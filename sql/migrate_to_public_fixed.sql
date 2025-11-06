-- ============================================
-- MIGRACIÓN CORREGIDA: Mover tablas a public schema
-- ============================================

-- 1. Eliminar tablas antiguas si existen en public
DROP TABLE IF EXISTS public.calendar_reminders CASCADE;
DROP TABLE IF EXISTS public.calendar_attendees CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.calendar_calendars CASCADE;

-- 2. Crear tabla de calendarios en public
CREATE TABLE public.calendar_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  is_primary boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  external_provider text,
  external_provider_email text, -- Email de la cuenta del proveedor (ej: juan@gmail.com, trabajo@empresa.com)
  external_calendar_id text,
  external_sync_token text,
  external_access_token text, -- Token de acceso específico para esta cuenta
  external_refresh_token text, -- Token de refresh para renovar el access token
  external_token_expires_at timestamptz, -- Cuándo expira el token
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Crear tabla de eventos en public
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES public.calendar_calendars(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day boolean DEFAULT false,
  timezone text DEFAULT 'UTC',
  recurrence_rule text,
  external_event_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Crear tabla de asistentes en public
CREATE TABLE public.calendar_attendees (
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text DEFAULT 'TENTATIVE',
  is_organizer boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (event_id, email)
);

-- 5. Crear tabla de recordatorios en public
CREATE TABLE public.calendar_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  method text NOT NULL,
  minutes_before integer NOT NULL
);

-- 6. Copiar datos existentes especificando columnas explícitamente
DO $$
BEGIN
  -- Copiar calendarios (especificando columnas explícitamente)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'calendar' AND table_name = 'calendars') THEN
    INSERT INTO public.calendar_calendars (
      id,
      owner_id,
      name,
      color,
      is_primary,
      is_favorite,
      is_visible,
      external_provider,
      external_calendar_id,
      external_sync_token,
      metadata,
      created_at,
      updated_at
    )
    SELECT 
      id,
      owner_id,
      name,
      color,
      COALESCE(is_primary, false),
      COALESCE(is_favorite, false),
      COALESCE(is_visible, true),
      external_provider,
      external_calendar_id,
      external_sync_token,
      COALESCE(metadata, '{}'::jsonb),
      COALESCE(created_at, now()),
      COALESCE(updated_at, now())
    FROM calendar.calendars;
    
    RAISE NOTICE 'Calendarios migrados desde calendar.calendars';
  END IF;

  -- Copiar eventos (especificando columnas explícitamente)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'calendar' AND table_name = 'events') THEN
    INSERT INTO public.calendar_events (
      id,
      calendar_id,
      title,
      description,
      location,
      start_time,
      end_time,
      is_all_day,
      timezone,
      recurrence_rule,
      external_event_id,
      metadata,
      created_at,
      updated_at
    )
    SELECT 
      id,
      calendar_id,
      title,
      description,
      location,
      start_time,
      end_time,
      COALESCE(is_all_day, false),
      COALESCE(timezone, 'UTC'),
      recurrence_rule,
      external_event_id,
      COALESCE(metadata, '{}'::jsonb),
      COALESCE(created_at, now()),
      COALESCE(updated_at, now())
    FROM calendar.events;
    
    RAISE NOTICE 'Eventos migrados desde calendar.events';
  END IF;

  -- Copiar asistentes (especificando columnas explícitamente)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'calendar' AND table_name = 'attendees') THEN
    INSERT INTO public.calendar_attendees (
      event_id,
      user_id,
      email,
      status,
      is_organizer,
      metadata
    )
    SELECT 
      event_id,
      user_id,
      email,
      COALESCE(status, 'TENTATIVE'),
      COALESCE(is_organizer, false),
      COALESCE(metadata, '{}'::jsonb)
    FROM calendar.attendees;
    
    RAISE NOTICE 'Asistentes migrados desde calendar.attendees';
  END IF;

  -- Copiar recordatorios
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'calendar' AND table_name = 'reminders') THEN
    -- Primero verificar la estructura de la tabla reminders
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'calendar' 
      AND table_name = 'reminders' 
      AND column_name = 'minutes_before'
    ) THEN
      -- Nueva estructura con minutes_before
      INSERT INTO public.calendar_reminders (
        id,
        event_id,
        method,
        minutes_before
      )
      SELECT 
        id,
        event_id,
        method,
        minutes_before
      FROM calendar.reminders;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'calendar' 
      AND table_name = 'reminders' 
      AND column_name = 'value'
    ) THEN
      -- Estructura antigua con value y unit
      INSERT INTO public.calendar_reminders (
        id,
        event_id,
        method,
        minutes_before
      )
      SELECT 
        id,
        event_id,
        method,
        CASE 
          WHEN unit = 'minutes' THEN value
          WHEN unit = 'hours' THEN value * 60
          WHEN unit = 'days' THEN value * 1440
          ELSE value
        END as minutes_before
      FROM calendar.reminders;
    END IF;
    
    RAISE NOTICE 'Recordatorios migrados desde calendar.reminders';
  END IF;
END $$;

-- 7. Crear índices
CREATE INDEX idx_calendar_calendars_owner_id ON public.calendar_calendars(owner_id);
CREATE INDEX idx_calendar_calendars_external_provider ON public.calendar_calendars(external_provider);
CREATE INDEX idx_calendar_events_calendar_id ON public.calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_external_event_id ON public.calendar_events(external_event_id);
CREATE INDEX idx_calendar_attendees_user_id ON public.calendar_attendees(user_id);
CREATE INDEX idx_calendar_attendees_email ON public.calendar_attendees(email);

-- Índices GIN para JSONB
CREATE INDEX idx_calendar_calendars_metadata_gin ON public.calendar_calendars USING GIN (metadata);
CREATE INDEX idx_calendar_events_metadata_gin ON public.calendar_events USING GIN (metadata);

-- 8. Índice único para evitar duplicados de Google Calendar
-- Un usuario puede tener el mismo calendario de Google solo una vez
-- PERO puede tener calendarios de diferentes cuentas de Google
CREATE UNIQUE INDEX idx_calendar_calendars_unique_external 
  ON public.calendar_calendars(owner_id, external_provider, external_provider_email, external_calendar_id)
  WHERE external_calendar_id IS NOT NULL AND external_provider IS NOT NULL;

-- Índice para búsqueda por email del proveedor
CREATE INDEX idx_calendar_calendars_provider_email 
  ON public.calendar_calendars(external_provider, external_provider_email)
  WHERE external_provider_email IS NOT NULL;

-- 9. Habilitar RLS
ALTER TABLE public.calendar_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;

-- 10. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view their own calendars" ON public.calendar_calendars;
DROP POLICY IF EXISTS "Users can insert their own calendars" ON public.calendar_calendars;
DROP POLICY IF EXISTS "Users can update their own calendars" ON public.calendar_calendars;
DROP POLICY IF EXISTS "Users can delete their own calendars" ON public.calendar_calendars;
DROP POLICY IF EXISTS "Users can view events from their calendars" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert events in their calendars" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update events in their calendars" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete events in their calendars" ON public.calendar_events;

-- 11. Crear políticas RLS

-- Políticas para calendar_calendars
CREATE POLICY "Users can view their own calendars"
  ON public.calendar_calendars FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own calendars"
  ON public.calendar_calendars FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own calendars"
  ON public.calendar_calendars FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own calendars"
  ON public.calendar_calendars FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Políticas para calendar_events
CREATE POLICY "Users can view events from their calendars"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_calendars
      WHERE calendar_calendars.id = calendar_events.calendar_id
      AND calendar_calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events in their calendars"
  ON public.calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_calendars
      WHERE calendar_calendars.id = calendar_id
      AND calendar_calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events in their calendars"
  ON public.calendar_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_calendars
      WHERE calendar_calendars.id = calendar_id
      AND calendar_calendars.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_calendars
      WHERE calendar_calendars.id = calendar_id
      AND calendar_calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events in their calendars"
  ON public.calendar_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_calendars
      WHERE calendar_calendars.id = calendar_id
      AND calendar_calendars.owner_id = auth.uid()
    )
  );

-- Políticas para calendar_attendees
CREATE POLICY "Users can view their own attendance"
  ON public.calendar_attendees FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      JOIN public.calendar_calendars c ON c.id = e.calendar_id
      WHERE e.id = event_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Calendar owners can manage attendees"
  ON public.calendar_attendees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      JOIN public.calendar_calendars c ON c.id = e.calendar_id
      WHERE e.id = event_id AND c.owner_id = auth.uid()
    )
  );

-- Políticas para calendar_reminders
CREATE POLICY "Users can manage reminders for their events"
  ON public.calendar_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      JOIN public.calendar_calendars c ON c.id = e.calendar_id
      WHERE e.id = event_id AND c.owner_id = auth.uid()
    )
  );

-- 12. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_calendars_updated_at
  BEFORE UPDATE ON public.calendar_calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 13. Verificación final
SELECT 
  'calendar_calendars' as table_name,
  COUNT(*) as row_count
FROM public.calendar_calendars
UNION ALL
SELECT 
  'calendar_events',
  COUNT(*)
FROM public.calendar_events
UNION ALL
SELECT 
  'calendar_attendees',
  COUNT(*)
FROM public.calendar_attendees
UNION ALL
SELECT 
  'calendar_reminders',
  COUNT(*)
FROM public.calendar_reminders;

-- 14. Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '✅ Tablas creadas en schema public con prefijo calendar_';
  RAISE NOTICE '✅ Datos migrados correctamente';
  RAISE NOTICE '✅ RLS habilitado y políticas creadas';
  RAISE NOTICE '✅ Índices creados';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Ya puedes usar el calendario!';
END $$;

