'use client'

import { useChat } from '@/contexts/ChatContext'
import { getSignedFileUrl } from '@/utils/fileAccess'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface ChatInputProps {
  className?: string
  placeholder?: string
  disabled?: boolean
}

export default function ChatInput({ 
  className = '', 
  placeholder = 'Escribe tu mensaje...',
  disabled = false 
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    id: string
    name: string
    progress: number
    status: 'uploading' | 'processing' | 'completed' | 'error'
    processedChunks?: number
    totalChunks?: number
    error?: string
  }>>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showButtons, setShowButtons] = useState(true)
  const { sendMessage, loading, currentChat, chats, loading: loadingChats, clearCurrentChat } = useChat()
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || loading || disabled) return

    const messageToSend = message.trim()
    setMessage('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    await sendMessage(messageToSend, currentChat?.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentChat) return

    for (const file of Array.from(files)) {
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2)}`
      
      // Add file to uploading list
      setUploadingFiles(prev => [...prev, {
        id: fileId,
        name: file.name,
        progress: 0,
        status: 'uploading'
      }])

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
          ))
        }, 200)

        // Upload file directly
        const supabase = (await import('@/lib/supabase/client')).createClient()
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          throw new Error('Usuario no autenticado')
        }

        // Generate unique file path with user ID
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `chat-${currentChat.id}/${user.id}/${fileName}`

        // Upload file to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Error uploading file: ${uploadError.message}`)
        }

        // Generate signed URL (1h by default)
        const signedUrl = await getSignedFileUrl(filePath, 3600)

        // Update status to processing
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'processing', progress: 95 } : f
        ))

        // Call n8n webhook to add PDF to RAG
        const ragWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_ADD_PDF_TO_RAG_HOST
        if (ragWebhookUrl) {
          try {
            const response = await fetch(ragWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                file_id: data.path,
                file_path: signedUrl,
                file_type: file.type
              })
            })

            if (response.ok) {
              const processedData = await response.json()
              // Update with processed chunks info
              setUploadingFiles(prev => prev.map(f => 
                f.id === fileId ? { 
                  ...f, 
                  status: 'completed', 
                  progress: 100,
                  processedChunks: Array.isArray(processedData) ? processedData.length : 0,
                  totalChunks: Array.isArray(processedData) ? processedData.length : 0
                } : f
              ))
            } else {
              throw new Error(`Webhook error: ${response.status}`)
            }
          } catch (ragError) {
            console.warn('Error calling RAG webhook:', ragError)
            setUploadingFiles(prev => prev.map(f => 
              f.id === fileId ? { 
                ...f, 
                status: 'error', 
                error: ragError instanceof Error ? ragError.message : 'Error desconocido'
              } : f
            ))
          }
        } else {
          // No webhook, mark as completed
          setUploadingFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, status: 'completed', progress: 100 } : f
          ))
        }
        
        clearInterval(progressInterval)

        // Remove from list after 3 seconds (longer to show completion status)
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
        }, 3000)

      } catch (error) {
        console.error('Error uploading file:', error)
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Error desconocido'
          } : f
        ))
        // Remove error files after 5 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
        }, 5000)
      }
    }
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

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
    // Si estamos en dashboard, ir a dashboard con chat (usando query param)
    if (window.location.pathname.startsWith('/dashboard')) {
      router.push(`/dashboard?chat=${chatId}`)
      setShowHistory(false)
    } else {
      // Si estamos en otra página, redirigir
      router.push(`/foco/${chatId}`)
      setShowHistory(false)
    }
  }

  const handleCalendarClick = () => {
    const currentPath = window.location.pathname
    
    if (currentPath.startsWith('/dashboard')) {
      // Si estamos en dashboard, ir a foco con el chat actual
      if (currentChat?.id) {
        router.push(`/foco/${currentChat.id}`)
      } else {
        router.push('/foco')
      }
    } else {
      // Si estamos en foco, ir a dashboard con el chat actual
      if (currentChat?.id) {
        router.push(`/dashboard?chat=${currentChat.id}`)
      } else {
        router.push('/dashboard')
      }
    }
  }

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      {/* Uploading Files Overlay */}
      {uploadingFiles.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-background border border-border rounded-lg shadow-lg max-w-md mx-auto">
          <div className="space-y-2">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  file.status === 'error' ? 'bg-destructive/10' :
                  file.status === 'completed' ? 'bg-green-500/10' :
                  file.status === 'processing' ? 'bg-yellow-500/10' :
                  'bg-primary/10'
                }`}>
                  {file.status === 'error' ? (
                    <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : file.status === 'completed' ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : file.status === 'processing' ? (
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  
                  {file.status === 'error' ? (
                    <div className="text-xs text-destructive mt-1">
                      Error: {file.error}
                    </div>
                  ) : file.status === 'completed' ? (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Guardado correctamente en el RAG {file.processedChunks && file.totalChunks ? 
                        `(${file.processedChunks} fragmentos)` : 
                        ''
                      }
                    </div>
                  ) : file.status === 'processing' ? (
                    <div className="text-xs text-yellow-600 mt-1">
                      Procesando con IA...
                    </div>
                  ) : (
                    <>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {file.progress}%
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div 
        className="bg-transparent"
      >
        <div className="pb-2 px-4 flex justify-center">
          <div className="w-full max-w-4xl mx-auto">
            {/* All buttons inside the input area */}
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 backdrop-blur-xl shadow-lg rounded-3xl border border-purple-500/20">
              {/* Toggle buttons visibility - outside form but inside input container */}
              <button
                onClick={() => setShowButtons(!showButtons)}
                className="w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all duration-200 flex items-center justify-center"
                title={showButtons ? "Ocultar botones" : "Mostrar botones"}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showButtons ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>

              {/* Buttons grid - 2 rows, 2 columns */}
              {showButtons && (
                <div className="flex flex-col gap-1">
                  {/* Row 1: New Chat, History */}
                  <div className="flex gap-1">
                    <button
                      onClick={handleNewChat}
                      className="w-8 h-8 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg"
                      title="Nuevo Chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-8 h-8 bg-secondary text-secondary-foreground rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg"
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
                              {loadingChats ? (
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
                  
                  {/* Row 2: Files, Calendar */}
                  <div className="flex gap-1">
                    {/* File upload button */}
                    <button
                      type="button"
                      onClick={handleFileButtonClick}
                      disabled={loading || disabled}
                      className="
                        w-8 h-8 text-muted-foreground hover:text-foreground
                        hover:bg-muted rounded-xl
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                        flex items-center justify-center
                        shadow-lg
                      "
                      title="Subir archivos"
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
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                    </button>
                    
                    {/* Calendar button with visual bar when in dashboard */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleCalendarClick}
                        disabled={loading || disabled}
                        className="
                          w-8 h-8 text-muted-foreground hover:text-foreground
                          hover:bg-muted rounded-xl
                          disabled:opacity-50 disabled:cursor-not-allowed
                          transition-all duration-200
                          flex items-center justify-center
                          shadow-lg
                        "
                        title="Ir al calendario"
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      
                      {/* Visual bar when in dashboard */}
                      {window.location.pathname.startsWith('/dashboard') && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-primary rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                {/* Textarea container */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    placeholder={placeholder}
                    disabled={loading || disabled}
                    className="
                      w-full min-h-[52px] max-h-[120px] px-4 py-4
                      bg-transparent border-none
                      resize-none overflow-y-auto
                      placeholder:text-muted-foreground
                      focus:outline-none
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                      text-sm
                    "
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      lineHeight: '1.5'
                    }}
                    rows={2}
                  />

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    disabled={loading || disabled}
                  />
                </div>
                
                {/* Send button */}
                <button
                  type="submit"
                  disabled={!message.trim() || loading || disabled}
                  className="
                    w-10 h-10 bg-primary text-primary-foreground rounded-2xl
                    hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                    transition-all duration-200
                    flex items-center justify-center
                    shadow-sm
                  "
                  title="Enviar mensaje (Enter)"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
