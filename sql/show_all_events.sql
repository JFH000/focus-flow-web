-- ============================================
-- VER TODOS LOS EVENTOS (sin filtros)
-- ============================================

-- 1. TODOS los eventos que tienes (sin importar fecha)
SELECT 
  e.id,
  e.title,
  TO_CHAR(e.start_time AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI') as inicio_colombia,
  TO_CHAR(e.start_time, 'YYYY-MM-DD HH24:MI:SS "UTC"') as inicio_utc,
  TO_CHAR(e.end_time, 'YYYY-MM-DD HH24:MI:SS "UTC"') as fin_utc,
  e.is_all_day,
  c.name as calendario,
  c.is_visible,
  c.external_provider_email
FROM public.calendar_events e
JOIN public.calendar_calendars c ON c.id = e.calendar_id
WHERE c.owner_id = auth.uid()
ORDER BY e.start_time DESC;

-- 2. Rango de fechas de tus eventos
SELECT 
  MIN(start_time) as evento_mas_antiguo,
  MAX(start_time) as evento_mas_reciente,
  COUNT(*) as total_eventos
FROM public.calendar_events e
JOIN public.calendar_calendars c ON c.id = e.calendar_id
WHERE c.owner_id = auth.uid();

-- 3. Ver si los eventos están en noviembre 2025
SELECT 
  e.title,
  e.start_time,
  e.end_time,
  c.name as calendario,
  c.is_visible
FROM public.calendar_events e
JOIN public.calendar_calendars c ON c.id = e.calendar_id
WHERE c.owner_id = auth.uid()
  AND e.start_time >= '2025-11-01'
  AND e.start_time < '2025-12-01'
ORDER BY e.start_time;

-- 4. Verificar calendarios visibles
SELECT 
  id,
  name,
  is_visible,
  external_provider_email,
  (SELECT COUNT(*) FROM public.calendar_events WHERE calendar_id = calendar_calendars.id) as num_eventos
FROM public.calendar_calendars
WHERE owner_id = auth.uid()
ORDER BY name;

