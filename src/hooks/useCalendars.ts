"use client"

import { createClient } from "@/lib/supabase/client"
import type { Calendar, CalendarInsert, CalendarUpdate, CalendarWithStats } from "@/types/database"
import { useCallback, useEffect, useState, useMemo } from "react"

interface UseCalendarsReturn {
  calendars: Calendar[]
  visibleCalendars: Calendar[]
  loading: boolean
  error: string | null
  createCalendar: (calendar: Omit<CalendarInsert, "owner_id">) => Promise<Calendar>
  updateCalendar: (id: string, updates: CalendarUpdate) => Promise<void>
  deleteCalendar: (id: string) => Promise<void>
  toggleCalendarVisibility: (id: string, isVisible: boolean) => Promise<void>
  toggleCalendarFavorite: (id: string, isFavorite: boolean) => Promise<void>
  setPrimaryCalendar: (id: string) => Promise<void>
  getCalendarStats: () => Promise<CalendarWithStats[]>
  refreshCalendars: () => Promise<void>
}

export function useCalendars(): UseCalendarsReturn {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortCalendars = useCallback((items: Calendar[]) => {
    return [...items].sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1
      }
      return (a.name || "").localeCompare(b.name || "")
    })
  }, [])

  const fetchCalendars = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCalendars([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from("calendar_calendars")
        .select("*")
        .eq("owner_id", user.id)
        .order("is_primary", { ascending: false })
        .order("name", { ascending: true })

      if (fetchError) {
        console.error("Error detallado al cargar calendarios:", fetchError)
        throw new Error(`Error al cargar calendarios: ${fetchError.message || JSON.stringify(fetchError)}`)
      }

      setCalendars(sortCalendars(data || []))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar calendarios"
      setError(errorMessage)
      console.error("Error fetching calendars:", err)
    } finally {
      setLoading(false)
    }
  }, [sortCalendars])

  // Cargar calendarios al iniciar
  useEffect(() => {
    fetchCalendars()
  }, [fetchCalendars])

  // Suscripción en tiempo real a cambios en calendarios
  useEffect(() => {
    const supabase = createClient()
    
    let isMounted = true
    
    // Crear canal de suscripción
    const channel = supabase
      .channel('calendar_calendars_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'calendar_calendars',
        },
        (payload) => {
          console.log('📡 Cambio detectado en calendarios:', payload.eventType)
          // Refrescar calendarios cuando hay cualquier cambio (solo si está montado)
          if (isMounted) {
            fetchCalendars()
          }
        }
      )
      .subscribe()

    // Cleanup: desuscribirse al desmontar
    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [fetchCalendars])

  const createCalendar = useCallback(
    async (calendarData: Omit<CalendarInsert, "owner_id">): Promise<Calendar> => {
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

        const { data, error: insertError } = await supabase
          .from("calendar_calendars")
          .insert({
            ...calendarData,
            owner_id: user.id,
          })
          .select()
          .single()

        if (insertError) {
          console.error("Error detallado al insertar calendario:", {
            error: insertError,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          })
          throw new Error(`No se pudo crear el calendario: ${insertError.message || JSON.stringify(insertError)}`)
        }

        if (data) {
          setCalendars(prev => {
            const withoutNew = prev.filter(cal => cal.id !== data.id)
            return sortCalendars([...withoutNew, data])
          })
        }

        await fetchCalendars()
        return data
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al crear calendario"
        setError(errorMessage)
        console.error("Error creating calendar:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchCalendars, sortCalendars],
  )

  const updateCalendar = useCallback(
    async (id: string, updates: CalendarUpdate) => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { error: updateError } = await supabase
          .from("calendar_calendars")
          .update(updates)
          .eq("id", id)

        if (updateError) {
          throw updateError
        }

        await fetchCalendars()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al actualizar calendario"
        setError(errorMessage)
        console.error("Error updating calendar:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchCalendars],
  )

  const deleteCalendar = useCallback(
    async (id: string) => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        // Verificar que no sea el único calendario
        if (calendars.length === 1) {
          throw new Error("No puedes eliminar tu último calendario")
        }

        // Si es el calendario principal, hacer que otro sea principal primero
        const calendarToDelete = calendars.find((c) => c.id === id)
        if (calendarToDelete?.is_primary) {
          const nextCalendar = calendars.find((c) => c.id !== id)
          if (nextCalendar) {
            await updateCalendar(nextCalendar.id, { is_primary: true })
          }
        }

        const { error: deleteError } = await supabase.from("calendar_calendars").delete().eq("id", id)

        if (deleteError) {
          throw deleteError
        }

        await fetchCalendars()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al eliminar calendario"
        setError(errorMessage)
        console.error("Error deleting calendar:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [calendars, updateCalendar, fetchCalendars],
  )

  const toggleCalendarVisibility = useCallback(
    async (id: string, isVisible: boolean) => {
      try {
        console.log(`👁️ Cambiando visibilidad: ${id} → ${isVisible}`)
        
        // Actualizar optimísticamente el estado local PRIMERO
        setCalendars(prev => {
          const updated = prev.map(cal => 
            cal.id === id ? { ...cal, is_visible: isVisible } : cal
          )
          console.log(`📊 Calendarios actualizados (visibles: ${updated.filter(c => c.is_visible).length})`)
          return updated
        })
        
        // Luego actualizar en la base de datos
        await updateCalendar(id, { is_visible: isVisible })
      } catch (err) {
        console.error("Error toggling calendar visibility:", err)
        // Revertir en caso de error
        await fetchCalendars()
        throw err
      }
    },
    [updateCalendar, fetchCalendars],
  )

  const toggleCalendarFavorite = useCallback(
    async (id: string, isFavorite: boolean) => {
      try {
        await updateCalendar(id, { is_favorite: isFavorite })
      } catch (err) {
        console.error("Error toggling calendar favorite:", err)
        throw err
      }
    },
    [updateCalendar],
  )

  const setPrimaryCalendar = useCallback(
    async (id: string) => {
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

        // Primero, quitar el flag de primary de todos los calendarios
        await supabase
          .from("calendar_calendars")
          .update({ is_primary: false })
          .eq("owner_id", user.id)

        // Luego, establecer el nuevo primary
        const { error: updateError } = await supabase
          .from("calendar_calendars")
          .update({ is_primary: true })
          .eq("id", id)

        if (updateError) {
          throw updateError
        }

        await fetchCalendars()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al establecer calendario principal"
        setError(errorMessage)
        console.error("Error setting primary calendar:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchCalendars],
  )

  const getCalendarStats = useCallback(async (): Promise<CalendarWithStats[]> => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      const { data, error: fetchError } = await supabase.rpc("calendar.get_calendar_stats", {
        user_id_param: user.id,
      })

      if (fetchError) {
        throw fetchError
      }

      return data || []
    } catch (err) {
      console.error("Error getting calendar stats:", err)
      return []
    }
  }, [])

  // Usar useMemo para que visibleCalendars no se recree en cada render
  const visibleCalendars = useMemo(
    () => calendars.filter((c) => c.is_visible),
    [calendars]
  )

  return {
    calendars,
    visibleCalendars,
    loading,
    error,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    toggleCalendarVisibility,
    toggleCalendarFavorite,
    setPrimaryCalendar,
    getCalendarStats,
    refreshCalendars: fetchCalendars,
  }
}

