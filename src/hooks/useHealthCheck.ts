import { useCallback, useEffect, useState } from 'react'

interface HealthCheckState {
  isHealthy: boolean
  isChecking: boolean
  error: string | null
  retryCount: number
}

export function useHealthCheck() {
  const [state, setState] = useState<HealthCheckState>({
    isHealthy: false,
    isChecking: true,
    error: null,
    retryCount: 0
  })

  const healthCheckUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_HEALTH_HOST

  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!healthCheckUrl) {
      setState(prev => ({
        ...prev,
        isHealthy: false,
        isChecking: false,
        error: 'Health check URL not configured'
      }))
      return false
    }

    try {
      setState(prev => ({
        ...prev,
        isChecking: true,
        error: null
      }))

      // Crear un AbortController para timeout de 3 segundos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setState(prev => ({
          ...prev,
          isHealthy: true,
          isChecking: false,
          error: null,
          retryCount: 0
        }))
        return true
      } else {
        throw new Error(`Health check failed: ${response.status}`)
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError'
      const errorMessage = isTimeout 
        ? 'Timeout: El contenedor no responde en 3 segundos'
        : error instanceof Error 
          ? error.message 
          : 'Error desconocido en health check'

      setState(prev => ({
        ...prev,
        isHealthy: false,
        isChecking: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }))
      return false
    }
  }, [healthCheckUrl])

  const startHealthCheck = useCallback(() => {
    setState(prev => ({
      ...prev,
      isChecking: true,
      error: null
    }))
  }, [])

  const stopHealthCheck = useCallback(() => {
    setState(prev => ({
      ...prev,
      isChecking: false
    }))
  }, [])

  // Auto-retry cada 2 segundos si no está healthy
  useEffect(() => {
    if (!state.isHealthy && !state.isChecking) {
      const interval = setInterval(() => {
        checkHealth()
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [state.isHealthy, state.isChecking, checkHealth])

  // Verificación inicial al montar el componente
  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  return {
    ...state,
    checkHealth,
    startHealthCheck,
    stopHealthCheck
  }
}
