-- ============================================
-- SOPORTE PARA CALENDARIOS ICS/iCALENDAR
-- ============================================
-- Permite suscribirse a calendarios externos vía URL (.ics)
-- Ejemplos: Bloque Neón, Google Calendar público, eventos deportivos, etc.

-- 1. Actualizar tabla de calendarios para incluir URL ICS
ALTER TABLE public.calendar_calendars 
ADD COLUMN IF NOT EXISTS ics_url text;

ALTER TABLE public.calendar_calendars 
ADD COLUMN IF NOT EXISTS ics_last_sync_at timestamptz;

ALTER TABLE public.calendar_calendars 
ADD COLUMN IF NOT EXISTS ics_sync_interval_minutes integer DEFAULT 60;

-- 2. Comentarios de documentación
COMMENT ON COLUMN public.calendar_calendars.ics_url IS 
  'URL del feed ICS para calendarios suscritos (ej: https://bloqueneon.uniandes.edu.co/...feed.ics)';

COMMENT ON COLUMN public.calendar_calendars.ics_last_sync_at IS 
  'Última vez que se sincronizó este calendario ICS';

COMMENT ON COLUMN public.calendar_calendars.ics_sync_interval_minutes IS 
  'Intervalo de sincronización en minutos (por defecto 60 minutos)';

-- 3. Índice para calendarios ICS
CREATE INDEX IF NOT EXISTS idx_calendar_calendars_ics_url 
  ON public.calendar_calendars(ics_url)
  WHERE ics_url IS NOT NULL;

-- 4. Crear constraint único para URLs ICS
-- Un usuario puede suscribirse a la misma URL solo una vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_calendars_unique_ics_url 
  ON public.calendar_calendars(owner_id, ics_url)
  WHERE ics_url IS NOT NULL;

-- 5. Función para marcar calendarios ICS que necesitan sincronización
CREATE OR REPLACE FUNCTION public.get_calendars_needing_sync()
RETURNS TABLE (
  id uuid,
  name text,
  ics_url text,
  last_sync timestamptz,
  interval_minutes integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.ics_url,
    c.ics_last_sync_at,
    c.ics_sync_interval_minutes
  FROM public.calendar_calendars c
  WHERE c.ics_url IS NOT NULL
    AND c.owner_id = auth.uid()
    AND (
      c.ics_last_sync_at IS NULL 
      OR c.ics_last_sync_at < now() - (c.ics_sync_interval_minutes || ' minutes')::interval
    )
  ORDER BY c.ics_last_sync_at NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ejemplos de calendarios ICS populares
COMMENT ON TABLE public.calendar_calendars IS 
'Soporta múltiples tipos de calendarios:
- Propios: Calendarios creados en Focus Flow
- Google: Sincronizados desde Google Calendar
- ICS/iCalendar: Suscritos desde URLs externas
  
Ejemplos de URLs ICS:
- Bloque Neón Uniandes: https://bloqueneon.uniandes.edu.co/d2l/le/calendar/feed/user/feed.ics?token=...
- Google Calendar público: https://calendar.google.com/calendar/ical/.../public/basic.ics
- Calendarios escolares/empresariales
- Eventos deportivos
- Feriados nacionales';

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Soporte para calendarios ICS añadido';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Nuevas columnas:';
  RAISE NOTICE '   - ics_url: URL del feed ICS';
  RAISE NOTICE '   - ics_last_sync_at: Última sincronización';
  RAISE NOTICE '   - ics_sync_interval_minutes: Intervalo de sync';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Los calendarios ICS se sincronizan automáticamente';
  RAISE NOTICE '   cada N minutos (configurable por calendario)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Casos de uso:';
  RAISE NOTICE '   - Bloque Neón (Uniandes)';
  RAISE NOTICE '   - Calendarios académicos';
  RAISE NOTICE '   - Calendarios públicos de Google';
  RAISE NOTICE '   - Eventos deportivos';
  RAISE NOTICE '   - Feriados nacionales';
END $$;

