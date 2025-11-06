-- ============================================
-- CHECK RÁPIDO: ¿Hay eventos en la BD?
-- ============================================

-- 1. ¿Cuántos calendarios tienes?
SELECT 
  COUNT(*) as total_calendarios,
  COUNT(*) FILTER (WHERE is_visible = true) as calendarios_visibles,
  COUNT(*) FILTER (WHERE external_provider = 'google') as calendarios_google
FROM public.calendar_calendars
WHERE owner_id = auth.uid();

-- 2. ¿Cuántos eventos tienes?
SELECT 
  COUNT(*) as total_eventos
FROM public.calendar_events e
JOIN public.calendar_calendars c ON c.id = e.calendar_id
WHERE c.owner_id = auth.uid();

-- 3. Ver los eventos con nombre del calendario
SELECT 
  e.title,
  e.start_time,
  e.is_all_day,
  c.name as calendario,
  c.is_visible as calendario_visible
FROM public.calendar_events e
JOIN public.calendar_calendars c ON c.id = e.calendar_id
WHERE c.owner_id = auth.uid()
ORDER BY e.start_time DESC
LIMIT 10;

-- 4. Ver eventos de ESTA semana
SELECT 
  e.title,
  TO_CHAR(e.start_time, 'YYYY-MM-DD HH24:MI') as inicio,
  TO_CHAR(e.end_time, 'YYYY-MM-DD HH24:MI') as fin,
  c.name as calendario,
  c.is_visible as visible
FROM public.calendar_events e
JOIN public.calendar_calendars c ON c.id = e.calendar_id
WHERE c.owner_id = auth.uid()
  AND e.start_time >= date_trunc('week', CURRENT_DATE)
  AND e.start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
ORDER BY e.start_time;

-- 5. Si NO HAY EVENTOS, verifica:
-- ¿Sincronizaste calendarios de Google?
SELECT 
  'Calendarios sincronizados' as estado,
  COUNT(*) as cantidad
FROM public.calendar_calendars
WHERE owner_id = auth.uid() 
  AND external_provider = 'google';

-- Si retorna 0, necesitas:
-- 1. Click en "Sincronizar" → "Google Calendar" → Conectar
-- 2. Click en "Sincronizar calendarios"
-- 3. Click en "Sincronizar eventos"

