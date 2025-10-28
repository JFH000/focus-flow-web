// app/foco/layout.tsx
'use client'

import AppLayout from '@/components/AppLayout'
import ChatList from '@/components/chat/ChatList'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useChat } from '@/contexts/ChatContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface Chat {
  id: string
  title: string
  updated_at: string
  context_type: string
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  chats: Chat[]
  onChatClick: (chatId: string) => void
}

function ChatItem({ 
  chat, 
  onChatClick,
  onRename,
  onShare,
  onDelete
}: { 
  chat: Chat
  onChatClick: (chatId: string) => void
  onRename: (chatId: string, newTitle: string) => void
  onShare: (chatId: string) => void
  onDelete: (chatId: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(chat.title)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== chat.title) {
      onRename(chat.id, newTitle.trim())
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

  return (
    <div 
      onClick={() => onChatClick(chat.id)}
      className="group relative p-2 rounded cursor-pointer transition-all duration-200 hover:bg-accent/50"
    >
      <div className="flex items-start justify-between">
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
              <h3 className="font-medium text-sm text-card-foreground line-clamp-1 leading-tight pr-8">
                {chat.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(chat.updated_at), 'HH:mm', { locale: es })}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Botón de tres puntos - Solo aparece al hacer hover */}
      <div 
        ref={menuRef}
        className="absolute top-1/2 -translate-y-1/2 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
              onClick={() => onShare(chat.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors duration-200 border-b"
            >
              Share
            </button>
            <button
              onClick={() => onDelete(chat.id)}
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

function HistoryModal({ 
  isOpen, 
  onClose, 
  chats, 
  onChatClick 
}: HistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { updateChatTitle, deleteChat } = useChat()

  const filteredChats = useMemo(() => {
    if (!searchTerm) {
      return chats.slice(0, 10) // Mostrar más chats en el modal
    }
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [chats, searchTerm])

  const handleRename = async (chatId: string, newTitle: string) => {
    try {
      await updateChatTitle(chatId, newTitle)
    } catch (error) {
      console.error('Error renaming chat:', error)
    }
  }

  const handleShare = async (chatId: string) => {
    try {
      const chat = chats.find(c => c.id === chatId)
      if (chat) {
        const chatData = {
          id: chat.id,
          title: chat.title,
          updated_at: chat.updated_at,
          context_type: chat.context_type,
        }
        
        const dataStr = JSON.stringify(chatData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `chat-${chatId}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error sharing chat:', error)
    }
  }

  const handleDelete = async (chatId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este chat?')) {
      try {
        await deleteChat(chatId)
      } catch (error) {
        console.error('Error deleting chat:', error)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Historial de Chats</h2>
        </div>
        
        {/* Buscador */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Buscar chat por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredChats.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                {searchTerm ? 'No se encontraron chats' : 'No hay chats recientes'}
              </p>
            ) : (
              filteredChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  onChatClick={onChatClick}
                  onRename={handleRename}
                  onShare={handleShare}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FocoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const { clearCurrentChat, chats } = useChat()
  const router = useRouter()
  const pathname = usePathname()

  // Función mejorada para nuevo chat - enfoque más simple y directo
  const handleNewChat = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
        e.preventDefault()
        e.stopPropagation()
    }
    
    console.log('Iniciando nuevo chat desde:', pathname)
    
    // Si ya estamos en /foco, simplemente limpiar el chat
    if (pathname === '/foco') {
        console.log('Ya estamos en /foco, limpiando chat...')
        clearCurrentChat()
        return
    }
    
    // Si estamos en un chat específico, navegar primero y luego limpiar
    console.log('Navegando a /foco primero...')
    router.push('/foco')
    
    // Esperar un poco más para asegurar la navegación
    await new Promise(resolve => setTimeout(resolve, 200))
    
    console.log('Limpiando chat actual después de navegar...')
    clearCurrentChat()
    }, [clearCurrentChat, router, pathname])

  // Función específica para toggle del sidebar
  const toggleSidebar = useCallback(() => {
    console.log('Toggle sidebar clicked, current state:', isSidebarOpen)
    setIsSidebarOpen(prev => !prev)
  }, [isSidebarOpen])

  const openHistoryModal = () => {
    setIsHistoryModalOpen(true)
  }

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false)
  }

  const handleChatClickFromModal = (chatId: string) => {
    router.push(`/foco/${chatId}`)
    closeHistoryModal()
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="flex h-full bg-background overflow-hidden">
          {/* Sidebar */}
          <aside 
            className={`flex flex-col border-r bg-card transition-all duration-300 ${
              isSidebarOpen ? 'w-80' : 'w-16'
            }`}
          >
            
            {/* Header del sidebar con botón de toggle - SIMPLIFICADO */}
            <div className="relative p-4 border-b min-h-[64px] flex items-center justify-center">
              {isSidebarOpen && (
                <h2 className="text-lg font-semibold">Chats Anteriores</h2>
              )}

              {/* Botón para colapsar/expandir - SIEMPRE EN LA MISMA POSICIÓN */}
              <button
                onClick={toggleSidebar}
                className="absolute top-1/2 -translate-y-1/2 right-2 p-2 hover:bg-muted rounded transition-all duration-200"
                title={isSidebarOpen ? 'Colapsar sidebar' : 'Expandir sidebar'}
              >
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isSidebarOpen ? '' : 'rotate-180'
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 19l-7-7 7-7" 
                  />
                </svg>
              </button>
            </div>

            {/* Contenido cuando está expandido */}
            {isSidebarOpen && (
              <>
                {/* Botón Nuevo Chat */}
                <div className="p-4 border-b">
                  <button
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium"
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4v16m8-8H4" 
                      />
                    </svg>
                    Nuevo Chat
                  </button>
                </div>

                {/* Lista de chats */}
                <div className="flex-1 overflow-y-auto">
                  <ChatList className="p-2" />
                </div>
              </>
            )}

            {/* Contenido cuando está colapsado - SOLO 2 BOTONES */}
            {!isSidebarOpen && (
              <div className="flex-1 flex flex-col items-center pt-8 space-y-6">
                {/* Botón Nuevo Chat */}
                <button
                  onClick={handleNewChat}
                  className="p-3 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors duration-200"
                  title="Nuevo Chat"
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 4v16m8-8H4" 
                    />
                  </svg>
                </button>

                {/* Separador */}
                <div className="w-8 h-px bg-border"></div>

                {/* Botón Buscar Chat (Historial) */}
                <button
                  onClick={openHistoryModal}
                  className="p-3 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors duration-200"
                  title="Buscar Chat"
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Footer del sidebar solo cuando está expandido */}
            {isSidebarOpen && (
              <div className="p-4 border-t">
                <button
                  onClick={openHistoryModal}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors duration-200"
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                    />
                  </svg>
                  Buscar Chat
                </button>
              </div>
            )}
          </aside>

          {/* Área principal del chat */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </main>

          {/* Modal de Historial de Chats */}
          <HistoryModal
            isOpen={isHistoryModalOpen}
            onClose={closeHistoryModal}
            chats={chats}
            onChatClick={handleChatClickFromModal}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}