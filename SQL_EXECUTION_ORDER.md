# 📋 Orden de Ejecución de Scripts SQL

Ejecuta estos scripts **EN ORDEN** en el SQL Editor de Supabase.

---

## 🚀 Instalación Inicial (Primera Vez)

### Script 1: Migración Principal
**Archivo**: `sql/migrate_to_public_fixed.sql`

**Qué hace:**
- ✅ Crea las 4 tablas: `calendar_calendars`, `calendar_events`, `calendar_attendees`, `calendar_reminders`
- ✅ Migra datos existentes del schema `calendar` (si los hay)
- ✅ Configura RLS y políticas de seguridad
- ✅ Crea índices para optimización
- ✅ Crea el constraint único (permite múltiples calendarios por usuario)

**Ejecutar:**
```sql
-- Copia y pega TODO el contenido de sql/migrate_to_public_fixed.sql
```

**Resultado esperado:**
```
✅ Migración completada exitosamente
✅ Tablas creadas en schema public con prefijo calendar_
✅ RLS habilitado y políticas creadas
🎉 ¡Ya puedes usar el calendario!
```

---

## 🌐 Funcionalidades Adicionales

### Script 2: Soporte para Calendarios ICS (Opcional pero Recomendado)
**Archivo**: `sql/add_ics_calendar_support.sql`

**Qué hace:**
- ✅ Agrega soporte para suscripciones a calendarios externos (ICS/iCalendar)
- ✅ Permite importar calendarios como Bloque Neón (Uniandes)
- ✅ Sincronización automática cada 60 minutos
- ✅ Compatible con cualquier URL ICS

**Cuándo ejecutar:**
- Después de ejecutar `migrate_to_public_fixed.sql`
- Si quieres suscribirte a calendarios externos
- Para integrar Bloque Neón, Google Calendar público, etc.

**Ejecutar:**
```sql
-- Copia y pega TODO el contenido de sql/add_ics_calendar_support.sql
```

**Resultado esperado:**
```
✅ Soporte para calendarios ICS añadido
📋 Nuevas columnas:
   - ics_url: URL del feed ICS
   - ics_last_sync_at: Última sincronización
   - ics_sync_interval_minutes: Intervalo de sync
```

**Documentación:**
- Ver `ICS_CALENDAR_GUIDE.md` para guía completa de uso
- Ver `ICS_IMPLEMENTATION_SUMMARY.md` para detalles técnicos

---

## 🔄 Funcionalidades Adicionales (Muy Recomendado)

### Script 3: Agregar user_id a Eventos
**Archivo**: `sql/add_user_id_to_events.sql`

**Qué hace:**
- ✅ Agrega columna `user_id` a `calendar_events`
- ✅ Popula `user_id` desde `calendar_calendars` (para eventos existentes)
- ✅ Crea índices para mejorar rendimiento
- ✅ Actualiza políticas RLS para usar `user_id` directamente

**Cuándo ejecutar:**
- Después de ejecutar `migrate_to_public_fixed.sql` y `add_ics_calendar_support.sql`
- **RECOMENDADO** para queries más eficientes y mejor RLS

**Ejecutar:**
```sql
-- Copia y pega TODO el contenido de sql/add_user_id_to_events.sql
```

**Resultado esperado:**
```
✅ Columna user_id agregada a calendar_events
📋 Beneficios:
   - Consultas más rápidas (índice directo por user_id)
   - RLS más eficiente (sin JOIN)
   - Funciones helper para queries complejas
```

**Beneficios:**
- ✅ Queries más rápidas sin JOIN
- ✅ RLS más eficiente
- ✅ Facilita integración con n8n
- ✅ Funciones helper SQL incluidas

---

### Script 4: Habilitar Supabase Realtime
**Archivo**: `sql/enable_realtime.sql`

**Qué hace:**
- ✅ Habilita actualizaciones en tiempo real para las tablas de calendario
- ✅ Los cambios se reflejan automáticamente en todos los navegadores conectados
- ✅ No necesitas recargar la página para ver nuevos calendarios o eventos

**Cuándo ejecutar:**
- Después de ejecutar `migrate_to_public_fixed.sql` y `add_ics_calendar_support.sql`
- **MUY RECOMENDADO** para mejor experiencia de usuario

**Ejecutar:**
```sql
-- Copia y pega TODO el contenido de sql/enable_realtime.sql
```

**Resultado esperado:**
```
✅ Supabase Realtime habilitado para tablas de calendario
📡 Ahora los cambios se transmiten en tiempo real
```

**Beneficios:**
- ✅ Cuando creas un calendario → aparece inmediatamente en el selector
- ✅ Cuando te suscribes a ICS → aparece al instante
- ✅ Cuando creas un evento → se muestra automáticamente
- ✅ Multi-dispositivo: cambios en un navegador aparecen en otros

---

## 🔧 Si Hay Errores

### Script 5: Arreglar Constraint (Si hay problemas con duplicados)
**Archivo**: `sql/add_constraint_for_multiple_calendars.sql`

**Cuándo ejecutar:**
- Si ves error: "duplicate key value violates unique constraint"
- Si el constraint no permite múltiples calendarios

**Ejecutar:**
```sql
-- Copia y pega el contenido de sql/add_constraint_for_multiple_calendars.sql
```

---

### Script 6: Arreglar Permisos (Si hay errores de RLS)
**Archivo**: `sql/fix_permissions.sql`

**Cuándo ejecutar:**
- Si ves error: "new row violates row-level security policy"
- Si no puedes crear/leer calendarios

**Ejecutar:**
```sql
-- Copia y pega el contenido de sql/fix_permissions.sql
```

---

## 🔍 Verificación

### Script 7: Verificar Estado
**Archivo**: `sql/verify_schema.sql`

**Cuándo ejecutar:**
- Para verificar que todo está configurado correctamente
- Para ver el estado de tus tablas

**Ejecutar:**
```sql
-- Copia y pega el contenido de sql/verify_schema.sql
```

---

### Script 8: Test de Inserción Manual
**Archivo**: `sql/test_calendar_insert.sql`

**Cuándo ejecutar:**
- Si sigues teniendo errores al crear calendarios
- Para debugging avanzado

**Ejecutar:**
```sql
-- Copia y pega el contenido de sql/test_calendar_insert.sql
```

---

## 📊 Resumen de Archivos SQL

| Archivo | Propósito | ¿Cuándo ejecutar? |
|---------|-----------|-------------------|
| `migrate_to_public_fixed.sql` | **PRINCIPAL** - Crear todo | **SIEMPRE (primero)** |
| `add_ics_calendar_support.sql` | **RECOMENDADO** - Calendarios ICS | Después del principal |
| `add_user_id_to_events.sql` | **RECOMENDADO** - user_id en eventos | Después de ICS |
| `enable_realtime.sql` | **MUY RECOMENDADO** - Actualización en tiempo real | Después de user_id |
| `add_constraint_for_multiple_calendars.sql` | Fix constraint único | Si hay errores de duplicados |
| `fix_permissions.sql` | Fix políticas RLS | Si hay errores de permisos |
| `verify_schema.sql` | Verificar estado | Para debugging |
| `test_calendar_insert.sql` | Test manual | Para debugging avanzado |

---

## ⚡ Inicio Rápido (Nuevo Proyecto)

Si estás empezando desde cero:

### Opción A: Solo Calendarios Básicos (1 script)
```sql
-- En Supabase SQL Editor:
-- 1. Abrir sql/migrate_to_public_fixed.sql
-- 2. Copiar TODO el contenido
-- 3. Pegar en SQL Editor
-- 4. Click en Run
-- 5. ¡Listo!
```

### Opción B: Con Soporte ICS (2 scripts) ⭐ **Recomendado**
```sql
-- PASO 1: Ejecutar migrate_to_public_fixed.sql (ver Opción A)

-- PASO 2: Ejecutar add_ics_calendar_support.sql
-- 1. Abrir sql/add_ics_calendar_support.sql
-- 2. Copiar TODO el contenido
-- 3. Pegar en SQL Editor
-- 4. Click en Run
-- 5. ¡Listo! Ahora puedes suscribirte a calendarios externos
```

**Con ICS puedes:**
- ✅ Importar Bloque Neón (Uniandes)
- ✅ Suscribirte a calendarios académicos
- ✅ Importar Google Calendar públicos
- ✅ Sincronización automática

### Opción C: Instalación Completa (4 scripts) 🌟 **MEJOR EXPERIENCIA**
```sql
-- PASO 1: Ejecutar migrate_to_public_fixed.sql
-- PASO 2: Ejecutar add_ics_calendar_support.sql
-- PASO 3: Ejecutar add_user_id_to_events.sql
-- PASO 4: Ejecutar enable_realtime.sql
```

**Con todo instalado obtienes:**
- ✅ Calendarios ICS (Bloque Neón, etc.)
- ✅ user_id directo en eventos (queries más rápidas)
- ✅ Cambios instantáneos sin recargar
- ✅ Sincronización multi-dispositivo
- ✅ Integración completa con n8n

---

## 🎯 Después de Ejecutar los Scripts

### En la Aplicación

1. **Refresca la página** (F5)
2. Deberías ver:
   - ✅ Navbar arriba
   - ✅ Mensaje "Empieza creando tu primer calendario"
   - ✅ Botón "Calendarios" en el header

3. **Crear primer calendario:**
   - Click en "Crear mi primer calendario"
   - Ingresa nombre y color
   - Click en "Crear Calendario"

4. **Sincronizar con Google (Opcional):**
   - Click en "Sincronizar"
   - Click en "Google Calendar" → Conectar
   - Click en "Sincronizar calendarios"
   - Deberías ver tus calendarios de Google importados

---

## 🐛 Si Sigue Fallando

Ejecuta este diagnóstico completo:

```sql
-- Diagnóstico completo
SELECT 'Tablas existentes' as check_type, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'calendar_%'

UNION ALL

SELECT 'Calendarios del usuario', COUNT(*)
FROM public.calendar_calendars
WHERE owner_id = auth.uid()

UNION ALL

SELECT 'Políticas RLS', COUNT(*)
FROM pg_policies 
WHERE tablename = 'calendar_calendars'

UNION ALL

SELECT 'Índices', COUNT(*)
FROM pg_indexes
WHERE tablename = 'calendar_calendars';
```

**Resultado esperado:**
```
Tablas existentes       | 4
Calendarios del usuario | 0 (o más si ya creaste)
Políticas RLS          | 4
Índices                | 3+
```

Si algún número no coincide, hay un problema en ese paso.

