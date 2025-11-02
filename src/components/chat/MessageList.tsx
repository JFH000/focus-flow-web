'use client'

import { useChat } from '@/contexts/ChatContext'
import { Message } from '@/types/database'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Copy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageListProps {
  className?: string
}

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

  if (messages.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground max-w-md mx-auto px-4">
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
          <p className="text-lg font-medium">¡Hola! 👋</p>
          <p className="text-sm">Escribe tu primer mensaje para comenzar</p>
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
                <span className="text-foreground/70 font-medium">IA Foco pensando</span>
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
              {message.model_used}
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
