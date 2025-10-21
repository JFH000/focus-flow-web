'use client'

import { useFileUpload } from '@/hooks/useFileUpload'
import { useRef, useState } from 'react'

interface FileUploadProps {
  chatId: string
  onFileUploaded?: (file: { id: string; name: string; path: string; size: number; type: string }) => void
  disabled?: boolean
}

export default function FileUpload({ chatId, onFileUploaded, disabled = false }: FileUploadProps) {
  const { uploading, progress, error, uploadedFiles, uploadFile, removeFile } = useFileUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      try {
        const uploadedFile = await uploadFile(file, chatId)
        onFileUploaded?.(uploadedFile)
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('image')) return '🖼️'
    if (type.includes('text')) return '📝'
    if (type.includes('word') || type.includes('document')) return '📄'
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
    if (type.includes('powerpoint') || type.includes('presentation')) return '📈'
    return '📎'
  }

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center transition-colors
          ${dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-2">
          <div className="text-2xl">📎</div>
          <div className="text-sm font-medium">
            {uploading ? 'Subiendo archivos...' : 'Arrastra archivos aquí o haz clic para seleccionar'}
          </div>
          <div className="text-xs text-muted-foreground">
            PDF, DOC, XLS, PPT, imágenes (máx. 10MB)
          </div>
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {progress}% completado
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Archivos subidos ({uploadedFiles.length})
          </div>
          <div className="space-y-1">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-lg">{getFileIcon(file.type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Eliminar archivo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
