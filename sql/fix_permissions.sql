-- ============================================
-- FIX: Permisos y Políticas RLS para Calendar
-- ============================================

-- 1. Dar permisos al esquema calendar
GRANT USAGE ON SCHEMA calendar TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA calendar TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA calendar TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA calendar TO anon, authenticated;

-- 2. Verificar que RLS está habilitado
ALTER TABLE calendar.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar.reminders ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view their own calendars" ON calendar.calendars;
DROP POLICY IF EXISTS "Users can insert their own calendars" ON calendar.calendars;
DROP POLICY IF EXISTS "Users can update their own calendars" ON calendar.calendars;
DROP POLICY IF EXISTS "Users can delete their own calendars" ON calendar.calendars;

DROP POLICY IF EXISTS "Users can view events from their calendars" ON calendar.events;
DROP POLICY IF EXISTS "Users can insert events in their calendars" ON calendar.events;
DROP POLICY IF EXISTS "Users can update events in their calendars" ON calendar.events;
DROP POLICY IF EXISTS "Users can delete events in their calendars" ON calendar.events;

-- 4. Crear políticas RLS correctas

-- Políticas para calendar.calendars
CREATE POLICY "Users can view their own calendars"
  ON calendar.calendars FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own calendars"
  ON calendar.calendars FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own calendars"
  ON calendar.calendars FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own calendars"
  ON calendar.calendars FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Políticas para calendar.events
CREATE POLICY "Users can view events from their calendars"
  ON calendar.events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = events.calendar_id
      AND calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events in their calendars"
  ON calendar.events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = calendar_id
      AND calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events in their calendars"
  ON calendar.events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = calendar_id
      AND calendars.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = calendar_id
      AND calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events in their calendars"
  ON calendar.events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar.calendars
      WHERE calendars.id = calendar_id
      AND calendars.owner_id = auth.uid()
    )
  );

-- 5. Verificación
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE schemaname = 'calendar'
ORDER BY tablename, policyname;

-- 6. Verificar permisos del esquema
SELECT 
  schema_name,
  schema_owner,
  has_schema_privilege('authenticated', schema_name, 'USAGE') as can_use_schema
FROM information_schema.schemata 
WHERE schema_name = 'calendar';

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE 'Permisos y políticas RLS actualizados correctamente para el esquema calendar';
END $$;

