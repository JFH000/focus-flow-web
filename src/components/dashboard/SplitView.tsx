'use client'

import AppLayout from '@/components/AppLayout'
import { ChatProvider } from '@/contexts/ChatContext'
import { ArrowLeftRight, ArrowRightLeft } from 'lucide-react'
import { useParams, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import CalendarPanel from './CalendarPanel'
import ChatPanel from './ChatPanel'

export default function SplitView() {
  const [leftPanelWidth, setLeftPanelWidth] = useState(50) // Porcentaje
  const [isResizing, setIsResizing] = useState(false)
  const [leftPanel, setLeftPanel] = useState<'chat' | 'calendar'>('chat')
  const [chatId, setChatId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)
  const searchParams = useSearchParams()
  const params = useParams()

  // Manejar parámetro de chat desde la URL (tanto query como params)
  useEffect(() => {
    const chatParam = searchParams.get('chat')
    const chatFromParams = params?.params?.[0] // Si viene como /dashboard/chatId
    
    if (chatParam) {
      setChatId(chatParam)
    } else if (chatFromParams) {
      setChatId(chatFromParams)
    } else {
      setChatId(null)
    }
  }, [searchParams, params])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = leftPanelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [leftPanelWidth])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const deltaX = e.clientX - startXRef.current
    const deltaPercent = (deltaX / containerWidth) * 100
    const newWidth = Math.max(20, Math.min(80, startWidthRef.current + deltaPercent))
    
    setLeftPanelWidth(newWidth)
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const swapPanels = useCallback(() => {
    setLeftPanel(prev => prev === 'chat' ? 'calendar' : 'chat')
  }, [])

  // Event listeners para el resize
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <AppLayout>
      <ChatProvider>
        <div className="h-full flex flex-col overflow-hidden">

        {/* Contenedor principal con paneles */}
        <div 
          ref={containerRef}
          className="flex-1 flex relative overflow-hidden"
        >
          {/* Botón de intercambio integrado en el separador */}
          <div className="relative">
            <button
              onClick={swapPanels}
              className="absolute -top-8 right-1/2 transform translate-x-1/2 z-20 p-1.5 rounded-full bg-background border border-border hover:bg-muted transition-colors shadow-sm"
              title="Intercambiar paneles"
            >
              {leftPanel === 'chat' ? (
                <ArrowRightLeft className="w-3 h-3" />
              ) : (
                <ArrowLeftRight className="w-3 h-3" />
              )}
            </button>
          </div>
          {/* Panel izquierdo */}
          <div 
            className="flex-shrink-0 border-r overflow-hidden"
            style={{ width: `${leftPanelWidth}%` }}
          >
            <div className="h-full overflow-y-auto">
              {leftPanel === 'chat' ? <ChatPanel chatId={chatId} /> : <CalendarPanel />}
            </div>
          </div>

          {/* Separador redimensionable */}
          <div
            className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex-shrink-0 relative group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 bg-transparent" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-8 bg-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Panel derecho */}
          <div 
            className="flex-1 min-w-0 overflow-hidden"
          >
            <div className="h-full overflow-y-auto">
              {leftPanel === 'chat' ? <CalendarPanel /> : <ChatPanel chatId={chatId} />}
            </div>
          </div>
        </div>
        </div>
      </ChatProvider>
    </AppLayout>
  )
}
