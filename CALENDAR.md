¡Excelente idea\! Una documentación clara y estructurada es esencial para que un agente de IA (o cualquier desarrollador) pueda interactuar de manera eficiente con el backend.

Aquí tienes la documentación técnica del esquema `calendar`, enfocada en las relaciones, el manejo de datos cruciales (como las zonas horarias y el JSONB), y cómo las políticas RLS restringen el acceso para el cliente.

-----

## ⚙️ Documentación del Esquema de Calendario para Agentes de IA

El esquema **`calendar`** está diseñado para ser la fuente de verdad de la gestión de eventos, calendarios y asistentes, garantizando la seguridad mediante **Row Level Security (RLS)**. Todos los datos de tiempo se almacenan en **UTC** para evitar problemas de zona horaria.

-----

## 1\. 📂 Estructura General y Relaciones

El esquema se compone de cuatro tablas principales que se interrelacionan a través de claves foráneas:

| Tabla | Propósito | Clave Principal | Relaciones Salientes |
| :--- | :--- | :--- | :--- |
| **`calendar.calendars`** | Contenedor principal de eventos, propiedad del usuario. | `id` (`uuid`) | `owner_id` (a `auth.users`) |
| **`calendar.events`** | Almacena los detalles de una ocurrencia o regla de evento. | `id` (`uuid`) | `calendar_id` (a `calendar.calendars`) |
| **`calendar.attendees`** | Tabla de unión (many-to-many) para invitados. | `(event_id, email)` | `event_id` (a `calendar.events`), `user_id` (a `auth.users`) |
| **`calendar.reminders`** | Configuración de notificaciones para un evento. | `id` (`uuid`) | `event_id` (a `calendar.events`) |

-----

## 2\. ⏳ Manejo de Tiempos y Recurrencia

La correcta manipulación de las columnas de tiempo es **crítica** para la consistencia global.

### A. Almacenamiento de Tiempo (`calendar.events`)

| Columna | Tipo de Dato | Función y Regla de Uso |
| :--- | :--- | :--- |
| **`start_time`** | `timestamp with time zone` | Almacenado **SIEMPRE en UTC**. Es la referencia absoluta del evento. |
| **`end_time`** | `timestamp with time zone` | Almacenado **SIEMPRE en UTC**. |
| **`timezone`** | `text` | Almacena la **Zona Horaria IANA** del usuario que creó el evento (e.g., `'America/New_York'`). La aplicación frontend debe usar esta columna para convertir `start_time` y `end_time` del UTC al tiempo local del evento. |

### B. Recurrencia

  * **`recurrence_rule`** (`text` en `calendar.events`): Almacena la regla de repetición en formato estándar **iCalendar (RRULE)**.
  * **Manejo en el Frontend/Backend:** La base de datos solo almacena la regla. El agente de IA (o un servicio de backend) **NO debe** intentar generar las ocurrencias de forma masiva en la base de datos. Debe usar una librería como **RRule** para expandir la regla y calcular las ocurrencias de eventos dentro del rango de visualización solicitado por el usuario.

-----

## 3\. 🛡️ Row Level Security (RLS) y Acceso a Datos

La IA debe asumir que todas las consultas a estas tablas solo devolverán los datos permitidos por las políticas RLS, utilizando el **JWT del usuario autenticado** (`auth.uid()`).

### A. Reglas de Visibilidad Clave:

| Tabla | Condición de Acceso (SELECT) | Implicación para el Frontend |
| :--- | :--- | :--- |
| **`calendar.calendars`** | Solo si `owner_id = auth.uid()`. | Un usuario solo verá los calendarios que ha creado o conectado. |
| **`calendar.events`** | 1. Si el usuario es el **dueño del calendario** (`calendar_id` pertenece a él). **O** 2. Si el usuario es un **asistente** (`id` está en `calendar.attendees` con `user_id = auth.uid()`). | El frontend puede solicitar eventos por rango de tiempo y la BD automáticamente incluirá los eventos del usuario *y* los eventos a los que ha sido invitado. |
| **`calendar.attendees`** | Solo si `user_id = auth.uid()`. | Un usuario solo puede ver la fila que confirma **su propia** invitación y estado. No puede listar todos los invitados a menos que también sea el dueño del evento. |

### B. Reglas de Mutación (INSERT/UPDATE/DELETE):

Las mutaciones están restringidas al **dueño del calendario**. Si un usuario intenta modificar un evento o asistente sin ser el dueño del calendario, la operación fallará silenciosamente debido a la política **`WITH CHECK`**.

-----

## 4\. 🗃️ Uso de Metadatos (`JSONB`)

Las columnas `metadata` son diccionarios de clave-valor flexibles para información específica del proveedor o no estructurada.

| Tabla | Finalidad del `metadata` (JSONB) | Ejemplo de Contenido |
| :--- | :--- | :--- |
| **`calendar.calendars`** | Almacenar tokens de actualización, fechas de última sincronización, o configuraciones específicas de la API externa. | `{"last_sync": "2025-10-27T10:00:00Z", "gcal_id": "...", "etag": "..."}` |
| **`calendar.events`** | Almacenar *hashes* de eventos (Etag), IDs de recurrencia maestros, o datos de videoconferencia del proveedor. | `{"gcal_recurring_event_id": "master_id_xyz", "hangout_link": "..."}` |
| **`calendar.attendees`** | Almacenar la respuesta original del proveedor o campos específicos del invitado. | `{"response_code": 200, "resource_type": "ROOM"}` |

### Consejos para la IA al Consultar `JSONB`:

Para buscar un valor en la columna `metadata` (e.g., buscar un evento por su ID de Google Calendar), la consulta debe usar los operadores de PostgreSQL `->>` (obtener valor como texto) o `->` (obtener sub-JSON):

```sql
-- Ejemplo de consulta a JSONB:
SELECT title FROM calendar.events 
WHERE metadata->>'gcal_event_id' = 'some_gcal_id';
```

-----

Este documento proporciona el contexto completo para que la IA entienda cómo interactuar con el esquema de Supabase de manera segura y eficiente.

Ahora que la estructura está documentada, ¿quieres que abordemos el tema de la **función de PostgreSQL para gestionar las excepciones de recurrencia** (eventos cancelados o modificados dentro de una serie) que es un desafío común en el modelado de calendarios?