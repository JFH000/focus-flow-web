"use client"

import type React from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { createClient } from "@/lib/supabase/client"
import { addDays, endOfWeek, format, isSameDay, startOfDay, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { useCallback, useEffect, useMemo, useState } from "react"
import AppLayout from "../AppLayout"

// Función para obtener el color del evento
function getEventColor(event: CalendarEvent): string {
  // Prioridad: color_hex > color > color por defecto
  if (event.color_hex) return event.color_hex
  if (event.color) return event.color

  // Colores vibrantes por defecto basados en el ID del evento
  const colors = [
    "#3b82f6", // Azul
    "#ef4444", // Rojo
    "#10b981", // Verde
    "#f59e0b", // Amarillo
    "#8b5cf6", // Púrpura
    "#ec4899", // Rosa
    "#06b6d4", // Cian
    "#84cc16", // Lima
    "#f97316", // Naranja
    "#6366f1", // Índigo
  ]

  // Usar el ID del evento para seleccionar un color consistente
  const hash = event.id.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0)
    return a & a
  }, 0)

  return colors[Math.abs(hash) % colors.length]
}

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  all_day: boolean
  color: string | null
  color_id: string | null
  color_hex: string | null
}

interface EventDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEdit: (event: CalendarEvent) => void
  onDelete: (eventId: string) => void
}

function EventDetailsModal({ isOpen, onClose, event, onEdit, onDelete }: EventDetailsModalProps) {
  if (!isOpen || !event) return null

  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header con color del evento */}
          <div className="h-1.5 w-full rounded-t-xl -mx-6 -mt-6 mb-6" style={{ background: getEventColor(event) }} />

          <h2 className="text-2xl font-bold mb-6 text-foreground text-balance">{event.title}</h2>

          <div className="space-y-4">
            {/* Fecha y hora */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <svg
                className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {format(startDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {event.all_day ? "Todo el día" : `${format(startDate, "HH:mm")} – ${format(endDate, "HH:mm")}`}
                </div>
              </div>
            </div>

            {/* Ubicación */}
            {event.location && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <svg
                  className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="text-sm text-foreground flex-1 min-w-0 break-words">{event.location}</div>
              </div>
            )}

            {/* Descripción */}
            {event.description && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <svg
                  className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <div className="text-sm text-muted-foreground flex-1 min-w-0 break-words">{event.description}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-6 mt-6 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                if (confirm("¿Estás seguro de que quieres eliminar este evento?")) {
                  onDelete(event.id)
                  onClose()
                }
              }}
              className="px-4 py-2.5 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Eliminar
            </button>
            <button
              onClick={() => {
                onEdit(event)
                onClose()
              }}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, "id">) => Promise<void>
  selectedDate?: Date
  selectedTime?: string
  editingEvent?: CalendarEvent | null
}

function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  selectedTime,
  editingEvent,
}: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: editingEvent?.title || "",
    description: editingEvent?.description || "",
    location: editingEvent?.location || "",
    startDate: editingEvent
      ? format(new Date(editingEvent.start_time), "yyyy-MM-dd")
      : selectedDate
        ? format(selectedDate, "yyyy-MM-dd")
        : "",
    startTime: editingEvent ? format(new Date(editingEvent.start_time), "HH:mm") : selectedTime || "09:00",
    endTime: editingEvent
      ? format(new Date(editingEvent.end_time), "HH:mm")
      : selectedTime
        ? format(new Date(`2000-01-01T${selectedTime}`).getTime() + 60 * 60 * 1000, "HH:mm")
        : "10:00",
    allDay: editingEvent?.all_day || false,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editingEvent) {
      setFormData({
        title: editingEvent.title,
        description: editingEvent.description || "",
        location: editingEvent.location || "",
        startDate: format(new Date(editingEvent.start_time), "yyyy-MM-dd"),
        startTime: format(new Date(editingEvent.start_time), "HH:mm"),
        endTime: format(new Date(editingEvent.end_time), "HH:mm"),
        allDay: editingEvent.all_day,
      })
    } else if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        startDate: format(selectedDate, "yyyy-MM-dd"),
      }))
    }
    if (selectedTime && !editingEvent) {
      setFormData((prev) => ({
        ...prev,
        startTime: selectedTime,
        endTime: format(new Date(`2000-01-01T${selectedTime}`).getTime() + 60 * 60 * 1000, "HH:mm"),
      }))
    }
    setError(null)
  }, [selectedDate, selectedTime, editingEvent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      setError("El título del evento es obligatorio")
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Crear fechas en la zona horaria local
      const startDate = new Date(`${formData.startDate}T${formData.startTime}:00`)
      const endDate = new Date(`${formData.startDate}T${formData.endTime}:00`)

      const startDateTime = formData.allDay ? `${formData.startDate}T00:00:00.000Z` : startDate.toISOString()

      const endDateTime = formData.allDay ? `${formData.startDate}T23:59:59.999Z` : endDate.toISOString()

      await onSave({
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        start_time: startDateTime,
        end_time: endDateTime,
        all_day: formData.allDay,
        color: null,
        color_id: null,
        color_hex: null,
      })

      onClose()
      setFormData({
        title: "",
        description: "",
        location: "",
        startDate: "",
        startTime: "09:00",
        endTime: "10:00",
        allDay: false,
      })
      setError(null)
    } catch (error) {
      console.error("Error creating event:", error)
      setError(error instanceof Error ? error.message : "Error al crear el evento")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border my-8">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-foreground">{editingEvent ? "Editar Evento" : "Crear Evento"}</h2>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Nombre del evento"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                rows={3}
                placeholder="Descripción del evento"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Ubicación</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Ubicación del evento"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => setFormData((prev) => ({ ...prev, allDay: e.target.checked }))}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
              />
              <label htmlFor="allDay" className="text-sm font-medium text-foreground cursor-pointer">
                Todo el día
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-foreground">Fecha</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>

              {!formData.allDay && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">Hora inicio</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">Hora fin</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading
                  ? editingEvent
                    ? "Guardando..."
                    : "Creando..."
                  : editingEvent
                    ? "Guardar Cambios"
                    : "Crear Evento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return { start, end }
}

function minutesSinceStartOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function useUserEvents(weekAnchor: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { start, end } = getWeekRange(weekAnchor)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setEvents([])
        setLoading(false)
        return
      }

      // Fetch events that intersect the week range
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .or(`and(start_time.lte.${end.toISOString()},end_time.gte.${start.toISOString()})`)
        .order("start_time", { ascending: true })

      if (error) throw error
      setEvents((data || []) as CalendarEvent[])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [weekAnchor])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, error, refreshEvents: fetchEvents }
}

function computeOverlaps(dayEvents: CalendarEvent[]) {
  // Improved algorithm for better event sizing
  const columns: CalendarEvent[][] = []

  for (const event of dayEvents) {
    let placed = false
    const eventStart = new Date(event.start_time)
    const eventEnd = new Date(event.end_time)

    // Try to find a column where this event doesn't overlap
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

  // Map event to position with better width calculation
  const positions = new Map<string, { column: number; span: number; totalColumns: number }>()
  const total = Math.max(columns.length, 1) // Ensure at least 1 column

  columns.forEach((col, colIndex) => {
    col.forEach((ev) => {
      // Calculate how many columns this event can span
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
        span: Math.min(maxSpan, 2), // Limit span to 2 for better readability
        totalColumns: total,
      })
    })
  })

  return positions
}

interface CalendarPageProps {
  isDashboard?: boolean
}

export default function CalendarPage({ isDashboard = false }: CalendarPageProps = {}) {
  const [anchor, setAnchor] = useState(startOfDay(new Date()))
  const { start, end } = useMemo(() => getWeekRange(anchor), [anchor])
  const { events, refreshEvents } = useUserEvents(anchor)
  const { syncEvents, createEvent, updateEvent, deleteEvent, removeDuplicates, error: syncError } = useGoogleCalendar() // Agregando updateEvent y deleteEvent
  const { session, connectGoogleCalendar, loading: authLoading } = useAuth()
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasCalendarAccess, setHasCalendarAccess] = useState(false)

  // Check if user has Google Calendar access
  useEffect(() => {
    const checkCalendarAccess = async () => {
      if (!session?.provider_token) {
        setHasCalendarAccess(false)
        return
      }

      try {
        // Test if the token has calendar permissions by making a simple API call
        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          setHasCalendarAccess(true)
        } else if (response.status === 403) {
          // Token exists but doesn't have calendar permissions
          setHasCalendarAccess(false)
        } else {
          setHasCalendarAccess(false)
        }
      } catch (error) {
        console.error("Error checking calendar access:", error)
        setHasCalendarAccess(false)
      }
    }

    checkCalendarAccess()
  }, [session])

  // Autoscroll hasta la mitad de la página al cargar
  useEffect(() => {
    const scrollToMiddle = () => {
      const scrollContainer = document.querySelector(".calendar-container")
      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight
        const clientHeight = scrollContainer.clientHeight
        const middlePosition = (scrollHeight - clientHeight) / 2
        scrollContainer.scrollTo({
          top: middlePosition,
          behavior: "smooth",
        })
      }
    }

    // Ejecutar después de que el componente se haya renderizado
    const timeoutId = setTimeout(scrollToMiddle, 100)
    return () => clearTimeout(timeoutId)
  }, [])

  const isToday = (d: Date) => isSameDay(d, new Date())

  const handleCreateEvent = async (eventData: Omit<CalendarEvent, "id">) => {
    try {
      // Validar que el título no esté vacío
      if (!eventData.title || eventData.title.trim() === "") {
        throw new Error("El título del evento es obligatorio")
      }

      console.log("Evento recibido:", {
        title: eventData.title,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        all_day: eventData.all_day,
        isEditing: !!editingEvent,
      })

      // Convert to Google Calendar format
      const googleEventData = {
        title: eventData.title.trim(),
        description: eventData.description || undefined,
        location: eventData.location || undefined,
        start: {
          dateTime: eventData.all_day ? undefined : eventData.start_time,
          date: eventData.all_day ? eventData.start_time.split("T")[0] : undefined,
        },
        end: {
          dateTime: eventData.all_day ? undefined : eventData.end_time,
          date: eventData.all_day ? eventData.end_time.split("T")[0] : undefined,
        },
        all_day: eventData.all_day,
      }

      console.log("Datos para Google Calendar:", googleEventData)

      // Si estamos editando, actualizar el evento existente
      if (editingEvent) {
        console.log("Actualizando evento existente:", editingEvent.id)
        await updateEvent({ id: editingEvent.id, ...googleEventData })
      } else {
        // Si no, crear un nuevo evento
        console.log("Creando nuevo evento")
        await createEvent(googleEventData)
      }

      // Refresh events
      await refreshEvents()

      // Limpiar el estado de edición
      setEditingEvent(null)
    } catch (error) {
      console.error("Error creating/updating event:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"

      // Check if it's a permissions error
      if (errorMessage.includes("PERMISSIONS_REQUIRED")) {
        setSyncMessage("❌ Necesitas conectar tu Google Calendar para crear eventos")
        setHasCalendarAccess(false)
        throw new Error(
          'Necesitas conectar tu Google Calendar para crear eventos. Haz clic en "Conectar Google Calendar" en la parte superior.',
        )
      }

      throw error
    }
  }

  const handleTimeSlotClick = (date: Date, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    setShowCreateModal(true)
  }

  // Función para actualizar desde la BD local
  const handleUpdateFromDB = useCallback(async () => {
    setIsUpdating(true)
    try {
      // Recargar solo los eventos sin recargar la página
      await refreshEvents()
    } catch (error) {
      console.error("Error updating from database:", error)
    } finally {
      setIsUpdating(false)
    }
  }, [refreshEvents])

  const handleDeleteEvent = async (eventId: string) => {
    try {
      console.log("Eliminando evento:", eventId)
      await deleteEvent(eventId)

      // Refresh events
      await refreshEvents()

      setSyncMessage("Evento eliminado correctamente")
      setTimeout(() => setSyncMessage(null), 3000)
    } catch (error) {
      console.error("Error deleting event:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      setSyncMessage(`Error al eliminar evento: ${errorMessage}`)
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  // Función para sincronizar con Google Calendar y eliminar duplicados
  const handleSyncWithGoogle = useCallback(async () => {
    setIsSyncing(true)
    setSyncMessage("Sincronizando con Google...")
    try {
      console.log("Iniciando sincronización con Google Calendar...")
      await syncEvents(start)
      console.log("Sincronización con Google completada, eliminando duplicados...")
      await removeDuplicates(start)
      console.log("Limpieza de duplicados completada")
      setSyncMessage("Sincronización completada")
      setTimeout(() => setSyncMessage(null), 3000)
    } catch (error) {
      console.error("Error syncing with Google:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"

      // Check if it's a permissions error
      if (errorMessage.includes("PERMISSIONS_REQUIRED")) {
        setSyncMessage("❌ Necesitas conectar tu Google Calendar primero")
        // Update the calendar access state
        setHasCalendarAccess(false)
      } else {
        setSyncMessage(`Error en la sincronización: ${errorMessage}`)
      }
      setTimeout(() => setSyncMessage(null), 5000)
    } finally {
      setIsSyncing(false)
    }
  }, [syncEvents, removeDuplicates, start])

  // Actualización automática cada 1 minuto desde la BD
  useEffect(() => {
    const interval = setInterval(() => {
      handleUpdateFromDB()
    }, 60000) // 1 minuto

    return () => clearInterval(interval)
  }, [handleUpdateFromDB])

  // Sincronización automática cada 5 minutos con Google Calendar
  useEffect(() => {
    const interval = setInterval(() => {
      handleSyncWithGoogle()
    }, 300000) // 5 minutos

    return () => clearInterval(interval)
  }, [handleSyncWithGoogle, syncEvents, removeDuplicates, start])

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i))
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []))
    for (const ev of events) {
      const evStart = new Date(ev.start_time)
      // Include multi-day events: assign to each day they intersect
      for (const day of days) {
        const same = isSameDay(day, evStart) || (evStart < day && new Date(ev.end_time) > day)
        if (same) {
          const key = format(day, "yyyy-MM-dd")
          map.get(key)!.push(ev)
        }
      }
    }
    // Sort by start time within each day
    for (const key of map.keys()) {
      map.get(key)!.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    }
    return map
  }, [events, anchor])

  const calendarContent = (
    <div
      className={`calendar-container ${isDashboard ? "h-full flex flex-col bg-background" : "h-screen flex flex-col bg-background"}`}
    >
      {(isUpdating || isSyncing || syncMessage) && (
        <div className="fixed bottom-6 right-6 z-50 mb-20 sm:mb-6">
          <div className="bg-card border border-border rounded-lg shadow-2xl px-4 py-3 min-w-[200px] max-w-[300px] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {(isUpdating || isSyncing) && (
                <svg
                  className="w-5 h-5 animate-spin text-primary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              {syncMessage && !isUpdating && !isSyncing && (
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <p className="text-sm font-medium text-foreground">
                {isUpdating && "Actualizando..."}
                {isSyncing && "Sincronizando..."}
                {syncMessage && !isUpdating && !isSyncing && syncMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-2 border-b border-border bg-card sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <button
              className="p-2 border border-border rounded-lg hover:bg-muted transition-colors active:scale-95"
              onClick={() => setAnchor(addDays(anchor, -7))}
              title="Semana anterior"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="p-2 border border-border rounded-lg hover:bg-muted transition-colors active:scale-95"
              onClick={() => setAnchor(addDays(anchor, 7))}
              title="Semana siguiente"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button
            className="px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium active:scale-95"
            onClick={() => setAnchor(startOfDay(new Date()))}
            title="Ir a hoy"
          >
            Hoy
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-base sm:text-lg font-bold text-foreground">
            {format(start, "d 'de' MMM", { locale: es })} – {format(end, "d 'de' MMM, yyyy", { locale: es })}
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
          {/* Google Calendar Connection Button */}
          {!hasCalendarAccess && (
            <button
              onClick={connectGoogleCalendar}
              disabled={authLoading}
              className="px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg text-sm font-medium active:scale-95"
              title="Conectar con Google Calendar"
            >
              {authLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
              <span className="hidden sm:inline">{authLoading ? "Conectando..." : "Conectar Google"}</span>
              <span className="sm:hidden">{authLoading ? "..." : "Google"}</span>
            </button>
          )}

          {/* Status indicator */}
          {hasCalendarAccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">Conectado</span>
            </div>
          )}

          {/* Botones de actualización */}
          {hasCalendarAccess && (
            <>
              <button
                onClick={handleUpdateFromDB}
                disabled={isUpdating}
                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 active:scale-95"
                title="Actualizar desde base de datos"
              >
                {isUpdating ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                <span className="text-xs font-medium">BD</span>
              </button>

              <button
                onClick={handleSyncWithGoogle}
                disabled={isSyncing}
                className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 active:scale-95"
                title="Sincronizar con Google Calendar"
              >
                {isSyncing ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-16 0 9 9 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    />
                  </svg>
                )}
                <span className="text-xs font-medium hidden sm:inline">Sync</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!hasCalendarAccess && (
        <div className="mx-4 sm:mx-6 mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400">Conecta tu Google Calendar</h3>
              <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Para sincronizar tus eventos con Google Calendar, necesitas conectar tu cuenta. Haz clic en el botón
                  &quot;Conectar Google Calendar&quot; en la parte superior.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,minmax(80px,1fr))] sm:grid-cols-[80px_repeat(7,1fr)] border-b border-border bg-card sticky top-[3rem] sm:top-[3rem] z-30 overflow-x-auto shadow-sm">
          <div className="border-r border-border px-2 py-2 text-xs text-muted-foreground font-semibold">Hora</div>
          {Array.from({ length: 7 }, (_, i) => addDays(anchor, i)).map((d) => (
            <div
              key={format(d, "yyyy-MM-dd")}
              className={`px-2 py-2 border-r border-border text-center min-w-[80px] ${isToday(d) ? "bg-primary/10" : ""}`}
            >
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                {format(d, "EEE", { locale: es })}
              </div>
              <div className={`text-sm font-bold mt-1 ${isToday(d) ? "text-primary" : "text-foreground"}`}>
                {format(d, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Main calendar grid */}
        <div className="flex-1 grid grid-cols-[60px_repeat(7,minmax(80px,1fr))] sm:grid-cols-[80px_repeat(7,1fr)] min-h-0 overflow-auto">
          {/* Hours gutter */}
          <div className="border-r border-border text-xs text-muted-foreground bg-muted/20 sticky left-0 z-20">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="h-16 border-b border-border/60 px-1 sm:px-2 relative flex items-start">
                <span className="text-[9px] sm:text-[10px] font-semibold -translate-y-1">
                  {h.toString().padStart(2, "0")}:00
                </span>
                <div className="absolute left-0 right-0 top-1/2 border-t border-border/50" />
              </div>
            ))}
          </div>

          {/* Days columns */}
          {Array.from({ length: 7 }, (_, i) => addDays(anchor, i)).map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayEvents = (eventsByDay.get(key) || []).filter((ev) => !ev.all_day)
            const positions = computeOverlaps(dayEvents)
            const showNow = isToday(day)
            const nowTop = (minutesSinceStartOfDay(new Date()) / (24 * 60)) * 100

            return (
              <div
                key={key}
                className={`relative border-r border-border min-w-[80px] ${isToday(day) ? "bg-primary/5" : "bg-background"}`}
              >
                {/* Hour slots background */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="h-16 border-b border-border/60 relative group">
                    <div className="absolute left-0 right-0 top-1/2 border-t border-border/50" />
                    {/* Clickable time slots */}
                    <div
                      className="absolute inset-0 hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => handleTimeSlotClick(day, `${h.toString().padStart(2, "0")}:00`)}
                    />
                  </div>
                ))}

                {/* Current time indicator */}
                {showNow && (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${nowTop}%` }}>
                    <div className="flex items-center">
                      <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 shadow-lg border-2 border-background" />
                      <div className="flex-1 border-t-2 border-red-500 shadow-sm" />
                    </div>
                  </div>
                )}

                {/* Events */}
                <div className="absolute inset-0 p-0.5 sm:p-1">
                  {dayEvents.map((ev) => {
                    const startDate = new Date(ev.start_time)
                    const endDate = new Date(ev.end_time)
                    const top = (minutesSinceStartOfDay(startDate) / (24 * 60)) * 100
                    const height = Math.max(
                      2,
                      ((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) * 100,
                    )
                    const pos = positions.get(ev.id)!
                    const width = (100 / pos.totalColumns) * pos.span
                    const left = pos.column * (100 / pos.totalColumns)

                    return (
                      <div
                        key={ev.id}
                        className="absolute rounded-md text-xs shadow-md hover:shadow-xl transition-all duration-200 bg-card/95 backdrop-blur-sm hover:bg-card cursor-pointer overflow-hidden hover:scale-105 hover:z-10"
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          left: `${left}%`,
                          width: `${width}%`,
                          borderLeft: `3px solid ${getEventColor(ev)}`,
                          backgroundColor: `${getEventColor(ev)}15`,
                        }}
                        onClick={() => setSelectedEvent(ev)}
                        title={`${ev.title}\n${format(startDate, "PPp", { locale: es })} – ${format(endDate, "PPp", { locale: es })}`}
                      >
                        <div className="p-1 sm:p-2 h-full flex flex-col">
                          <div className="font-semibold text-foreground text-[10px] sm:text-[11px] truncate leading-tight">
                            {ev.title}
                          </div>
                          <div className="text-muted-foreground text-[9px] sm:text-[10px] truncate mt-0.5">
                            {format(startDate, "HH:mm")}
                          </div>
                          {ev.location && height > 15 && (
                            <div className="text-muted-foreground text-[9px] truncate mt-0.5 hidden sm:block">
                              📍 {ev.location}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <EventDetailsModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onEdit={(event) => {
          setEditingEvent(event)
          setShowCreateModal(true)
        }}
        onDelete={handleDeleteEvent}
      />

      {/* Create/Edit Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingEvent(null)
        }}
        onSave={handleCreateEvent}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        editingEvent={editingEvent}
      />

      <button
        onClick={() => {
          setSelectedDate(new Date())
          setSelectedTime(format(new Date(), "HH:mm"))
          setShowCreateModal(true)
        }}
        className="fixed bottom-6 right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center z-50 group"
        title="Crear nuevo evento"
      >
        <svg
          className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-90 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )

  if (isDashboard) {
    return calendarContent
  }

  return <AppLayout>{calendarContent}</AppLayout>
}
