# 📅 Guía de Calendarios ICS/iCalendar

## 🎯 ¿Qué es un Calendario ICS?

Los calendarios ICS (iCalendar) son un estándar universal para compartir información de calendarios entre diferentes aplicaciones. **Focus Flow** ahora permite suscribirse a cualquier calendario ICS mediante una URL.

---

## 📋 Casos de Uso

### 1. **Bloque Neón (Universidad de los Andes)**
- URL: `https://bloqueneon.uniandes.edu.co/d2l/le/calendar/feed/user/feed.ics?token=...`
- Sincroniza automáticamente tus clases y actividades académicas

### 2. **Calendarios Académicos**
- Fechas importantes del semestre
- Vacaciones y festivos
- Eventos institucionales

### 3. **Google Calendar Público**
- URL: `https://calendar.google.com/calendar/ical/.../public/basic.ics`
- Calendarios públicos compartidos

### 4. **Calendarios Corporativos**
- Reuniones de equipo
- Eventos de empresa
- Capacitaciones

### 5. **Otros**
- Eventos deportivos
- Lanzamientos de productos
- Feriados nacionales

---

## 🚀 Cómo Usar

### Paso 1: Ejecutar el SQL

```bash
# En Supabase SQL Editor
```

Ejecuta el archivo: `sql/add_ics_calendar_support.sql`

Este script agrega las siguientes columnas a `calendar_calendars`:
- `ics_url` - URL del feed ICS
- `ics_last_sync_at` - Última sincronización
- `ics_sync_interval_minutes` - Intervalo de sincronización (default: 60 min)

### Paso 2: Obtener la URL ICS

#### **Desde Bloque Neón (Uniandes):**
1. Inicia sesión en https://bloqueneon.uniandes.edu.co
2. Ve a **Calendario**
3. Busca la opción **"Suscribirse"** o **"Feed"**
4. Copia la URL que termine en `.ics`

#### **Desde Google Calendar:**
1. Abre Google Calendar en web
2. Ve a **Configuración** → **Configuración de mis calendarios**
3. Selecciona el calendario
4. Ve a **"Integrar calendario"**
5. Copia la **"Dirección secreta en formato iCal"**

### Paso 3: Suscribirse en Focus Flow

1. Abre el **Calendario** en Focus Flow
2. Haz clic en **"Sincronizar"** (botón de refrescar)
3. En el menú, busca **"Calendarios Externos"**
4. Haz clic en **"Calendario ICS → Suscribirse por URL"**
5. Completa el formulario:
   - **Nombre**: Ej. "Bloque Neón", "Calendario Académico"
   - **URL ICS**: Pega la URL completa
   - **Color**: Selecciona un color para identificar el calendario
6. Haz clic en **"Suscribirse"**

### Paso 4: Ver los Eventos

- Los eventos se sincronizan automáticamente cada **60 minutos**
- También puedes sincronizar manualmente desde el menú de sincronización
- Los eventos aparecen en tu vista de calendario con el color seleccionado

---

## 🔄 Sincronización

### Automática
Los calendarios ICS se sincronizan automáticamente cada **60 minutos** (configurable).

### Manual
1. Haz clic en **"Sincronizar"** en el calendario
2. Selecciona **"Sincronizar eventos"** (sincroniza todos los calendarios, incluyendo ICS)

### Configuración del Intervalo
El intervalo de sincronización se puede ajustar por calendario en la base de datos:

```sql
UPDATE public.calendar_calendars
SET ics_sync_interval_minutes = 30  -- Cambiar a 30 minutos
WHERE id = 'calendar-id-here';
```

---

## ⚙️ Características

### ✅ Soporte Completo
- ✅ Eventos simples
- ✅ Eventos de todo el día
- ✅ Título, descripción, ubicación
- ✅ Fechas y horas (UTC)
- ✅ Sincronización automática
- ✅ Múltiples calendarios ICS

### 🔒 Solo Lectura
Los calendarios ICS son **solo de lectura**:
- ✅ Puedes verlos en Focus Flow
- ✅ Se sincronizan automáticamente
- ❌ No puedes crear eventos en ellos
- ❌ No puedes editar eventos desde Focus Flow

### 🎨 Personalización
- Asigna un nombre personalizado
- Selecciona un color único
- Activa/desactiva visibilidad
- Marca como favorito

---

## 🛠️ Solución de Problemas

### "Ya estás suscrito a este calendario"
**Problema**: La URL ya fue agregada previamente.

**Solución**: Verifica en el selector de calendarios si ya existe. Si quieres reemplazarlo, elimínalo primero.

---

### "La URL no es válida"
**Problema**: La URL no tiene el formato correcto.

**Solución**: 
- Asegúrate de que empiece con `http://` o `https://`
- Debe contener `.ics` o `calendar` en la URL
- Ejemplo válido: `https://example.com/calendar/feed.ics?token=abc123`

---

### "Error al obtener calendario ICS: 401 Unauthorized"
**Problema**: La URL requiere autenticación.

**Solución**: 
- Verifica que el enlace incluya el token de autenticación
- En Bloque Neón: Copia la URL completa con el parámetro `?token=...`
- Algunos calendarios requieren que inicies sesión primero

---

### "CORS policy: No 'Access-Control-Allow-Origin'"
**Problema**: Error de CORS (ya solucionado en la implementación).

**Solución**: 
- ✅ La aplicación usa un proxy interno para evitar CORS
- ✅ No necesitas hacer nada, debería funcionar automáticamente
- Si persiste, verifica que el archivo `src/app/api/calendar/fetch-ics/route.ts` exista

---

### "No se muestran los eventos"
**Problema**: Los eventos no aparecen después de suscribirse.

**Solución**:
1. Espera 1-2 minutos (la primera sincronización puede tardar)
2. Verifica que el calendario esté **visible** (marcado) en el selector
3. Sincroniza manualmente: **Sincronizar → Sincronizar eventos**
4. Revisa que el rango de fechas de los eventos esté dentro de la vista actual

---

### "Encontrados 0 eventos en el ICS"
**Problema**: El archivo ICS está vacío o no tiene eventos en el rango de fechas.

**Solución**:
- Verifica en el calendario original que tenga eventos
- Comprueba que los eventos estén dentro del rango de fechas (Focus Flow busca eventos desde 1 mes atrás hasta 6 meses adelante)
- Prueba la URL directamente en tu navegador para ver si descarga un archivo `.ics`

---

## 🗄️ Estructura de la Base de Datos

```sql
-- Columnas agregadas a calendar_calendars
ics_url                    text        -- URL del feed ICS
ics_last_sync_at          timestamptz -- Última sincronización
ics_sync_interval_minutes integer     -- Intervalo (minutos)
```

### Ejemplo de Registro

```sql
{
  "id": "uuid",
  "owner_id": "user-uuid",
  "name": "Bloque Neón",
  "color": "#10b981",
  "is_visible": true,
  "external_provider": "ics",
  "ics_url": "https://bloqueneon.uniandes.edu.co/.../feed.ics?token=abc",
  "ics_sync_interval_minutes": 60,
  "ics_last_sync_at": "2025-11-06T12:00:00Z"
}
```

---

## 📊 Flujo de Sincronización

```
┌─────────────────────┐
│   Usuario crea      │
│   suscripción ICS   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Se guarda en BD    │
│  calendar_calendars │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Sincronización     │
│  automática cada    │
│  N minutos          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  1. Descargar .ics  │
│  2. Parsear eventos │
│  3. Insertar en BD  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Eventos visibles   │
│  en el calendario   │
└─────────────────────┘
```

---

## 🔐 Seguridad

### Tokens en URLs
- ⚠️ Las URLs con tokens son **privadas y personales**
- ⚠️ **No compartas** tu URL de Bloque Neón con otras personas
- ✅ Focus Flow almacena las URLs de forma segura en Supabase
- ✅ Solo tú puedes ver tus calendarios suscritos

### Row Level Security (RLS)
```sql
-- Solo el dueño puede ver sus calendarios ICS
CREATE POLICY "Users can view own calendars"
ON public.calendar_calendars
FOR SELECT
USING (owner_id = auth.uid());
```

---

## 🎉 Beneficios

### Para Estudiantes
- ✅ Sincroniza automáticamente tu horario de clases
- ✅ No olvides fechas importantes
- ✅ Centraliza todos tus calendarios
- ✅ Vista unificada de compromisos académicos y personales

### Para Profesionales
- ✅ Integra calendarios corporativos
- ✅ Sincroniza eventos de equipo
- ✅ Mantén separados pero visibles calendarios de trabajo y personales

### Para Todos
- ✅ Menos trabajo manual
- ✅ Siempre actualizado
- ✅ Compatible con cualquier calendario ICS
- ✅ Sin límite de calendarios suscritos

---

## 📚 Referencias

- **RFC 5545** (iCalendar): https://tools.ietf.org/html/rfc5545
- **Bloque Neón**: https://bloqueneon.uniandes.edu.co
- **Google Calendar Help**: https://support.google.com/calendar

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa esta guía primero
2. Verifica los logs del navegador (F12 → Console)
3. Comprueba que el SQL se ejecutó correctamente
4. Contacta al equipo de desarrollo

---

**¡Disfruta de tus calendarios sincronizados! 🎊**

