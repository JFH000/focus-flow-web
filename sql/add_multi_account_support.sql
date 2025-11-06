-- ============================================
-- ACTUALIZACIÓN: Soporte para Múltiples Cuentas de Google
-- ============================================
-- Permite a un usuario conectar varios correos de Google
-- Ej: personal@gmail.com, trabajo@empresa.com, universidad@edu.co

-- 1. Agregar columnas para múltiples cuentas
ALTER TABLE public.calendar_calendars 
ADD COLUMN IF NOT EXISTS external_provider_email text;

ALTER TABLE public.calendar_calendars 
ADD COLUMN IF NOT EXISTS external_access_token text;

ALTER TABLE public.calendar_calendars 
ADD COLUMN IF NOT EXISTS external_refresh_token text;

ALTER TABLE public.calendar_calendars 
ADD COLUMN IF NOT EXISTS external_token_expires_at timestamptz;

-- 2. Eliminar índice único antiguo
DROP INDEX IF EXISTS public.idx_calendar_calendars_unique_external;

-- 3. Crear nuevo índice único que incluya el email
-- Esto permite: juan tiene calendario "Work" de personal@gmail.com Y calendario "Work" de trabajo@empresa.com
CREATE UNIQUE INDEX idx_calendar_calendars_unique_external 
  ON public.calendar_calendars(owner_id, external_provider, external_provider_email, external_calendar_id)
  WHERE external_calendar_id IS NOT NULL AND external_provider IS NOT NULL;

-- 4. Crear índice para búsqueda por email del proveedor
CREATE INDEX IF NOT EXISTS idx_calendar_calendars_provider_email 
  ON public.calendar_calendars(external_provider, external_provider_email)
  WHERE external_provider_email IS NOT NULL;

-- 5. Crear tabla para almacenar las cuentas conectadas (opcional pero recomendado)
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'google', 'outlook', 'apple'
  provider_email text NOT NULL,
  provider_user_id text, -- ID del usuario en el proveedor
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[], -- Permisos concedidos
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sync_at timestamptz,
  UNIQUE(user_id, provider, provider_email)
);

-- Habilitar RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para connected_accounts
CREATE POLICY "Users can view their own connected accounts"
  ON public.connected_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own connected accounts"
  ON public.connected_accounts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_connected_accounts_user_id ON public.connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_provider ON public.connected_accounts(provider, provider_email);

-- 6. Función para obtener token válido de una cuenta
CREATE OR REPLACE FUNCTION public.get_valid_token_for_calendar(calendar_id_param uuid)
RETURNS TABLE (
  access_token text,
  needs_refresh boolean
) AS $$
DECLARE
  cal_record RECORD;
  account_record RECORD;
BEGIN
  -- Obtener el calendario
  SELECT * INTO cal_record
  FROM public.calendar_calendars
  WHERE id = calendar_id_param;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Si el calendario tiene su propio token, usarlo
  IF cal_record.external_access_token IS NOT NULL THEN
    RETURN QUERY SELECT 
      cal_record.external_access_token,
      (cal_record.external_token_expires_at IS NULL OR cal_record.external_token_expires_at < now()) as needs_refresh;
    RETURN;
  END IF;

  -- Si no, buscar en connected_accounts
  SELECT * INTO account_record
  FROM public.connected_accounts
  WHERE user_id = cal_record.owner_id
    AND provider = cal_record.external_provider
    AND provider_email = cal_record.external_provider_email
    AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT 
      account_record.access_token,
      (account_record.token_expires_at IS NULL OR account_record.token_expires_at < now()) as needs_refresh;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comentarios para documentación
COMMENT ON COLUMN public.calendar_calendars.external_provider_email IS 
  'Email de la cuenta del proveedor externo. Permite múltiples cuentas de Google por usuario.';

COMMENT ON COLUMN public.calendar_calendars.external_access_token IS 
  'Token de acceso OAuth específico para esta cuenta de Google. Se renueva automáticamente.';

COMMENT ON TABLE public.connected_accounts IS 
  'Almacena las cuentas externas conectadas por el usuario (Gmail personal, trabajo, universidad, etc.)';

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Soporte para múltiples cuentas añadido correctamente';
  RAISE NOTICE 'ℹ️  Ahora un usuario puede conectar múltiples cuentas de Google';
  RAISE NOTICE 'ℹ️  Ejemplo: personal@gmail.com, trabajo@empresa.com, etc.';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Nuevas columnas en calendar_calendars:';
  RAISE NOTICE '   - external_provider_email (email de la cuenta)';
  RAISE NOTICE '   - external_access_token (token específico)';
  RAISE NOTICE '   - external_refresh_token (para renovar)';
  RAISE NOTICE '   - external_token_expires_at (cuándo expira)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Nueva tabla: connected_accounts';
  RAISE NOTICE '   Gestiona todas las cuentas conectadas del usuario';
END $$;

