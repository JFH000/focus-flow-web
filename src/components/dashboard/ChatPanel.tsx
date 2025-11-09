'use client'

import ChatInput from '@/components/chat/ChatInput'
import ChatList from '@/components/chat/ChatList'
import MessageList from '@/components/chat/MessageList'
import { useChat } from '@/contexts/ChatContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface ChatPanelProps {
  chatId?: string | null
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  chats: Array<{ id: string; title: string; updated_at: string }>
  onChatClick: (chatId: string) => void
}

function HistoryModal({ isOpen, onClose, chats, onChatClick }: HistoryModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Historial de Chats</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
          {chats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay chats disponibles</p>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onChatClick(chat.id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="font-medium">{chat.title}</div>
                  <div className="text-sm text-muted-foreground">{new Date(chat.updated_at).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPanel({ chatId }: ChatPanelProps) {
  const { loadChat, clearCurrentChat, chats } = useChat()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  useEffect(() => {
    if (chatId) {
      loadChat(chatId).catch(console.error)
    } else {
      clearCurrentChat()
    }
  }, [chatId, loadChat, clearCurrentChat])

  const handleNewChat = useCallback(() => {
    clearCurrentChat()
    // Limpiar el parámetro de chat de la URL
    const params = new URLSearchParams(searchParams.toString())
    params.delete('chat')
    router.push(`/dashboard?${params.toString()}`)
  }, [clearCurrentChat, router, searchParams])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  const openHistoryModal = () => {
    setIsHistoryModalOpen(true)
  }

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false)
  }

  useEffect(() => {
    const handleCloseSidebar = () => {
      setIsSidebarOpen(false)
    }

    window.addEventListener('closeSidebar', handleCloseSidebar)
    return () => window.removeEventListener('closeSidebar', handleCloseSidebar)
  }, [])

  const handleChatClickFromModal = (selectedChatId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('chat', selectedChatId)
    router.push(`/dashboard?${params.toString()}`)
    closeHistoryModal()
  }

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`flex flex-col border-r border-purple-500/20 bg-gradient-to-b from-purple-600/5 via-blue-600/5 to-purple-600/5 backdrop-blur-xl shadow-lg transition-all duration-300 ${
          isSidebarOpen 
            ? 'w-52 translate-x-0' 
            : 'w-12'
        } flex-shrink-0`}
      >
        {/* Header del sidebar con botón de toggle */}
        <div className="relative border-b border-purple-500/20 min-h-[48px] flex items-center justify-center bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10">

          {/* Botón para colapsar/expandir */}
          <button
            onClick={toggleSidebar}
            className={`absolute top-1/2 -translate-y-1/2 p-2 hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-blue-600/20 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
              isSidebarOpen 
                ? 'right-2' 
                : 'left-1/2 -translate-x-1/2'
            }`}
            title={isSidebarOpen ? 'Colapsar sidebar' : 'Expandir sidebar'}
          >
            <svg 
              className={`w-4 h-4 text-muted-foreground hover:text-purple-600 transition-all duration-300 ${
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
            {/* Opciones principales */}
            <div className="p-3 space-y-1 border-b border-purple-500/20">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-blue-600/10 rounded-lg transition-all duration-200"
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
                    d="M12 4v16m8-8H4" 
                  />
                </svg>
                <span>Nuevo Chat</span>
              </button>
              
              <button
                onClick={openHistoryModal}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-blue-600/10 rounded-lg transition-all duration-200"
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
                <span>Buscar Chat</span>
              </button>
            </div>

            {/* Lista de chats */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-base font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Chats
                </h2>
              </div>
              <ChatList className="p-2" />
            </div>
          </>
        )}

        {/* Contenido cuando está colapsado */}
        {!isSidebarOpen && (
          <div className="flex-1 flex flex-col items-center pt-6 space-y-5">
            {/* Botón Nuevo Chat */}
            <button
              onClick={handleNewChat}
              className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors duration-200 group"
              title="Nuevo Chat"
            >
              <svg 
                className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" 
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
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>

            {/* Botón Buscar Chat */}
            <button
              onClick={openHistoryModal}
              className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors duration-200 group"
              title="Buscar Chat"
            >
              <svg 
                className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" 
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
      </aside>

      {/* Área principal del chat */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Área de mensajes */}
        <div className="flex-1 overflow-hidden">
          <MessageList />
        </div>

        {/* Input del chat */}
        <div className="">
          <ChatInput />
        </div>
      </div>

      {/* Modal de Historial de Chats */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={closeHistoryModal}
        chats={chats}
        onChatClick={handleChatClickFromModal}
      />
    </div>
  )
}
