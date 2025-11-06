# 📅 Integración de Calendario con n8n

## 🎯 Cambio Implementado

Ahora cuando el usuario envía un mensaje al chat, **automáticamente se incluye el ID de su calendario principal** en la petición a n8n.

---

## 🔧 Implementación

### Archivo: `src/contexts/ChatContext.tsx`

#### **Función modificada**: `sendMessage()`

**Lógica agregada:**
1. Buscar el calendario principal del usuario
2. Si no tiene calendarios → crear uno llamado "new" automáticamente
3. Incluir `calendar_id` en la petición a n8n

---

## 📊 Flujo Completo

```
Usuario envía mensaje
         ↓
Guardar mensaje en BD
         ↓
¿Usuario tiene calendarios?
         ↓
    NO → Crear calendario "new"
         ↓
    SÍ → Obtener calendario principal
         ↓
Enviar a n8n con calendar_id
         ↓
n8n procesa con contexto de calendario
```

---

## 🔍 Detalles Técnicos

### 1. **Buscar Calendario Principal**

```typescript
const { data: calendars } = await supabase
  .from('calendar_calendars')
  .select('id, is_primary')
  .eq('owner_id', user.id)
  .order('is_primary', { ascending: false })
  .limit(1)
```

**Orden:**
1. Primero busca calendarios con `is_primary = true`
2. Si no hay, toma el primero que encuentre

---

### 2. **Crear Calendario Automáticamente**

```typescript
if (calendars.length === 0) {
  await supabase
    .from('calendar_calendars')
    .insert({
      owner_id: user.id,
      name: 'new',
      color: '#3b82f6',
      is_primary: true,
      is_visible: true,
      is_favorite: false
    })
}
```

**Características del calendario "new":**
- 📌 Nombre: `"new"`
- 🎨 Color: Azul (`#3b82f6`)
- ⭐ Es principal: `true`
- 👁️ Visible: `true`
- 💙 Favorito: `false`

---

### 3. **Petición a n8n Actualizada**

**ANTES:**
```json
{
  "message": "¿Qué tengo hoy?",
  "chat_id": "abc-123-def",
  "client_id": "user-456-xyz"
}
```

**AHORA:**
```json
{
  "message": "¿Qué tengo hoy?",
  "chat_id": "abc-123-def",
  "client_id": "user-456-xyz",
  "calendar_id": "cal-789-uvw"  ← NUEVO
}
```

---

## ✅ Casos de Uso

### **Caso 1: Usuario con Calendarios**

```
Usuario: "¿Qué tengo mañana?"
         ↓
Sistema: Busca calendarios → Encuentra 3
         ↓
Sistema: Toma el calendario principal → "Mi Calendario"
         ↓
n8n recibe: calendar_id = "abc-123"
         ↓
n8n puede: Consultar eventos en ese calendario
```

---

### **Caso 2: Usuario Nuevo Sin Calendarios**

```
Usuario nuevo: "Hola"
               ↓
Sistema: Busca calendarios → No encuentra ninguno
         ↓
Sistema: Crea calendario "new" automáticamente
         ↓
Sistema: Marca como principal
         ↓
n8n recibe: calendar_id = "xyz-789"
         ↓
n8n puede: Crear eventos en ese calendario
```

---

### **Caso 3: Usuario con Múltiples Calendarios**

```
Usuario tiene:
- "Personal" (is_primary = true)
- "Trabajo" (is_primary = false)
- "Bloque Neón" (is_primary = false)

Sistema: Busca → Encuentra "Personal" (principal)
         ↓
n8n recibe: calendar_id = "personal-id"
```

---

## 🎯 Beneficios

### Para n8n:
✅ **Puede crear eventos** en el calendario correcto del usuario
✅ **Puede consultar eventos** del calendario principal
✅ **Contexto automático** sin que el usuario especifique

### Para el Usuario:
✅ **Automático**: No necesita configurar nada
✅ **Transparente**: Funciona "mágicamente"
✅ **Sin fricción**: Si no tiene calendario, se crea uno

---

## 📝 Ejemplos de Conversaciones

### **Crear Evento:**
```
Usuario: "Crear evento mañana a las 3pm: Reunión con Juan"
n8n recibe: calendar_id → Crea evento en calendario principal
Resultado: Evento creado en "Mi Calendario"
```

### **Consultar Eventos:**
```
Usuario: "¿Qué tengo esta semana?"
n8n recibe: calendar_id → Consulta eventos de ese calendario
Resultado: Lista de eventos del calendario principal
```

### **Usuario Nuevo:**
```
Usuario nuevo: "Programa una reunión para mañana"
Sistema: Crea calendario "new" automáticamente
n8n recibe: calendar_id del calendario recién creado
Resultado: Evento creado en calendario "new"
```

---

## 🔍 Logs en Consola

### **Usuario con Calendarios:**
```
Enviando POST al webhook de chat: {
  url: "https://n8n.example.com/webhook/...",
  body: {
    message: "¿Qué tengo mañana?",
    chat_id: "abc-123",
    client_id: "user-456",
    calendar_id: "cal-789"
  }
}
```

### **Usuario Nuevo:**
```
📅 Usuario sin calendarios, creando calendario "new"...
✅ Calendario "new" creado: xyz-123-abc
Enviando POST al webhook de chat: {
  url: "https://n8n.example.com/webhook/...",
  body: {
    message: "Hola",
    chat_id: "abc-123",
    client_id: "user-456",
    calendar_id: "xyz-123-abc"
  }
}
```

---

## 🛠️ Configuración en n8n

En tu workflow de n8n, ahora puedes acceder a:

```javascript
// En el nodo de n8n
const calendarId = $json.calendar_id

// Usar para crear eventos
CREATE EVENT in calendar_id

// Usar para consultar eventos  
SELECT * FROM calendar_events WHERE calendar_id = calendarId
```

---

## 🎯 Casos Edge

### ¿Qué pasa si falla la creación del calendario?

```typescript
if (!calendarError && newCalendar) {
  primaryCalendarId = newCalendar.id
} else {
  console.error('❌ Error creando calendario:', calendarError)
  // calendar_id se envía como null
}
```

**n8n recibe**: `calendar_id: null`
**Debe manejar**: Caso donde no hay calendario disponible

---

### ¿Qué pasa si el usuario tiene calendarios pero ninguno es principal?

```typescript
.order('is_primary', { ascending: false })
.limit(1)
```

**Toma el primero** que encuentre, aunque no sea principal.

---

## 📚 Referencia Rápida

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `message` | string | Mensaje del usuario |
| `chat_id` | string (uuid) | ID del chat |
| `client_id` | string (uuid) | ID del usuario |
| `calendar_id` | string (uuid) \| null | **NUEVO**: ID del calendario principal |

---

## ✅ Ventajas de Esta Implementación

1. ✅ **Automático**: Sin configuración manual
2. ✅ **Inteligente**: Crea calendario si no existe
3. ✅ **Transparente**: Usuario no nota nada
4. ✅ **Consistente**: Siempre usa calendario principal
5. ✅ **Robusto**: Maneja caso de error
6. ✅ **Logged**: Mensajes de consola para debugging

---

## 🚀 Próximos Pasos en n8n

Con el `calendar_id` disponible, n8n puede:

- ✅ Crear eventos en el calendario correcto
- ✅ Consultar eventos del usuario
- ✅ Modificar eventos existentes
- ✅ Programar recordatorios
- ✅ Sincronizar con proveedores externos

---

**¡El calendario principal ahora se envía automáticamente a n8n en cada mensaje! 🎉**

