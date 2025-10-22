'use client'

import { useHealthCheck } from '@/hooks/useHealthCheck'
import { useEffect, useState } from 'react'

interface HealthStatusProps {
  className?: string
}

export default function HealthStatus({ className = '' }: HealthStatusProps) {
  const { isHealthy, isChecking, error, retryCount } = useHealthCheck()
  const [showStatus, setShowStatus] = useState(false)

  // Mostrar el estado solo cuando no está healthy o está checking
  useEffect(() => {
    setShowStatus(!isHealthy || isChecking)
  }, [isHealthy, isChecking])

  // No mostrar nada si está healthy y no está checking
  if (!showStatus) {
    return null
  }

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      )
    }
    
    if (isHealthy) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    
    return (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }

  const getStatusText = () => {
    if (isChecking) {
      return 'Encendiendo contenedor...'
    }
    
    if (isHealthy) {
      return 'Contenedor listo'
    }
    
    return 'Contenedor no disponible'
  }

  const getStatusColor = () => {
    if (isChecking) {
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
    }
    
    if (isHealthy) {
      return 'bg-green-500/10 text-green-700 border-green-500/20'
    }
    
    return 'bg-red-500/10 text-red-700 border-red-500/20'
  }

  return (
    <div className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm
        ${getStatusColor()}
        animate-message-slide-in
      `}>
        {getStatusIcon()}
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
          {error && (
            <span className="text-xs opacity-80">
              {error}
            </span>
          )}
          {retryCount > 0 && (
            <span className="text-xs opacity-60">
              Reintento #{retryCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
