-- ============================================
-- MIGRACIÓN: Sistema de Calendarios Múltiples
-- ============================================
-- Este script migra de calendar_events (tabla plana) 
-- al esquema completo de calendar con soporte para múltiples calendarios

-- Paso 1: Crear el esquema calendar si no existe
CREATE SCHEMA IF NOT EXISTS calendar;

-- Paso 2: Crear tabla de calendarios
CREATE TABLE IF NOT EXISTS calendar.calendars (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  is_primary boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  external_provider text, -- 'google', 'outlook', 'apple', null para calendarios propios
  external_calendar_id text, -- ID del calendario en el proveedor externo
  external_sync_token text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT calendars_pkey PRIMARY KEY (id),
  CONSTRAINT calendars_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Paso 3: Crear tabla de eventos
CREATE TABLE IF NOT EXISTS calendar.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  is_all_day boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'UTC',
  recurrence_rule text,
  external_event_id text, -- ID del evento en el proveedor externo
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES calendar.calendars(id) ON DELETE CASCADE
);

-- Paso 4: Crear tabla de asistentes
CREATE TABLE IF NOT EXISTS calendar.attendees (
  event_id uuid NOT NULL,
  user_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'TENTATIVE', -- 'ACCEPTED', 'DECLINED', 'TENTATIVE', 'NEEDS_ACTION'
  is_organizer boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT attendees_pkey PRIMARY KEY (event_id, email),
  CONSTRAINT attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES calendar.events(id) ON DELETE CASCADE,
  CONSTRAINT attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Paso 5: Crear tabla de recordatorios
CREATE TABLE IF NOT EXISTS calendar.reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  method text NOT NULL, -- 'email', 'popup', 'sms'
  minutes_before integer NOT NULL,
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_event_id_fkey FOREIGN KEY (event_id) REFERENCES calendar.events(id) ON DELETE CASCADE
);

-- Paso 6: Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_calendars_owner_id ON calendar.calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendars_external_provider ON calendar.calendars(external_provider);
CREATE INDEX IF NOT EXISTS idx_events_calendar_id ON calendar.events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON calendar.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_external_event_id ON calendar.events(external_event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_user_id ON calendar.attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON calendar.attendees(email);

-- Índices GIN para búsquedas en JSONB
CREATE INDEX IF NOT EXISTS idx_calendars_metadata_gin ON calendar.calendars USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_events_metadata_gin ON calendar.events USING GIN (metadata);

-- Paso 7: Migrar datos existentes de calendar_events
-- Primero, crear un calendario por defecto para cada usuario que tenga eventos
DO $$
DECLARE
  user_record RECORD;
  new_calendar_id uuid;
BEGIN
  -- Por cada usuario con eventos en la tabla antigua
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.calendar_events
  LOOP
    -- Crear un calendario por defecto llamado "Mi Calendario"
    INSERT INTO calendar.calendars (
      owner_id, 
      name, 
      color, 
      is_primary, 
      is_visible,
      external_provider
    )
    VALUES (
      user_record.user_id,
      'Mi Calendario',
      '#3b82f6', -- Azul por defecto
      true,
      true,
      'google' -- Asumimos que son de Google si tienen google_event_id
    )
    RETURNING id INTO new_calendar_id;

    -- Migrar los eventos de este usuario al nuevo calendario
    INSERT INTO calendar.events (
      calendar_id,
      title,
      description,
      location,
      start_time,
      end_time,
      is_all_day,
      timezone,
      external_event_id,
      created_at,
      metadata
    )
    SELECT 
      new_calendar_id,
      title,
      description,
      location,
      start_time,
      end_time,
      all_day,
      'UTC', -- Default timezone
      google_event_id,
      created_at,
      jsonb_build_object(
        'color_id', color_id,
        'color_hex', color_hex,
        'migrated_from', 'calendar_events',
        'original_id', id
      )
    FROM public.calendar_events
    WHERE user_id = user_record.user_id;

    RAISE NOTICE 'Migrated events for user %', user_record.user_id;
  END LOOP;
END $$;

-- Paso 8: Crear políticas RLS (Row Level Security)

-- Habilitar RLS en todas las tablas
ALTER TABLE calendar.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar.reminders ENABLE ROW LEVEL SECURITY;

-- Políticas para calendar.calendars
CREATE POLICY "Users can view their own calendars"
  ON calendar.calendars FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own calendars"
  ON calendar.calendars FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own calendars"
  ON calendar.calendars FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own calendars"
  ON calendar.calendars FOR DELETE
  USING (auth.uid() = owner_id);

-- Políticas para calendar.events
CREATE POLICY "Users can view events from their calendars"
  ON calendar.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = events.calendar_id
      AND calendars.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM calendar.attendees
      WHERE attendees.event_id = events.id
      AND attendees.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events in their calendars"
  ON calendar.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = calendar_id
      AND calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events in their calendars"
  ON calendar.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = calendar_id
      AND calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events in their calendars"
  ON calendar.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = calendar_id
      AND calendars.owner_id = auth.uid()
    )
  );

-- Políticas para calendar.attendees
CREATE POLICY "Users can view their own attendance"
  ON calendar.attendees FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM calendar.events e
      JOIN calendar.calendars c ON c.id = e.calendar_id
      WHERE e.id = event_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Calendar owners can manage attendees"
  ON calendar.attendees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar.events e
      JOIN calendar.calendars c ON c.id = e.calendar_id
      WHERE e.id = event_id AND c.owner_id = auth.uid()
    )
  );

-- Políticas para calendar.reminders
CREATE POLICY "Users can manage reminders for their events"
  ON calendar.reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar.events e
      JOIN calendar.calendars c ON c.id = e.calendar_id
      WHERE e.id = event_id AND c.owner_id = auth.uid()
    )
  );

-- Paso 9: Crear funciones útiles

-- Función para obtener todos los eventos visibles del usuario en un rango de tiempo
CREATE OR REPLACE FUNCTION calendar.get_visible_events(
  user_id_param uuid,
  start_time_param timestamptz,
  end_time_param timestamptz
)
RETURNS TABLE (
  event_id uuid,
  calendar_id uuid,
  calendar_name text,
  calendar_color text,
  title text,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  is_all_day boolean,
  timezone text,
  external_event_id text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.calendar_id,
    c.name,
    c.color,
    e.title,
    e.description,
    e.location,
    e.start_time,
    e.end_time,
    e.is_all_day,
    e.timezone,
    e.external_event_id
  FROM calendar.events e
  JOIN calendar.calendars c ON c.id = e.calendar_id
  WHERE c.owner_id = user_id_param
    AND c.is_visible = true
    AND e.start_time <= end_time_param
    AND e.end_time >= start_time_param
  ORDER BY e.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de calendarios del usuario
CREATE OR REPLACE FUNCTION calendar.get_calendar_stats(user_id_param uuid)
RETURNS TABLE (
  calendar_id uuid,
  calendar_name text,
  event_count bigint,
  last_event_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COUNT(e.id),
    MAX(e.start_time)
  FROM calendar.calendars c
  LEFT JOIN calendar.events e ON e.calendar_id = c.id
  WHERE c.owner_id = user_id_param
  GROUP BY c.id, c.name
  ORDER BY c.is_primary DESC, c.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 10: Crear vista para facilitar consultas
CREATE OR REPLACE VIEW calendar.events_with_calendar AS
SELECT 
  e.*,
  c.name as calendar_name,
  c.color as calendar_color,
  c.owner_id as calendar_owner_id,
  c.external_provider as calendar_provider,
  c.is_visible as calendar_is_visible
FROM calendar.events e
JOIN calendar.calendars c ON c.id = e.calendar_id;

-- Paso 11: Agregar triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendars_updated_at
  BEFORE UPDATE ON calendar.calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON calendar.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Ejecutar este script en el SQL Editor de Supabase
-- 2. Verificar la migración de datos con: SELECT * FROM calendar.calendars;
-- 3. Después de verificar, puedes renombrar o eliminar la tabla calendar_events antigua
-- 4. Los eventos ahora están organizados por calendarios
-- 5. Cada usuario tendrá al menos un calendario por defecto
-- ============================================

