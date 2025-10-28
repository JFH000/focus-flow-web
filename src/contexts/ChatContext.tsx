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
  updateChatTitle: (chatId: string, newTitle: string) => Promise<boolean>
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

  const loadChats = useCallback(async () => {
    if (!user) return

    try {
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

  useEffect(() => {
    if (user) {
      loadChats()
    } else {
      setChats([])
      setCurrentChat(null)
      setMessages([])
    }
  }, [user, loadChats])

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

  const updateChatTitle = useCallback(async (chatId: string, newTitle: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase
        .from('chats')
        .update({ 
          title: newTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating chat title:', error)
        return false
      }

      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle, updated_at: data.updated_at } : chat
      ))

      if (currentChat?.id === chatId) {
        setCurrentChat(prev => prev ? { ...prev, title: newTitle, updated_at: data.updated_at } : null)
      }

      return true
    } catch (error) {
      console.error('Error updating chat title:', error)
      return false
    }
  }, [user, supabase, currentChat])

  const loadChat = useCallback(async (chatId: string) => {
    if (!user) return

    if (currentChat?.id === chatId && messages.length > 0) {
      return
    }

    try {
      setLoadingMessages(true)
      
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

      if (!targetChatId) {
        const newChat = await createChat(content.slice(0, 50) + (content.length > 50 ? '...' : ''))
        if (!newChat) return null
        targetChatId = newChat.id
        setCurrentChat({ ...newChat, messages: [] })
        
        router.push(`/foco/${targetChatId}`)
      }

      setLoading(true)

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

      setMessages(prev => [...prev, userMessageData])

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

              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue
                try {
                  const eventObj = JSON.parse(trimmed) as { type?: string; content?: string }
                  if (eventObj.type === 'item' && typeof eventObj.content === 'string') {
                    aiContent += eventObj.content

                    setMessages(prev => {
                      const lastMessage = prev[prev.length - 1]
                      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.id === 'streaming') {
                        return [...prev.slice(0, -1), { ...lastMessage, content: aiContent }]
                      } else {
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
                } catch {
                  // Skip invalid JSON lines
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
        aiContent = `Gracias por tu mensaje: "${content}". Esta es una respuesta simulada de la IA.`
      }

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

      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg.id !== 'streaming')
        return [...filteredMessages, aiMessageData]
      })

      if (currentChat) {
        setCurrentChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, userMessageData, aiMessageData]
        } : null)
      } else if (targetChatId) {
        await loadChat(targetChatId)
      }

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
    clearCurrentChat,
    updateChatTitle
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