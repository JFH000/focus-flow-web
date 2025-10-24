'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { createClient } from '@/lib/supabase/client'
import { addDays, endOfWeek, format, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AppLayout from '../AppLayout'

// Función para obtener el color del evento
function getEventColor(event: CalendarEvent): string {
  // Prioridad: color_hex > color > color por defecto
  if (event.color_hex) return event.color_hex
  if (event.color) return event.color
  
  // Colores vibrantes por defecto basados en el ID del evento
  const colors = [
    '#3b82f6', // Azul
    '#ef4444', // Rojo
    '#10b981', // Verde
    '#f59e0b', // Amarillo
    '#8b5cf6', // Púrpura
    '#ec4899', // Rosa
    '#06b6d4', // Cian
    '#84cc16', // Lima
    '#f97316', // Naranja
    '#6366f1'  // Índigo
  ]
  
  // Usar el ID del evento para seleccionar un color consistente
  const hash = event.id.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
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

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id'>) => Promise<void>
  selectedDate?: Date
  selectedTime?: string
}

function CreateEventModal({ isOpen, onClose, onSave, selectedDate, selectedTime }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    startTime: selectedTime || '09:00',
    endTime: selectedTime ? format(new Date(`2000-01-01T${selectedTime}`).getTime() + 60 * 60 * 1000, 'HH:mm') : '10:00',
    allDay: false
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        startDate: format(selectedDate, 'yyyy-MM-dd')
      }))
    }
    if (selectedTime) {
      setFormData(prev => ({
        ...prev,
        startTime: selectedTime,
        endTime: format(new Date(`2000-01-01T${selectedTime}`).getTime() + 60 * 60 * 1000, 'HH:mm')
      }))
    }
    // Limpiar error cuando se abra el modal
    setError(null)
  }, [selectedDate, selectedTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      setError('El título del evento es obligatorio')
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Crear fechas en la zona horaria local
      const startDate = new Date(`${formData.startDate}T${formData.startTime}:00`)
      const endDate = new Date(`${formData.startDate}T${formData.endTime}:00`)
      
      const startDateTime = formData.allDay 
        ? `${formData.startDate}T00:00:00.000Z`
        : startDate.toISOString()
      
      const endDateTime = formData.allDay
        ? `${formData.startDate}T23:59:59.999Z`
        : endDate.toISOString()

      await onSave({
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        start_time: startDateTime,
        end_time: endDateTime,
        all_day: formData.allDay,
        color: null,
        color_id: null,
        color_hex: null
      })

      onClose()
      setFormData({
        title: '',
        description: '',
        location: '',
        startDate: '',
        startTime: '09:00',
        endTime: '10:00',
        allDay: false
      })
      setError(null)
    } catch (error) {
      console.error('Error creating event:', error)
      setError(error instanceof Error ? error.message : 'Error al crear el evento')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Crear Evento</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nombre del evento"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ubicación del evento"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => setFormData(prev => ({ ...prev, allDay: e.target.checked }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hora fin</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
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
                {loading ? 'Creando...' : 'Crear Evento'}
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setEvents([])
        setLoading(false)
        return
      }

      // Fetch events that intersect the week range
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .or(`and(start_time.lte.${end.toISOString()},end_time.gte.${start.toISOString()})`)
        .order('start_time', { ascending: true })

      if (error) throw error
      setEvents((data || []) as CalendarEvent[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
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
      const hasOverlap = col.some(existingEvent => {
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
  const positions = new Map<string, { column: number, span: number, totalColumns: number }>()
  const total = Math.max(columns.length, 1) // Ensure at least 1 column
  
  columns.forEach((col, colIndex) => {
    col.forEach(ev => {
      // Calculate how many columns this event can span
      const eventStart = new Date(ev.start_time)
      const eventEnd = new Date(ev.end_time)
      
      let maxSpan = 1
      for (let i = colIndex + 1; i < columns.length; i++) {
        const canSpan = !columns[i].some(otherEvent => {
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
        totalColumns: total 
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
  const { syncEvents, createEvent, removeDuplicates, error: syncError } = useGoogleCalendar()
  const { session, connectGoogleCalendar, loading: authLoading } = useAuth()
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasCalendarAccess, setHasCalendarAccess] = useState(false)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start])

  // Check if user has Google Calendar access
  useEffect(() => {
    const checkCalendarAccess = async () => {
      if (!session?.provider_token) {
        setHasCalendarAccess(false)
        return
      }

      try {
        // Test if the token has calendar permissions by making a simple API call
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.provider_token}`,
            'Content-Type': 'application/json',
          }
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
        console.error('Error checking calendar access:', error)
        setHasCalendarAccess(false)
      }
    }

    checkCalendarAccess()
  }, [session])

  // Autoscroll hasta la mitad de la página al cargar
  useEffect(() => {
    const scrollToMiddle = () => {
      const scrollContainer = document.querySelector('.calendar-container')
      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight
        const clientHeight = scrollContainer.clientHeight
        const middlePosition = (scrollHeight - clientHeight) / 2
        scrollContainer.scrollTo({
          top: middlePosition,
          behavior: 'smooth'
        })
      }
    }

    // Ejecutar después de que el componente se haya renderizado
    const timeoutId = setTimeout(scrollToMiddle, 100)
    return () => clearTimeout(timeoutId)
  }, [])

  const isToday = (d: Date) => isSameDay(d, new Date())


  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    try {
      // Validar que el título no esté vacío
      if (!eventData.title || eventData.title.trim() === '') {
        throw new Error('El título del evento es obligatorio')
      }

      console.log('Evento recibido:', {
        title: eventData.title,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        all_day: eventData.all_day
      })

      // Convert to Google Calendar format
      const googleEventData = {
        title: eventData.title.trim(), // Asegurar que no tenga espacios en blanco
        description: eventData.description || undefined,
        location: eventData.location || undefined,
        start: {
          dateTime: eventData.all_day ? undefined : eventData.start_time,
          date: eventData.all_day ? eventData.start_time.split('T')[0] : undefined
        },
        end: {
          dateTime: eventData.all_day ? undefined : eventData.end_time,
          date: eventData.all_day ? eventData.end_time.split('T')[0] : undefined
        },
        all_day: eventData.all_day
      }

      console.log('Datos para Google Calendar:', googleEventData)

      await createEvent({
        title: googleEventData.title,
        description: googleEventData.description,
        location: googleEventData.location,
        start: googleEventData.start,
        end: googleEventData.end,
        all_day: googleEventData.all_day
      })
      
      // Refresh events
      await refreshEvents()
    } catch (error) {
      console.error('Error creating event:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      // Check if it's a permissions error
      if (errorMessage.includes('PERMISSIONS_REQUIRED')) {
        setSyncMessage('❌ Necesitas conectar tu Google Calendar para crear eventos')
        setHasCalendarAccess(false)
        throw new Error('Necesitas conectar tu Google Calendar para crear eventos. Haz clic en "Conectar Google Calendar" en la parte superior.')
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
      console.error('Error updating from database:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [refreshEvents])

  // Función para sincronizar con Google Calendar y eliminar duplicados
  const handleSyncWithGoogle = useCallback(async () => {
    setIsSyncing(true)
    setSyncMessage('Sincronizando con Google...')
    try {
      console.log('Iniciando sincronización con Google Calendar...')
      await syncEvents(start)
      console.log('Sincronización con Google completada, eliminando duplicados...')
      await removeDuplicates(start)
      console.log('Limpieza de duplicados completada')
      setSyncMessage('Sincronización completada')
      setTimeout(() => setSyncMessage(null), 3000)
    } catch (error) {
      console.error('Error syncing with Google:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      // Check if it's a permissions error
      if (errorMessage.includes('PERMISSIONS_REQUIRED')) {
        setSyncMessage('❌ Necesitas conectar tu Google Calendar primero')
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
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []))
    for (const ev of events) {
      const evStart = new Date(ev.start_time)
      // Include multi-day events: assign to each day they intersect
      for (const day of days) {
        const same = isSameDay(day, evStart) || (evStart < day && new Date(ev.end_time) > day)
        if (same) {
          const key = format(day, 'yyyy-MM-dd')
          map.get(key)!.push(ev)
        }
      }
    }
    // Sort by start time within each day
    for (const key of map.keys()) {
      map.get(key)!.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    }
    return map
  }, [events, days])

  const calendarContent = (
    <div className={`calendar-container ${isDashboard ? "h-full flex flex-col bg-background" : "h-screen flex flex-col bg-background"}`}>
        {/* Mensaje de estado */}
        {(isUpdating || isSyncing || syncMessage) && (
          <div className="px-6 py-2 bg-primary/10 text-primary text-sm text-center">
            {isUpdating && "🔄 Actualizando desde la base de datos..."}
            {isSyncing && "🔄 Sincronizando con Google Calendar..."}
            {syncMessage && `✅ ${syncMessage}`}
          </div>
        )}

        {/* Header */}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        
        <div className="text-center">
          <h1 className="text-lg font-semibold">
            {format(start, "d 'de' MMM", { locale: es })} – {format(end, "d 'de' MMM, yyyy", { locale: es })}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Google Calendar Connection Button - Only show if no access */}
          {!hasCalendarAccess && (
            <button
              onClick={connectGoogleCalendar}
              disabled={authLoading}
              className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg"
              title="Conectar con Google Calendar para sincronizar eventos"
            >
              {authLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              <span className="text-sm font-medium">
                {authLoading ? 'Conectando...' : 'Conectar Google Calendar'}
              </span>
            </button>
          )}

          {/* Status indicator - Only show if connected */}
          {hasCalendarAccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-100 text-green-800 border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Google Calendar Conectado</span>
            </div>
          )}

          {/* Botones de actualización - Only show if connected */}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                )}
                <span className="text-xs">Google</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status messages */}
      {(syncMessage || syncError) && (
        <div className={`px-6 py-3 text-sm ${
          syncMessage ? 'bg-green-100 text-green-800' : 
          syncError ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {syncMessage || syncError}
        </div>
      )}

      {/* Info message when no calendar access */}
      {!hasCalendarAccess && (
        <div className="px-6 py-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Conecta tu Google Calendar
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>Para sincronizar tus eventos con Google Calendar, necesitas conectar tu cuenta. Haz clic en el botón "Conectar Google Calendar" en la parte superior.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-border bg-background sticky top-[calc(3rem+4.5rem)] z-30">
          <div className="border-r border-border px-2 py-2 text-xs text-muted-foreground font-medium">Hora</div>
          {days.map((d) => (
            <div key={format(d,'yyyy-MM-dd')} className={`px-2 py-2 border-r border-border text-center ${isToday(d) ? 'bg-primary/5' : ''}`}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{format(d, 'EEE', { locale: es })}</div>
              <div className={`text-xs font-semibold ${isToday(d) ? 'text-primary' : ''}`}>{format(d, 'd')}</div>
            </div>
          ))}
        </div>


        {/* Overlay para cerrar evento expandido con efecto de distorsión */}
        {expandedEvent && (
          <div 
            className="fixed inset-0 z-20 backdrop-blur-sm bg-black/20" 
            onClick={() => setExpandedEvent(null)}
          />
        )}

        {/* Main calendar grid */}
        <div className="flex-1 grid grid-cols-8 min-h-0">
          {/* Hours gutter */}
          <div className="border-r border-border text-xs text-muted-foreground bg-muted/30">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="h-16 border-b border-border/60 px-2 relative flex items-start">
                <span className="text-[9px] font-medium -translate-y-1">{h.toString().padStart(2, '0')}:00</span>
                <div className="absolute left-0 right-0 top-1/2 border-t border-border/50" />
              </div>
            ))}
          </div>

          {/* Days columns */}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = (eventsByDay.get(key) || []).filter(ev => !ev.all_day)
            const positions = computeOverlaps(dayEvents)
            const showNow = isToday(day)
            const nowTop = (minutesSinceStartOfDay(new Date()) / (24 * 60)) * 100
            
            return (
              <div key={key} className={`relative border-r border-border ${isToday(day) ? 'bg-primary/10' : 'bg-muted/20'}`}>
                {/* Hour slots background */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="h-16 border-b border-border/60 relative group">
                    <div className="absolute left-0 right-0 top-1/2 border-t border-border/50" />
                    {/* Clickable time slots */}
                    <div 
                      className="absolute inset-0 hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => handleTimeSlotClick(day, `${h.toString().padStart(2, '0')}:00`)}
                    />
                  </div>
                ))}

                {/* Current time indicator */}
                {showNow && (
                  <div className="absolute left-0 right-0 z-10" style={{ top: `${nowTop}%` }}>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-red-500 shadow-lg border-2 border-background" />
                      <div className="flex-1 border-t-2 border-red-500 shadow-sm" />
                    </div>
                  </div>
                )}

                {/* Events */}
                <div className="absolute inset-0 p-1">
                  {dayEvents.map(ev => {
                    const startDate = new Date(ev.start_time)
                    const endDate = new Date(ev.end_time)
                    const top = (minutesSinceStartOfDay(startDate) / (24 * 60)) * 100
                    const height = Math.max(2, ((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) * 100)
                    const pos = positions.get(ev.id)!
                    const width = (100 / pos.totalColumns) * pos.span
                    const left = pos.column * (100 / pos.totalColumns)

                    const isExpanded = expandedEvent === ev.id
                    
                    // Calcular el factor de expansión basado en el tamaño original del evento
                    const expansionFactor = Math.max(0.5, Math.min(2.0, height / 10)) // Factor entre 0.5 y 2.0
                    const scaleFactor = isExpanded ? 1 + expansionFactor : 1
                    const sizeIncrease = isExpanded ? Math.max(5, height * 0.3) : 0 // Aumento proporcional al tamaño
                    
                    return (
                      <div
                        key={ev.id}
                        className={`absolute rounded-md text-xs shadow-lg border-2 hover:shadow-xl transition-all duration-500 ease-out bg-card/95 backdrop-blur-sm hover:bg-card cursor-pointer ${
                          isExpanded ? 'z-30' : 'overflow-hidden'
                        }`}
                        style={{
                          top: isExpanded ? `${top - sizeIncrease/2}%` : `${top}%`,
                          height: isExpanded ? `${height + sizeIncrease}%` : `${height}%`,
                          left: isExpanded ? `${left - sizeIncrease/2}%` : `${left}%`,
                          width: isExpanded ? `${width + sizeIncrease}%` : `${width}%`,
                          borderColor: getEventColor(ev),
                          backgroundColor: isExpanded ? `${getEventColor(ev)}60` : `${getEventColor(ev)}20`,
                          transform: isExpanded ? `scale(${scaleFactor})` : 'scale(1)',
                          boxShadow: isExpanded ? '0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)' : '0 4px 8px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                        title={isExpanded ? undefined : `${ev.title}\n${format(startDate, 'PPp', { locale: es })} – ${format(endDate, 'PPp', { locale: es })}`}
                      >
                        <div className="h-2 w-full" style={{ background: getEventColor(ev) }} />
                        <div className={`p-2 relative group ${isExpanded ? 'pb-8' : ''}`}>
                          <div className={`font-semibold text-foreground ${isExpanded ? 'text-sm' : 'text-[11px] truncate pr-6'}`}>
                            {ev.title}
                          </div>
                          <div className={`opacity-80 text-muted-foreground ${isExpanded ? 'text-xs mt-1' : 'text-[10px] truncate'}`}>
                            {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
                          </div>
                          {ev.location && (
                            <div className={`opacity-80 text-muted-foreground ${isExpanded ? 'text-xs mt-1' : 'text-[10px] truncate'}`}>
                              📍 {ev.location}
                            </div>
                          )}
                          {isExpanded && ev.description && (
                            <div className="text-xs text-muted-foreground mt-2 opacity-90">
                              {ev.description}
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

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateEvent}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />
      </div>
  )

  if (isDashboard) {
    return calendarContent
  }

  return (
    <AppLayout>
      {calendarContent}
    </AppLayout>
  )
}
