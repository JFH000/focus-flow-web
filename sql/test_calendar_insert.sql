-- ============================================
-- TEST: Verificar que podemos crear calendarios
-- ============================================

-- 1. Verificar tu user_id
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver calendarios existentes
SELECT 
  id,
  owner_id,
  name,
  external_provider,
  external_calendar_id,
  is_visible,
  created_at
FROM public.calendar_calendars
ORDER BY created_at DESC;

-- 3. Prueba manual de inserción
-- REEMPLAZA 'TU-USER-ID-AQUÍ' con tu ID real de la query anterior

/*
-- Test 1: Calendario propio (sin proveedor externo)
INSERT INTO public.calendar_calendars (
  owner_id,
  name,
  color,
  is_primary,
  is_visible
) VALUES (
  'TU-USER-ID-AQUÍ',
  'Test - Mi Calendario',
  '#3b82f6',
  true,
  true
) RETURNING *;

-- Test 2: Calendario de Google
INSERT INTO public.calendar_calendars (
  owner_id,
  name,
  color,
  is_primary,
  is_visible,
  external_provider,
  external_calendar_id
) VALUES (
  'TU-USER-ID-AQUÍ',
  'Test - Google Calendar',
  '#ff0000',
  false,
  true,
  'google',
  'test-gcal-id-123'
) RETURNING *;
*/

-- 4. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('calendar_calendars', 'calendar_events')
ORDER BY tablename, policyname;

-- 5. Verificar permisos en las tablas
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name LIKE 'calendar_%'
  AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;

