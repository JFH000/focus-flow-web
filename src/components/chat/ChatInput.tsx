'use client'

import { useChat } from '@/contexts/ChatContext'
import { getSignedFileUrl } from '@/utils/fileAccess'
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
  const { sendMessage, loading, currentChat } = useChat()
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
        <div className="pb-1 px-4 flex justify-center">
          <div className="w-full max-w-4xl mx-auto">
            {/* All buttons inside the input area */}
            <div className="flex items-center gap-2 py-1.5 px-3 sm:py-2 sm:px-5 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 backdrop-blur-xl shadow-lg rounded-2xl sm:rounded-[2.25rem] border border-purple-500/20">
              {/* File upload button - Always visible */}
              <button
                type="button"
                onClick={handleFileButtonClick}
                disabled={loading || disabled}
                className="
                  w-9 h-9 sm:w-9 sm:h-9 text-muted-foreground hover:text-foreground
                  hover:bg-muted/60 rounded-xl sm:rounded-2xl
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  flex items-center justify-center
                  shadow-sm active:scale-95
                "
                title="Subir archivos"
              >
                <svg
                  className="w-5 h-5 sm:w-4 sm:h-4"
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
                      w-full min-h-[40px] sm:min-h-[44px] max-h-[120px] px-3 sm:px-4
                      bg-transparent border-none
                      resize-none overflow-y-auto
                      placeholder:text-muted-foreground
                      focus:outline-none
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                      text-base sm:text-lg
                      leading-[1.5]
                    "
                    style={{
                      paddingTop: '0.5rem',
                      paddingBottom: '0.5rem',
                      verticalAlign: 'middle'
                    }}
                    rows={1}
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
                    w-11 h-11 sm:w-11 sm:h-11 bg-primary text-primary-foreground rounded-2xl sm:rounded-[1.5rem]
                    hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                    transition-all duration-200
                    flex items-center justify-center
                    shadow-md active:scale-95
                  "
                  title="Enviar mensaje (Enter)"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
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
