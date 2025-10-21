'use client'

import ChatInput from '@/components/chat/ChatInput'
import MessageList from '@/components/chat/MessageList'
import { useChat } from '@/contexts/ChatContext'
import { useEffect } from 'react'

interface ChatPanelProps {
  chatId?: string | null
}

export default function ChatPanel({ chatId }: ChatPanelProps) {
  const { loadChat } = useChat()

  useEffect(() => {
    if (chatId) {
      loadChat(chatId).catch(console.error)
    }
  }, [chatId, loadChat])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Área de mensajes */}
      <div className="flex-1 overflow-hidden">
        <MessageList />
      </div>

      {/* Input del chat */}
      <div className="">
        <ChatInput />
      </div>
    </div>
  )
}
