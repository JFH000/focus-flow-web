-- ============================================
-- AGREGAR USER_ID A CALENDAR_EVENTS
-- ============================================
-- Agrega referencia directa del usuario a los eventos
-- para facilitar consultas y mejorar rendimiento

-- 1. Agregar columna user_id
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Poblar user_id desde calendar_calendars (para eventos existentes)
UPDATE public.calendar_events e
SET user_id = c.owner_id
FROM public.calendar_calendars c
WHERE e.calendar_id = c.id
  AND e.user_id IS NULL;

-- 3. Hacer user_id NOT NULL después de poblar
ALTER TABLE public.calendar_events 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Crear índice para mejorar rendimiento de queries por usuario
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id 
  ON public.calendar_events(user_id);

-- 5. Crear índice compuesto para queries comunes
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time 
  ON public.calendar_events(user_id, start_time, end_time);

-- 6. Actualizar políticas RLS para usar user_id directamente
DROP POLICY IF EXISTS "Users can view own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.calendar_events;

-- Política SELECT: Ver eventos propios (verifica user_id directamente)
CREATE POLICY "Users can view own events"
  ON public.calendar_events
  FOR SELECT
  USING (user_id = auth.uid());

-- Política INSERT: Crear eventos propios
CREATE POLICY "Users can insert own events"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política UPDATE: Actualizar eventos propios
CREATE POLICY "Users can update own events"
  ON public.calendar_events
  FOR UPDATE
  USING (user_id = auth.uid());

-- Política DELETE: Eliminar eventos propios
CREATE POLICY "Users can delete own events"
  ON public.calendar_events
  FOR DELETE
  USING (user_id = auth.uid());

-- 7. Función helper para obtener eventos del usuario
CREATE OR REPLACE FUNCTION public.get_user_events_in_range(
  p_user_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
RETURNS TABLE (
  id uuid,
  calendar_id uuid,
  title text,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  is_all_day boolean,
  calendar_name text,
  calendar_color text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.calendar_id,
    e.title,
    e.description,
    e.location,
    e.start_time,
    e.end_time,
    e.is_all_day,
    c.name as calendar_name,
    c.color as calendar_color
  FROM public.calendar_events e
  INNER JOIN public.calendar_calendars c ON e.calendar_id = c.id
  WHERE e.user_id = p_user_id
    AND e.start_time <= p_end_time
    AND e.end_time >= p_start_time
  ORDER BY e.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Verificar la estructura
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'calendar_events'
  AND column_name IN ('user_id', 'calendar_id')
ORDER BY ordinal_position;

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Columna user_id agregada a calendar_events';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Beneficios:';
  RAISE NOTICE '   - Consultas más rápidas (índice directo por user_id)';
  RAISE NOTICE '   - RLS más eficiente (sin JOIN)';
  RAISE NOTICE '   - Funciones helper para queries complejas';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Índices creados:';
  RAISE NOTICE '   - idx_calendar_events_user_id';
  RAISE NOTICE '   - idx_calendar_events_user_time';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ahora puedes consultar eventos directamente:';
  RAISE NOTICE '   SELECT * FROM calendar_events WHERE user_id = auth.uid();';
END $$;

