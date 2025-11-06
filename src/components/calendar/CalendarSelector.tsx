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
      {/* Botón principal - Responsive */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors active:scale-95"
        title="Seleccionar calendarios"
      >
        <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {/* Texto completo en desktop, corto en móvil */}
        <span className="text-sm font-medium hidden sm:inline">
          Calendarios ({visibleCount}/{calendars.length})
        </span>
        <span className="text-sm font-medium sm:hidden">
          {visibleCount}/{calendars.length}
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

      {/* Dropdown/Modal */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Panel dropdown - Mismo para móvil y desktop, solo cambia el ancho */}
          <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-8px)] sm:w-96 md:w-80 mx-1 sm:mx-0 bg-background border border-border rounded-lg shadow-xl z-50 max-h-[70vh] md:max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-3 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Mis Calendarios</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{visibleCount} de {calendars.length} visibles</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden p-1 rounded-md hover:bg-muted transition-colors active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
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
                <div className="p-2">
                {calendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className="group px-3 py-2.5 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer rounded-md"
                    onClick={() => handleToggleVisibility(calendar)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={calendar.is_visible}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                      />

                      {/* Color badge */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: calendar.color || "#3b82f6" }}
                      />

                      {/* Información del calendario */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium truncate">{calendar.name}</span>
                          
                          {/* Badges */}
                          {calendar.is_primary && (
                            <span className="px-1.5 py-0.5 text-[9px] font-medium bg-primary/10 text-primary rounded">
                              Principal
                            </span>
                          )}
                          
                          {calendar.external_provider === "google" && (
                            <span className="px-1.5 py-0.5 text-[9px] font-medium bg-blue-100 text-blue-700 rounded">
                              Google
                            </span>
                          )}
                          
                          {calendar.external_provider === "ics" && (
                            <span className="px-1.5 py-0.5 text-[9px] font-medium bg-cyan-100 text-cyan-700 rounded">
                              ICS
                            </span>
                          )}
                        </div>
                        
                        {/* Info secundaria - Solo desktop */}
                        {calendar.external_provider_email && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate hidden md:block">
                            {calendar.external_provider_email}
                          </div>
                        )}
                        {calendar.ics_url && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate hidden md:block" title={calendar.ics_url}>
                            🔗 {new URL(calendar.ics_url).hostname}
                          </div>
                        )}
                      </div>

                      {/* Botones de acción - Siempre visible en móvil */}
                      <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleToggleFavorite(calendar, e)}
                          className="p-1.5 rounded hover:bg-background active:bg-background/80 transition-colors"
                          title={calendar.is_favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                        >
                          <svg className="w-4 h-4" fill={calendar.is_favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>

                        {!calendar.is_primary && (
                          <button
                            onClick={(e) => handleSetPrimary(calendar.id, e)}
                            className="p-1.5 rounded hover:bg-background active:bg-background/80 transition-colors"
                            title="Hacer calendario principal"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDeleteClick(calendar, e)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-600 active:bg-red-200 transition-colors"
                          title="Eliminar calendario"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>

            {/* Botón crear */}
            <div className="flex-shrink-0 p-2 border-t border-border bg-background">
              <button
                onClick={() => {
                  setIsOpen(false)
                  onCreateCalendar?.()
                }}
                className="w-full px-3 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Calendario
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

