# 📊 Análisis Profundo del Proyecto Focus Flow - Módulo de Calendario

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General del Proyecto](#arquitectura-general)
3. [Análisis Detallado del Módulo de Calendario](#analisis-calendario)
4. [Flujos de Datos](#flujos-de-datos)
5. [Integración con Google Calendar](#integracion-google)
6. [Base de Datos](#base-de-datos)
7. [UI/UX del Calendario](#ui-ux)
8. [Fortalezas y Debilidades](#fortalezas-debilidades)
9. [Recomendaciones de Mejora](#recomendaciones)

---

## 🎯 Resumen Ejecutivo

**Focus Flow** es una aplicación web Next.js 15 que combina gestión de calendario, chat con IA y gestión de archivos. El módulo de calendario es el componente más complejo, integrado con Google Calendar API y Supabase.

### Stack Tecnológico Principal:
- **Frontend:** Next.js 15.5.6, React 19.1.0, TypeScript
- **Backend:** Supabase (PostgreSQL + Auth)
- **UI:** Tailwind CSS 4, Componentes personalizados
- **APIs Externas:** Google Calendar API v3
- **Librerías:** date-fns, Supabase JS

---

## 🏗️ Arquitectura General del Proyecto

### Estructura de Directorios
```
src/
├── app/                    # Next.js App Router
│   ├── calendar/          # Ruta del calendario
│   ├── dashboard/         # Dashboard principal
│   ├── foco/              # Módulo de chat
│   └── auth/              # Autenticación OAuth
├── components/
│   ├── calendar/          # Componentes del calendario
│   ├── chat/              # Componentes de chat
│   ├── dashboard/         # Componentes del dashboard
│   └── ui/                # Componentes base
├── contexts/              # Contextos React
│   ├── AuthContext.tsx
│   ├── ChatContext.tsx
│   └── ThemeContext.tsx
├── hooks/                 # Custom hooks
│   ├── useGoogleCalendar.ts  # ⭐ Hook principal del calendario
│   └── useFileUpload.ts
├── lib/
│   └── supabase/         # Clientes de Supabase
└── types/
    └── database.ts       # Tipos TypeScript para DB
```

### Patrones de Diseño Identificados:
1. **Component-Based Architecture:** Separación clara de componentes
2. **Custom Hooks Pattern:** Lógica reutilizable en hooks
3. **Context API:** Estado global para Auth y Chat
4. **Server Components + Client Components:** Mezcla según necesidad

---

## 📅 Análisis Detallado del Módulo de Calendario

### 1. Componente Principal: `CalendarPage.tsx`

#### Ubicación: `src/components/calendar/CalendarPage.tsx` (1,318 líneas)

#### Responsabilidades:
- Renderizado de vista semanal tipo calendario
- Gestión de estado de eventos y UI
- Coordinación entre Google Calendar API y base de datos local
- Manejo de modales (crear/editar eventos, detalles)
- Cálculo de solapamientos y posicionamiento de eventos

#### Estado del Componente:
```typescript
- anchor: Date                    // Fecha de referencia de la semana
- events: CalendarEvent[]         // Lista de eventos
- showCreateModal: boolean        // Modal de crear evento
- selectedEvent: CalendarEvent    // Evento seleccionado para ver detalles
- editingEvent: CalendarEvent     // Evento en edición
- hasCalendarAccess: boolean      // Estado de conexión con Google
- syncMessage: string             // Mensajes de sincronización
- isUpdating: boolean             // Estado de actualización desde BD
- isSyncing: boolean              // Estado de sincronización con Google
```

#### Funciones Clave:

##### 1.1 `useUserEvents(weekAnchor: Date)`
**Propósito:** Hook personalizado para obtener eventos de la semana actual

**Flujo:**
1. Calcula el rango de la semana (start/end)
2. Consulta Supabase filtrando por:
   - `user_id`
   - Eventos que intersectan con la semana (usando operadores OR complejos)
3. Cachea resultados por semana para evitar re-fetches innecesarios
4. Retorna `events`, `loading`, `error`, `refreshEvents()`

**Consulta SQL generada:**
```sql
SELECT * FROM calendar_events
WHERE user_id = $1
AND (
  (start_time <= $end AND end_time >= $start) OR
  (start_time >= $start AND start_time <= $end) OR
  (end_time >= $start AND end_time <= $end)
)
ORDER BY start_time ASC
```

**Problemas detectados:**
- ❌ La lógica de intersección puede fallar con eventos de todo el día
- ❌ No maneja correctamente eventos multi-día que cruzan semanas
- ⚠️ Cache simple puede causar datos obsoletos

##### 1.2 `computeOverlaps(dayEvents: CalendarEvent[])`
**Propósito:** Calcula posicionamiento de eventos solapados

**Algoritmo:**
1. Agrupa eventos en columnas (sin solapamiento temporal)
2. Calcula span de cada evento (cuántas columnas puede ocupar)
3. Limita span máximo a 2 columnas
4. Retorna mapa con posición y ancho de cada evento

**Limitaciones:**
- Solo calcula solapamiento dentro de un día
- Span máximo fijo (2) puede no ser suficiente para muchos eventos
- No considera eventos de todo el día

##### 1.3 `handleCreateEvent(eventData)`
**Flujo Completo:**
```
1. Validación de datos
2. Mapeo de color hex → Google colorId
3. Si editingEvent existe:
   → updateEvent() (sincroniza con Google y BD)
4. Si no:
   → createEvent() (crea en Google, luego guarda en BD)
5. refreshEvents() para actualizar UI
```

**Puntos críticos:**
- ✅ Maneja errores de permisos insuficientes
- ⚠️ Si falla Google pero funciona BD, hay inconsistencia
- ❌ No hay rollback si falla la segunda operación

##### 1.4 `handleSyncWithGoogle()`
**Sincronización Bidireccional:**
1. Llama `syncEvents(start)` - Descarga eventos de Google
2. Llama `removeDuplicates(start)` - Limpia duplicados locales
3. Actualiza estado de sincronización en UI

**Intervalos automáticos:**
- Cada 60 segundos: `handleUpdateFromDB()` - Actualiza desde BD local
- Cada 300 segundos (5 min): `handleSyncWithGoogle()` - Sincroniza con Google

**Riesgos:**
- ⚠️ Sincronización cada 5 min puede perder cambios rápidos
- ⚠️ No hay detección de conflictos (qué pasa si se modifica en ambos lados)
- ❌ Sincronización automática no se detiene si hay errores repetidos

### 2. Hook Personalizado: `useGoogleCalendar.ts`

#### Ubicación: `src/hooks/useGoogleCalendar.ts` (737 líneas)

#### Funciones Principales:

##### 2.1 `createEvent(eventData)`
**Proceso:**
1. Autenticación: Verifica usuario y sesión
2. Obtiene `provider_token` de Supabase (token OAuth de Google)
3. Construye payload para Google Calendar API:
   ```typescript
   {
     summary: eventData.title,
     description: eventData.description,
     location: eventData.location,
     start: { dateTime: "..." | date: "..." },
     end: { dateTime: "..." | date: "..." },
     colorId: "..."
   }
   ```
4. POST a `https://www.googleapis.com/calendar/v3/calendars/primary/events`
5. Inserta en `calendar_events` con `google_event_id`

**Manejo de Errores:**
- ✅ 401: Token expirado
- ✅ 403: Permisos insuficientes (ACCESS_TOKEN_SCOPE_INSUFFICIENT)
- ⚠️ 404: No manejado específicamente
- ❌ Si Google falla pero BD no, queda inconsistencia

##### 2.2 `updateEvent(event)`
**Lógica condicional:**
```typescript
if (!localEvent.google_event_id) {
  // Solo actualiza BD local (evento creado localmente)
} else {
  // 1. PATCH a Google Calendar
  // 2. Actualiza BD local con respuesta de Google
}
```

**Problemas:**
- ⚠️ Si evento tiene `google_event_id` pero no existe en Google, falla
- ⚠️ No actualiza `color_hex` si Google no retorna `colorId` actualizado
- ❌ No hay validación de que `event.id` existe en BD

##### 2.3 `deleteEvent(eventId)`
**Flujo:**
1. Busca evento en BD local
2. Si tiene `google_event_id`, DELETE en Google
3. Si Google retorna 404, continúa (evento ya eliminado)
4. DELETE en BD local

**Aspectos positivos:**
- ✅ Maneja graciosamente eventos ya eliminados en Google
- ⚠️ Si falla BD pero Google OK, queda inconsistencia

##### 2.4 `syncEvents(weekStart: Date)` ⭐ **Función Crítica**

**Proceso Detallado:**
```
1. Autenticación y validación de tokens
2. Calcula rango de semana (start → end)
3. Construye URL de Google Calendar API:
   - timeMin: inicio de semana
   - timeMax: fin de semana
   - singleEvents: true (expande recurrencias)
   - orderBy: startTime
   - maxResults: 100
4. GET a Google Calendar API
5. ⚠️ ELIMINA todos los eventos del usuario en ese rango
6. Inserta nuevos eventos desde Google
```

**Problemas Críticos Identificados:**

1. **⚠️ Estrategia de Sincronización Agresiva:**
   ```typescript
   // ELIMINA todos los eventos del rango ANTES de insertar
   await supabase
     .from("calendar_events")
     .delete()
     .eq("user_id", user.id)
     .gte("start_time", timeMin)
     .lte("start_time", timeMax)
   ```
   - **Riesgo:** Si la inserción falla, se pierden todos los eventos del rango
   - **No hay transacción:** Operación no atómica
   - **Pérdida de eventos locales:** Eventos creados localmente sin `google_event_id` se eliminan

2. **⚠️ Deduplicación Incompleta:**
   ```typescript
   const key = `${eventData.title}_${eventData.start_time}_${eventData.end_time}_${eventData.all_day}`
   ```
   - Usa solo título, tiempo y all_day
   - Dos eventos idénticos en diferentes días no se detectan
   - Eventos con mismo título pero diferentes descripciones se consideran duplicados

3. **⚠️ Límite de Resultados:**
   - `maxResults: 100` puede truncar semanas con muchos eventos
   - No hay paginación

4. **❌ No Maneja Recurrencias Correctamente:**
   - Aunque usa `singleEvents: true`, no almacena relación con evento padre
   - Si un evento recurrente se modifica, puede duplicarse

##### 2.5 `removeDuplicates(weekStart: Date)`
**Proceso:**
1. Obtiene todos los eventos del rango
2. Agrupa por clave única (título + tiempos)
3. Mantiene el primero (ordenado por `created_at`)
4. Elimina el resto en lotes de 100

**Limitaciones:**
- ⚠️ Solo detecta duplicados exactos (mismo título, tiempo)
- ⚠️ No detecta eventos que difieren solo en descripción
- ⚠️ No maneja eventos con diferentes `google_event_id` pero mismos datos

##### 2.6 `updateColorEvent(googleEventId, colorId)`
**Uso:** Actualiza solo el color de un evento en Google Calendar

**Limitación:**
- ❌ No actualiza el evento completo, solo color
- ⚠️ Si Google rechaza, no hay feedback claro

### 3. Interfaz de Usuario

#### Componentes Visuales:

##### 3.1 Vista Semanal (`CalendarPage`)
- **Estructura:** Grid de 8 columnas (1 para horas + 7 días)
- **Altura de filas:** 16px por hora (24 horas × 16px = 384px mínimo)
- **Scroll:** Vertical para ver todas las horas
- **Indicador "Ahora":** Línea roja que muestra la hora actual

**Características:**
- ✅ Responsive (se adapta a diferentes tamaños)
- ✅ Visualización clara de solapamientos
- ✅ Colores personalizables por evento
- ⚠️ No hay vista mensual o diaria
- ❌ Eventos de "todo el día" no se muestran correctamente

##### 3.2 Modales:

**CreateEventModal:**
- Campos: título*, descripción, ubicación, fecha, hora inicio/fin, todo el día, color
- Validación: Solo título requerido
- Problemas:
  - ⚠️ No valida que hora fin > hora inicio
  - ⚠️ No previene fechas pasadas (depende del caso de uso)
  - ❌ No hay soporte para recurrencias

**EventDetailsModal:**
- Muestra: título, fecha/hora, ubicación, descripción, color
- Acciones: Cerrar, Eliminar, Editar, Cambiar color
- ⚠️ Cambio de color no requiere confirmación (puede ser accidental)

##### 3.3 Indicadores de Estado:
- Banner de sincronización (arriba)
- Botones de acción:
  - "Conectar Google Calendar" (si no conectado)
  - "BD" (actualizar desde BD local)
  - "Google" (sincronizar con Google)
- Estado visual: Verde si conectado, indicadores de carga

---

## 🔄 Flujos de Datos

### Flujo 1: Crear Evento Nuevo
```
Usuario → Click en slot de tiempo
  ↓
Abre CreateEventModal
  ↓
Usuario completa formulario → Submit
  ↓
CalendarPage.handleCreateEvent()
  ↓
useGoogleCalendar.createEvent()
  ├─ Verifica autenticación
  ├─ POST a Google Calendar API
  └─ INSERT en calendar_events (con google_event_id)
  ↓
refreshEvents() → Actualiza UI
```

**Puntos de falla:**
- Si Google falla: Error al usuario, evento no creado
- Si BD falla: Evento en Google pero no en BD (inconsistencia)

### Flujo 2: Sincronización con Google
```
Intervalo de 5 min / Click manual
  ↓
handleSyncWithGoogle()
  ↓
syncEvents(start)
  ├─ GET eventos de Google Calendar API
  ├─ DELETE eventos locales del rango
  └─ INSERT eventos de Google
  ↓
removeDuplicates(start)
  ├─ SELECT eventos del rango
  ├─ Identifica duplicados
  └─ DELETE duplicados
  ↓
refreshEvents() → Actualiza UI
```

**Puntos críticos:**
- ⚠️ DELETE antes de INSERT puede causar pérdida de datos
- ⚠️ Eventos locales sin `google_event_id` se pierden

### Flujo 3: Actualizar Evento
```
Usuario → Click en evento → Editar
  ↓
Abre CreateEventModal (modo edición)
  ↓
Usuario modifica → Submit
  ↓
CalendarPage.handleCreateEvent() (con editingEvent)
  ↓
useGoogleCalendar.updateEvent()
  ├─ Si tiene google_event_id:
  │   ├─ PATCH a Google Calendar API
  │   └─ UPDATE en calendar_events
  └─ Si no tiene google_event_id:
      └─ UPDATE solo en calendar_events
  ↓
refreshEvents() → Actualiza UI
```

**Problemas:**
- ⚠️ Si Google falla, solo se actualiza BD (inconsistencia)
- ⚠️ No hay rollback si falla la segunda operación

### Flujo 4: Eliminar Evento
```
Usuario → Click en evento → Eliminar → Confirmar
  ↓
CalendarPage.handleDeleteEvent()
  ↓
useGoogleCalendar.deleteEvent()
  ├─ Si tiene google_event_id:
  │   └─ DELETE en Google Calendar API
  └─ DELETE en calendar_events
  ↓
refreshEvents() → Actualiza UI
```

**Aspectos positivos:**
- ✅ Maneja graciosamente eventos ya eliminados en Google

---

## 🔗 Integración con Google Calendar

### Autenticación OAuth

**Flujo de Conexión:**
```
Usuario → Click "Conectar Google Calendar"
  ↓
AuthContext.connectGoogleCalendar()
  ├─ signOut() (cierra sesión actual)
  └─ signInWithOAuth({
       provider: 'google',
       scopes: [
         'https://www.googleapis.com/auth/calendar',
         'https://www.googleapis.com/auth/calendar.events'
       ]
     })
  ↓
Redirect a Google OAuth
  ↓
Usuario autoriza → Callback a /auth/callback
  ↓
exchangeCodeForSession() → Token almacenado en Supabase
```

**Tokens:**
- Almacenados en `session.provider_token` (Supabase)
- Scope: `calendar` + `calendar.events` (read/write completo)
- Renovación: Manejo automático por Supabase

**Problemas:**
- ⚠️ `connectGoogleCalendar()` hace `signOut()` primero, puede perder estado
- ⚠️ No hay validación previa de si ya está conectado
- ❌ No hay desconexión manual (solo signOut completo)

### Mapeo de Datos

#### Google Calendar → Base de Datos Local
```typescript
Google Event          →  calendar_events
────────────────────────────────────────
id                    →  google_event_id
summary               →  title
description           →  description
location               →  location
start.dateTime/date    →  start_time (UTC)
end.dateTime/date      →  end_time (UTC)
!start.dateTime        →  all_day (true)
colorId                →  color_id
                       →  color_hex (mapeado)
```

**Mapeo de Colores:**
- Google usa IDs: `"1"`, `"2"`, ..., `"11"`
- La app mapea a HEX: `"#a4bdfc"`, `"#7ae7bf"`, etc.
- Mapeo bidireccional en `useGoogleCalendar.ts`

**Limitaciones:**
- ❌ No se sincroniza `recurrence` (array de RRULE)
- ❌ No se sincroniza `attendees` (invitados)
- ❌ No se sincroniza `reminders` (recordatorios)
- ⚠️ `metadata` JSONB no se usa actualmente

---

## 🗄️ Base de Datos

### Tabla Actual: `calendar_events` (Esquema `public`)

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  google_event_id TEXT,  -- ID del evento en Google Calendar
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,  -- UTC
  end_time TIMESTAMPTZ NOT NULL,    -- UTC
  all_day BOOLEAN DEFAULT false,
  color_id TEXT,                    -- ID de color de Google
  color_hex TEXT,                   -- Hex del color
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Índices (asumidos):**
- `user_id` (para filtrado rápido)
- `start_time` (para rangos temporales)
- `google_event_id` (para sincronización)

**RLS (Row Level Security):**
- Usuarios solo ven sus propios eventos (`user_id = auth.uid()`)

### Esquema Planeado: `calendar` (Según CALENDAR.md)

**Tablas:**
1. `calendar.calendars`
   - `id`, `owner_id`, `name`, `timezone`, `metadata` (JSONB)

2. `calendar.events`
   - `id`, `calendar_id`, `title`, `start_time`, `end_time`, `timezone`, `recurrence_rule`, `metadata` (JSONB)

3. `calendar.attendees`
   - `event_id`, `user_id`, `email`, `response_status`, `metadata` (JSONB)

4. `calendar.reminders`
   - `id`, `event_id`, `method`, `minutes_before`

**Estado Actual:**
- ⚠️ El código usa `calendar_events` (esquema `public`)
- 📄 La documentación describe `calendar.events` (esquema `calendar`)
- ❌ **Hay una discrepancia entre implementación y diseño**

---

## 🎨 UI/UX del Calendario

### Fortalezas:
1. ✅ Vista semanal clara y familiar
2. ✅ Colores personalizables por evento
3. ✅ Indicador de hora actual
4. ✅ Modales intuitivos
5. ✅ Feedback visual de sincronización
6. ✅ Scroll automático a mitad del día

### Debilidades:
1. ❌ No hay vista mensual/diaria
2. ❌ Eventos "todo el día" no tienen espacio dedicado
3. ⚠️ Solapamientos complejos pueden ser difíciles de leer
4. ❌ No hay búsqueda de eventos
5. ❌ No hay filtros (por color, calendario, etc.)
6. ⚠️ En móviles, la vista puede ser muy compacta
7. ❌ No hay indicador de eventos próximos
8. ❌ No hay notificaciones/recordatorios

### Responsive Design:
- ✅ Usa Tailwind CSS (responsive por defecto)
- ⚠️ No hay breakpoints específicos para calendario
- ❌ Vista no optimizada para móviles (grid de 8 columnas muy estrecho)

---

## 💪 Fortalezas y Debilidades

### Fortalezas del Sistema:

1. **Arquitectura Modular:**
   - Separación clara de responsabilidades
   - Hook personalizado reutilizable
   - Componentes bien estructurados

2. **Sincronización Automática:**
   - Actualización periódica desde BD (60s)
   - Sincronización con Google (300s)
   - Feedback visual al usuario

3. **Manejo de Errores:**
   - Errores específicos por código HTTP
   - Mensajes claros al usuario
   - Manejo de tokens expirados

4. **UI Moderna:**
   - Diseño limpio y profesional
   - Colores personalizables
   - Animaciones suaves

5. **Seguridad:**
   - RLS activado
   - Autenticación OAuth robusta
   - Validación de permisos

### Debilidades Críticas:

1. **Riesgo de Pérdida de Datos:**
   - ⚠️ `syncEvents()` elimina eventos antes de insertar
   - ⚠️ No hay transacciones atómicas
   - ⚠️ Eventos locales sin `google_event_id` se pierden en sync

2. **Inconsistencias de Estado:**
   - ⚠️ Si Google falla pero BD no, hay inconsistencia
   - ⚠️ No hay rollback automático
   - ⚠️ No hay detección de conflictos

3. **Limitaciones Funcionales:**
   - ❌ No maneja recurrencias
   - ❌ No maneja invitados
   - ❌ No maneja recordatorios
   - ❌ Solo vista semanal

4. **Rendimiento:**
   - ⚠️ `computeOverlaps()` puede ser O(n²) para muchos eventos
   - ⚠️ Sin paginación en sincronización (máx 100 eventos)
   - ⚠️ Re-renders innecesarios (no usa React.memo)

5. **Discrepancia de Esquema:**
   - ❌ Código usa `calendar_events` (public)
   - ❌ Documentación describe `calendar.events` (calendar)
   - ❌ No hay migración planificada

6. **Testing:**
   - ❌ No se encontraron tests
   - ❌ No hay validación de datos de entrada robusta
   - ❌ No hay manejo de edge cases documentado

---

## 🚀 Recomendaciones de Mejora

### Prioridad Alta (Crítico):

1. **Implementar Transacciones para Sincronización:**
   ```typescript
   // En lugar de DELETE → INSERT
   // Usar: INSERT ... ON CONFLICT DO UPDATE
   // O: BEGIN TRANSACTION → DELETE → INSERT → COMMIT
   ```

2. **Cambiar Estrategia de Sync:**
   ```typescript
   // Opción A: Merge en lugar de reemplazar
   // - Comparar eventos existentes con Google
   // - Actualizar solo los que cambiaron
   // - Insertar solo nuevos
   // - Marcar como "eliminados" los que no están en Google
   
   // Opción B: Sincronización bidireccional inteligente
   // - Detectar conflictos (modificado en ambos lados)
   // - Resolver con "último cambio gana" o "pedir al usuario"
   ```

3. **Proteger Eventos Locales:**
   ```typescript
   // No eliminar eventos que:
   // - No tienen google_event_id (creados localmente)
   // - Tienen metadata.local_only = true
   ```

4. **Unificar Esquema de Base de Datos:**
   - Decidir: ¿usar `calendar_events` o migrar a `calendar.events`?
   - Si migrar, planificar migración de datos
   - Actualizar código y documentación

### Prioridad Media:

5. **Implementar Paginación:**
   ```typescript
   // En syncEvents(), usar pageToken para obtener todos los eventos
   let pageToken = null
   do {
     const response = await fetch(url + `&pageToken=${pageToken}`)
     // ... procesar eventos
     pageToken = response.nextPageToken
   } while (pageToken)
   ```

6. **Mejorar Detección de Duplicados:**
   ```typescript
   // Usar google_event_id como clave primaria de deduplicación
   // Si dos eventos tienen mismo google_event_id, son duplicados
   ```

7. **Agregar Validaciones:**
   ```typescript
   // En CreateEventModal:
   - Validar que end_time > start_time
   - Validar que fecha no es muy antigua (si aplica)
   - Validar formato de ubicación (opcional)
   ```

8. **Optimizar Rendimiento:**
   ```typescript
   // Usar React.memo para eventos
   const EventBlock = React.memo(({ event }) => { ... })
   
   // Memoizar computeOverlaps
   const positions = useMemo(() => computeOverlaps(dayEvents), [dayEvents])
   
   // Virtualización para muchas horas/días
   ```

### Prioridad Baja (Mejoras de UX):

9. **Agregar Vistas Alternativas:**
   - Vista mensual (grid)
   - Vista diaria (lista detallada)
   - Vista de agenda (próximos eventos)

10. **Funcionalidades Faltantes:**
    - Búsqueda de eventos
    - Filtros (color, calendario, tipo)
    - Recordatorios/notificaciones
    - Soporte de recurrencias
    - Manejo de invitados

11. **Mejoras de UI:**
    - Espacio dedicado para eventos "todo el día"
    - Drag & drop para mover eventos
    - Resize para cambiar duración
    - Zoom in/out de horas

12. **Testing:**
    - Unit tests para hooks
    - Integration tests para sincronización
    - E2E tests para flujos críticos

---

## 📊 Métricas y Observabilidad

### Métricas Recomendadas:

1. **Rendimiento:**
   - Tiempo de carga de eventos
   - Tiempo de sincronización
   - Tasa de errores de API

2. **Confiabilidad:**
   - Tasa de sincronización exitosa
   - Eventos perdidos/duplicados
   - Conflictos detectados

3. **Uso:**
   - Eventos creados/eliminados por día
   - Sincronizaciones manuales vs automáticas
   - Errores más comunes

### Logging Actual:

- ✅ Hay `console.log` extensivo en `useGoogleCalendar.ts`
- ⚠️ No hay sistema centralizado de logging
- ❌ No hay tracking de errores (Sentry, etc.)
- ❌ No hay métricas de rendimiento

---

## 🔒 Seguridad

### Aspectos Positivos:
- ✅ RLS activado en Supabase
- ✅ Autenticación OAuth segura
- ✅ Tokens no expuestos en cliente (usando Supabase)

### Mejoras Recomendadas:
- ⚠️ Validar permisos antes de cada operación
- ⚠️ Rate limiting en sincronizaciones
- ⚠️ Sanitización de inputs de usuario
- ⚠️ CORS configurado correctamente

---

## 📝 Conclusiones

El módulo de calendario es **funcional pero tiene riesgos críticos** de pérdida de datos debido a la estrategia de sincronización agresiva. La arquitectura es sólida pero necesita:

1. **Refactorización de sincronización** (prioridad máxima)
2. **Unificación del esquema de base de datos**
3. **Mejoras de rendimiento y UX**
4. **Testing y observabilidad**

El código está bien estructurado y es mantenible, pero requiere atención inmediata en la lógica de sincronización antes de un despliegue a producción con muchos usuarios.

---

**Fecha de Análisis:** 2025-01-27  
**Versión del Código Analizado:** Commit actual del repositorio  
**Analista:** AI Assistant

