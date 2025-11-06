# 🔐 Guía de Tokens y Autenticación

## Tipos de Tokens en el Sistema

### 1. **Provider Token** (Token de Acceso de Google)
- **Ubicación**: `session.provider_token` 
- **Almacenado en**: Sesión de Supabase (memoria)
- **Duración**: ~1 hora (expira)
- **Uso**: Hacer llamadas a Google Calendar API
- **Renovación**: Automática con refresh_token

### 2. **Refresh Token** (Token de Renovación)
- **Ubicación**: `session.provider_refresh_token`
- **Almacenado en**: Base de datos de Supabase (auth.users)
- **Duración**: Permanente (hasta que se revoque)
- **Uso**: Obtener nuevos provider_tokens cuando expiran

### 3. **Sync Token** (Token de Sincronización de Google)
- **Ubicación**: `calendar_calendars.external_sync_token`
- **Almacenado en**: Base de datos (tu tabla)
- **Duración**: Permanente (hasta que se invalide)
- **Uso**: Sincronización incremental (solo eventos nuevos/modificados)

---

## ⚠️ Problema Actual: Tokens No Se Guardan

El problema es que **NO estamos guardando los sync tokens** de Google Calendar, lo que significa que:
- ❌ Cada sincronización descarga TODOS los eventos de nuevo
- ❌ No hay sincronización incremental
- ❌ Más lento y usa más API quota

### Solución: Implementar Sincronización Incremental

Google Calendar API soporta dos formas de sincronizar:

#### Opción A: Full Sync (Lo que hacemos ahora)
```
GET /calendars/primary/events?timeMin=X&timeMax=Y
→ Retorna todos los eventos del rango
→ Borramos eventos antiguos e insertamos nuevos
```

#### Opción B: Incremental Sync (Más eficiente)
```
GET /calendars/primary/events?syncToken=abc123
→ Retorna solo eventos NUEVOS o MODIFICADOS desde la última sincronización
→ Incluye un nuevo syncToken para la próxima sincronización
```

---

## 🔧 Cómo Funciona en Nuestro Sistema

### Al Sincronizar Calendarios

```typescript
// 1. Google retorna esto:
{
  "id": "primary",
  "summary": "juanfelipe@gmail.com",
  "syncToken": "CPDAlvWF0YsDEiQKIkhWRjNhc...",  // ← Este token
  "backgroundColor": "#9fe1e7",
  ...
}

// 2. Lo guardamos en la BD:
INSERT INTO calendar_calendars (
  owner_id,
  name,
  external_provider,
  external_calendar_id,
  external_sync_token,  // ← Aquí se guarda
  ...
)
```

### Al Sincronizar Eventos (Primera Vez)

```typescript
// 1. Hacemos request inicial:
GET /calendars/primary/events?timeMin=X&timeMax=Y

// 2. Google retorna:
{
  "items": [...eventos...],
  "nextSyncToken": "CPDAlvWF0YsDEiQKIkhWRjNhc..."  // ← Nuevo token
}

// 3. Guardamos el nextSyncToken en la BD:
UPDATE calendar_calendars
SET external_sync_token = 'CPDAlvWF0YsDEiQKIkhWRjNhc...'
WHERE id = calendar_id;
```

### Al Sincronizar Eventos (Siguientes Veces)

```typescript
// 1. Obtenemos el syncToken guardado:
SELECT external_sync_token FROM calendar_calendars WHERE id = X;

// 2. Si existe, usamos incremental sync:
GET /calendars/primary/events?syncToken=CPDAlvWF0YsDEiQKIghWRjNhc...

// 3. Google retorna SOLO cambios:
{
  "items": [
    // Solo eventos nuevos/modificados/eliminados
  ],
  "nextSyncToken": "CPDAlvWF0YsDEiQKIghWRjNhd..."  // ← Actualizar
}

// 4. Actualizamos el token:
UPDATE calendar_calendars
SET external_sync_token = 'CPDAlvWF0YsDEiQKIghWRjNhd...'
WHERE id = X;
```

---

## 🚨 Validación de Tokens

### Provider Token (Acceso a Google)

```typescript
// Verificar si el token es válido
const response = await fetch(
  'https://www.googleapis.com/calendar/v3/calendars/primary',
  {
    headers: { Authorization: `Bearer ${session.provider_token}` }
  }
);

if (response.status === 401) {
  // Token expirado, necesita renovarse
  await supabase.auth.refreshSession();
}

if (response.status === 403) {
  // No tiene permisos de Calendar
  // Necesita reconectar con los scopes correctos
}
```

### Sync Token

```typescript
// Si el sync token es inválido, Google retorna error 410
const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?syncToken=${token}`
);

if (response.status === 410) {
  // Token inválido, hacer full sync de nuevo
  // Esto pasa si:
  // - Han pasado muchos días sin sincronizar
  // - El calendario fue eliminado y recreado
  // - Cambios mayores en el calendario
}
```

---

## ✅ Checklist de Tokens

Para que el sistema funcione correctamente:

- [ ] **Script SQL ejecutado** (`migrate_to_public_fixed.sql`)
- [ ] **Constraint único correcto** (permite múltiples calendarios)
- [ ] **Campo `external_sync_token`** existe en la tabla
- [ ] **Refresh session** implementado cuando el token expira
- [ ] **Sincronización incremental** (próximo paso a implementar)

---

## 🎯 Próximos Pasos

1. **Ejecutar script corregido** - Las tablas deben estar en `public` schema
2. **Verificar que los tokens se guardan** - Revisar después de sincronizar
3. **Implementar sincronización incremental** - Usar syncToken cuando esté disponible

---

## 🔍 Debugging: Verificar Tokens

```sql
-- Ver qué tokens se están guardando
SELECT 
  name,
  external_provider,
  external_calendar_id,
  CASE 
    WHEN external_sync_token IS NOT NULL 
    THEN CONCAT(LEFT(external_sync_token, 20), '...') 
    ELSE 'NULL'
  END as sync_token_preview,
  updated_at
FROM public.calendar_calendars
ORDER BY updated_at DESC;
```

Esta query te mostrará si los sync tokens se están guardando después de la sincronización.

