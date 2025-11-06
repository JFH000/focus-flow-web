-- ============================================
-- HABILITAR SUPABASE REALTIME
-- ============================================
-- Permite que los cambios en las tablas se transmitan
-- en tiempo real a todos los clientes conectados

-- 1. Habilitar Realtime para calendar_calendars
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_calendars;

-- 2. Habilitar Realtime para calendar_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;

-- 3. Habilitar Realtime para calendar_attendees (opcional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_attendees;

-- 4. Habilitar Realtime para calendar_reminders (opcional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_reminders;

-- Verificar que las tablas estén en la publicación
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename LIKE 'calendar_%'
ORDER BY tablename;

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Supabase Realtime habilitado para tablas de calendario';
  RAISE NOTICE '';
  RAISE NOTICE '📡 Ahora los cambios se transmiten en tiempo real:';
  RAISE NOTICE '   - calendar_calendars → Cuando se crea/edita/elimina un calendario';
  RAISE NOTICE '   - calendar_events → Cuando se crea/edita/elimina un evento';
  RAISE NOTICE '   - calendar_attendees → Cuando se agregan/quitan asistentes';
  RAISE NOTICE '   - calendar_reminders → Cuando se configuran recordatorios';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Los componentes se actualizarán automáticamente sin necesidad de recargar';
END $$;

