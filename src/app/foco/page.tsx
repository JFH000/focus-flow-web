// app/foco/page.tsx
'use client'

import ChatInput from '@/components/chat/ChatInput'
import MessageList from '@/components/chat/MessageList'
import { useChat } from '@/contexts/ChatContext'
import { useEffect } from 'react'

export default function FocoPage() {
  const { clearCurrentChat } = useChat()

  useEffect(() => {
    clearCurrentChat()
  }, [clearCurrentChat])

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 3rem)', overflow: 'hidden' }}>
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full">
          <MessageList />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <ChatInput placeholder="¿En qué puedo ayudarte hoy?" />
        </div>
      </div>
    </div>
  )
}