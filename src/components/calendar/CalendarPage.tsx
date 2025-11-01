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

const EVENT_COLORS = [
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
  google_event_id?: string // New field for Google Calendar event ID
}

interface EventDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEdit: (event: CalendarEvent) => void
  onDelete: (eventId: string) => void
  onColorChange: (eventId: string, color: string) => void // Nueva prop para cambiar color
}

function EventDetailsModal({ isOpen, onClose, event, onEdit, onDelete, onColorChange }: EventDetailsModalProps) {
  if (!isOpen || !event) return null

  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header con color del evento */}
          <div className="h-2 w-full rounded-t-lg -mx-6 -mt-6 mb-4" style={{ background: getEventColor(event) }} />

          <h2 className="text-2xl font-bold mb-4 text-foreground">{event.title}</h2>

          <div className="space-y-3">
            {/* Fecha y hora */}
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-muted-foreground mt-0.5"
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
              <div>
                <div className="text-sm font-medium text-foreground">
                  {format(startDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {event.all_day ? "Todo el día" : `${format(startDate, "HH:mm")} – ${format(endDate, "HH:mm")}`}
                </div>
              </div>
            </div>

            {/* Ubicación */}
            {event.location && (
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-muted-foreground mt-0.5"
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
                <div className="text-sm text-foreground">{event.location}</div>
              </div>
            )}

            {/* Descripción */}
            {event.description && (
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-muted-foreground mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <div className="text-sm text-muted-foreground">{event.description}</div>
              </div>
            )}

            <div className="border-t border-border pt-3 mt-3">
              <label className="text-sm font-medium text-foreground mb-2 block">Color del evento</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange(event.id, color)
                      onClose()
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      getEventColor(event) === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Cambiar color a ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-6 mt-6 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
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
              className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
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
              className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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
    color: editingEvent?.color_hex || EVENT_COLORS[0],
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
        color: editingEvent.color_hex || EVENT_COLORS[0],
      })
    } else if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        startDate: format(selectedDate, "yyyy-MM-dd"),
        color: EVENT_COLORS[0],
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
      const startDate = new Date(`${formData.startDate}T${formData.startTime}:00`)
      const endDate = new Date(`${formData.startDate}T${formData.endTime}:00`)

      const startDateTime = formData.allDay ? `${formData.startDate}T00:00:00.000Z` : startDate.toISOString()

      const endDateTime = formData.allDay ? `${formData.startDate}T23:59:59.999Z` : endDate.toISOString()

      const colorMapping: Record<string, string> = {
        "#3b82f6": "1",
        "#ef4444": "11",
        "#10b981": "10",
        "#f59e0b": "5",
        "#8b5cf6": "3",
        "#ec4899": "4",
        "#06b6d4": "7",
        "#84cc16": "2",
        "#f97316": "6",
        "#6366f1": "9",
      }

      await onSave({
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        start_time: startDateTime,
        end_time: endDateTime,
        all_day: formData.allDay,
        color: formData.color,
        color_id: colorMapping[formData.color] || "1",
        color_hex: formData.color,
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
        color: EVENT_COLORS[0],
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{editingEvent ? "Editar Evento" : "Crear Evento"}</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium mb-2">Color del evento</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      formData.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Seleccionar color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => setFormData((prev) => ({ ...prev, allDay: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="allDay" className="text-sm font-medium">
                Todo el día
              </label>
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

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, "id">) => Promise<void>
  selectedDate?: Date
  selectedTime?: string
  editingEvent?: CalendarEvent | null
}

function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const end = endOfWeek(date, { weekStartsOn: 0 })
  return { start, end }
}

function minutesSinceStartOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function useUserEvents(weekAnchor: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedWeek, setLastFetchedWeek] = useState<Date | null>(null)

  const fetchEvents = useCallback(async () => {
    const weekKey = weekAnchor.toDateString()
    const lastFetchedKey = lastFetchedWeek?.toDateString()

    if (loading || lastFetchedKey === weekKey) {
      return
    }

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

      console.log("Fetching events for week:", {
        start: start.toISOString(),
        end: end.toISOString(),
        weekAnchor: weekAnchor.toISOString(),
      })

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .or(
          `and(start_time.lte.${end.toISOString()},end_time.gte.${start.toISOString()}),` +
            `start_time.gte.${start.toISOString()},start_time.lte.${end.toISOString()},` +
            `end_time.gte.${start.toISOString()},end_time.lte.${end.toISOString()}`,
        )
        .order("start_time", { ascending: true })

      if (error) {
        console.error("Error fetching events:", error)
        throw error
      }

      console.log("Fetched events:", data?.length || 0)
      setEvents(data || [])
      setLastFetchedWeek(new Date(weekAnchor))
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido"
      console.error("Error in useUserEvents:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [weekAnchor, loading, lastFetchedWeek])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    loading,
    error,
    refreshEvents: () => {
      setLastFetchedWeek(null)
      return fetchEvents()
    },
  }
}

function computeOverlaps(dayEvents: CalendarEvent[]) {
  const columns: CalendarEvent[][] = []

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

interface CalendarPageProps {
  isDashboard?: boolean
}

export default function CalendarPage({ isDashboard = false }: CalendarPageProps = {}) {
  const [anchor, setAnchor] = useState(startOfDay(new Date()))
  const { start, end } = useMemo(() => getWeekRange(anchor), [anchor])
  const { events, refreshEvents } = useUserEvents(anchor)
  const {
    syncEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    removeDuplicates,
    error: syncError,
    updateColorEvent,
  } = useGoogleCalendar()
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

        if (response.ok) {
          setHasCalendarAccess(true)
        } else if (response.status === 403) {
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

    const timeoutId = setTimeout(scrollToMiddle, 100)
    return () => clearTimeout(timeoutId)
  }, [])

  const isToday = (d: Date) => isSameDay(d, new Date())

  const handleCreateEvent = async (eventData: Omit<CalendarEvent, "id">) => {
    try {
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

      const colorMapping: Record<string, string> = {
        "#3b82f6": "1",
        "#ef4444": "11",
        "#10b981": "10",
        "#f59e0b": "5",
        "#8b5cf6": "3",
        "#ec4899": "4",
        "#06b6d4": "7",
        "#84cc16": "2",
        "#f97316": "6",
        "#6366f1": "9",
      }

      // Asegurarse de que el color tenga un valor predeterminado
      const eventColor = eventData.color || "#3b82f6"
      const googleEventData = {
        title: eventData.title.trim(),
        description: eventData.description || undefined,
        location: eventData.location || undefined,
        all_day: eventData.all_day,
        start: eventData.all_day
          ? { date: format(new Date(eventData.start_time), "yyyy-MM-dd") }
          : { dateTime: new Date(eventData.start_time).toISOString() },
        end: eventData.all_day
          ? { date: format(new Date(eventData.end_time), "yyyy-MM-dd") }
          : { dateTime: new Date(eventData.end_time).toISOString() },
        colorId: colorMapping[eventColor] || "1",
        color: eventColor,
        color_hex: eventColor,
        color_id: colorMapping[eventColor] || "1",
      }

      console.log("Datos para Google Calendar:", googleEventData)

      if (editingEvent) {
        console.log("Actualizando evento existente:", editingEvent.id)
        await updateEvent({ id: editingEvent.id, ...googleEventData })
      } else {
        console.log("Creando nuevo evento")
        await createEvent(googleEventData)
      }

      await refreshEvents()

      setEditingEvent(null)
    } catch (error) {
      console.error("Error creating/updating event:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"

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

  const handleColorChange = async (eventId: string, newColor: string) => {
    try {
      const supabase = createClient()

      const colorMapping: Record<string, string> = {
        "#3b82f6": "1",
        "#ef4444": "11",
        "#10b981": "10",
        "#f59e0b": "5",
        "#8b5cf6": "3",
        "#ec4899": "4",
        "#06b6d4": "7",
        "#84cc16": "2",
        "#f97316": "6",
        "#6366f1": "9",
      }

      const googleColorId = colorMapping[newColor] || "1"

      console.log("[v0] Updating color - Local:", newColor, "Google ID:", googleColorId)

      const { error: supabaseError } = await supabase
        .from("calendar_events")
        .update({ color_hex: newColor, color_id: googleColorId })
        .eq("id", eventId)

      if (supabaseError) throw supabaseError

      if (hasCalendarAccess && session?.provider_token) {
        try {
          const { data: eventData, error: fetchError } = await supabase
            .from("calendar_events")
            .select("google_event_id")
            .eq("id", eventId)
            .single()

          if (fetchError || !eventData) {
            console.warn("[v0] Could not fetch event data for Google Calendar sync")
          } else if (eventData.google_event_id) {
            await updateColorEvent(eventData.google_event_id, googleColorId)
            console.log("[v0] Event color updated in Google Calendar")
          } else {
            console.log("[v0] Event has no google_event_id, skipping Google Calendar update")
          }
        } catch (googleError) {
          console.error("[v0] Error updating color in Google Calendar:", googleError)
        }
      }

      setSelectedEvent((prev) => (prev ? { ...prev, color_hex: newColor, color_id: googleColorId } : null))

      await refreshEvents()

      setSyncMessage("✅ Color del evento actualizado")
      setTimeout(() => setSyncMessage(null), 3000)
    } catch (error) {
      console.error("[v0] Error updating event color:", error)
      setSyncMessage("❌ Error al actualizar el color del evento")
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  const handleUpdateFromDB = useCallback(async () => {
    setIsUpdating(true)
    try {
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

      if (errorMessage.includes("PERMISSIONS_REQUIRED")) {
        setSyncMessage("❌ Necesitas conectar tu Google Calendar primero")
        setHasCalendarAccess(false)
      } else {
        setSyncMessage(`Error en la sincronización: ${errorMessage}`)
      }
      setTimeout(() => setSyncMessage(null), 5000)
    } finally {
      setIsSyncing(false)
    }
  }, [syncEvents, removeDuplicates, start])

  useEffect(() => {
    const interval = setInterval(() => {
      handleUpdateFromDB()
    }, 60000)

    return () => clearInterval(interval)
  }, [handleUpdateFromDB])

  useEffect(() => {
    const interval = setInterval(() => {
      handleSyncWithGoogle()
    }, 300000)

    return () => clearInterval(interval)
  }, [handleSyncWithGoogle, syncEvents, removeDuplicates, start])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
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

  const calendarContent = (
    <div
      className={`calendar-container ${isDashboard ? "h-full flex flex-col bg-background" : "h-screen flex flex-col bg-background"}`}
    >
      {(isUpdating || isSyncing || syncMessage) && (
        <div className="px-6 py-2 bg-primary/10 text-primary text-sm text-center">
          {isUpdating && "🔄 Actualizando desde la base de datos..."}
          {isSyncing && "🔄 Sincronizando con Google Calendar..."}
          {syncMessage && `✅ ${syncMessage}`}
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-12 z-40">
        <div className="flex items-center gap-2">
          <button
            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
            onClick={() => setAnchor(addDays(anchor, -7))}
            title="Semana anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
            onClick={() => setAnchor(addDays(anchor, 7))}
            title="Semana siguiente"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
            onClick={() => setAnchor(startOfDay(new Date()))}
            title="Ir a hoy"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-semibold">
            {format(start, "d 'de' MMM", { locale: es })} – {format(end, "d 'de' MMM, yyyy", { locale: es })}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!hasCalendarAccess && (
            <button
              onClick={connectGoogleCalendar}
              disabled={authLoading}
              className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg"
              title="Conectar con Google Calendar para sincronizar eventos"
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
              <span className="text-sm font-medium">{authLoading ? "Conectando..." : "Conectar Google Calendar"}</span>
            </button>
          )}

          {hasCalendarAccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-100 text-green-800 border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Google Calendar Conectado</span>
            </div>
          )}

          {hasCalendarAccess && (
            <>
              <button
                onClick={handleUpdateFromDB}
                disabled={isUpdating}
                className="p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
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
                <span className="text-xs">BD</span>
              </button>

              <button
                onClick={handleSyncWithGoogle}
                disabled={isSyncing}
                className="p-2 rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-2"
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
                <span className="text-xs">Google</span>
              </button>
            </>
          )}
        </div>
      </div>

      {(syncMessage || syncError) && (
        <div
          className={`px-6 py-3 text-sm ${
            syncMessage
              ? "bg-green-100 text-green-800"
              : syncError
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
          }`}
        >
          {syncMessage || syncError}
        </div>
      )}

      {!hasCalendarAccess && (
        <div className="px-6 py-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Conecta tu Google Calendar</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>
                  Para sincronizar tus eventos con Google Calendar, necesitas conectar tu cuenta. Haz clic en el botón
                  &quot;Conectar Google Calendar&quot; en la parte superior.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-8 border-b border-border bg-background sticky top-[3rem] z-30">
          <div className="border-r border-border px-2 py-2 text-xs text-muted-foreground font-medium">Hora</div>
          {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => (
            <div
              key={format(d, "yyyy-MM-dd")}
              className={`px-2 py-2 border-r border-border text-center ${isToday(d) ? "bg-primary/5" : ""}`}
            >
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {format(d, "EEE", { locale: es })}
              </div>
              <div className={`text-xs font-semibold ${isToday(d) ? "text-primary" : ""}`}>{format(d, "d")}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-8 min-h-0">
          <div className="border-r border-border text-xs text-muted-foreground bg-muted/30">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="h-16 border-b border-border/60 px-2 relative flex items-start">
                <span className="text-[9px] font-medium -translate-y-1">{h.toString().padStart(2, "0")}:00</span>
                <div className="absolute left-0 right-0 top-1/2 border-t border-border/50" />
              </div>
            ))}
          </div>

          {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayEvents = (eventsByDay.get(key) || []).filter((ev) => !ev.all_day)
            const positions = computeOverlaps(dayEvents)
            const showNow = isToday(day)
            const nowTop = (minutesSinceStartOfDay(new Date()) / (24 * 60)) * 100

            return (
              <div
                key={key}
                className={`relative border-r border-border ${isToday(day) ? "bg-primary/10" : "bg-muted/20"}`}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="h-16 border-b border-border/60 relative group">
                    <div className="absolute left-0 right-0 top-1/2 border-t border-border/50" />
                    <div
                      className="absolute inset-0 hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => handleTimeSlotClick(day, `${h.toString().padStart(2, "0")}:00`)}
                    />
                  </div>
                ))}

                {showNow && (
                  <div className="absolute left-0 right-0 z-10" style={{ top: `${nowTop}%` }}>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-red-500 shadow-lg border-2 border-background" />
                      <div className="flex-1 border-t-2 border-red-500 shadow-sm" />
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 p-1">
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
                        className="absolute rounded-md text-xs shadow-lg border-2 hover:shadow-xl transition-all duration-200 bg-card/95 backdrop-blur-sm hover:bg-card cursor-pointer overflow-hidden hover:scale-105"
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          left: `${left}%`,
                          width: `${width}%`,
                          borderColor: getEventColor(ev),
                          backgroundColor: `${getEventColor(ev)}20`,
                        }}
                        onClick={() => setSelectedEvent(ev)}
                        title={`${ev.title}\n${format(startDate, "PPp", { locale: es })} – ${format(endDate, "PPp", { locale: es })}`}
                      >
                        <div className="h-2 w-full" style={{ background: getEventColor(ev) }} />
                        <div className="p-2">
                          <div className="font-semibold text-foreground text-[11px] truncate pr-6">{ev.title}</div>
                          <div className="opacity-80 text-muted-foreground text-[10px] truncate">
                            {format(startDate, "HH:mm")}–{format(endDate, "HH:mm")}
                          </div>
                          {ev.location && (
                            <div className="opacity-80 text-muted-foreground text-[10px] truncate">
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
        onColorChange={handleColorChange}
      />

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
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
        title="Crear nuevo evento"
      >
        <svg
          className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )

  if (isDashboard) {
    return calendarContent
  }

  return <AppLayout>{calendarContent}</AppLayout>
}
