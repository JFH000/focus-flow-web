'use client'

import { useChat } from '@/contexts/ChatContext'
import { Message } from '@/types/database'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Copy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageListProps {
  className?: string
}

const QUICK_PROMPTS = [
  {
    title: 'Revisa tu agenda de mañana',
    description: 'Recibe tus espacios libres por la tarde.',
    message: '¿Puedes revisar mi calendario de mañana entre las 09:00 AM y las 05:00 PM (hora de Bogotá) y decirme qué espacios libres tengo?'
  },
  {
    title: 'Programa una sesión foco',
    description: 'Crea un evento con hora exacta.',
    message: 'Agenda una sesión de enfoque profundo llamada "Foco en tesis" para este viernes a las 10:00 AM (hora de Bogotá) con una duración de 90 minutos.'
  },
  {
    title: 'Planifica tu semana',
    description: 'Organiza prioridades y metas.',
    message: 'Necesito un plan semanal para equilibrar estudio, trabajo y descanso. Dispongo de 2 horas en la mañana y 2 en la tarde de lunes a viernes, y 4 horas los sábados. Incluye bloques de repaso y descansos.'
  },
  {
    title: 'Resume un documento',
    description: 'Pega el texto y obtén ideas clave.',
    message: 'Por favor resume y extrae los puntos clave de este texto (lo pegaré a continuación) y sugiere acciones concretas basadas en ese contenido:\n\n'
  }
] as const

export default function MessageList({ className = '' }: MessageListProps) {
  const { messages, loadingMessages, currentChat } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)
  const isInitialLoadRef = useRef(true)
  const currentChatIdRef = useRef<string | null>(null)
  const lastFocusTimeRef = useRef<number>(0)

  // Function to scroll to absolute bottom
  const scrollToBottom = useCallback(() => {
    // Wait for DOM to fully update, then scroll smoothly to absolute bottom
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current
          // Scroll to the maximum scroll position
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          })
        }
      })
    })
  }, [])

  // Track when page becomes visible again (tab switch) - but don't reload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastFocusTimeRef.current = Date.now()
        // Don't reset auto-scroll state when coming back from tab switch
        // This prevents unnecessary reloading
      }
    }

    const handleFocus = () => {
      lastFocusTimeRef.current = Date.now()
      // Don't reset auto-scroll state when window gains focus
      // This prevents unnecessary reloading
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Reset auto-scroll state when chat changes
  useEffect(() => {
    if (currentChat?.id !== currentChatIdRef.current) {
      currentChatIdRef.current = currentChat?.id || null
      isInitialLoadRef.current = true
      previousMessageCountRef.current = 0
    }
  }, [currentChat?.id])

  // Check if there's a streaming message (must be before conditional returns)
  const hasStreamingMessage = messages.some(msg => msg.id === 'streaming')

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    // Skip auto-scroll only on very first load (initial mount)
    if (isInitialLoadRef.current && messages.length === 0) {
      isInitialLoadRef.current = false
      return
    }

    // Always scroll when messages count increases (new message added)
    if (messages.length > previousMessageCountRef.current) {
      scrollToBottom()
    }

    // Always scroll if the last message is from the user
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      scrollToBottom()
    }

    // Update previous count
    previousMessageCountRef.current = messages.length
  }, [messages, scrollToBottom])

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (hasStreamingMessage) {
      scrollToBottom()
    }
  }, [hasStreamingMessage, scrollToBottom])

  const handleQuickPrompt = useCallback((prompt: string) => {
    window.dispatchEvent(new CustomEvent('chat:quickPrompt', { detail: { message: prompt } }))
  }, [])

  const hasMessages = messages.length > 0

  const quickPromptHint = useMemo(() => {
    if (!hasMessages) {
      return 'Configura tu mensaje con un clic'
    }
    return ''
  }, [hasMessages])

  if (loadingMessages && messages.length === 0) {
    return (
      <div className={`h-full overflow-y-auto p-4 ${className}`}>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="loading-shimmer w-8 h-8 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="loading-shimmer h-4 w-1/3 rounded"></div>
                <div className="loading-shimmer h-4 w-2/3 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!hasMessages) {
    return (
      <div className={`h-full overflow-y-auto ${className}`}>
        <div className="relative h-full flex flex-col items-center justify-center px-4 py-16">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 right-1/3 h-64 w-64 rounded-full bg-purple-500/20 blur-[120px]" />
            <div className="absolute bottom-[-80px] left-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-[140px]" />
          </div>

          <div className="relative w-full max-w-4xl mx-auto">
            <div className="rounded-3xl border border-border/60 bg-background/80 shadow-2xl backdrop-blur-xl overflow-hidden">
              <div className="absolute inset-x-8 -top-24 h-40 rounded-full bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 blur-3xl" />

              <div className="relative px-6 py-8 sm:px-12 sm:py-14">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
                    <span className="flex h-2.5 w-2.5 items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </span>
                    Nuevo chat listo
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      ¿En qué quieres enfocarte hoy?
                    </h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                      Escribe un mensaje o usa una de las plantillas inteligentes para comenzar más rápido.
                    </p>
                  </div>

                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium uppercase tracking-widest text-muted-foreground/80">
                        sugerencias rápidas
                      </span>
                      <span>{quickPromptHint}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt.title}
                          type="button"
                          onClick={() => handleQuickPrompt(prompt.message)}
                          className="group flex w-full flex-col items-start gap-3 rounded-2xl border border-border bg-card/70 p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v12m6-6H6"
                                />
                              </svg>
                            </span>
                            {prompt.title}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {prompt.description}
                          </p>
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-primary/80">
                            Usar plantilla
                            <svg
                              className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 shadow-sm">
                      <span className="font-medium text-foreground">Tip</span>
                      <span>Usa</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
                        <span>Shift</span>
                        <span>+</span>
                        <span>Enter</span>
                      </span>
                      <span>para saltos de línea</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 shadow-sm">
                      <span className="font-medium text-foreground">Arrastra archivos</span>
                      <span>o haz clic en el clip para sumarlos al contexto</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollContainerRef} className={`h-full overflow-y-auto message-list ${className}`}>
      <div className="p-3 sm:p-4 pb-32 sm:pb-24 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} /> 
      </div>
    </div>
  )
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-message-slide-in`}>
      {/* Message Content */}
      <div className={`max-w-[85%] sm:max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`
          inline-block w-full px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-sm relative group
          ${isUser 
            ? 'bg-background text-foreground border-2 border-primary' 
            : isAssistant
              ? 'bg-card text-card-foreground border border-border'
              : 'bg-destructive/10 text-destructive'
          }
        `}>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`
              absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 
              transition-opacity duration-200 hover:bg-black/10 dark:hover:bg-white/10
              ${isUser ? 'text-primary hover:text-primary/80' : 'text-primary hover:text-primary/80'}
            `}
            title="Copiar mensaje"
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>

          <div className="prose prose-sm sm:prose-base max-w-none text-sm sm:text-base">
            {message.content === 'thinking' ? (
              <div className="flex items-center gap-2 py-2">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-typing-dot"></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-typing-dot" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-typing-dot" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            ) : isAssistant ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
        </div>
        
        {/* Message metadata */}
        <div className={`
          mt-1 text-xs text-muted-foreground
          ${isUser ? 'text-right' : ''}
        `}>
          <span>
            {format(new Date(message.created_at), 'HH:mm', { locale: es })}
          </span>
          {message.model_used && (
            <span className="ml-2 px-1 py-0.5 bg-primary/20 text-primary rounded text-xs">
              {message.model_used === 'n8n-ai' ? 'foco.ia' : message.model_used}
            </span>
          )}
          {message.token_count && (
            <span className="ml-1 text-xs">
              ({message.token_count} tokens)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
