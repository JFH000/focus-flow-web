'use client'

import AppLayout from '@/components/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import ChatInput from '@/components/chat/ChatInput'
import MessageList from '@/components/chat/MessageList'
import { useChat } from '@/contexts/ChatContext'
import { useEffect } from 'react'

export default function FocoPage() {
  const { clearCurrentChat } = useChat()

  // Clear current chat when navigating to /foco (new chat page)
  useEffect(() => {
    clearCurrentChat()
  }, [clearCurrentChat])

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="h-full flex flex-col bg-background" style={{ height: 'calc(100vh - 3rem)', overflow: 'hidden' }}>
          {/* Messages area - with scroll */}
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full">
              <MessageList />
            </div>
            
            {/* Input area - floating over messages */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <ChatInput placeholder="¿En qué puedo ayudarte hoy?" />
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
