"use client"

import { useCalendars } from "@/hooks/useCalendars"
import type { Calendar } from "@/types/database"
import { useState, useEffect } from "react"

interface CalendarSelectorProps {
  onCalendarToggle?: (calendarId: string, isVisible: boolean) => void
  onCreateCalendar?: () => void
  onCalendarChange?: () => void
  onRefreshEvents?: () => void
}

export default function CalendarSelector({ onCalendarToggle, onCreateCalendar, onCalendarChange, onRefreshEvents }: CalendarSelectorProps) {
  const { calendars, loading, toggleCalendarVisibility, setPrimaryCalendar, toggleCalendarFavorite, deleteCalendar, refreshCalendars } = useCalendars()
  const [isOpen, setIsOpen] = useState(false)
  const [calendarToDelete, setCalendarToDelete] = useState<Calendar | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Notificar cambios en calendarios
  useEffect(() => {
    onCalendarChange?.()
  }, [calendars.length, onCalendarChange])

  const handleToggleVisibility = async (calendar: Calendar) => {
    try {
      console.log(`🔄 Toggle visibility: ${calendar.name} → ${!calendar.is_visible}`)
      await toggleCalendarVisibility(calendar.id, !calendar.is_visible)
      onCalendarToggle?.(calendar.id, !calendar.is_visible)
      
      // Refrescar eventos inmediatamente
      console.log('📡 Refrescando eventos después de cambio de visibilidad...')
      onRefreshEvents?.()
    } catch (error) {
      console.error("Error toggling calendar visibility:", error)
    }
  }

  const handleSetPrimary = async (calendarId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await setPrimaryCalendar(calendarId)
    } catch (error) {
      console.error("Error setting primary calendar:", error)
    }
  }

  const handleToggleFavorite = async (calendar: Calendar, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await toggleCalendarFavorite(calendar.id, !calendar.is_favorite)
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const handleDeleteClick = (calendar: Calendar, e: React.MouseEvent) => {
    e.stopPropagation()
    setCalendarToDelete(calendar)
  }

  const handleConfirmDelete = async () => {
    if (!calendarToDelete) return
    
    setIsDeleting(true)
    try {
      await deleteCalendar(calendarToDelete.id)
      setCalendarToDelete(null)
    } catch (error) {
      console.error("Error deleting calendar:", error)
      alert(error instanceof Error ? error.message : "Error al eliminar calendario")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setCalendarToDelete(null)
  }

  const visibleCount = calendars.filter((c) => c.is_visible).length

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative">
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors"
        title="Seleccionar calendarios"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm font-medium">
          Calendarios ({visibleCount}/{calendars.length})
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Panel de calendarios */}
          <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-sm">Mis Calendarios</h3>
              <p className="text-xs text-muted-foreground mt-1">Selecciona qué calendarios mostrar</p>
            </div>

            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Cargando calendarios...
              </div>
            )}

            {!loading && calendars.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No tienes calendarios aún
              </div>
            )}

            {!loading && calendars.length > 0 && (
              <div className="py-2">
                {calendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className="group px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleToggleVisibility(calendar)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox de visibilidad */}
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={calendar.is_visible}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>

                      {/* Indicador de color del calendario */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: calendar.color || "#3b82f6" }}
                      />

                      {/* Información del calendario */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{calendar.name}</span>
                          
                          {/* Badges */}
                          {calendar.is_primary && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                              Principal
                            </span>
                          )}
                          
                          {calendar.external_provider && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                              {calendar.external_provider === "google" && "Google"}
                              {calendar.external_provider === "ics" && (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  ICS
                                </>
                              )}
                              {calendar.external_provider !== "google" && calendar.external_provider !== "ics" && calendar.external_provider}
                            </span>
                          )}
                        </div>
                        
                        {/* Email de la cuenta o URL ICS */}
                        {calendar.external_provider_email && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {calendar.external_provider_email}
                          </div>
                        )}
                        {calendar.ics_url && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1" title={calendar.ics_url}>
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span className="truncate">{new URL(calendar.ics_url).hostname}</span>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Botón de favorito */}
                        <button
                          onClick={(e) => handleToggleFavorite(calendar, e)}
                          className="p-1 rounded hover:bg-background transition-colors"
                          title={calendar.is_favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                        >
                          <svg
                            className="w-4 h-4"
                            fill={calendar.is_favorite ? "currentColor" : "none"}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        </button>

                        {/* Botón de hacer principal */}
                        {!calendar.is_primary && (
                          <button
                            onClick={(e) => handleSetPrimary(calendar.id, e)}
                            className="p-1 rounded hover:bg-background transition-colors"
                            title="Hacer calendario principal"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Botón de eliminar */}
                        <button
                          onClick={(e) => handleDeleteClick(calendar, e)}
                          className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                          title="Eliminar calendario"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botón para crear nuevo calendario */}
            <div className="p-2 border-t border-border">
              <button
                onClick={() => {
                  setIsOpen(false)
                  onCreateCalendar?.()
                }}
                className="w-full px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear calendario
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmación de eliminación */}
      {calendarToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">¿Eliminar calendario?</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Estás a punto de eliminar el calendario <strong>"{calendarToDelete.name}"</strong>.
                </p>
                <p className="text-sm text-red-600 font-medium">
                  ⚠️ Todos los eventos de este calendario también serán eliminados. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

