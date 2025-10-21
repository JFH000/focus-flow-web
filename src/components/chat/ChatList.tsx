'use client'

import { useChat } from '@/contexts/ChatContext'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePathname, useRouter } from 'next/navigation'

interface ChatListProps {
  className?: string
}

export default function ChatList({ className = '' }: ChatListProps) {
  const { chats, loading, deleteChat } = useChat()
  const router = useRouter()
  const pathname = usePathname()

  const handleChatClick = (chatId: string) => {
    router.push(`/foco/${chatId}`)
  }

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation()
    if (confirm('¿Estás seguro de que quieres eliminar este chat?')) {
      const success = await deleteChat(chatId)
      if (success && pathname === `/foco/${chatId}`) {
        router.push('/foco')
      }
    }
  }

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="loading-shimmer h-16 rounded-lg"></div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {chats.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm">No tienes chats aún</p>
          <p className="text-xs">Crea tu primer chat escribiendo un mensaje</p>
        </div>
      ) : (
        chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => handleChatClick(chat.id)}
            className={`
              p-4 rounded-lg border cursor-pointer transition-all duration-200
              hover:bg-muted/50 hover:border-primary/50
              ${pathname === `/foco/${chat.id}` 
                ? 'bg-primary/10 border-primary' 
                : 'bg-card border-border'
              }
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-card-foreground truncate">
                  {chat.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(chat.updated_at), { 
                    addSuffix: true, 
                    locale: es 
                  })}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-secondary/20 text-secondary-foreground rounded-full">
                    {chat.context_type}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                title="Eliminar chat"
              >
                <svg
                  className="w-4 h-4 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

