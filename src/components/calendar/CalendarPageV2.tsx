"use client"

import type React from "react"
import { useCalendars } from "@/hooks/useCalendars"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { createClient } from "@/lib/supabase/client"
import type { CalendarEvent } from "@/types/database"
import { addDays, endOfWeek, format, isSameDay, startOfDay, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import AppLayout from "../AppLayout"
import ProtectedRoute from "../ProtectedRoute"
import CalendarSelector from "./CalendarSelector"
import CreateCalendarModal from "./CreateCalendarModal"
import { toast } from "sonner"

interface CalendarPageProps {
  isDashboard?: boolean
}

// Función helper para obtener el rango de la semana
function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const end = endOfWeek(date, { weekStartsOn: 0 })
  return { start, end }
}

export default function CalendarPageV2({ isDashboard = false }: CalendarPageProps = {}) {
  const [anchor, setAnchor] = useState(startOfDay(new Date()))
  const { start, end } = useMemo(() => getWeekRange(anchor), [anchor])
  
  // Hooks
  const {
    calendars,
    visibleCalendars,
    refreshCalendars,
    createCalendar: createCalendarFn,
    loading: calendarsLoading,
    toggleCalendarVisibility,
    setPrimaryCalendar,
    toggleCalendarFavorite,
    deleteCalendar,
  } = useCalendars()
  const { 
    syncGoogleCalendars,
    syncCalendarEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    loading: googleLoading,
    error: googleError,
    clearError: clearGoogleError,
  } = useGoogleCalendar()
  const { session, connectGoogleCalendar, loading: authLoading } = useAuth()

  // Estado local
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateCalendarModal, setShowCreateCalendarModal] = useState(false)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [hasCalendarAccess, setHasCalendarAccess] = useState(false)
  const [showSyncMenu, setShowSyncMenu] = useState(false)

  // Verificar acceso a Google Calendar
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

        setHasCalendarAccess(response.ok)
      } catch (error) {
        console.error("Error checking calendar access:", error)
        setHasCalendarAccess(false)
      }
    }

    checkCalendarAccess()
  }, [session])

  useEffect(() => {
    if (googleError) {
      toast.error(googleError)
      clearGoogleError()
    }
  }, [googleError, clearGoogleError])

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

      const { data, error } = await supabase
        .from("calendar_events")
        .select(`
          *,
          calendar:calendar_id (
            id,
            name,
            color,
            external_provider
          )
        `)
        .in("calendar_id", visibleCalendarIds)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time", { ascending: true })

      if (error) {
        console.error("Error fetching events:", error)
        throw error
      }

      setEvents(data || [])
    } catch (error) {
      console.error("Error in fetchEvents:", error)
    } finally {
      setLoading(false)
    }
  }, [start, end])

  // Cargar eventos cuando cambie la semana o los calendarios visibles
  useEffect(() => {
    fetchEvents()
  }, [start, end, visibleCalendars.length])

  useEffect(() => {
    const handleExternalCalendarRefresh = () => {
      console.log("🔁 Evento externo calendar:refresh recibido, actualizando eventos (V2)...")
      fetchEvents()
    }

    window.addEventListener("calendar:refresh", handleExternalCalendarRefresh)

    return () => {
      window.removeEventListener("calendar:refresh", handleExternalCalendarRefresh)
    }
  }, [fetchEvents])

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

  // Sincronizar calendarios de Google
  const handleSyncAllEvents = useCallback(async () => {
    if (!hasCalendarAccess) {
      toast.error("Necesitas conectar tu Google Calendar primero")
      return
    }

    const toastId = toast.loading("Sincronizando eventos...")
    try {
      await syncAllCalendarsInternal(start)
      await fetchEvents()
      toast.success("Eventos sincronizados", { id: toastId })
    } catch (error) {
      console.error("Error syncing events:", error)
      toast.error("Error al sincronizar eventos", { id: toastId })
    }
  }, [hasCalendarAccess, syncAllCalendarsInternal, start, fetchEvents])

  const handleSyncGoogleCalendars = useCallback(async () => {
    if (!hasCalendarAccess) {
      toast.error("Necesitas conectar tu Google Calendar primero")
      return
    }

    const toastId = toast.loading("Sincronizando calendarios de Google...")
    try {
      await syncGoogleCalendars()
      await refreshCalendars()
      toast.success("Calendarios sincronizados", { id: toastId })
    } catch (error) {
      console.error("Error syncing Google calendars:", error)
      toast.error("Error al sincronizar calendarios", { id: toastId })
    }
  }, [hasCalendarAccess, syncGoogleCalendars, refreshCalendars])

  // Auto-sincronización periódica (solo si está conectado a Google y tiene calendarios de Google)
  useEffect(() => {
    if (!hasCalendarAccess) return

    // Verificar si hay calendarios de Google
    const hasGoogleCalendars = calendars.some(c => c.external_provider === 'google')
    if (!hasGoogleCalendars) return

    console.log("Auto-sincronización habilitada para calendarios de Google")

    const interval = setInterval(() => {
      console.log("Ejecutando auto-sincronización...")
      syncAllCalendarsInternal(start).then(() => {
        fetchEvents()
      }).catch(err => {
        console.error("Error en auto-sincronización:", err)
      })
    }, 300000) // 5 minutos

    return () => {
      console.log("Auto-sincronización deshabilitada")
      clearInterval(interval)
    }
  }, [hasCalendarAccess, calendars.length, start])

  // Agrupar eventos por día
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

  const isToday = (d: Date) => isSameDay(d, new Date())

  const calendarContent = (
    <div className={`calendar-container ${isDashboard ? "h-full flex flex-col bg-background overflow-hidden" : "h-full flex flex-col bg-background overflow-hidden"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-3 md:px-6 py-3 md:py-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40 gap-3 md:gap-0">
        {/* Navegación y título */}
        <div className="flex items-center justify-between md:justify-start gap-2">
          <div className="flex items-center gap-1 md:gap-2">
            <button
              className="p-1.5 md:p-2 border border-border rounded-md hover:bg-muted transition-colors"
              onClick={() => setAnchor(addDays(anchor, -7))}
              title="Semana anterior"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="p-1.5 md:p-2 border border-border rounded-md hover:bg-muted transition-colors"
              onClick={() => setAnchor(addDays(anchor, 7))}
              title="Semana siguiente"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              className="p-1.5 md:p-2 border border-border rounded-md hover:bg-muted transition-colors"
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

          {/* Título mobile */}
          <div className="text-center md:hidden">
            <h1 className="text-sm font-semibold">
              {format(start, "d MMM", { locale: es })} – {format(end, "d MMM", { locale: es })}
            </h1>
          </div>
        </div>

        {/* Título Desktop */}
        <div className="hidden md:block text-center">
          <h1 className="text-lg font-semibold">
            {format(start, "d 'de' MMM", { locale: es })} – {format(end, "d 'de' MMM, yyyy", { locale: es })}
          </h1>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Selector de calendarios */}
          <CalendarSelector
            calendars={calendars}
            loading={calendarsLoading}
            toggleCalendarVisibility={toggleCalendarVisibility}
            setPrimaryCalendar={setPrimaryCalendar}
            toggleCalendarFavorite={toggleCalendarFavorite}
            deleteCalendar={deleteCalendar}
            onCreateCalendar={() => setShowCreateCalendarModal(true)}
            onRefreshEvents={fetchEvents}
          />

          {/* Menú de sincronización con proveedores */}
          <div className="relative">
            <button
              onClick={() => setShowSyncMenu(!showSyncMenu)}
              className="px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium"
              title="Sincronizar con proveedores externos"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden md:inline">Sincronizar</span>
            </button>

            {/* Menú dropdown */}
            {showSyncMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSyncMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-20">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Proveedores Externos
                    </div>

                    {/* Google Calendar */}
                    {!hasCalendarAccess ? (
                      <button
                        onClick={() => {
                          setShowSyncMenu(false)
                          connectGoogleCalendar()
                        }}
                        disabled={authLoading}
                        className="w-full px-3 py-2 text-left rounded-md hover:bg-muted transition-colors flex items-center gap-3 disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-red-500 flex items-center justify-center text-white">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Google Calendar</div>
                          <div className="text-xs text-muted-foreground">
                            {authLoading ? "Conectando..." : "Conectar cuenta"}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <div className="px-3 py-2 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-red-500 flex items-center justify-center text-white">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
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

                    {/* Divider */}
                    <div className="my-2 border-t border-border"></div>

                    {/* Info */}
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      <p>Próximamente: Outlook, Apple Calendar</p>
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
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
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

      {/* Vista simple de eventos (placeholder - implementar vista de calendario completa) */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Cargando eventos...
          </div>
        ) : visibleCalendars.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No hay calendarios visibles. Selecciona al menos un calendario.
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No hay eventos esta semana
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const calendar = (event as any).calendar
              return (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border border-border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1 h-full min-h-[3rem] rounded-full"
                      style={{ backgroundColor: calendar?.color || "#3b82f6" }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{event.title}</h3>
                      {calendar && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {calendar.name}
                          {calendar.external_provider && ` • ${calendar.external_provider}`}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(event.start_time), "PPp", { locale: es })}
                      </p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      <CreateCalendarModal
        isOpen={showCreateCalendarModal}
        onClose={() => setShowCreateCalendarModal(false)}
        onSuccess={async () => {
          await refreshCalendars()
          toast.success("Calendario creado correctamente")
        }}
        createCalendar={createCalendarFn}
        loading={calendarsLoading}
      />

      {/* Botón flotante para crear evento */}
      <button
        onClick={() => setShowCreateEventModal(true)}
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

