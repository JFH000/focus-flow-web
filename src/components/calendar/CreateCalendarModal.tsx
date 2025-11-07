"use client"

import { useCalendars } from "@/hooks/useCalendars"
import type React from "react"
import { useState, useEffect, useCallback } from "react"

interface CreateCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const CALENDAR_COLORS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Verde", value: "#10b981" },
  { name: "Amarillo", value: "#f59e0b" },
  { name: "Púrpura", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Cian", value: "#06b6d4" },
  { name: "Lima", value: "#84cc16" },
  { name: "Naranja", value: "#f97316" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Gris", value: "#6b7280" },
  { name: "Teal", value: "#14b8a6" },
]

export default function CreateCalendarModal({ isOpen, onClose, onSuccess }: CreateCalendarModalProps) {
  const { createCalendar, loading } = useCalendars()
  const [formData, setFormData] = useState({
    name: "",
    color: CALENDAR_COLORS[0].value,
    is_primary: false,
    is_favorite: false,
  })
  const [error, setError] = useState<string | null>(null)

  const resetAndClose = useCallback(() => {
    setFormData({ name: '', color: CALENDAR_COLORS[0].value, is_primary: false, is_favorite: false })
    setError(null)
    onClose()
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError("El nombre del calendario es obligatorio")
      return
    }

    try {
      await createCalendar({
        name: formData.name.trim(),
        color: formData.color,
        is_primary: formData.is_primary,
        is_favorite: formData.is_favorite,
        is_visible: true,
        external_provider: null,
        external_calendar_id: null,
        external_sync_token: null,
        metadata: {},
      })

      // Resetear formulario
      setFormData({
        name: "",
        color: CALENDAR_COLORS[0].value,
        is_primary: false,
        is_favorite: false,
      })

      onSuccess?.()
      resetAndClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear calendario"
      setError(errorMessage)
    }
  }

  // Cerrar con Escape (solo si no está cargando)
  useEffect(() => {
    if (!isOpen || loading) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetAndClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, loading, resetAndClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      resetAndClose()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Crear Calendario</h2>
            <button
              onClick={resetAndClose}
              disabled={loading}
              className="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre del calendario */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre del calendario <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej: Trabajo, Personal, Estudio..."
                required
                disabled={loading}
              />
            </div>

            {/* Selector de color */}
            <div>
              <label className="block text-sm font-medium mb-2">Color del calendario</label>
              <div className="grid grid-cols-6 gap-2">
                {CALENDAR_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color: color.value }))}
                    className={`w-10 h-10 rounded-md border-2 transition-all hover:scale-110 ${
                      formData.color === color.value ? "border-foreground scale-110 shadow-md" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    disabled={loading}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Color seleccionado: <span className="font-medium">{CALENDAR_COLORS.find((c) => c.value === formData.color)?.name}</span>
              </p>
            </div>

            {/* Opciones adicionales */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_primary: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={loading}
                />
                <div>
                  <span className="text-sm font-medium">Calendario principal</span>
                  <p className="text-xs text-muted-foreground">Los eventos se crearán aquí por defecto</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_favorite}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_favorite: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={loading}
                />
                <div>
                  <span className="text-sm font-medium">Añadir a favoritos</span>
                  <p className="text-xs text-muted-foreground">Aparecerá destacado en tu lista</p>
                </div>
              </label>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">Calendario de la aplicación</p>
                  <p>Este calendario se guardará solo en Focus Flow. Si deseas sincronizar con Google Calendar, conéctalo desde la configuración.</p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Calendario
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

