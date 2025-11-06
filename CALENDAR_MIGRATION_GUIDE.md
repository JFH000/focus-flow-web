# 📅 Guía de Migración: Sistema de Múltiples Calendarios

Esta guía te ayudará a migrar tu aplicación al nuevo sistema de calendarios que soporta múltiples calendarios (propios y de proveedores externos).

---

## 📋 Resumen de Cambios

### ✨ Nuevas Funcionalidades

1. **Múltiples Calendarios**: Soporta varios calendarios por usuario
2. **Calendarios Propios**: Crea calendarios directamente en la app (sin necesidad de proveedores)
3. **Sincronización con Google Calendar**: Sincroniza todos tus calendarios de Google
4. **Selector de Calendarios**: Elige qué calendarios ver en la vista principal
5. **Gestión de Visibilidad**: Oculta/muestra calendarios sin eliminarlos
6. **Favoritos**: Marca calendarios como favoritos

### 🗂️ Nueva Estructura de Base de Datos

```
calendar.calendars      → Contiene los calendarios del usuario
calendar.events         → Eventos organizados por calendario
calendar.attendees      → Asistentes/invitados a eventos
calendar.reminders      → Recordatorios de eventos
```

---

## 🚀 Pasos de Migración

### Paso 1: Ejecutar el Script SQL

1. Abre el **SQL Editor** en Supabase Dashboard
2. Copia y pega el contenido de `sql/migration_calendar_schema.sql`
3. Ejecuta el script completo
4. Verifica que no haya errores

**El script automáticamente:**
- Crea el nuevo esquema `calendar`
- Crea las 4 tablas nuevas
- **Migra todos los eventos existentes** de `calendar_events` a las nuevas tablas
- Crea un calendario por defecto para cada usuario con eventos
- Configura las políticas RLS
- Crea índices para optimizar el rendimiento
- Crea funciones útiles

### Paso 2: Verificar la Migración

Ejecuta este query para verificar que tus datos se migraron correctamente:

```sql
-- Ver calendarios creados
SELECT * FROM calendar.calendars;

-- Ver eventos migrados
SELECT 
  e.title,
  e.start_time,
  c.name as calendar_name
FROM calendar.events e
JOIN calendar.calendars c ON c.id = e.calendar_id
ORDER BY e.start_time DESC
LIMIT 10;

-- Comparar conteos
SELECT 
  (SELECT COUNT(*) FROM public.calendar_events) as eventos_antiguos,
  (SELECT COUNT(*) FROM calendar.events) as eventos_nuevos;
```

### Paso 3: Actualizar el Código Frontend

#### Opción A: Usar el Nuevo Componente (Recomendado)

Reemplaza `CalendarPage` por `CalendarPageV2`:

```tsx
// En src/app/calendar/page.tsx
import CalendarPageV2 from '@/components/calendar/CalendarPageV2'

export default function CalendarRoute() {
  return <CalendarPageV2 />
}

// En src/components/dashboard/CalendarPanel.tsx
import CalendarPageV2 from '@/components/calendar/CalendarPageV2'

export default function CalendarPanel() {
  return (
    <div className="h-full bg-background overflow-y-auto">
      <CalendarPageV2 isDashboard={true} />
    </div>
  )
}
```

#### Opción B: Actualizar CalendarPage Existente

Si prefieres mantener `CalendarPage.tsx`, necesitarás:
1. Reemplazar `calendar_events` por `calendar.events` en todas las consultas
2. Agregar la lógica de múltiples calendarios
3. Integrar `CalendarSelector` y `CreateCalendarModal`

### Paso 4: Probar el Sistema

1. **Iniciar la aplicación**
   ```bash
   npm run dev
   ```

2. **Verificar calendarios**
   - Deberías ver tu calendario migrado automáticamente
   - Prueba crear un nuevo calendario propio

3. **Conectar Google Calendar**
   - Click en "Conectar Google Calendar"
   - Autoriza los permisos
   - Click en el botón de sincronización para importar calendarios

4. **Probar funcionalidades**
   - Crear eventos en diferentes calendarios
   - Ocultar/mostrar calendarios
   - Marcar favoritos
   - Cambiar calendario principal

---

## 📚 Uso del Nuevo Sistema

### Crear un Calendario Propio

```tsx
import { useCalendars } from '@/hooks/useCalendars'

function MyComponent() {
  const { createCalendar } = useCalendars()
  
  const handleCreate = async () => {
    await createCalendar({
      name: "Mi Calendario de Trabajo",
      color: "#3b82f6",
      is_primary: false,
      is_favorite: true,
      is_visible: true,
      external_provider: null, // null = calendario propio
      metadata: {}
    })
  }
}
```

### Sincronizar Calendarios de Google

```tsx
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

function MyComponent() {
  const { syncGoogleCalendars, syncAllCalendars } = useGoogleCalendar()
  
  const handleSync = async () => {
    // 1. Sincronizar lista de calendarios
    await syncGoogleCalendars()
    
    // 2. Sincronizar eventos de todos los calendarios
    const weekStart = new Date()
    await syncAllCalendars(weekStart)
  }
}
```

### Gestionar Calendarios

```tsx
import { useCalendars } from '@/hooks/useCalendars'

function MyComponent() {
  const { 
    calendars,              // Todos los calendarios
    visibleCalendars,       // Solo los visibles
    toggleCalendarVisibility,
    setPrimaryCalendar,
    deleteCalendar
  } = useCalendars()
  
  return (
    <div>
      {calendars.map(calendar => (
        <div key={calendar.id}>
          <h3>{calendar.name}</h3>
          <input 
            type="checkbox"
            checked={calendar.is_visible}
            onChange={() => toggleCalendarVisibility(calendar.id, !calendar.is_visible)}
          />
        </div>
      ))}
    </div>
  )
}
```

### Crear Eventos en un Calendario Específico

```tsx
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

function MyComponent() {
  const { createEvent } = useGoogleCalendar()
  
  const handleCreateEvent = async (calendarId: string) => {
    await createEvent(calendarId, {
      title: "Reunión de equipo",
      description: "Planificación semanal",
      location: "Sala de reuniones",
      start: { dateTime: "2025-11-06T10:00:00Z" },
      end: { dateTime: "2025-11-06T11:00:00Z" },
      all_day: false
    })
  }
}
```

---

## 🎨 Componentes Disponibles

### CalendarSelector

Componente dropdown para seleccionar calendarios visibles:

```tsx
import CalendarSelector from '@/components/calendar/CalendarSelector'

<CalendarSelector 
  onCalendarToggle={(id, isVisible) => console.log('Toggle:', id, isVisible)}
  onCreateCalendar={() => setShowModal(true)}
/>
```

### CreateCalendarModal

Modal para crear nuevos calendarios:

```tsx
import CreateCalendarModal from '@/components/calendar/CreateCalendarModal'

<CreateCalendarModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={() => console.log('Calendar created!')}
/>
```

### CalendarPageV2

Página de calendario completa con todas las funcionalidades:

```tsx
import CalendarPageV2 from '@/components/calendar/CalendarPageV2'

<CalendarPageV2 isDashboard={false} />
```

---

## 🔧 Hooks Disponibles

### useCalendars

Gestiona calendarios del usuario:

```tsx
const {
  calendars,                    // Array<Calendar>
  visibleCalendars,             // Array<Calendar> (solo visibles)
  loading,                      // boolean
  error,                        // string | null
  createCalendar,               // (calendar) => Promise<Calendar>
  updateCalendar,               // (id, updates) => Promise<void>
  deleteCalendar,               // (id) => Promise<void>
  toggleCalendarVisibility,     // (id, visible) => Promise<void>
  toggleCalendarFavorite,       // (id, favorite) => Promise<void>
  setPrimaryCalendar,           // (id) => Promise<void>
  getCalendarStats,             // () => Promise<CalendarWithStats[]>
  refreshCalendars              // () => Promise<void>
} = useCalendars()
```

### useGoogleCalendar

Gestiona sincronización con Google Calendar:

```tsx
const {
  loading,                      // boolean
  error,                        // string | null
  syncGoogleCalendars,          // () => Promise<void>
  syncCalendarEvents,           // (calendarId, weekStart) => Promise<void>
  syncAllCalendars,             // (weekStart) => Promise<void>
  createEvent,                  // (calendarId, event) => Promise<void>
  updateEvent,                  // (eventId, updates) => Promise<void>
  deleteEvent,                  // (eventId) => Promise<void>
  updateColorEvent,             // (eventId, colorId) => Promise<void>
  clearError                    // () => void
} = useGoogleCalendar()
```

---

## 🗄️ Tipos TypeScript

Todos los tipos están definidos en `src/types/database.ts`:

```typescript
import type { 
  Calendar,
  CalendarInsert,
  CalendarUpdate,
  CalendarEvent,
  CalendarEventInsert,
  CalendarEventUpdate,
  Attendee,
  Reminder,
  CalendarWithStats,
  CalendarEventWithDetails
} from '@/types/database'
```

---

## ⚠️ Notas Importantes

### 1. Tabla Antigua (`calendar_events`)

- **No se elimina automáticamente** - mantén un backup
- Puedes eliminarla manualmente después de verificar la migración:
  ```sql
  -- SOLO después de verificar que todo funciona
  DROP TABLE IF EXISTS public.calendar_events;
  ```

### 2. Permisos de Google Calendar

- Necesitas reconectar con Google Calendar para obtener los nuevos scopes
- Los usuarios existentes deben hacer logout/login para actualizar tokens

### 3. Rendimiento

- Los índices ya están creados por el script de migración
- Si tienes muchos eventos (>10,000), considera hacer la migración por lotes

### 4. Sincronización Automática

- Por defecto, los eventos se sincronizan cada 5 minutos
- Puedes ajustar este intervalo en `CalendarPageV2.tsx`:
  ```tsx
  const interval = setInterval(() => {
    handleSyncAllEvents()
  }, 300000) // 5 minutos = 300,000 ms
  ```

---

## 🐛 Solución de Problemas

### Los calendarios no se muestran

1. Verifica que la migración SQL se ejecutó correctamente
2. Revisa la consola del navegador por errores
3. Verifica las políticas RLS en Supabase

### Error al sincronizar con Google

1. Verifica que el token no haya expirado
2. Reconecta la cuenta de Google
3. Verifica los scopes en la configuración de OAuth

### Eventos duplicados

Ejecuta el limpiador de duplicados:

```sql
SELECT calendar.remove_duplicates_for_user('user-id-here');
```

### No puedo crear eventos

1. Verifica que tienes al menos un calendario
2. Asegúrate de que el calendario no es de solo lectura
3. Verifica las políticas RLS

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de la consola del navegador
2. Revisa los logs de Supabase
3. Verifica las políticas RLS
4. Consulta la documentación de Supabase sobre schemas y RLS

---

## ✅ Checklist de Migración

- [ ] Script SQL ejecutado sin errores
- [ ] Calendarios visibles en `SELECT * FROM calendar.calendars`
- [ ] Eventos migrados correctamente
- [ ] Código frontend actualizado
- [ ] Aplicación iniciada sin errores
- [ ] Calendarios visibles en la UI
- [ ] Crear calendario propio funciona
- [ ] Sincronización con Google funciona
- [ ] Crear eventos funciona
- [ ] Selector de calendarios funciona
- [ ] Tabla antigua `calendar_events` respaldada (opcional)
- [ ] Usuarios notificados de los cambios

---

¡Felicidades! Tu sistema de calendarios ahora soporta múltiples calendarios y proveedores externos. 🎉

