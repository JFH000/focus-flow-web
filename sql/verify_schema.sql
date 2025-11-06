-- ============================================
-- VERIFICACIÓN: Estado del Esquema Calendar
-- ============================================

-- 1. Verificar que las tablas existen
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'calendar'
ORDER BY table_name;

-- 2. Verificar columnas de calendar.calendars
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'calendar' AND table_name = 'calendars'
ORDER BY ordinal_position;

-- 3. Verificar constraints y claves
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'calendar' 
  AND tc.table_name = 'calendars'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 4. Verificar índices únicos
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'calendar' 
  AND tablename = 'calendars';

-- 5. Verificar RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'calendar';

-- 6. Probar inserción directa (con tu user_id)
-- REEMPLAZA 'tu-user-id-aquí' con tu ID real de usuario
/*
INSERT INTO calendar.calendars (
  owner_id,
  name,
  color,
  is_primary,
  is_favorite,
  is_visible
) VALUES (
  'tu-user-id-aquí',
  'Test Calendar',
  '#3b82f6',
  false,
  false,
  true
) RETURNING *;
*/

-- 7. Ver si hay datos existentes
SELECT 
  id,
  owner_id,
  name,
  is_primary,
  is_visible,
  external_provider,
  created_at
FROM calendar.calendars
LIMIT 5;

