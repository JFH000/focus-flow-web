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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden relative pb-12 sm:pb-0">
        <div className="h-full overflow-y-auto">
          <MessageList />
        </div>
        
        <div className="fixed sm:absolute bottom-4 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none border-t border-border sm:border-none">
          <ChatInput placeholder="¿En qué puedo ayudarte hoy?" />
        </div>
      </div>
    </div>
  )
}