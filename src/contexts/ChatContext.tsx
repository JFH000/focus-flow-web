'use client'

import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Chat, ChatInsert, ChatWithMessages, Message, MessageInsert } from '@/types/database'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface ChatContextType {
  chats: Chat[]
  currentChat: ChatWithMessages | null
  messages: Message[]
  loading: boolean
  loadingMessages: boolean
  createChat: (title: string, contextType?: string) => Promise<Chat | null>
  deleteChat: (chatId: string) => Promise<boolean>
  loadChat: (chatId: string) => Promise<void>
  sendMessage: (content: string, chatId?: string) => Promise<Message | null>
  clearCurrentChat: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<ChatWithMessages | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  // Load user's chats when user changes
  useEffect(() => {
    if (user) {
      loadChats()
    } else {
      setChats([])
      setCurrentChat(null)
      setMessages([])
    }
  }, [user])

  const loadChats = useCallback(async () => {
    if (!user) return

    try {
      // Don't set loadingMessages for loading chats list
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading chats:', error)
        return
      }

      setChats(data || [])
    } catch (error) {
      console.error('Error loading chats:', error)
    }
  }, [user, supabase])

  const createChat = useCallback(async (title: string, contextType: string = 'general'): Promise<Chat | null> => {
    if (!user) return null

    try {
      const newChat: ChatInsert = {
        user_id: user.id,
        title,
        context_type: contextType
      }

      const { data, error } = await supabase
        .from('chats')
        .insert(newChat)
        .select()
        .single()

      if (error) {
        console.error('Error creating chat:', error)
        return null
      }

      setChats(prev => [data, ...prev])
      return data
    } catch (error) {
      console.error('Error creating chat:', error)
      return null
    }
  }, [user, supabase])

  const deleteChat = useCallback(async (chatId: string): Promise<boolean> => {
    if (!user) return false

    try {
      setLoading(true)
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting chat:', error)
        return false
      }

      setChats(prev => prev.filter(chat => chat.id !== chatId))
      
      // Clear current chat if it was deleted
      if (currentChat?.id === chatId) {
        setCurrentChat(null)
        setMessages([])
      }

      return true
    } catch (error) {
      console.error('Error deleting chat:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [user, supabase, currentChat])

  const loadChat = useCallback(async (chatId: string) => {
    if (!user) return

    // If we already have this chat loaded, don't reload
    if (currentChat?.id === chatId && messages.length > 0) {
      return
    }

    try {
      setLoadingMessages(true)
      
      // Load chat with messages
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          *,
          messages (*)
        `)
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single()

      if (chatError) {
        console.error('Error loading chat:', chatError)
        throw new Error('Chat not found')
      }

      setCurrentChat(chatData)
      setMessages(chatData.messages || [])
    } catch (error) {
      console.error('Error loading chat:', error)
      setLoadingMessages(false)
      throw error
    } finally {
      setLoadingMessages(false)
    }
  }, [user, supabase, currentChat?.id, messages.length])

  const sendMessage = useCallback(async (content: string, chatId?: string): Promise<Message | null> => {
    if (!user) return null

    try {
      let targetChatId = chatId

      // If no chatId provided, create a new chat
      if (!targetChatId) {
        const newChat = await createChat(content.slice(0, 50) + (content.length > 50 ? '...' : ''))
        if (!newChat) return null
        targetChatId = newChat.id
        setCurrentChat({ ...newChat, messages: [] })
        
        // Redirect to the new chat URL
        router.push(`/foco/${targetChatId}`)
      }

      // Now start loading for message sending
      setLoading(true)

      // Create user message
      const userMessage: MessageInsert = {
        chat_id: targetChatId,
        user_id: user.id,
        role: 'user',
        content
      }

      const { data: userMessageData, error: userMessageError } = await supabase
        .from('messages')
        .insert(userMessage)
        .select()
        .single()

      if (userMessageError) {
        console.error('Error creating user message:', userMessageError)
        return null
      }

      // Add user message to current messages
      setMessages(prev => [...prev, userMessageData])

      // Send to n8n webhook and get streaming response
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_CHAT_HOST
      let aiContent = ''

      if (webhookUrl) {
        try {
          const requestBody = {
            message: content,
            chat_id: targetChatId,
            client_id: user.id
          }
          
          console.log('Enviando POST al webhook de chat:', {
            url: webhookUrl,
            body: requestBody
          })
          
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          if (!response.body) {
            throw new Error('No response body')
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          try {
            while (true) {
              const { done, value } = await reader.read()

              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk

              // Process complete NDJSON lines
              const lines = buffer.split('\n')
              // Keep last partial line in buffer
              buffer = lines.pop() || ''

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue
                try {
                  const eventObj = JSON.parse(trimmed) as { type?: string; content?: string }
                  if (eventObj.type === 'item' && typeof eventObj.content === 'string') {
                    aiContent += eventObj.content

                    // Update messages with streaming content
                    setMessages(prev => {
                      const lastMessage = prev[prev.length - 1]
                      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.id === 'streaming') {
                        return [...prev.slice(0, -1), { ...lastMessage, content: aiContent }]
                      } else {
                        // Create streaming message
                        const streamingMessage: Message = {
                          id: 'streaming',
                          chat_id: targetChatId,
                          user_id: user.id,
                          role: 'assistant',
                          content: aiContent,
                          model_used: 'n8n-ai',
                          token_count: null,
                          attached_files: [],
                          created_at: new Date().toISOString()
                        }
                        return [...prev, streamingMessage]
                      }
                    })
                  }
                  // Ignore 'begin' and 'end' here; stream completion is driven by network EOF
                } catch {
                  // If a line isn't valid JSON, skip it silently
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
        } catch (error) {
          console.error('Error calling n8n webhook:', error)
          aiContent = `Error al procesar tu mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }
      } else {
        // Fallback to simulated response if no webhook URL
        aiContent = `Gracias por tu mensaje: "${content}". Esta es una respuesta simulada de la IA.`
      }

      // Create final AI message
      const aiResponse: MessageInsert = {
        chat_id: targetChatId,
        user_id: user.id,
        role: 'assistant',
        content: aiContent,
        model_used: webhookUrl ? 'n8n-ai' : 'simulated-ai'
      }

      const { data: aiMessageData, error: aiMessageError } = await supabase
        .from('messages')
        .insert(aiResponse)
        .select()
        .single()

      if (aiMessageError) {
        console.error('Error creating AI message:', aiMessageError)
        return userMessageData
      }

      // Replace streaming message with final message
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg.id !== 'streaming')
        return [...filteredMessages, aiMessageData]
      })

      // Update current chat with new messages
      if (currentChat) {
        setCurrentChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, userMessageData, aiMessageData]
        } : null)
      } else if (targetChatId) {
        // If we don't have currentChat but have a targetChatId, load the chat
        await loadChat(targetChatId)
      }

      // Update chats list with updated timestamp (without reloading)
      setChats(prev => prev.map(chat => 
        chat.id === targetChatId 
          ? { ...chat, updated_at: new Date().toISOString() }
          : chat
      ))

      return userMessageData
    } catch (error) {
      console.error('Error sending message:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [user, supabase, currentChat, createChat, loadChat, router])

  const clearCurrentChat = useCallback(() => {
    setCurrentChat(null)
    setMessages([])
  }, [])

  const value = {
    chats,
    currentChat,
    messages,
    loading,
    loadingMessages,
    createChat,
    deleteChat,
    loadChat,
    sendMessage,
    clearCurrentChat
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
