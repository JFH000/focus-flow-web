"use client"

import { createClient } from "@/lib/supabase/client"
import type { CalendarEventInsert, CalendarInsert } from "@/types/database"
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
  syncGoogleCalendars: () => Promise<void>
  syncCalendarEvents: (calendarId: string, weekStart: Date) => Promise<void>
  syncAllCalendars: (weekStart: Date) => Promise<void>
  createEvent: (calendarId: string, event: Omit<GoogleCalendarEvent, "id" | "summary">) => Promise<void>
  updateEvent: (eventId: string, event: Partial<GoogleCalendarEvent>) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
  updateColorEvent: (externalEventId: string, colorId: string) => Promise<void>
  clearError: () => void
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Sincronizar la lista de calendarios de Google Calendar
   */
  const syncGoogleCalendars = useCallback(async () => {
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
        throw new Error("No se encontraron tokens de Google")
      }

      // Obtener lista de calendarios de Google
      const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token de Google expirado. Por favor, cierra sesión y vuelve a iniciar.")
        }
        if (response.status === 403) {
          throw new Error("PERMISSIONS_REQUIRED: Necesitas permisos de Google Calendar")
        }
        throw new Error(`Error de Google Calendar: ${response.status}`)
      }

      const data = await response.json()
      const googleCalendars = data.items || []

      console.log(`Encontrados ${googleCalendars.length} calendarios en Google Calendar`)

      // Obtener el email de la cuenta actual de Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
        },
      })

      let googleEmail = "unknown@gmail.com"
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json()
        googleEmail = userInfo.email
        console.log(`Sincronizando calendarios de la cuenta: ${googleEmail}`)
      }

      // Calcular fecha de expiración del token (típicamente 1 hora)
      const tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString()

      // Sincronizar cada calendario con la base de datos
      for (const gcal of googleCalendars) {
        try {
          console.log(`Procesando calendario: ${gcal.summary || gcal.id}`)
          
          // Primero verificar si el calendario ya existe (para ESTA cuenta de Google)
          const { data: existingCalendar } = await supabase
            .from("calendar_calendars")
            .select("id")
            .eq("owner_id", user.id)
            .eq("external_calendar_id", gcal.id)
            .eq("external_provider", "google")
            .eq("external_provider_email", googleEmail)
            .single()

          const calendarData = {
            name: gcal.summary || "Sin nombre",
            color: gcal.backgroundColor || "#3b82f6",
            is_primary: gcal.primary || false,
            is_visible: true,
            external_provider: "google",
            external_provider_email: googleEmail,
            external_calendar_id: gcal.id,
            external_sync_token: gcal.syncToken || null,
            external_access_token: session.provider_token,
            external_refresh_token: session.provider_refresh_token || null,
            external_token_expires_at: tokenExpiresAt,
            metadata: {
              etag: gcal.etag,
              access_role: gcal.accessRole,
              time_zone: gcal.timeZone,
              selected: gcal.selected,
              foreground_color: gcal.foregroundColor,
            },
          }

          if (existingCalendar) {
            // Actualizar calendario existente
            const { error: updateError } = await supabase
              .from("calendar_calendars")
              .update({
                name: calendarData.name,
                color: calendarData.color,
                is_primary: calendarData.is_primary,
                external_sync_token: calendarData.external_sync_token,
                external_access_token: calendarData.external_access_token,
                external_refresh_token: calendarData.external_refresh_token,
                external_token_expires_at: calendarData.external_token_expires_at,
                metadata: calendarData.metadata,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingCalendar.id)

            if (updateError) {
              console.error(`❌ Error actualizando calendario "${gcal.summary}":`, {
                error: updateError,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                code: updateError.code
              })
            } else {
              console.log(`✅ Calendario actualizado: "${gcal.summary}"`)
            }
          } else {
            // Crear nuevo calendario
            const { data: newCalendar, error: insertError } = await supabase
              .from("calendar_calendars")
              .insert({
                owner_id: user.id,
                name: calendarData.name,
                color: calendarData.color,
                is_primary: calendarData.is_primary,
                is_visible: calendarData.is_visible,
                external_provider: calendarData.external_provider,
                external_provider_email: calendarData.external_provider_email,
                external_calendar_id: calendarData.external_calendar_id,
                external_sync_token: calendarData.external_sync_token,
                external_access_token: calendarData.external_access_token,
                external_refresh_token: calendarData.external_refresh_token,
                external_token_expires_at: calendarData.external_token_expires_at,
                metadata: calendarData.metadata,
              })
              .select()
              .single()

            if (insertError) {
              console.error(`❌ Error insertando calendario "${gcal.summary}":`, {
                error: insertError,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                code: insertError.code,
                calendarData: {
                  owner_id: user.id,
                  name: calendarData.name,
                  external_provider: calendarData.external_provider,
                  external_calendar_id: calendarData.external_calendar_id,
                }
              })
            } else {
              console.log(`✅ Calendario creado: "${gcal.summary}" (ID: ${newCalendar?.id})`)
            }
          }
        } catch (err) {
          console.error(`Error procesando calendario ${gcal.summary}:`, err)
        }
      }

      console.log("Sincronización de calendarios completada")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Google Calendar sync calendars error:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sincronizar eventos de un calendario específico
   */
  const syncCalendarEvents = useCallback(async (calendarId: string, weekStart: Date) => {
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

      // Obtener información del calendario
      const { data: calendar, error: calendarError } = await supabase
        .from("calendar_calendars")
        .select("*")
        .eq("id", calendarId)
        .single()

      if (calendarError || !calendar) {
        throw new Error("Calendario no encontrado")
      }

      if (calendar.external_provider !== "google" || !calendar.external_calendar_id) {
        // No es un calendario de Google, saltar
        return
      }

      // Usar el token almacenado en el calendario (específico para esta cuenta)
      let accessToken = calendar.external_access_token

      // Si no hay token o está expirado, usar el de la sesión actual
      if (!accessToken || (calendar.external_token_expires_at && new Date(calendar.external_token_expires_at) < new Date())) {
        console.log(`Token expirado para ${calendar.name}, usando token de sesión actual`)
        
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.provider_token) {
          throw new Error(`No hay token válido para sincronizar "${calendar.name}". Vuelve a conectar la cuenta ${calendar.external_provider_email}`)
        }

        accessToken = session.provider_token

        // Actualizar el token en la BD
        await supabase
          .from("calendar_calendars")
          .update({
            external_access_token: accessToken,
            external_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          })
          .eq("id", calendarId)
      }

      // Sincronizar un rango más amplio: desde hace 1 mes hasta dentro de 6 meses
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Hace 1 mes
      const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // Dentro de 6 meses

      console.log(`📅 Sincronizando eventos del calendario "${calendar.name}"`)
      console.log(`   Calendar ID: ${calendar.external_calendar_id}`)
      console.log(`   Email: ${calendar.external_provider_email}`)
      console.log(`   Rango: ${new Date(timeMin).toLocaleDateString()} - ${new Date(timeMax).toLocaleDateString()}`)

      // Construir URL para obtener eventos de Google Calendar
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events`)
      url.searchParams.set("timeMin", timeMin)
      url.searchParams.set("timeMax", timeMax)
      url.searchParams.set("singleEvents", "true")
      url.searchParams.set("orderBy", "startTime")
      url.searchParams.set("maxResults", "2500")

      console.log(`🌐 URL de Google Calendar: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      console.log(`📡 Respuesta de Google: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token de Google expirado")
        }
        if (response.status === 404) {
          console.warn(`Calendario ${calendar.name} no encontrado en Google, puede haber sido eliminado`)
          return
        }
        throw new Error(`Error de Google Calendar: ${response.status}`)
      }

      const data = await response.json()
      const events = data.items || []
      const nextSyncToken = data.nextSyncToken || null

      console.log(`📊 Encontrados ${events.length} eventos en "${calendar.name}"`)
      if (events.length > 0) {
        console.log(`   Primer evento: ${events[0].summary} - ${events[0].start.dateTime || events[0].start.date}`)
        console.log(`   Último evento: ${events[events.length - 1].summary} - ${events[events.length - 1].start.dateTime || events[events.length - 1].start.date}`)
      }
      console.log(`   Next Sync Token:`, nextSyncToken ? `${nextSyncToken.substring(0, 20)}...` : 'null')

      // Eliminar eventos existentes de este calendario (todos, para re-sincronizar)
      console.log(`🗑️ Eliminando eventos antiguos del calendario "${calendar.name}"...`)
      const { error: deleteError, count: deletedCount } = await supabase
        .from("calendar_events")
        .delete({ count: 'exact' })
        .eq("calendar_id", calendarId)
      
      if (deleteError) {
        console.error("Error eliminando eventos antiguos:", deleteError)
      } else {
        console.log(`   ${deletedCount || 0} eventos antiguos eliminados`)
      }

      // Insertar nuevos eventos
      const eventsToInsert: CalendarEventInsert[] = events.map((event: any) => ({
        calendar_id: calendarId,
        title: event.summary || "Sin título",
        description: event.description || null,
        location: event.location || null,
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        is_all_day: !event.start.dateTime,
        timezone: event.start.timeZone || "UTC",
        external_event_id: event.id,
        metadata: {
          color_id: event.colorId,
          color_hex: getGoogleCalendarColorHex(event.colorId),
          html_link: event.htmlLink,
          status: event.status,
          visibility: event.visibility,
          recurrence: event.recurrence,
        },
      }))

      if (eventsToInsert.length > 0) {
        console.log(`Insertando ${eventsToInsert.length} eventos para "${calendar.name}"...`)
        console.log("Primer evento a insertar:", eventsToInsert[0])
        
        const { data: insertedData, error: insertError } = await supabase
          .from("calendar_events")
          .insert(eventsToInsert)
          .select()

        if (insertError) {
          console.error(`❌ Error insertando eventos:`, {
            error: insertError,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          })
          throw insertError
        }
        
        console.log(`✅ ${insertedData?.length || 0} eventos insertados correctamente`)
      } else {
        console.log(`⚠️ No hay eventos para insertar en "${calendar.name}"`)
      }

      // 🔑 IMPORTANTE: Guardar el nextSyncToken para sincronización incremental futura
      if (nextSyncToken) {
        const { error: tokenUpdateError } = await supabase
          .from("calendar_calendars")
          .update({
            external_sync_token: nextSyncToken,
            updated_at: new Date().toISOString(),
          })
          .eq("id", calendarId)

        if (tokenUpdateError) {
          console.error(`Error guardando sync token para "${calendar.name}":`, tokenUpdateError)
        } else {
          console.log(`✅ Sync token guardado para "${calendar.name}"`)
        }
      }

      console.log(`${eventsToInsert.length} eventos sincronizados para "${calendar.name}"`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error syncing calendar events:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sincronizar todos los calendarios visibles del usuario
   */
  const syncAllCalendars = useCallback(
    async (weekStart: Date) => {
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

        // Obtener todos los calendarios del usuario
        const { data: calendars, error: calendarsError } = await supabase
          .from("calendar_calendars")
          .select("*")
          .eq("owner_id", user.id)
          .eq("is_visible", true)

        if (calendarsError) {
          throw calendarsError
        }

        console.log(`Sincronizando ${calendars?.length || 0} calendarios visibles...`)

        // Sincronizar eventos de cada calendario
        for (const calendar of calendars || []) {
          if (calendar.external_provider === "google") {
            await syncCalendarEvents(calendar.id, weekStart)
          }
        }

        console.log("Sincronización de todos los calendarios completada")
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        console.error("Error syncing all calendars:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [syncCalendarEvents],
  )

  /**
   * Crear un evento en un calendario específico
   */
  const createEvent = useCallback(async (calendarId: string, eventData: Omit<GoogleCalendarEvent, "id" | "summary">) => {
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

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.provider_token) {
        throw new Error("No se encontraron tokens de Google")
      }

      // Obtener el calendario
      const { data: calendar, error: calendarError } = await supabase
        .from("calendar_calendars")
        .select("*")
        .eq("id", calendarId)
        .single()

      if (calendarError || !calendar) {
        throw new Error("Calendario no encontrado")
      }

      // Si es un calendario de Google, crear también en Google
      if (calendar.external_provider === "google" && calendar.external_calendar_id) {
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

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(googleEvent),
          },
        )

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Token de Google expirado")
          }
          if (response.status === 403) {
            throw new Error("PERMISSIONS_REQUIRED: No tienes permisos para crear eventos")
          }
          throw new Error(`Error de Google Calendar: ${response.status}`)
        }

        const createdEvent = await response.json()

        // Guardar en la base de datos local
        await supabase.from("calendar_events").insert({
          calendar_id: calendarId,
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start_time: eventData.all_day ? eventData.start.date! : eventData.start.dateTime!,
          end_time: eventData.all_day ? eventData.end.date! : eventData.end.dateTime!,
          is_all_day: eventData.all_day || false,
          timezone: "UTC",
          external_event_id: createdEvent.id,
          metadata: {
            color_id: eventData.colorId,
            color_hex: getGoogleCalendarColorHex(eventData.colorId),
          },
        })
      } else {
        // Calendario propio de la app, solo guardar en BD
        await supabase.from("calendar_events").insert({
          calendar_id: calendarId,
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start_time: eventData.all_day ? eventData.start.date! : eventData.start.dateTime!,
          end_time: eventData.all_day ? eventData.end.date! : eventData.end.dateTime!,
          is_all_day: eventData.all_day || false,
          timezone: "UTC",
          metadata: {
            color_id: eventData.colorId,
            color_hex: getGoogleCalendarColorHex(eventData.colorId),
          },
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error creating event:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Actualizar un evento existente
   */
  const updateEvent = useCallback(async (eventId: string, eventData: Partial<GoogleCalendarEvent>) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.provider_token) {
        throw new Error("No se encontraron tokens de Google")
      }

      // Obtener el evento y el calendario
      const { data: event, error: eventError } = await supabase
        .from("calendar_events")
        .select("*, calendar:calendar_id(*)")
        .eq("id", eventId)
        .single()

      if (eventError || !event) {
        throw new Error("Evento no encontrado")
      }

      const calendar = (event as any).calendar

      // Si es de Google, actualizar también en Google
      if (calendar.external_provider === "google" && event.external_event_id) {
        const googleEvent: any = {}
        if (eventData.title) googleEvent.summary = eventData.title
        if (eventData.description !== undefined) googleEvent.description = eventData.description
        if (eventData.location !== undefined) googleEvent.location = eventData.location
        if (eventData.colorId) googleEvent.colorId = eventData.colorId

        if (eventData.start || eventData.end) {
          if (eventData.all_day) {
            if (eventData.start) googleEvent.start = { date: eventData.start.date || eventData.start.dateTime?.split("T")[0] }
            if (eventData.end) googleEvent.end = { date: eventData.end.date || eventData.end.dateTime?.split("T")[0] }
          } else {
            if (eventData.start) googleEvent.start = { dateTime: eventData.start.dateTime || eventData.start.date }
            if (eventData.end) googleEvent.end = { dateTime: eventData.end.dateTime || eventData.end.date }
          }
        }

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${event.external_event_id}`,
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
          if (response.status === 404) {
            console.warn("Evento no encontrado en Google Calendar, actualizando solo en BD local")
          } else {
            throw new Error(`Error de Google Calendar: ${response.status}`)
          }
        }
      }

      // Actualizar en la base de datos local
      const updates: any = {}
      if (eventData.title) updates.title = eventData.title
      if (eventData.description !== undefined) updates.description = eventData.description
      if (eventData.location !== undefined) updates.location = eventData.location
      if (eventData.start) updates.start_time = eventData.all_day ? eventData.start.date! : eventData.start.dateTime!
      if (eventData.end) updates.end_time = eventData.all_day ? eventData.end.date! : eventData.end.dateTime!
      if (eventData.all_day !== undefined) updates.is_all_day = eventData.all_day

      if (eventData.colorId) {
        updates.metadata = {
          ...event.metadata,
          color_id: eventData.colorId,
          color_hex: getGoogleCalendarColorHex(eventData.colorId),
        }
      }

      await supabase.from("calendar_events").update(updates).eq("id", eventId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error updating event:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Eliminar un evento
   */
  const deleteEvent = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.provider_token) {
        throw new Error("No se encontraron tokens de Google")
      }

      // Obtener el evento y el calendario
      const { data: event, error: eventError } = await supabase
        .from("calendar_events")
        .select("*, calendar:calendar_id(*)")
        .eq("id", eventId)
        .single()

      if (eventError || !event) {
        throw new Error("Evento no encontrado")
      }

      const calendar = (event as any).calendar

      // Si es de Google, eliminar también de Google
      if (calendar.external_provider === "google" && event.external_event_id) {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${event.external_event_id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
            },
          },
        )

        if (!response.ok && response.status !== 404) {
          console.warn("Error eliminando de Google Calendar, continuando con eliminación local")
        }
      }

      // Eliminar de la base de datos local
      await supabase.from("calendar_events").delete().eq("id", eventId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error deleting event:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Actualizar el color de un evento
   */
  const updateColorEvent = useCallback(async (externalEventId: string, colorId: string) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.provider_token) {
        throw new Error("No se encontraron tokens de Google")
      }

      // Obtener el evento
      const { data: event, error: eventError } = await supabase
        .from("calendar_events")
        .select("*, calendar:calendar_id(*)")
        .eq("external_event_id", externalEventId)
        .single()

      if (eventError || !event) {
        throw new Error("Evento no encontrado")
      }

      const calendar = (event as any).calendar

      // Si es de Google, actualizar en Google
      if (calendar.external_provider === "google") {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_calendar_id)}/events/${externalEventId}`,
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
          throw new Error(`Error de Google Calendar: ${response.status}`)
        }
      }

      // Actualizar en BD local
      await supabase
        .from("calendar_events")
        .update({
          metadata: {
            ...event.metadata,
            color_id: colorId,
            color_hex: getGoogleCalendarColorHex(colorId),
          },
        })
        .eq("external_event_id", externalEventId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      console.error("Error updating event color:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    syncGoogleCalendars,
    syncCalendarEvents,
    syncAllCalendars,
    createEvent,
    updateEvent,
    deleteEvent,
    updateColorEvent,
    clearError,
  }
}
