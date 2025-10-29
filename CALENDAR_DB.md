## ⚙️ SQL para Añadir la Columna `metadata` (JSONB)

Solo necesitamos añadir esta columna a las tablas que podrían recibir información extra o específica de un proveedor externo (`calendars` y `events`).

```sql
-- 1. Añadir la columna 'metadata' a la tabla de calendarios
ALTER TABLE calendar.calendars
ADD COLUMN metadata jsonb DEFAULT '{}' NOT NULL;
-- Usar '{}' como valor por defecto es una buena práctica para jsonb

-- 2. Añadir la columna 'metadata' a la tabla de eventos
ALTER TABLE calendar.events
ADD COLUMN metadata jsonb DEFAULT '{}' NOT NULL;

-- 3. Añadir la columna 'metadata' a la tabla de asistentes (attendees)
-- Esto es útil para almacenar datos específicos del proveedor sobre el invitado (e.g., permisos, tipo de recurso)
ALTER TABLE calendar.attendees
ADD COLUMN metadata jsonb DEFAULT '{}' NOT NULL;


-- #################################################
-- # RECOMENDACIÓN DE RENDIMIENTO
-- #################################################

-- Si planeas buscar o filtrar frecuentemente por valores dentro del JSONB,
-- considera añadir un índice GIN. Por ejemplo, si buscas eventos con una clave específica
-- en su metadata:

-- Ejemplo de índice GIN (opcional, basado en el patrón de consulta)
CREATE INDEX idx_events_metadata_gin
ON calendar.events
USING GIN (metadata);
```

### Explicación del Uso de `JSONB`:

  * **Flexibilidad:** Podrás almacenar cualquier dato extra que devuelva Google, Outlook o Apple (como `etag` del evento, configuraciones específicas de notificaciones del proveedor, o cualquier campo futuro que no mapees directamente).
  * **Rendimiento:** El tipo de dato **`JSONB`** (JSON *Binario*) de PostgreSQL está optimizado para consultas e indexación, lo que permite buscar valores dentro del JSON de manera eficiente, a diferencia del tipo `JSON` simple.

