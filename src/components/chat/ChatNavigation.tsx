'use client'

import { useChat } from '@/contexts/ChatContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ChatNavigationProps {
  className?: string
}

export default function ChatNavigation({ className = '' }: ChatNavigationProps) {
  const { chats, loading, loadChat, clearCurrentChat } = useChat()
  const router = useRouter()
  const [showHistory, setShowHistory] = useState(false)

  const handleNewChat = () => {
    // Limpiar el chat actual primero
    clearCurrentChat()
    
    // Si estamos en dashboard, ir a dashboard sin chat
    if (window.location.pathname.startsWith('/dashboard')) {
      router.push('/dashboard')
    } else {
      router.push('/foco')
    }
  }

  const handleChatClick = async (chatId: string) => {
    // Si estamos en dashboard, cargar el chat directamente
    if (window.location.pathname.startsWith('/dashboard')) {
      try {
        await loadChat(chatId)
        setShowHistory(false)
      } catch (error) {
        console.error('Error loading chat:', error)
      }
    } else {
      // Si estamos en otra página, redirigir
      router.push(`/foco/${chatId}`)
      setShowHistory(false)
    }
  }

  return (
    <>
      {/* Navigation buttons - positioned by parent container */}
      <div className={`flex flex-col gap-1 ${className}`}>
        <button
          onClick={handleNewChat}
          className="w-8 h-8 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg"
          title="Nuevo Chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-8 h-8 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg"
            title="Historial"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* History dropdown */}
          {showHistory && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowHistory(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute bottom-9 left-0 w-80 bg-card border border-border rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-medium text-card-foreground">Chats Anteriores</h3>
            </div>
            
            <div className="p-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="loading-shimmer h-12 rounded"></div>
                  ))}
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm">No tienes chats aún</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleChatClick(chat.id)}
                      className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors">
                            {chat.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(chat.updated_at).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-secondary/20 text-secondary-foreground rounded-full flex-shrink-0">
                          {chat.context_type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
        </div>
      </div>
    </>
  )
}
