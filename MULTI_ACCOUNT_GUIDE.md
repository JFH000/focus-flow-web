# 📧 Guía: Múltiples Cuentas de Google Calendar

Tu sistema ahora soporta **múltiples cuentas de Google Calendar** simultáneamente.

---

## 🎯 Casos de Uso

### Ejemplo 1: Tres cuentas diferentes
```
Usuario: Juan Pérez

Cuenta 1: juan.personal@gmail.com
  └─ Calendarios: Personal, Familia, Amigos

Cuenta 2: juan.perez@empresa.com  
  └─ Calendarios: Trabajo, Reuniones, Proyectos

Cuenta 3: j.perez@universidad.edu
  └─ Calendarios: Clases, Exámenes, Tareas
```

**Resultado**: Juan puede ver y gestionar TODOS estos calendarios en una sola vista.

---

## 🔧 Cómo Funciona

### 1. Estructura de Datos

Cada calendario guarda información de su cuenta específica:

```typescript
calendar_calendars {
  id: "abc-123",
  owner_id: "user-juan",
  name: "Trabajo",
  external_provider: "google",
  external_provider_email: "juan@empresa.com",  // ← Email específico
  external_calendar_id: "gcal-id-work",
  external_access_token: "ya29.a0...",          // ← Token específico
  external_refresh_token: "1//0g...",
  external_token_expires_at: "2025-11-06T15:00:00Z"
}
```

### 2. Índice Único Actualizado

```sql
-- ANTES: No permitía múltiples cuentas
(owner_id, external_provider, external_calendar_id)

-- AHORA: Incluye el email
(owner_id, external_provider, external_provider_email, external_calendar_id)
```

**Esto permite:**
- ✅ Juan tiene calendario "Work" de personal@gmail.com
- ✅ Juan tiene calendario "Work" de trabajo@empresa.com
- ❌ Juan NO puede tener dos veces el mismo calendario de la misma cuenta

---

## 🚀 Flujo de Uso

### Primera Cuenta (Cuenta Principal)

1. **Conectar Google Calendar**
   - Click en "Sincronizar"
   - Click en "Google Calendar"
   - Autoriza con: `personal@gmail.com`

2. **Sincronizar Calendarios**
   - Click en "Sincronizar calendarios"
   - Se importan calendarios de `personal@gmail.com`
   - Se guardan con `external_provider_email = personal@gmail.com`

### Segunda Cuenta (Cuenta de Trabajo)

1. **Cerrar sesión y volver a conectar** (Supabase solo maneja una sesión OAuth a la vez)
2. **Conectar con otra cuenta**
   - Click en "Sincronizar"
   - Click en "Google Calendar"
   - Autoriza con: `trabajo@empresa.com`

3. **Sincronizar Calendarios**
   - Click en "Sincronizar calendarios"
   - Se importan calendarios de `trabajo@empresa.com`
   - Se guardan con `external_provider_email = trabajo@empresa.com`

### Tercera, Cuarta, Quinta Cuenta...

Repite el proceso. Puedes conectar **ilimitadas cuentas de Google**.

---

## 🔑 Gestión de Tokens

### Tokens por Calendario

Cada calendario guarda sus propios tokens:

```typescript
{
  external_access_token: "ya29.a0...",     // Token de acceso (1 hora)
  external_refresh_token: "1//0g...",     // Token de refresh (permanente)
  external_token_expires_at: "2025-11-06T15:00:00Z"
}
```

### Renovación Automática

Cuando un calendario intenta sincronizar:

1. Verifica si su token está expirado
2. Si está expirado:
   - Usa el token de la sesión actual (si es de la misma cuenta)
   - O muestra error pidiendo reconectar esa cuenta específica

---

## 📊 Vista en la UI

### Selector de Calendarios

```
┌─────────────────────────────────┐
│ ☑ Trabajo                       │
│   📧 juan@empresa.com            │  ← Email visible
│   🏷️ Google                      │
├─────────────────────────────────┤
│ ☑ Personal                      │
│   📧 juan.personal@gmail.com     │  ← Otra cuenta
│   🏷️ Google                      │
├─────────────────────────────────┤
│ ☑ Clases                        │
│   📧 j.perez@universidad.edu     │  ← Tercera cuenta
│   🏷️ Google                      │
└─────────────────────────────────┘
```

### Modal de Crear Evento

```
┌─────────────────────────────────┐
│ Calendario: [Seleccionar ▼]     │
│   • Trabajo (juan@empresa.com)  │
│   • Personal (personal@gmail)   │
│   • Clases (universidad.edu)    │
│   • Mi Calendario Propio        │  ← Sin email
└─────────────────────────────────┘
```

---

## 🔐 Seguridad

### Row Level Security (RLS)

- ✅ Solo el dueño puede ver sus calendarios
- ✅ Los tokens están encriptados en la BD
- ✅ Cada calendario solo puede ser sincronizado con su token específico

### Ventajas vs. Alternativas

**Nuestra Solución:**
- ✅ Tokens almacenados de forma segura
- ✅ Sincronización independiente por cuenta
- ✅ No requiere re-autenticación constante

**Alternativa (No implementada):**
- ❌ Re-autenticar cada vez que cambias de cuenta
- ❌ Solo una cuenta activa a la vez
- ❌ Experiencia de usuario fragmentada

---

## 📋 Archivos SQL a Ejecutar

### Opción 1: Nueva Instalación

Si empiezas desde cero, ejecuta:
```sql
-- sql/migrate_to_public_fixed.sql (ya incluye soporte multi-cuenta)
```

### Opción 2: Actualizar Sistema Existente

Si ya tienes el sistema funcionando, ejecuta:
```sql
-- sql/add_multi_account_support.sql (añade columnas nuevas)
```

---

## 🧪 Ejemplo Práctico

```typescript
// Usuario conecta cuenta personal
await syncGoogleCalendars() 
// → Guarda: 
//   - Calendario "Personal" (personal@gmail.com)
//   - Calendario "Familia" (personal@gmail.com)

// Usuario se desconecta y conecta cuenta de trabajo
await supabase.auth.signOut()
await connectGoogleCalendar() // Login con trabajo@empresa.com
await syncGoogleCalendars()
// → Guarda:
//   - Calendario "Trabajo" (trabajo@empresa.com)
//   - Calendario "Reuniones" (trabajo@empresa.com)

// RESULTADO: 4 calendarios de 2 cuentas diferentes
SELECT 
  name,
  external_provider_email,
  created_at
FROM calendar_calendars
WHERE owner_id = 'user-juan'
ORDER BY external_provider_email;

/*
name        | external_provider_email  | created_at
------------|--------------------------|---------------------------
Familia     | personal@gmail.com       | 2025-11-06 10:00:00
Personal    | personal@gmail.com       | 2025-11-06 10:00:01
Reuniones   | trabajo@empresa.com      | 2025-11-06 10:15:00
Trabajo     | trabajo@empresa.com      | 2025-11-06 10:15:01
*/
```

---

## ⚡ Sincronización Inteligente

El sistema detecta automáticamente qué token usar:

```javascript
// Al sincronizar "Trabajo" (trabajo@empresa.com):
1. Busca: calendar.external_access_token
2. Verifica: ¿Está expirado?
3. Si NO → Usa ese token
4. Si SÍ → Intenta usar token de sesión actual
5. Si sesión es de otra cuenta → ERROR: "Reconecta trabajo@empresa.com"
```

---

## 🎨 Mejoras Visuales

### En CalendarSelector

Ahora verás:
```
☑ Reuniones Equipo
  trabajo@empresa.com      ← Email claramente visible
  🏷️ Google
```

### En Eventos

```
📅 Reunión de Ventas
   Calendario: Trabajo (trabajo@empresa.com)
   ⏰ 10:00 - 11:00
   📍 Sala de conferencias
```

---

## ⚠️ Limitación Actual de Supabase Auth

Supabase Auth solo permite **una sesión OAuth activa a la vez**. Esto significa:

- ✅ Puedes tener calendarios de múltiples cuentas
- ✅ Todos se pueden ver simultáneamente
- ✅ Los tokens se guardan por calendario
- ⚠️ Para añadir una NUEVA cuenta, debes cerrar sesión y volver a conectar

### Flujo Recomendado:

1. Conectar cuenta principal (personal@gmail.com)
2. Sincronizar sus calendarios
3. **Cerrar sesión**
4. Conectar cuenta de trabajo (trabajo@empresa.com)
5. Sincronizar sus calendarios
6. **¡Listo!** Ambos conjuntos de calendarios están disponibles

---

## 🔮 Futuro: OAuth Multi-Cuenta

Para soportar múltiples sesiones simultáneas necesitaríamos:
1. Sistema de tokens personalizado (fuera de Supabase Auth)
2. OAuth flow manual por cada cuenta
3. Tabla `connected_accounts` (ya implementada)

Este sistema ya está parcialmente implementado y listo para cuando se necesite.

---

## ✅ Checklist de Funcionalidad

- [x] Columna `external_provider_email` en BD
- [x] Índice único actualizado
- [x] Tokens guardados por calendario
- [x] Email visible en UI
- [x] Hook `useConnectedAccounts`
- [x] Componente `ConnectedAccountsManager`
- [x] Sincronización usa token correcto
- [ ] OAuth flow multi-cuenta simultáneo (futuro)

---

¡Tu sistema ya soporta múltiples cuentas de Google Calendar! 🎉

