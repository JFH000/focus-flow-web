"use client"

import { createClient } from "@/lib/supabase/client"
import { endOfWeek, format } from "date-fns"
import { useCallback, useState } from "react"

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
  recurrence?: string[]
}

// Mapeo de colores de Google Calendar
const GOOGLE_CALENDAR_COLORS = {
  "1": "#a4bdfc", // Lavender
  "2": "#7ae7bf", // Sage
  "3": "#dbadff", // Grape
  "4": "#ff887c", // Flamingo
  "5": "#fbd75b", // Banana
  "6": "#ffb878", // Tangerine
  "7": "#46d6db", // Peacock
  "8": "#e1e1e1", // Graphite
  "9": "#5484ed", // Blueberry
  "10": "#51b749", // Basil
  "11": "#dc2127", // Tomato
} as const

function getGoogleCalendarColorHex(colorId?: string): string {
  if (!colorId) return "#3b82f6" // Default blue
  return GOOGLE_CALENDAR_COLORS[colorId as keyof typeof GOOGLE_CALENDAR_COLORS] || "#3b82f6"
}

interface UseGoogleCalendarReturn {
  loading: boolean
  error: string | null
  syncEvents: (weekStart: Date) => Promise<void>
  createEvent: (event: Omit<GoogleCalendarEvent, "id" | "summary">) => Promise<void>
  updateEvent: (event: GoogleCalendarEvent) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
  clearError: () => void
  removeDuplicates: (weekStart: Date) => Promise<void>
  removeAllDuplicates: () => Promise<void>
  updateColorEvent: (googleEventId: string, colorId: string) => Promise<void> // Added updateColorEvent function
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const createEvent = useCallback(async (eventData: Omit<GoogleCalendarEvent, "id" | "summary">) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Usuario no autenticado")
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.provider_token) {
        throw new Error("No se encontraron tokens de Google. Por favor, cierra sesión y vuelve a iniciar.")
      }

      // Create event in Google Calendar
      const googleEvent = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: eventData.all_day
          ? { date: eventData.start.date || eventData.start.dateTime?.split("T")[0] }
          : { dateTime: eventData.start.dateTime || eventData.start.date },
        end: eventData.all_day
          ? { date: eventData.end.date || eventData.end.dateTime?.split("T")[0] }
          : { dateTime: eventData.end.dateTime || eventData.end.date },
        ...(eventData.colorId && { colorId: eventData.colorId }),
        ...(eventData.recurrence && eventData.recurrence.length > 0 && { recurrence: eventData.recurrence }),
      }

      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token de Google expirado. Por favor, cierra sesión y vuelve a iniciar.")
        }

        if (response.status === 403) {
          const errorText = await response.text()
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error?.details?.[0]?.reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT") {
              throw new Error(
                'PERMISSIONS_REQUIRED: Necesitas conectar tu Google Calendar para crear eventos. Haz clic en "Conectar Google Calendar" en la parte superior.',
              )
            }
          } catch {
            // If we can't parse the error, fall back to generic message
          }
          throw new Error("No tienes permisos para acceder al calendario. Por favor, conecta tu Google Calendar.")
        }

        throw new Error(`Error de Google Calendar: ${response.status}`)
      }

      const createdEvent = await response.json()

      const { error: insertError } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        google_event_id: createdEvent.id,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start_time: eventData.all_day ? eventData.start.date : eventData.start.dateTime,
        end_time: eventData.all_day ? eventData.end.date : eventData.end.dateTime,
        all_day: eventData.all_day,
        color_id: eventData.colorId || null,
        color_hex: getGoogleCalendarColorHex(eventData.colorId),
      })

      if (insertError) {
        throw new Error(`Error guardando evento: ${insertError.message}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Google Calendar create event error:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEvent = useCallback(async (event: GoogleCalendarEvent) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Usuario no autenticado")
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.provider_token) {
        throw new Error("No se encontraron tokens de Google. Por favor, cierra sesión y vuelve a iniciar.")
      }

      const { data: localEvent, error: fetchError } = await supabase
        .from("calendar_events")
        .select("google_event_id")
        .eq("id", event.id)
        .eq("user_id", user.id)
        .single()

      if (fetchError || !localEvent) {
        throw new Error("Evento no encontrado en la base de datos local")
      }

      if (!localEvent.google_event_id) {
        const { error: updateError } = await supabase
          .from("calendar_events")
          .update({
            title: event.title,
            description: event.description,
            location: event.location,
            start_time: event.all_day ? event.start.date : event.start.dateTime,
            end_time: event.all_day ? event.end.date : event.end.dateTime,
            all_day: event.all_day,
          })
          .eq("id", event.id)
          .eq("user_id", user.id)

        if (updateError) {
          throw new Error(`Error actualizando evento: ${updateError.message}`)
        }
        return
      }

      const googleEvent = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: event.all_day
          ? { date: event.start.date || event.start.dateTime?.split("T")[0] }
          : { dateTime: event.start.dateTime || event.start.date },
        end: event.all_day
          ? { date: event.end.date || event.end.dateTime?.split("T")[0] }
          : { dateTime: event.end.dateTime || event.end.date },
        ...(event.colorId && { colorId: event.colorId }),
        ...(event.recurrence && event.recurrence.length > 0 && { recurrence: event.recurrence }),
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${localEvent.google_event_id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        },
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token de Google expirado. Por favor, cierra sesión y vuelve a iniciar.")
        }

        if (response.status === 403) {
          throw new Error("No tienes permisos para actualizar este evento.")
        }

        if (response.status === 404) {
          throw new Error("Evento no encontrado en Google Calendar. Puede haber sido eliminado.")
        }

        throw new Error(`Error de Google Calendar: ${response.status}`)
      }

      const updatedEvent = await response.json()

      const { error: updateError } = await supabase
        .from("calendar_events")
        .update({
          title: event.title,
          description: event.description,
          location: event.location,
          start_time: event.all_day ? event.start.date : event.start.dateTime,
          end_time: event.all_day ? event.end.date : event.end.dateTime,
          all_day: event.all_day,
          color_id: updatedEvent.colorId || null,
          color_hex: getGoogleCalendarColorHex(updatedEvent.colorId),
        })
        .eq("id", event.id)
        .eq("user_id", user.id)

      if (updateError) {
        throw new Error(`Error actualizando evento: ${updateError.message}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Google Calendar update event error:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteEvent = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Usuario no autenticado")
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.provider_token) {
        throw new Error("No se encontraron tokens de Google. Por favor, cierra sesión y vuelve a iniciar.")
      }

      const { data: localEvent, error: fetchError } = await supabase
        .from("calendar_events")
        .select("google_event_id")
        .eq("id", eventId)
        .eq("user_id", user.id)
        .single()

      if (fetchError || !localEvent) {
        throw new Error("Evento no encontrado en la base de datos local")
      }

      if (localEvent.google_event_id) {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${localEvent.google_event_id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
            },
          },
        )

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Token de Google expirado. Por favor, cierra sesión y vuelve a iniciar.")
          }

          if (response.status === 403) {
            throw new Error("No tienes permisos para eliminar este evento.")
          }

          if (response.status === 404) {
            console.warn("Evento no encontrado en Google Calendar, eliminando solo de la base de datos local")
          } else {
            throw new Error(`Error de Google Calendar: ${response.status}`)
          }
        }
      }

      const { error: deleteError } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId)
        .eq("user_id", user.id)

      if (deleteError) {
        throw new Error(`Error eliminando evento: ${deleteError.message}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Google Calendar delete event error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const syncEvents = useCallback(async (weekStart: Date) => {
    setLoading(true)
    setError(null)

    try {
      console.log("🔍 Iniciando syncEvents...")
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error("❌ Error de usuario:", userError)
        throw new Error("Usuario no autenticado")
      }
      console.log("✅ Usuario autenticado:", user.id)

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.provider_token) {
        console.error("❌ Error de sesión:", sessionError)
        console.log("Session data:", session)
        throw new Error("No se encontraron tokens de Google. Por favor, cierra sesión y vuelve a iniciar.")
      }
      console.log("✅ Sesión con tokens de Google encontrada")

      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const timeMin = weekStart.toISOString()
      const timeMax = weekEnd.toISOString()

      console.log("Sincronizando semana:", {
        weekStart: format(weekStart, "yyyy-MM-dd HH:mm"),
        weekEnd: format(weekEnd, "yyyy-MM-dd HH:mm"),
        timeMin,
        timeMax,
      })

      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
      url.searchParams.set("timeMin", timeMin)
      url.searchParams.set("timeMax", timeMax)
      url.searchParams.set("singleEvents", "true")
      url.searchParams.set("orderBy", "startTime")
      url.searchParams.set("maxResults", "100")

      console.log("🌐 Llamando a Google Calendar API:", url.toString())
      console.log("🔑 Token:", session.provider_token ? "Presente" : "Ausente")

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📡 Respuesta de Google Calendar:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error de Google Calendar:", errorText)

        if (response.status === 401) {
          throw new Error("Token de Google expirado. Por favor, cierra sesión y vuelve a iniciar.")
        }

        if (response.status === 403) {
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error?.details?.[0]?.reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT") {
              throw new Error(
                'PERMISSIONS_REQUIRED: Necesitas conectar tu Google Calendar para sincronizar eventos. Haz clic en "Conectar Google Calendar" en la parte superior.',
              )
            }
          } catch {
            // If we can't parse the error, fall back to generic message
          }
          throw new Error("No tienes permisos para acceder al calendario. Por favor, conecta tu Google Calendar.")
        }

        throw new Error(`Error de Google Calendar: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const events = data.items || []

      console.log(
        `Encontrados ${events.length} eventos en Google Calendar para la semana del ${format(weekStart, "dd/MM")} al ${format(weekEnd, "dd/MM/yyyy")}`,
      )

      const { error: deleteError } = await supabase
        .from("calendar_events")
        .delete()
        .eq("user_id", user.id)
        .gte("start_time", timeMin)
        .lte("start_time", timeMax)

      if (deleteError) {
        throw new Error(`Error eliminando eventos existentes: ${deleteError.message}`)
      }

      const processedEvents = new Map()

      for (const event of events) {
        const eventData = {
          user_id: user.id,
          google_event_id: event.id,
          title: event.summary || "Sin título",
          description: event.description || null,
          location: event.location || null,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          all_day: !event.start.dateTime,
          color_id: event.colorId || null,
          color_hex: getGoogleCalendarColorHex(event.colorId),
        }

        const key = `${eventData.title}_${eventData.start_time}_${eventData.end_time}_${eventData.all_day}`

        if (!processedEvents.has(key)) {
          processedEvents.set(key, eventData)
        }
      }

      const eventsToInsert = Array.from(processedEvents.values())

      if (eventsToInsert.length > 0) {
        const { error: insertError } = await supabase.from("calendar_events").insert(eventsToInsert)

        if (insertError) {
          throw new Error(`Error guardando eventos: ${insertError.message}`)
        }
      }

      console.log(
        `Sincronización completada: ${eventsToInsert.length} eventos únicos insertados para la semana del ${format(weekStart, "dd/MM")} al ${format(weekEnd, "dd/MM/yyyy")}`,
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Google Calendar sync error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const removeDuplicates = useCallback(async (weekStart: Date) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Usuario no autenticado")
      }

      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const timeMin = weekStart.toISOString()
      const timeMax = weekEnd.toISOString()

      const { data: events, error: fetchError } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", timeMin)
        .lte("start_time", timeMax)
        .order("created_at", { ascending: true })

      if (fetchError) {
        throw new Error(`Error obteniendo eventos: ${fetchError.message}`)
      }

      if (!events || events.length === 0) {
        console.log("No hay eventos para limpiar")
        return
      }

      const eventsByKey = new Map()
      const duplicates: string[] = []

      events.forEach((event) => {
        const key = `${event.title}_${event.start_time}_${event.end_time}_${event.all_day}`

        if (eventsByKey.has(key)) {
          duplicates.push(event.id)
        } else {
          eventsByKey.set(key, event)
        }
      })

      if (duplicates.length > 0) {
        console.log(`Encontrados ${duplicates.length} eventos duplicados de ${events.length} total`)

        const batchSize = 100
        for (let i = 0; i < duplicates.length; i += batchSize) {
          const batch = duplicates.slice(i, i + batchSize)
          const { error: deleteError } = await supabase.from("calendar_events").delete().in("id", batch)

          if (deleteError) {
            console.error(`Error eliminando lote ${i}-${i + batchSize}:`, deleteError)
          }
        }

        console.log(`${duplicates.length} eventos duplicados eliminados`)
      } else {
        console.log("No se encontraron eventos duplicados")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error removing duplicates:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const removeAllDuplicates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Usuario no autenticado")
      }

      const { data: events, error: fetchError } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (fetchError) {
        throw new Error(`Error obteniendo eventos: ${fetchError.message}`)
      }

      if (!events || events.length === 0) {
        console.log("No hay eventos para limpiar")
        return
      }

      const eventsByKey = new Map()
      const duplicates: string[] = []

      events.forEach((event) => {
        const key = `${event.title}_${event.start_time}_${event.end_time}_${event.all_day}`

        if (eventsByKey.has(key)) {
          duplicates.push(event.id)
        } else {
          eventsByKey.set(key, event)
        }
      })

      if (duplicates.length > 0) {
        console.log(`Encontrados ${duplicates.length} eventos duplicados de ${events.length} total`)

        const batchSize = 100
        for (let i = 0; i < duplicates.length; i += batchSize) {
          const batch = duplicates.slice(i, i + batchSize)
          const { error: deleteError } = await supabase.from("calendar_events").delete().in("id", batch)

          if (deleteError) {
            console.error(`Error eliminando lote ${i}-${i + batchSize}:`, deleteError)
          }
        }

        console.log(`${duplicates.length} eventos duplicados eliminados`)
      } else {
        console.log("No se encontraron eventos duplicados")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error removing all duplicates:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateColorEvent = useCallback(async (googleEventId: string, colorId: string) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Usuario no autenticado")
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.provider_token) {
        throw new Error("No se encontraron tokens de Google. Por favor, cierra sesión y vuelve a iniciar.")
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}?colorId=${colorId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ colorId }),
        },
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token de Google expirado. Por favor, cierra sesión y vuelve a iniciar.")
        }

        if (response.status === 403) {
          throw new Error("No tienes permisos para actualizar este evento.")
        }

        if (response.status === 404) {
          throw new Error("Evento no encontrado en Google Calendar.")
        }

        throw new Error(`Error de Google Calendar: ${response.status}`)
      }

      console.log("[v0] Color actualizado en Google Calendar")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("[v0] Error updating event color in Google Calendar:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    syncEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    clearError,
    removeDuplicates,
    removeAllDuplicates,
    updateColorEvent,
  }
}
