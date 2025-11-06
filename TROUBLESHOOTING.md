# 🔧 Solución de Problemas: Sistema de Calendarios

## ❌ Error: "Error sincronizando calendario [email]"

### Causas Posibles

1. **Tablas no creadas en Supabase**
2. **Políticas RLS bloqueando la inserción**
3. **Falta el constraint único**
4. **Campos requeridos faltantes**

---

## 🔍 Diagnóstico Paso a Paso

### Paso 1: Verificar que las Tablas Existen

```sql
-- Ejecutar en Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'calendar_%';

-- Deberías ver:
-- calendar_calendars
-- calendar_events
-- calendar_attendees
-- calendar_reminders
```

**Si NO aparecen:**
→ Ejecuta `sql/migrate_to_public_fixed.sql`

---

### Paso 2: Obtener tu User ID

```sql
-- Tu ID de usuario
SELECT 
  id,
  email
FROM auth.users
WHERE email = 'tu-email@gmail.com';

-- Copia el ID que aparece
```

---

### Paso 3: Probar Inserción Manual

```sql
-- REEMPLAZA 'TU-USER-ID' con el ID que copiaste arriba
INSERT INTO public.calendar_calendars (
  owner_id,
  name,
  color,
  is_primary,
  is_visible,
  external_provider,
  external_calendar_id
) VALUES (
  'TU-USER-ID',
  'Test Manual',
  '#3b82f6',
  true,
  true,
  'google',
  'test-id-123'
) RETURNING *;
```

**Si funciona:**
→ El problema está en el código frontend (tokens, permisos)

**Si NO funciona:**
→ El problema está en RLS o en la estructura de la tabla

---

### Paso 4: Verificar Políticas RLS

```sql
-- Ver políticas activas
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'calendar_calendars';
```

**Deberías ver 4 políticas:**
- Users can view their own calendars
- Users can insert their own calendars
- Users can update their own calendars
- Users can delete their own calendars

**Si NO aparecen:**
→ Ejecuta `sql/fix_permissions.sql`

---

### Paso 5: Probar con RLS Desactivado (Solo para Debugging)

```sql
-- TEMPORAL: Desactivar RLS solo para probar
ALTER TABLE public.calendar_calendars DISABLE ROW LEVEL SECURITY;

-- Intenta crear un calendario desde la app

-- IMPORTANTE: Volver a activarlo después
ALTER TABLE public.calendar_calendars ENABLE ROW LEVEL SECURITY;
```

**Si funciona con RLS desactivado:**
→ El problema está en las políticas RLS

---

## 🐛 Errores Comunes

### Error: "relation calendar.calendars does not exist"

**Causa**: Las tablas están en el schema `calendar`, no en `public`

**Solución**: 
```sql
-- Ejecutar: sql/migrate_to_public_fixed.sql
```

---

### Error: "The schema must be one of the following: public, graphql_public"

**Causa**: Supabase no expone esquemas personalizados por defecto

**Solución**: Usar tablas en `public` schema con prefijo
```sql
-- Ya corregido en migrate_to_public_fixed.sql
```

---

### Error: "duplicate key value violates unique constraint"

**Causa**: Intentando crear el mismo calendario dos veces

**Solución**: Ya implementada - el código ahora actualiza en vez de duplicar

---

### Error: "new row violates row-level security policy"

**Causa**: RLS bloqueando la inserción

**Solución**: Verificar que `auth.uid()` retorna tu user_id
```sql
-- Prueba esto logueado en la app:
SELECT auth.uid();

-- Debería retornar tu user_id
```

---

## ✅ Verificación Final

Después de ejecutar los scripts, verifica:

```sql
-- 1. Contar calendarios
SELECT COUNT(*) FROM public.calendar_calendars;

-- 2. Ver tus calendarios
SELECT 
  name,
  external_provider,
  is_visible,
  created_at
FROM public.calendar_calendars
WHERE owner_id = auth.uid()
ORDER BY created_at DESC;

-- 3. Verificar sync tokens
SELECT 
  name,
  CASE 
    WHEN external_sync_token IS NOT NULL 
    THEN CONCAT(LEFT(external_sync_token, 30), '...') 
    ELSE 'NO TOKEN'
  END as sync_token_status
FROM public.calendar_calendars
WHERE owner_id = auth.uid();
```

---

## 📞 Si Nada Funciona

1. **Exporta el error completo** de la consola del navegador
2. **Ejecuta** `sql/test_calendar_insert.sql` 
3. **Comparte** el output completo

El error debería mostrar exactamente qué está fallando.

