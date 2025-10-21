import { createClient } from '@/lib/supabase/client'
import { endOfWeek, format } from 'date-fns'
import { useCallback, useState } from 'react'

interface GoogleCalendarEvent {
  id: string
  title: string
  summary?: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  all_day?: boolean
  colorId?: string
}

// Mapeo de colores de Google Calendar
const GOOGLE_CALENDAR_COLORS = {
  '1': '#a4bdfc', // Lavender
  '2': '#7ae7bf', // Sage
  '3': '#dbadff', // Grape
  '4': '#ff887c', // Flamingo
  '5': '#fbd75b', // Banana
  '6': '#ffb878', // Tangerine
  '7': '#46d6db', // Peacock
  '8': '#e1e1e1', // Graphite
  '9': '#5484ed', // Blueberry
  '10': '#51b749', // Basil
  '11': '#dc2127', // Tomato
} as const

function getGoogleCalendarColorHex(colorId?: string): string {
  if (!colorId) return '#3b82f6' // Default blue
  return GOOGLE_CALENDAR_COLORS[colorId as keyof typeof GOOGLE_CALENDAR_COLORS] || '#3b82f6'
}

interface UseGoogleCalendarReturn {
  loading: boolean
  error: string | null
  syncEvents: (weekStart: Date) => Promise<void>
  createEvent: (event: Omit<GoogleCalendarEvent, 'id' | 'summary'>) => Promise<void>
  clearError: () => void
  removeDuplicates: (weekStart: Date) => Promise<void>
  removeAllDuplicates: () => Promise<void>
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const createEvent = useCallback(async (eventData: Omit<GoogleCalendarEvent, 'id' | 'summary'>) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Usuario no autenticado')
      }

      // Get session with Google tokens
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.provider_token) {
        throw new Error('No se encontraron tokens de Google. Por favor, cierra sesión y vuelve a iniciar.')
      }

      // Create event in Google Calendar
      const googleEvent = {
        summary: eventData.title, // Google Calendar API usa 'summary' para el título
        description: eventData.description,
        location: eventData.location,
        start: eventData.all_day 
          ? { date: eventData.start.date || eventData.start.dateTime?.split('T')[0] }
          : { dateTime: eventData.start.dateTime || eventData.start.date },
        end: eventData.all_day 
          ? { date: eventData.end.date || eventData.end.dateTime?.split('T')[0] }
          : { dateTime: eventData.end.dateTime || eventData.end.date },
      }

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.provider_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent)
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token de Google expirado. Por favor, cierra sesión y vuelve a iniciar.')
        }
        throw new Error(`Error de Google Calendar: ${response.status}`)
      }

      const createdEvent = await response.json()

      // Save to local database
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: user.id,
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start_time: eventData.all_day ? eventData.start.date : eventData.start.dateTime,
          end_time: eventData.all_day ? eventData.end.date : eventData.end.dateTime,
          all_day: eventData.all_day,
          color_id: createdEvent.colorId || null,
          color_hex: getGoogleCalendarColorHex(createdEvent.colorId),
        })

      if (insertError) {
        throw new Error(`Error guardando evento: ${insertError.message}`)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Google Calendar create event error:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const syncEvents = useCallback(async (weekStart: Date) => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Iniciando syncEvents...')
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('❌ Error de usuario:', userError)
        throw new Error('Usuario no autenticado')
      }
      console.log('✅ Usuario autenticado:', user.id)

      // Get session with Google tokens
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.provider_token) {
        console.error('❌ Error de sesión:', sessionError)
        console.log('Session data:', session)
        throw new Error('No se encontraron tokens de Google. Por favor, cierra sesión y vuelve a iniciar.')
      }
      console.log('✅ Sesión con tokens de Google encontrada')

      // Calculate week range (Monday to Sunday)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const timeMin = weekStart.toISOString()
      const timeMax = weekEnd.toISOString()
      
      console.log('Sincronizando semana:', {
        weekStart: format(weekStart, 'yyyy-MM-dd HH:mm'),
        weekEnd: format(weekEnd, 'yyyy-MM-dd HH:mm'),
        timeMin,
        timeMax
      })

      // Call Google Calendar API directly from frontend
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
      url.searchParams.set('timeMin', timeMin)
      url.searchParams.set('timeMax', timeMax)
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('maxResults', '100')
      
      console.log('🌐 Llamando a Google Calendar API:', url.toString())
      console.log('🔑 Token:', session.provider_token ? 'Presente' : 'Ausente')
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.provider_token}`,
          'Content-Type': 'application/json',
        }
      })

      console.log('📡 Respuesta de Google Calendar:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error de Google Calendar:', errorText)
        if (response.status === 401) {
          throw new Error('Token de Google expirado. Por favor, cierra sesión y vuelve a iniciar.')
        }
        throw new Error(`Error de Google Calendar: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const events = data.items || []
      
      console.log(`Encontrados ${events.length} eventos en Google Calendar para la semana del ${format(weekStart, 'dd/MM')} al ${format(weekEnd, 'dd/MM/yyyy')}`)

      // Clear existing events for this week first
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', user.id)
        .gte('start_time', timeMin)
        .lte('start_time', timeMax)

      if (deleteError) {
        throw new Error(`Error eliminando eventos existentes: ${deleteError.message}`)
      }

      // Process events and remove duplicates before inserting
      const processedEvents = new Map()
      
      for (const event of events) {
        const eventData = {
          user_id: user.id,
          title: event.summary || 'Sin título',
          description: event.description || null,
          location: event.location || null,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          all_day: !event.start.dateTime,
          color_id: event.colorId || null,
          color_hex: getGoogleCalendarColorHex(event.colorId),
        }

        // Create a unique key to identify duplicates
        const key = `${eventData.title}_${eventData.start_time}_${eventData.end_time}_${eventData.all_day}`
        
        // Only keep the first occurrence of each event
        if (!processedEvents.has(key)) {
          processedEvents.set(key, eventData)
        }
      }

      // Convert map to array for insertion
      const eventsToInsert = Array.from(processedEvents.values())

      // Insert processed events
      if (eventsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(eventsToInsert)

        if (insertError) {
          throw new Error(`Error guardando eventos: ${insertError.message}`)
        }
      }
      
      console.log(`Sincronización completada: ${eventsToInsert.length} eventos únicos insertados para la semana del ${format(weekStart, 'dd/MM')} al ${format(weekEnd, 'dd/MM/yyyy')}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Google Calendar sync error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const removeDuplicates = useCallback(async (weekStart: Date) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Usuario no autenticado')
      }

      // Calculate week range
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const timeMin = weekStart.toISOString()
      const timeMax = weekEnd.toISOString()

      // Get all events for this week
      const { data: events, error: fetchError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', timeMin)
        .lte('start_time', timeMax)
        .order('created_at', { ascending: true }) // Keep the oldest event

      if (fetchError) {
        throw new Error(`Error obteniendo eventos: ${fetchError.message}`)
      }

      if (!events || events.length === 0) {
        console.log('No hay eventos para limpiar')
        return
      }

      // Group events by key (title + start_time + end_time + all_day)
      const eventsByKey = new Map()
      const duplicates: string[] = []

      events.forEach(event => {
        const key = `${event.title}_${event.start_time}_${event.end_time}_${event.all_day}`
        
        if (eventsByKey.has(key)) {
          // This is a duplicate - keep the first one, mark others for deletion
          duplicates.push(event.id)
        } else {
          eventsByKey.set(key, event)
        }
      })

      if (duplicates.length > 0) {
        console.log(`Encontrados ${duplicates.length} eventos duplicados de ${events.length} total`)
        
        // Delete duplicates in batches to avoid query limits
        const batchSize = 100
        for (let i = 0; i < duplicates.length; i += batchSize) {
          const batch = duplicates.slice(i, i + batchSize)
          const { error: deleteError } = await supabase
            .from('calendar_events')
            .delete()
            .in('id', batch)

          if (deleteError) {
            console.error(`Error eliminando lote ${i}-${i + batchSize}:`, deleteError)
          }
        }

        console.log(`${duplicates.length} eventos duplicados eliminados`)
      } else {
        console.log('No se encontraron eventos duplicados')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error removing duplicates:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const removeAllDuplicates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Usuario no autenticado')
      }

      // Get all events for this user
      const { data: events, error: fetchError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }) // Keep the oldest event

      if (fetchError) {
        throw new Error(`Error obteniendo eventos: ${fetchError.message}`)
      }

      if (!events || events.length === 0) {
        console.log('No hay eventos para limpiar')
        return
      }

      // Group events by key (title + start_time + end_time + all_day)
      const eventsByKey = new Map()
      const duplicates: string[] = []

      events.forEach(event => {
        const key = `${event.title}_${event.start_time}_${event.end_time}_${event.all_day}`
        
        if (eventsByKey.has(key)) {
          // This is a duplicate - keep the first one, mark others for deletion
          duplicates.push(event.id)
        } else {
          eventsByKey.set(key, event)
        }
      })

      if (duplicates.length > 0) {
        console.log(`Encontrados ${duplicates.length} eventos duplicados de ${events.length} total`)
        
        // Delete duplicates in batches to avoid query limits
        const batchSize = 100
        for (let i = 0; i < duplicates.length; i += batchSize) {
          const batch = duplicates.slice(i, i + batchSize)
          const { error: deleteError } = await supabase
            .from('calendar_events')
            .delete()
            .in('id', batch)

          if (deleteError) {
            console.error(`Error eliminando lote ${i}-${i + batchSize}:`, deleteError)
          }
        }

        console.log(`${duplicates.length} eventos duplicados eliminados`)
      } else {
        console.log('No se encontraron eventos duplicados')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error removing all duplicates:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    syncEvents,
    createEvent,
    clearError,
    removeDuplicates,
    removeAllDuplicates
  }
}
