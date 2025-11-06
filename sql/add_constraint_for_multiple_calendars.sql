-- ============================================
-- FIX: Constraint para Múltiples Calendarios
-- ============================================
-- Un usuario puede tener múltiples calendarios de Google
-- Pero no puede tener el MISMO calendario duplicado

-- 1. Eliminar índice único antiguo si existe
DROP INDEX IF EXISTS public.idx_calendar_calendars_unique_external;

-- 2. Crear índice único correcto
-- Esto permite: user123 tenga calendario "Trabajo" Y "Personal" Y "Familia"
-- Pero NO permite: user123 tenga calendario "Trabajo" DOS VECES
CREATE UNIQUE INDEX idx_calendar_calendars_unique_external 
  ON public.calendar_calendars(owner_id, external_provider, external_calendar_id)
  WHERE external_calendar_id IS NOT NULL AND external_provider IS NOT NULL;

-- 3. Verificar que el índice se creó correctamente
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'calendar_calendars'
  AND indexname = 'idx_calendar_calendars_unique_external';

-- 4. Prueba de concepto (NO EJECUTAR, solo ejemplo)
/*
-- Esto debería funcionar: Usuario con 3 calendarios diferentes
INSERT INTO public.calendar_calendars (owner_id, name, external_provider, external_calendar_id) VALUES
  ('user-123', 'Trabajo', 'google', 'gcal-id-1'),
  ('user-123', 'Personal', 'google', 'gcal-id-2'),
  ('user-123', 'Familia', 'google', 'gcal-id-3');

-- Esto debería FALLAR: Calendario duplicado
INSERT INTO public.calendar_calendars (owner_id, name, external_provider, external_calendar_id) VALUES
  ('user-123', 'Trabajo Copia', 'google', 'gcal-id-1'); -- ❌ Error: ya existe
*/

DO $$
BEGIN
  RAISE NOTICE '✅ Constraint actualizado correctamente';
  RAISE NOTICE 'ℹ️  Ahora un usuario puede tener múltiples calendarios de Google';
  RAISE NOTICE 'ℹ️  Pero no puede duplicar el mismo calendario';
END $$;

