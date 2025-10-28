'use client'

import { useChat } from '@/contexts/ChatContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

interface ChatListProps {
  className?: string
}

interface Chat {
  id: string
  title: string
  updated_at: string
  context_type: string
  user_id: string
  created_at: string
}

interface ChatListItemProps {
  chat: Chat
}

function ChatListItem({ chat }: ChatListItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(chat.title)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { deleteChat, updateChatTitle } = useChat()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleChatClick = () => {
    router.push(`/foco/${chat.id}`)
  }

  const handleRename = async () => {
    if (newTitle.trim() && newTitle !== chat.title) {
      await updateChatTitle(chat.id, newTitle.trim())
    }
    setIsRenaming(false)
    setShowMenu(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setNewTitle(chat.title)
      setIsRenaming(false)
      setShowMenu(false)
    }
  }

  const handleShare = async () => {
    try {
      const chatData = {
        id: chat.id,
        title: chat.title,
        updated_at: chat.updated_at,
        context_type: chat.context_type,
        user_id: chat.user_id,
        created_at: chat.created_at,
      }
      
      const dataStr = JSON.stringify(chatData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chat-${chat.id}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setShowMenu(false)
    } catch (error) {
      console.error('Error sharing chat:', error)
    }
  }

  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar este chat?')) {
      const success = await deleteChat(chat.id)
      if (success && pathname === `/foco/${chat.id}`) {
        router.push('/foco')
      }
    }
    setShowMenu(false)
  }

  return (
    <div
      onClick={handleChatClick}
      className={`
        group relative p-3 rounded-lg border cursor-pointer transition-all duration-200
        hover:bg-accent hover:border-primary/30
        ${pathname === `/foco/${chat.id}` 
          ? 'bg-primary/10 border-primary shadow-sm' 
          : 'bg-background border-border'
        }
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-primary mt-1 flex-shrink-0">•</span>
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyPress}
              className="w-full p-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <h3 className="font-medium text-sm text-card-foreground line-clamp-2 leading-tight">
                {chat.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 ml-2">
                {format(new Date(chat.updated_at), 'd MMM. HHmm', { locale: es })}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Botón de tres puntos - Solo aparece al hacer hover */}
      <div 
        ref={menuRef}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded hover:bg-muted transition-colors duration-200"
        >
          <svg 
            className="w-4 h-4 text-muted-foreground" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" 
            />
          </svg>
        </button>

        {/* Menú desplegable */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-card border rounded-md shadow-lg z-10">
            <button
              onClick={() => {
                setIsRenaming(true)
                setShowMenu(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors duration-200 border-b"
            >
              Rename
            </button>
            <button
              onClick={handleShare}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors duration-200 border-b"
            >
              Share
            </button>
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors duration-200"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatList({ className = '' }: ChatListProps) {
  const { chats, loading } = useChat()

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
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
          <ChatListItem key={chat.id} chat={chat} />
        ))
      )}
    </div>
  )
}