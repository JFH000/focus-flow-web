import { createClient } from '@/lib/supabase/client'
import { useCallback, useState } from 'react'

interface FileUploadState {
  uploading: boolean
  progress: number
  error: string | null
  uploadedFiles: Array<{
    id: string
    name: string
    path: string
    size: number
    type: string
  }>
}

export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({
    uploading: false,
    progress: 0,
    error: null,
    uploadedFiles: []
  })

  const uploadFile = useCallback(async (file: File, chatId: string) => {
    const supabase = createClient()
    
    setState(prev => ({
      ...prev,
      uploading: true,
      progress: 0,
      error: null
    }))

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Usuario no autenticado. Por favor, inicia sesión.')
      }

      // Generate unique file path with user ID to ensure RLS compliance
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `chat-${chatId}/${user.id}/${fileName}`

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        throw new Error(`Error uploading file: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath)

      // Call n8n webhook to add PDF to RAG
      const ragWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_ADD_PDF_TO_RAG_HOST
      if (ragWebhookUrl) {
        try {
          await fetch(ragWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_id: data.path,
              file_path: urlData.publicUrl
            })
          })
        } catch (ragError) {
          console.warn('Error calling RAG webhook:', ragError)
          // Don't fail the upload if RAG webhook fails
        }
      }

      const uploadedFile = {
        id: data.path,
        name: file.name,
        path: urlData.publicUrl,
        size: file.size,
        type: file.type
      }

      setState(prev => ({
        ...prev,
        uploading: false,
        progress: 100,
        uploadedFiles: [...prev.uploadedFiles, uploadedFile]
      }))

      return uploadedFile
    } catch (error) {
      console.error('Error uploading file:', error)
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      throw error
    }
  }, [])

  const removeFile = useCallback((fileId: string) => {
    setState(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(file => file.id !== fileId)
    }))
  }, [])

  const clearFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      uploadedFiles: []
    }))
  }, [])

  return {
    ...state,
    uploadFile,
    removeFile,
    clearFiles
  }
}
