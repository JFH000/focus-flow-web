-- ============================================
-- DEBUG: Verificar Estado de Eventos
-- ============================================

-- 1. Ver si hay calendarios
SELECT 
  id,
  name,
  external_provider,
  external_provider_email,
  is_visible,
  created_at
FROM public.calendar_calendars
WHERE owner_id = auth.uid()
ORDER BY created_at DESC;

-- 2. Ver si hay eventos en la BD
SELECT 
  e.id,
  e.title,
  e.start_time,
  e.end_time,
  c.name as calendar_name,
  c.external_provider_email
FROM public.calendar_events e
JOIN public.calendar_calendars c ON c.id = e.calendar_id
WHERE c.owner_id = auth.uid()
ORDER BY e.start_time DESC
LIMIT 20;

-- 3. Contar eventos por calendario
SELECT 
  c.name as calendar_name,
  c.external_provider_email,
  COUNT(e.id) as event_count,
  MIN(e.start_time) as earliest_event,
  MAX(e.start_time) as latest_event
FROM public.calendar_calendars c
LEFT JOIN public.calendar_events e ON e.calendar_id = c.id
WHERE c.owner_id = auth.uid()
GROUP BY c.id, c.name, c.external_provider_email
ORDER BY c.name;

-- 4. Ver eventos de esta semana
SELECT 
  e.title,
  e.start_time,
  e.end_time,
  e.is_all_day,
  c.name as calendar_name
FROM public.calendar_events e
JOIN public.calendar_calendars c ON c.id = e.calendar_id
WHERE c.owner_id = auth.uid()
  AND e.start_time >= date_trunc('week', CURRENT_DATE)
  AND e.start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
ORDER BY e.start_time;

-- 5. Verificar RLS en calendar_events
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'calendar_events'
ORDER BY policyname;

-- 6. Test de inserción manual
-- Primero obtén un calendar_id:
/*
SELECT id, name FROM public.calendar_calendars WHERE owner_id = auth.uid() LIMIT 1;

-- Luego prueba insertar un evento:
INSERT INTO public.calendar_events (
  calendar_id,
  title,
  start_time,
  end_time,
  is_all_day,
  timezone
) VALUES (
  'tu-calendar-id-aquí',
  'Evento de Prueba',
  '2025-11-06T10:00:00Z',
  '2025-11-06T11:00:00Z',
  false,
  'UTC'
) RETURNING *;
*/

