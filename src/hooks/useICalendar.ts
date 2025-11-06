"use client"

import { createClient } from "@/lib/supabase/client"
import type { CalendarEventInsert } from "@/types/database"
import { useCallback, useState } from "react"

interface UseICalendarReturn {
  loading: boolean
  error: string | null
  subscribeToICSCalendar: (name: string, icsUrl: string, color?: string) => Promise<void>
  syncICSCalendar: (calendarId: string) => Promise<void>
  syncAllICSCalendars: () => Promise<void>
  clearError: () => void
}

// Función helper para parsear archivos ICS
function parseICS(icsContent: string): any[] {
  const events: any[] = []
  const lines = icsContent.split(/\r?\n/)
  
  let currentEvent: any = null
  let inEvent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (line === 'END:VEVENT' && currentEvent) {
      events.push(currentEvent)
      currentEvent = null
      inEvent = false
    } else if (inEvent && currentEvent) {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':')

      if (key.startsWith('DTSTART')) {
        currentEvent.start = parseICSDate(value, key)
      } else if (key.startsWith('DTEND')) {
        currentEvent.end = parseICSDate(value, key)
      } else if (key === 'SUMMARY') {
        currentEvent.summary = value
      } else if (key === 'DESCRIPTION') {
        currentEvent.description = value
      } else if (key === 'LOCATION') {
        currentEvent.location = value
      } else if (key === 'UID') {
        currentEvent.uid = value
      }
    }
  }

  return events
}

function parseICSDate(value: string, key: string): { dateTime?: string; date?: string; isAllDay: boolean } {
  // Detectar si es evento de todo el día
  const isAllDay = key.includes('VALUE=DATE') || (value.length === 8 && !value.includes('T'))

  if (isAllDay) {
    // Formato: YYYYMMDD
    const year = value.substring(0, 4)
    const month = value.substring(4, 6)
    const day = value.substring(6, 8)
    return {
      date: `${year}-${month}-${day}`,
      isAllDay: true,
    }
  } else {
    // Formato: YYYYMMDDTHHmmssZ o YYYYMMDDTHHmmss
    const dateTimePart = value.replace(/Z$/, '')
    const year = dateTimePart.substring(0, 4)
    const month = dateTimePart.substring(4, 6)
    const day = dateTimePart.substring(6, 8)
    const hour = dateTimePart.substring(9, 11)
    const minute = dateTimePart.substring(11, 13)
    const second = dateTimePart.substring(13, 15) || '00'

    return {
      dateTime: `${year}-${month}-${day}T${hour}:${minute}:${second}Z`,
      isAllDay: false,
    }
  }
}

export function useICalendar(): UseICalendarReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Suscribirse a un calendario ICS
   */
  const subscribeToICSCalendar = useCallback(async (name: string, icsUrl: string, color: string = "#3b82f6") => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Verificar si la URL ya está suscrita
      const { data: existingCalendar } = await supabase
        .from("calendar_calendars")
        .select("id, name")
        .eq("owner_id", user.id)
        .eq("ics_url", icsUrl)
        .single()

      if (existingCalendar) {
        throw new Error(`Ya estás suscrito a este calendario: "${existingCalendar.name}"`)
      }

      // Crear el calendario
      const { data: newCalendar, error: insertError } = await supabase
        .from("calendar_calendars")
        .insert({
          owner_id: user.id,
          name,
          color,
          is_visible: true,
          external_provider: "ics",
          ics_url: icsUrl,
          ics_sync_interval_minutes: 60, // Sincronizar cada hora
          metadata: {
            subscription_type: "ics",
            subscribed_at: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      console.log(`✅ Calendario ICS creado: "${name}"`)

      // Sincronizar inmediatamente
      if (newCalendar) {
        await syncICSCalendar(newCalendar.id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al suscribirse al calendario"
      setError(errorMessage)
      console.error("Error subscribing to ICS calendar:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sincronizar un calendario ICS específico
   */
  const syncICSCalendar = useCallback(async (calendarId: string) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Obtener información del calendario
      const { data: calendar, error: calendarError } = await supabase
        .from("calendar_calendars")
        .select("*")
        .eq("id", calendarId)
        .single()

      if (calendarError || !calendar) {
        throw new Error("Calendario no encontrado")
      }

      if (!calendar.ics_url) {
        throw new Error("Este calendario no tiene URL ICS")
      }

      console.log(`📅 Sincronizando calendario ICS: "${calendar.name}"`)
      console.log(`   URL: ${calendar.ics_url}`)

      // Obtener el archivo ICS a través de nuestro proxy API
      // Esto evita problemas de CORS
      const response = await fetch("/api/calendar/fetch-ics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          icsUrl: calendar.ics_url,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }))
        throw new Error(errorData.error || `Error al obtener calendario ICS: ${response.status}`)
      }

      const data = await response.json()
      const icsContent = data.content
      console.log(`📄 Archivo ICS descargado (${icsContent.length} caracteres)`)

      // Parsear eventos
      const events = parseICS(icsContent)
      console.log(`📊 Encontrados ${events.length} eventos en el ICS`)

      if (events.length > 0) {
        console.log(`   Primer evento: ${events[0].summary}`)
      }

      // Eliminar eventos antiguos de este calendario
      const { error: deleteError } = await supabase
        .from("calendar_events")
        .delete()
        .eq("calendar_id", calendarId)

      if (deleteError) {
        console.error("Error eliminando eventos antiguos:", deleteError)
      }

      // Insertar nuevos eventos
      const eventsToInsert: CalendarEventInsert[] = events
        .filter((event) => event.start && event.summary) // Solo eventos válidos
        .map((event) => ({
          calendar_id: calendarId,
          user_id: calendar.owner_id,  // Referencia directa al usuario
          title: event.summary || "Sin título",
          description: event.description || null,
          location: event.location || null,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end?.dateTime || event.end?.date || event.start.dateTime || event.start.date,
          is_all_day: event.start.isAllDay || false,
          timezone: "UTC",
          external_event_id: event.uid || null,
          metadata: {
            source: "ics",
            ics_url: calendar.ics_url,
          },
        }))

      if (eventsToInsert.length > 0) {
        console.log(`Insertando ${eventsToInsert.length} eventos...`)

        const { data: insertedData, error: insertError } = await supabase
          .from("calendar_events")
          .insert(eventsToInsert)
          .select()

        if (insertError) {
          console.error("❌ Error insertando eventos:", insertError)
          throw insertError
        }

        console.log(`✅ ${insertedData?.length || 0} eventos insertados`)
      }

      // Actualizar fecha de última sincronización
      await supabase
        .from("calendar_calendars")
        .update({
          ics_last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", calendarId)

      console.log(`✅ Calendario ICS "${calendar.name}" sincronizado correctamente`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al sincronizar calendario ICS"
      setError(errorMessage)
      console.error("Error syncing ICS calendar:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sincronizar todos los calendarios ICS del usuario
   */
  const syncAllICSCalendars = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Obtener calendarios ICS del usuario
      const { data: icsCalendars, error: calendarsError } = await supabase
        .from("calendar_calendars")
        .select("id, name")
        .eq("owner_id", user.id)
        .eq("external_provider", "ics")
        .not("ics_url", "is", null)

      if (calendarsError) {
        throw calendarsError
      }

      if (!icsCalendars || icsCalendars.length === 0) {
        console.log("No hay calendarios ICS para sincronizar")
        return
      }

      console.log(`Sincronizando ${icsCalendars.length} calendarios ICS...`)

      // Sincronizar cada calendario
      for (const calendar of icsCalendars) {
        try {
          await syncICSCalendar(calendar.id)
        } catch (err) {
          console.error(`Error sincronizando "${calendar.name}":`, err)
          // Continuar con los demás calendarios
        }
      }

      console.log("✅ Sincronización de calendarios ICS completada")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error syncing all ICS calendars:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [syncICSCalendar])

  return {
    loading,
    error,
    subscribeToICSCalendar,
    syncICSCalendar,
    syncAllICSCalendars,
    clearError,
  }
}

