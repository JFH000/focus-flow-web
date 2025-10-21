import { createClient } from '@/lib/supabase/client'

/**
 * Genera una URL firmada para acceder a un archivo privado
 * @param filePath - Ruta del archivo en el bucket
 * @param expiresIn - Tiempo de expiración en segundos (default: 1 hora)
 * @returns URL firmada o null si hay error
 */
export async function getSignedFileUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.storage
      .from('chat-files')
      .createSignedUrl(filePath, expiresIn)
    
    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }
    
    return data.signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    return null
  }
}

/**
 * Genera múltiples URLs firmadas para una lista de archivos
 * @param filePaths - Array de rutas de archivos
 * @param expiresIn - Tiempo de expiración en segundos
 * @returns Array de URLs firmadas
 */
export async function getMultipleSignedUrls(filePaths: string[], expiresIn: number = 3600): Promise<Array<{ path: string; url: string | null }>> {
  const results = await Promise.all(
    filePaths.map(async (path) => ({
      path,
      url: await getSignedFileUrl(path, expiresIn)
    }))
  )
  
  return results
}

/**
 * Verifica si un archivo existe en el bucket
 * @param filePath - Ruta del archivo
 * @returns true si existe, false si no
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.storage
      .from('chat-files')
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      })
    
    if (error) {
      console.error('Error checking file existence:', error)
      return false
    }
    
    return data && data.length > 0
  } catch (error) {
    console.error('Error checking file existence:', error)
    return false
  }
}

