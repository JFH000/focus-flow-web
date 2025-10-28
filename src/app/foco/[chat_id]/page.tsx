// app/foco/[chat_id]/page.tsx
'use client'

import ChatInput from '@/components/chat/ChatInput'
import MessageList from '@/components/chat/MessageList'
import { useChat } from '@/contexts/ChatContext'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { loadChat, currentChat, loadingMessages } = useChat()
  const chatId = params.chat_id as string
  const [chatNotFound, setChatNotFound] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    if (chatId && currentChat?.id !== chatId) {
      loadChat(chatId).catch(() => {
        setChatNotFound(true)
      }).finally(() => {
        setIsInitialLoad(false)
      })
    } else if (currentChat?.id === chatId) {
      setIsInitialLoad(false)
    }
  }, [chatId, loadChat, currentChat?.id])

  useEffect(() => {
    if (!loadingMessages && chatNotFound) {
      const timer = setTimeout(() => {
        router.push('/foco')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loadingMessages, chatNotFound, router])

  if (loadingMessages && isInitialLoad) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="loading-shimmer w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando chat...</p>
        </div>
      </div>
    )
  }

  if (chatNotFound) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-lg font-medium">Chat no encontrado</p>
          <p className="text-sm">Este chat no existe o no tienes acceso a él</p>
        </div>
      </div>
    )
  }

  if (!currentChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="loading-shimmer w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 3rem)', overflow: 'hidden' }}>
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full">
          <MessageList />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <ChatInput 
            placeholder="Escribe tu mensaje..."
          />
        </div>
      </div>
    </div>
  )
}