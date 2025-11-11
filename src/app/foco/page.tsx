// app/foco/page.tsx
'use client'

import ChatInput from '@/components/chat/ChatInput'
import MessageList from '@/components/chat/MessageList'
import { useChat } from '@/contexts/ChatContext'
import { useEffect, useState } from 'react'

export default function FocoPage() {
  const { clearCurrentChat } = useChat()
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    clearCurrentChat()
  }, [clearCurrentChat])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const viewport = window.visualViewport
    if (!viewport) return

    const updateOffset = () => {
      const offset = Math.max(window.innerHeight - viewport.height - viewport.offsetTop, 0)
      setKeyboardOffset(offset)
    }

    updateOffset()
    viewport.addEventListener('resize', updateOffset)
    viewport.addEventListener('scroll', updateOffset)

    return () => {
      viewport.removeEventListener('resize', updateOffset)
      viewport.removeEventListener('scroll', updateOffset)
    }
  }, [])

  const bottomSpacing = (isMobile ? keyboardOffset : 0) + 16

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden relative pb-12 sm:pb-0">
        <div className="h-full">
          <MessageList />
        </div>
        
        <div
          className="fixed sm:absolute left-0 right-0 z-10 pointer-events-none"
          style={{ bottom: `${bottomSpacing}px` }}
        >
          <div className="pointer-events-auto w-full">
            <ChatInput placeholder="¿En qué puedo ayudarte hoy?" />
          </div>
        </div>
      </div>
    </div>
  )
}