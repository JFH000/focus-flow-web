"use client"

import type React from "react"
import { useCalendars } from "@/hooks/useCalendars"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { createClient } from "@/lib/supabase/client"
import type { CalendarEvent as DBCalendarEvent } from "@/types/database"
import { addDays, endOfWeek, format, isSameDay, startOfDay, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import AppLayout from "../AppLayout"
import ProtectedRoute from "../ProtectedRoute"
import CalendarSelector from "./CalendarSelector"
import CreateCalendarModal from "./CreateCalendarModal"
import SubscribeICSModal from "./SubscribeICSModal"

// Colores de eventos
const EVENT_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
]

// Interface extendida para eventos con información del calendario
interface CalendarEventExtended extends DBCalendarEvent {
  calendar?: {
    id: string
    name: string
    color: string | null
    external_provider: string | null
  }
}

// Función para obtener color del evento (prioridad: metadata > calendario > default)
function getEventColor(event: CalendarEventExtended): string {
  if (event.metadata?.color_hex) return event.metadata.color_hex
  if (event.calendar?.color) return event.calendar.color
  return "#3b82f6"
}

interface CalendarPageProps {
  isDashboard?: boolean
}

function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const end = endOfWeek(date, { weekStartsOn: 0 })
  return { start, end }
}

function minutesSinceStartOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function computeOverlaps(dayEvents: CalendarEventExtended[]) {
  const columns: CalendarEventExtended[][] = []

  for (const event of dayEvents) {
    let placed = false
    const eventStart = new Date(event.start_time)
    const eventEnd = new Date(event.end_time)

    for (const col of columns) {
      const hasOverlap = col.some((existingEvent) => {
        const existingStart = new Date(existingEvent.start_time)
        const existingEnd = new Date(existingEvent.end_time)
        return !(eventEnd <= existingStart || eventStart >= existingEnd)
      })

      if (!hasOverlap) {
        col.push(event)
        placed = true
        break
      }
    }

    if (!placed) {
      columns.push([event])
    }
  }

  const positions = new Map<string, { column: number; span: number; totalColumns: number }>()
  const total = Math.max(columns.length, 1)

  columns.forEach((col, colIndex) => {
    col.forEach((ev) => {
      const eventStart = new Date(ev.start_time)
      const eventEnd = new Date(ev.end_time)

      let maxSpan = 1
      for (let i = colIndex + 1; i < columns.length; i++) {
        const canSpan = !columns[i].some((otherEvent) => {
          const otherStart = new Date(otherEvent.start_time)
          const otherEnd = new Date(otherEvent.end_time)
          return !(eventEnd <= otherStart || eventStart >= otherEnd)
        })
        if (canSpan) {
          maxSpan++
        } else {
          break
        }
      }

      positions.set(ev.id, {
        column: colIndex,
        span: Math.min(maxSpan, 2),
        totalColumns: total,
      })
    })
  })

  return positions
}

// Modal de detalles del evento
function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
}: {
  isOpen: boolean
  onClose: () => void
  event: CalendarEventExtended | null
  onEdit: (event: CalendarEventExtended) => void
  onDelete: (eventId: string) => void
}) {
  // Cerrar con Escape - ANTES del return condicional
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || !event) return null

  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4" 
      onClick={handleBackdropClick}
    >
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 md:p-6">
          <div className="h-2 w-full rounded-t-lg -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4" style={{ background: getEventColor(event) }} />
          
          <h2 className="text-xl md:text-2xl font-bold mb-4">{event.title}</h2>

          <div className="space-y-3">
            {/* Fecha y hora */}
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-muted-foreground mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-sm font-medium">
                  {format(startDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {event.is_all_day ? "Todo el día" : `${format(startDate, "h:mm a", { locale: es })} – ${format(endDate, "h:mm a", { locale: es })}`}
                </div>
              </div>
            </div>

            {/* Calendario */}
            {event.calendar && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-muted-foreground mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-sm">
                  {event.calendar.name}
                  {event.calendar.external_provider && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {event.calendar.external_provider}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Ubicación */}
            {event.location && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-muted-foreground mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="text-sm">{event.location}</div>
              </div>
            )}

            {/* Descripción */}
            {event.description && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-muted-foreground mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <div className="text-sm text-muted-foreground">{event.description}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-6 mt-6 border-t border-border">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">
              Cerrar
            </button>
            <button
              onClick={() => {
                if (confirm("¿Estás seguro de que quieres eliminar este evento?")) {
                  onDelete(event.id)
                  onClose()
                }
              }}
              className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Modal para crear/editar eventos
function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  selectedTime,
  selectedCalendarId,
  editingEvent,
  calendars,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (calendarId: string, eventData: any) => Promise<void>
  selectedDate?: Date
  selectedTime?: string
  selectedCalendarId?: string
  editingEvent?: CalendarEventExtended | null
  calendars: any[]
}) {
  const [formData, setFormData] = useState({
    calendarId: selectedCalendarId || "",
    title: "",
    description: "",
    location: "",
    startDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
    startTime: selectedTime || "09:00",
    endTime: selectedTime ? format(new Date(`2000-01-01T${selectedTime}`).getTime() + 60 * 60 * 1000, "HH:mm") : "10:00",
    allDay: false,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // useEffect para poblar el formulario
  useEffect(() => {
    if (editingEvent) {
      setFormData({
        calendarId: editingEvent.calendar_id,
        title: editingEvent.title,
        description: editingEvent.description || "",
        location: editingEvent.location || "",
        startDate: format(new Date(editingEvent.start_time), "yyyy-MM-dd"),
        startTime: format(new Date(editingEvent.start_time), "HH:mm"),
        endTime: format(new Date(editingEvent.end_time), "HH:mm"),
        allDay: editingEvent.is_all_day,
      })
    } else if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        calendarId: selectedCalendarId || (calendars.find(c => c.is_primary)?.id || calendars[0]?.id || ""),
        startDate: format(selectedDate, "yyyy-MM-dd"),
      }))
    }
  }, [selectedDate, selectedTime, editingEvent, selectedCalendarId, calendars])

  // Cerrar con Escape - DEBE estar ANTES del return condicional
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      setError("El título del evento es obligatorio")
      return
    }

    if (!formData.calendarId) {
      setError("Debes seleccionar un calendario")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const startDate = new Date(`${formData.startDate}T${formData.startTime}:00`)
      const endDate = new Date(`${formData.startDate}T${formData.endTime}:00`)

      const startDateTime = formData.allDay ? `${formData.startDate}T00:00:00.000Z` : startDate.toISOString()
      const endDateTime = formData.allDay ? `${formData.startDate}T23:59:59.999Z` : endDate.toISOString()

      await onSave(formData.calendarId, {
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location || undefined,
        start: formData.allDay ? { date: formData.startDate } : { dateTime: startDateTime },
        end: formData.allDay ? { date: formData.startDate } : { dateTime: endDateTime },
        all_day: formData.allDay,
      })

      onClose()
      setFormData({
        calendarId: "",
        title: "",
        description: "",
        location: "",
        startDate: "",
        startTime: "09:00",
        endTime: "10:00",
        allDay: false,
      })
    } catch (error) {
      console.error("Error creating event:", error)
      setError(error instanceof Error ? error.message : "Error al crear el evento")
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">{editingEvent ? "Editar Evento" : "Crear Evento"}</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de calendario */}
            <div>
              <label className="block text-sm font-medium mb-1">Calendario *</label>
              <select
                value={formData.calendarId}
                onChange={(e) => setFormData((prev) => ({ ...prev, calendarId: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={loading || !!editingEvent}
              >
                <option value="">Selecciona un calendario</option>
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name} {cal.is_primary && "(Principal)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nombre del evento"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Descripción del evento"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ubicación</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ubicación del evento"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => setFormData((prev) => ({ ...prev, allDay: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="allDay" className="text-sm font-medium">Todo el día</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {!formData.allDay && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hora inicio</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hora fin</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (editingEvent ? "Guardando..." : "Creando...") : (editingEvent ? "Guardar Cambios" : "Crear Evento")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPageV2({ isDashboard = false }: CalendarPageProps = {}) {
  const [anchor, setAnchor] = useState(startOfDay(new Date()))
  const { start, end } = useMemo(() => getWeekRange(anchor), [anchor])
  
  // Hooks
  const { calendars, visibleCalendars, refreshCalendars } = useCalendars()
  const { 
    syncGoogleCalendars,
    syncCalendarEvents,
    createEvent,
    deleteEvent,
    loading: googleLoading,
    error: googleError 
  } = useGoogleCalendar()
  const { session, connectGoogleCalendar, loading: authLoading } = useAuth()

  // Estado local
  const [events, setEvents] = useState<CalendarEventExtended[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateCalendarModal, setShowCreateCalendarModal] = useState(false)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [showSubscribeICSModal, setShowSubscribeICSModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventExtended | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEventExtended | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [hasCalendarAccess, setHasCalendarAccess] = useState(false)
  const [showSyncMenu, setShowSyncMenu] = useState(false)

  // Verificar acceso a Google Calendar (no bloqueante)
  useEffect(() => {
    const checkCalendarAccess = async () => {
      if (!session?.provider_token) {
        setHasCalendarAccess(false)
        return
      }

      try {
        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            "Content-Type": "application/json",
          },
        })

        const hasAccess = response.ok
        setHasCalendarAccess(hasAccess)
        
        if (!hasAccess) {
          console.log("ℹ️ No tienes acceso a Google Calendar API, pero puedes usar calendarios locales")
        }
      } catch (error) {
        console.log("ℹ️ Google Calendar no disponible, usando solo calendarios locales")
        setHasCalendarAccess(false)
      }
    }

    checkCalendarAccess()
  }, [session])

  // Obtener eventos de los calendarios visibles
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setEvents([])
        setLoading(false)
        return
      }

      // Obtener calendarios visibles del usuario
      const { data: userCalendars } = await supabase
        .from("calendar_calendars")
        .select("id")
        .eq("owner_id", user.id)
        .eq("is_visible", true)

      if (!userCalendars || userCalendars.length === 0) {
        setEvents([])
        setLoading(false)
        return
      }

      const visibleCalendarIds = userCalendars.map((c) => c.id)

      console.log("📅 Consultando eventos...", {
        userCalendars: userCalendars.length,
        visibleCalendarIds,
        start: start.toISOString(),
        end: end.toISOString()
      })

      const { data, error, count } = await supabase
        .from("calendar_events")
        .select(`
          *,
          calendar:calendar_id (
            id,
            name,
            color,
            external_provider
          )
        `, { count: 'exact' })
        .in("calendar_id", visibleCalendarIds)
        .or(`and(start_time.lte.${end.toISOString()},end_time.gte.${start.toISOString()}),and(start_time.gte.${start.toISOString()},start_time.lte.${end.toISOString()})`)
        .order("start_time", { ascending: true })

      console.log(`📊 Query ejecutada. Total encontrado: ${count || 0}`)

      if (error) {
        console.error("❌ Error fetching events:", {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log(`✅ Eventos cargados: ${data?.length || 0}`)
      if (data && data.length > 0) {
        console.log("Primer evento:", data[0])
      }
      
      setEvents(data || [])
    } catch (error) {
      console.error("Error in fetchEvents:", error)
    } finally {
      setLoading(false)
    }
  }, [start, end])

  // Crear una key que cambie cuando cambien los calendarios visibles específicos
  const visibleCalendarIds = useMemo(() => {
    const ids = visibleCalendars.map(c => c.id).sort().join(',')
    console.log(`🔑 visibleCalendarIds actualizado: ${ids}`)
    return ids
  }, [visibleCalendars])

  // Cargar eventos cuando cambie la semana o los calendarios visibles
  useEffect(() => {
    console.log("🔄 Cargando eventos por cambio de semana/calendarios...")
    console.log(`   Calendarios visibles (${visibleCalendars.length}):`, visibleCalendars.map(c => c.name))
    fetchEvents()
  }, [start, end, visibleCalendarIds])

  // Cargar eventos al montar el componente
  useEffect(() => {
    console.log("🔄 Cargando eventos iniciales...")
    fetchEvents()
  }, [])

  // Suscripción en tiempo real a cambios en eventos
  useEffect(() => {
    const supabase = createClient()
    
    // Crear canal de suscripción para eventos
    const channel = supabase
      .channel('calendar_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'calendar_events',
        },
        (payload) => {
          console.log('📡 Cambio detectado en eventos:', payload.eventType)
          // Refrescar eventos cuando hay cualquier cambio
          fetchEvents()
        }
      )
      .subscribe()

    // Cleanup: desuscribirse al desmontar
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Función interna para sincronizar eventos de calendarios de Google
  const syncAllCalendarsInternal = useCallback(async (weekStart: Date) => {
    if (!hasCalendarAccess) return
    
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Obtener calendarios de Google del usuario
      const { data: userCalendars } = await supabase
        .from("calendar_calendars")
        .select("id")
        .eq("owner_id", user.id)
        .eq("is_visible", true)
        .eq("external_provider", "google")

      if (!userCalendars || userCalendars.length === 0) {
        console.log("No hay calendarios de Google para sincronizar")
        return
      }

      console.log(`Sincronizando ${userCalendars.length} calendarios de Google...`)

      // Sincronizar eventos de cada calendario
      for (const calendar of userCalendars) {
        await syncCalendarEvents(calendar.id, weekStart)
      }

      console.log("Sincronización completada")
    } catch (err) {
      console.error("Error syncing calendars:", err)
      throw err
    }
  }, [hasCalendarAccess, syncCalendarEvents])

  // Handlers
  const handleSyncGoogleCalendars = useCallback(async () => {
    if (!hasCalendarAccess) {
      setSyncMessage("❌ Necesitas conectar tu Google Calendar primero")
      return
    }

    setSyncMessage("Sincronizando calendarios de Google...")
    try {
      await syncGoogleCalendars()
      await refreshCalendars()
      
      // Después de sincronizar calendarios, sincronizar también los eventos
      setSyncMessage("✅ Calendarios sincronizados. Sincronizando eventos...")
      await syncAllCalendarsInternal(start)
      await fetchEvents()
      
      setSyncMessage("✅ Sincronización completa")
      setTimeout(() => setSyncMessage(null), 3000)
    } catch (error) {
      console.error("Error syncing Google calendars:", error)
      setSyncMessage("❌ Error al sincronizar calendarios")
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }, [hasCalendarAccess, syncGoogleCalendars, refreshCalendars, syncAllCalendarsInternal, start, fetchEvents])

  const handleSyncAllEvents = useCallback(async () => {
    if (!hasCalendarAccess) {
      setSyncMessage("❌ Necesitas conectar tu Google Calendar primero")
      return
    }

    setSyncMessage("🔄 Sincronizando eventos de todos los calendarios...")
    try {
      // Sincronizar con un rango amplio (no solo la semana actual)
      await syncAllCalendarsInternal(new Date()) // Pasamos la fecha actual como referencia
      
      // Esperar un momento para que se inserten los eventos
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Recargar eventos
      await fetchEvents()
      
      setSyncMessage("✅ Eventos sincronizados correctamente")
      setTimeout(() => setSyncMessage(null), 3000)
    } catch (error) {
      console.error("Error syncing events:", error)
      const errorMsg = error instanceof Error ? error.message : "Error desconocido"
      setSyncMessage(`❌ Error: ${errorMsg}`)
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }, [hasCalendarAccess, syncAllCalendarsInternal, fetchEvents])

  const handleCreateEvent = async (calendarId: string, eventData: any) => {
    try {
      await createEvent(calendarId, eventData)
      await fetchEvents()
      setSyncMessage("✅ Evento creado correctamente")
      setTimeout(() => setSyncMessage(null), 3000)
    } catch (error) {
      throw error
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId)
      await fetchEvents()
      setSyncMessage("✅ Evento eliminado correctamente")
      setTimeout(() => setSyncMessage(null), 3000)
    } catch (error) {
      console.error("Error deleting event:", error)
      setSyncMessage("❌ Error al eliminar evento")
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  const handleTimeSlotClick = (date: Date, time: string) => {
    const primaryCalendar = calendars.find(c => c.is_primary)
    setSelectedDate(date)
    setSelectedTime(time)
    setShowCreateEventModal(true)
  }

  // Agrupar eventos por día
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventExtended[]>()
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []))
    
    for (const ev of events) {
      const evStart = new Date(ev.start_time)
      for (const day of days) {
        const same = isSameDay(day, evStart) || (evStart < day && new Date(ev.end_time) > day)
        if (same) {
          const key = format(day, "yyyy-MM-dd")
          map.get(key)!.push(ev)
        }
      }
    }
    
    for (const key of map.keys()) {
      map.get(key)!.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    }
    
    return map
  }, [events, start])

  const isToday = (d: Date) => isSameDay(d, new Date())

  const calendarContent = (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Messages */}
      {syncMessage && (
        <div className="px-3 md:px-6 py-2 bg-primary/10 text-primary text-xs md:text-sm text-center">
          {syncMessage}
        </div>
      )}

      {googleError && (
        <div className="px-3 md:px-6 py-2 bg-red-100 text-red-700 text-xs md:text-sm text-center">
          {googleError}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-3 md:px-6 py-3 md:py-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40 gap-3">
        {/* Navegación */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
            onClick={() => setAnchor(addDays(anchor, -7))}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
            onClick={() => setAnchor(addDays(anchor, 7))}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
            onClick={() => setAnchor(startOfDay(new Date()))}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Título */}
        <h1 className="text-lg font-semibold text-center">
          {format(start, "d 'de' MMM", { locale: es })} – {format(end, "d 'de' MMM, yyyy", { locale: es })}
        </h1>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Botón de refrescar eventos */}
          <button
            onClick={() => fetchEvents()}
            disabled={loading}
            className="p-2 rounded-md border border-border hover:bg-muted transition-colors"
            title="Refrescar eventos desde la BD"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <CalendarSelector 
            onCreateCalendar={() => setShowCreateCalendarModal(true)} 
            onRefreshEvents={fetchEvents}
          />

          {/* Menú de sincronización */}
          <div className="relative">
            <button
              onClick={() => setShowSyncMenu(!showSyncMenu)}
              className="px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden md:inline">Sincronizar</span>
            </button>

            {showSyncMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSyncMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-20">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Proveedores Externos
                    </div>

                    {!hasCalendarAccess ? (
                      <button
                        onClick={() => {
                          setShowSyncMenu(false)
                          connectGoogleCalendar()
                        }}
                        disabled={authLoading}
                        className="w-full px-3 py-2 text-left rounded-md hover:bg-muted transition-colors flex items-center gap-3 disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                          G
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Google Calendar</div>
                          <div className="text-xs text-muted-foreground">
                            {authLoading ? "Conectando..." : "Conectar cuenta"}
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <div className="px-3 py-2 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                            G
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">Google Calendar</div>
                            <div className="text-xs text-green-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              Conectado
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            setShowSyncMenu(false)
                            handleSyncGoogleCalendars()
                          }}
                          disabled={googleLoading}
                          className="w-full px-3 py-2 text-left rounded-md hover:bg-muted transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Sincronizar calendarios</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowSyncMenu(false)
                            handleSyncAllEvents()
                          }}
                          disabled={googleLoading}
                          className="w-full px-3 py-2 text-left rounded-md hover:bg-muted transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Sincronizar eventos</span>
                        </button>
                      </div>
                    )}

                    <div className="my-2 border-t border-border"></div>
                    
                    {/* Suscribirse a calendarios ICS */}
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Calendarios Externos
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowSyncMenu(false)
                        setShowSubscribeICSModal(true)
                      }}
                      className="w-full px-3 py-2 text-left rounded-md hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Calendario ICS</div>
                        <div className="text-xs text-muted-foreground">
                          Suscribirse por URL
                        </div>
                      </div>
                    </button>
                    
                    <div className="my-2 border-t border-border"></div>
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Próximamente: Outlook, Apple Calendar
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info message si no hay calendarios */}
      {calendars.length === 0 && (
        <div className="px-3 md:px-6 py-3 md:py-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium">Empieza creando tu primer calendario</h3>
              <p className="mt-1 text-sm">
                Crea un calendario para organizar tus eventos. Luego podrás sincronizar con Google Calendar si lo deseas.
              </p>
              <button
                onClick={() => setShowCreateCalendarModal(true)}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                Crear mi primer calendario →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista Desktop: Cuadrícula semanal */}
      <div className="hidden md:flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Contenedor único con scroll para alinear header y body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Grid completo (header + body en el mismo contenedor) */}
          <div className="flex flex-col min-w-0">
            {/* Cabecera de días - sticky dentro del scroll */}
            <div className="flex border-b border-border bg-background sticky top-0 z-30">
              <div className="w-[60px] flex-shrink-0 border-r border-border px-3 py-2 text-xs text-muted-foreground font-medium text-center">
                Hora
              </div>
              <div className="flex-1 grid grid-cols-7">
                {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => (
                  <div
                    key={format(d, "yyyy-MM-dd")}
                    className={`px-2 py-2 border-r border-border last:border-r-0 text-center ${isToday(d) ? "bg-primary/10" : ""}`}
                  >
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {format(d, "EEE", { locale: es })}
                    </div>
                    <div className={`text-sm font-semibold ${isToday(d) ? "text-primary" : "text-foreground"}`}>
                      {format(d, "d")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cuadrícula de horas y eventos */}
            <div className="flex">
            {/* Columna de horas */}
            <div className="w-[60px] flex-shrink-0 border-r border-border text-xs text-muted-foreground bg-muted/20">
              {Array.from({ length: 24 }, (_, h) => {
                // Convertir a formato 12 horas
                const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
                const period = h < 12 ? 'AM' : 'PM'
                
                return (
                  <div key={h} className="h-16 border-b border-border/50 px-1 py-1 relative">
                    <div className="text-[9px] font-medium text-center leading-tight">
                      <div>{hour12}</div>
                      <div className="text-[8px] opacity-70">{period}</div>
                    </div>
                    <div className="absolute left-0 right-0 top-1/2 border-t border-border/30" />
                  </div>
                )
              })}
            </div>

              {/* Columnas de días */}
              <div className="flex-1 grid grid-cols-7">
                {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayEvents = (eventsByDay.get(key) || []).filter((ev) => !ev.is_all_day)
            const positions = computeOverlaps(dayEvents)
            const showNow = isToday(day)
            const nowTop = (minutesSinceStartOfDay(new Date()) / (24 * 60)) * 100

            return (
              <div
                key={key}
                className={`relative border-r border-border ${isToday(day) ? "bg-primary/5" : ""}`}
              >
                {/* Slots de hora clicables */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="h-16 border-b border-border/50 relative group">
                    {/* Línea divisoria de media hora */}
                    <div className="absolute left-0 right-0 top-1/2 border-t border-border/20" />
                    
                    {/* Área clickeable */}
                    <div
                      className="absolute inset-0 hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => handleTimeSlotClick(day, `${h.toString().padStart(2, "0")}:00`)}
                      title={`Crear evento el ${format(day, "d 'de' MMM", { locale: es })} a las ${h.toString().padStart(2, "0")}:00`}
                    />
                  </div>
                ))}

                {/* Línea de tiempo actual */}
                {showNow && (
                  <div className="absolute left-0 right-0 z-10" style={{ top: `${nowTop}%` }}>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-red-500 shadow-lg border-2 border-background" />
                      <div className="flex-1 border-t-2 border-red-500 shadow-sm" />
                    </div>
                  </div>
                )}

                {/* Eventos */}
                <div className="absolute inset-0 pointer-events-none">
                  {dayEvents.map((ev) => {
                    const startDate = new Date(ev.start_time)
                    const endDate = new Date(ev.end_time)
                    const top = (minutesSinceStartOfDay(startDate) / (24 * 60)) * 100
                    const durationMinutes = (endDate.getTime() - startDate.getTime()) / (60 * 1000)
                    const heightPercent = ((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) * 100
                    const pos = positions.get(ev.id)!
                    const width = (100 / pos.totalColumns) * pos.span
                    const left = pos.column * (100 / pos.totalColumns)
                    
                    // Altura FIJA basada en duración
                    const height = Math.max(2.5, heightPercent)
                    
                    // Lógica adaptativa según duración
                    const isTiny = durationMinutes <= 15      // Micro evento
                    const isVerySmall = durationMinutes <= 30 // Evento muy pequeño
                    const isSmall = durationMinutes <= 45     // Evento pequeño
                    const isMedium = durationMinutes <= 90    // Evento mediano
                    
                    // Decidir qué mostrar
                    let content
                    if (isTiny) {
                      // Solo hora en formato compacto
                      content = (
                        <div className="h-full flex items-center justify-center px-1">
                          <div className="text-[10px] font-semibold text-foreground truncate text-center">
                            {format(startDate, "h:mm a", { locale: es })}
                          </div>
                        </div>
                      )
                    } else if (isVerySmall) {
                      // Solo título O hora (lo más corto)
                      const showTitle = ev.title.length <= 15
                      content = (
                        <div className="h-full flex items-center px-1.5">
                          <div className="text-[10px] font-semibold text-foreground truncate w-full">
                            {showTitle ? ev.title : `${format(startDate, "h:mm a", { locale: es })}`}
                          </div>
                        </div>
                      )
                    } else if (isSmall) {
                      // Título truncado en 1 línea
                      content = (
                        <div className="h-full flex flex-col justify-center px-1.5 py-1">
                          <div className="text-[11px] font-semibold text-foreground truncate leading-tight">
                            {ev.title}
                          </div>
                        </div>
                      )
                    } else if (isMedium) {
                      // Título + hora
                      content = (
                        <div className="h-full flex flex-col justify-start px-1.5 py-1">
                          <div className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2 mb-0.5">
                            {ev.title}
                          </div>
                          <div className="text-muted-foreground text-[10px] leading-tight truncate">
                            {format(startDate, "h:mm a", { locale: es })}
                          </div>
                        </div>
                      )
                    } else {
                      // Título + hora + ubicación (eventos largos)
                      content = (
                        <div className="h-full flex flex-col justify-start px-1.5 py-1">
                          <div className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2 mb-0.5">
                            {ev.title}
                          </div>
                          <div className="text-muted-foreground text-[10px] leading-tight truncate">
                            {format(startDate, "h:mm a", { locale: es })} - {format(endDate, "h:mm a", { locale: es })}
                          </div>
                          {ev.location && (
                            <div className="text-muted-foreground text-[9px] mt-0.5 truncate">
                              📍 {ev.location}
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={ev.id}
                        className="absolute rounded-md shadow-lg border-l-4 hover:shadow-xl transition-all duration-200 cursor-pointer hover:z-10 pointer-events-auto group overflow-hidden"
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          left: `${left}%`,
                          width: `calc(${width}% - 2px)`,
                          borderLeftColor: getEventColor(ev),
                          backgroundColor: `${getEventColor(ev)}20`,
                        }}
                        onClick={() => setSelectedEvent(ev)}
                        title={`${ev.title}\n${format(startDate, "h:mm a", { locale: es })} – ${format(endDate, "h:mm a", { locale: es })}${ev.location ? `\n📍 ${ev.location}` : ''}`}
                      >
                        {content}
                        
                        {/* Badge de calendario en la esquina */}
                        <div 
                          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: ev.calendar?.color || getEventColor(ev) }}
                          title={ev.calendar?.name}
                        />
                      </div>
                    )
                  })}
                </div>
                </div>
                )
              })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vista Mobile: Lista */}
      <div className="flex flex-col md:hidden flex-1 overflow-y-auto">
        {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((day) => {
          const key = format(day, "yyyy-MM-dd")
          const dayEvents = eventsByDay.get(key) || []
          
          return (
            <div key={key} className="border-b border-border">
              <div className={`sticky top-0 px-4 py-2 ${isToday(day) ? "bg-primary/10" : "bg-muted/50"} border-b border-border flex items-center justify-between z-10`}>
                <div>
                  <div className={`text-sm font-semibold ${isToday(day) ? "text-primary" : ""}`}>
                    {format(day, "EEEE", { locale: es })}
                  </div>
                  <div className="text-xs text-muted-foreground">{format(day, "d 'de' MMM", { locale: es })}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(day)
                    setSelectedTime(format(new Date(), "HH:mm"))
                    setShowCreateEventModal(true)
                  }}
                  className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {dayEvents.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No hay eventos</div>
              ) : (
                <div className="divide-y divide-border">
                  {dayEvents.map((ev) => {
                    const startDate = new Date(ev.start_time)
                    const endDate = new Date(ev.end_time)

                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-1 h-full min-h-[3rem] rounded-full" style={{ backgroundColor: getEventColor(ev) }} />
                          <div className="flex-1">
                          <h3 className="font-semibold text-sm">{ev.title}</h3>
                          <div className="text-xs text-muted-foreground mt-1">
                            {ev.is_all_day ? "Todo el día" : `${format(startDate, "h:mm a", { locale: es })} – ${format(endDate, "h:mm a", { locale: es })}`}
                          </div>
                            {ev.calendar && (
                              <div className="text-xs text-muted-foreground mt-1">{ev.calendar.name}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modales */}
      <EventDetailsModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onEdit={(event) => {
          setEditingEvent(event)
          setShowCreateEventModal(true)
        }}
        onDelete={handleDeleteEvent}
      />

      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => {
          setShowCreateEventModal(false)
          setEditingEvent(null)
        }}
        onSave={handleCreateEvent}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        selectedCalendarId={calendars.find(c => c.is_primary)?.id}
        editingEvent={editingEvent}
        calendars={calendars}
      />

      <CreateCalendarModal
        isOpen={showCreateCalendarModal}
        onClose={() => setShowCreateCalendarModal(false)}
        onSuccess={() => {
          refreshCalendars()
          setSyncMessage("✅ Calendario creado correctamente")
          setTimeout(() => setSyncMessage(null), 3000)
        }}
      />

      <SubscribeICSModal
        isOpen={showSubscribeICSModal}
        onClose={() => setShowSubscribeICSModal(false)}
        onSuccess={() => {
          refreshCalendars()
          fetchEvents()
          setSyncMessage("✅ Calendario ICS suscrito correctamente")
          setTimeout(() => setSyncMessage(null), 3000)
        }}
      />

      {/* Botón flotante para crear evento */}
      <button
        onClick={() => {
          setSelectedDate(new Date())
          setSelectedTime(format(new Date(), "HH:mm"))
          setShowCreateEventModal(true)
        }}
        className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50"
        title="Crear nuevo evento"
      >
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )

  // Si es para el dashboard, retornar solo el contenido
  if (isDashboard) {
    return calendarContent
  }

  // Si es página independiente, envolver con AppLayout y ProtectedRoute
  return (
    <ProtectedRoute>
      <AppLayout>
        {calendarContent}
      </AppLayout>
    </ProtectedRoute>
  )
}

