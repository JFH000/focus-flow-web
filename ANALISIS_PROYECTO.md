# 📊 Análisis Profundo del Proyecto Focus Flow

## 📋 Resumen Ejecutivo

**Focus Flow** es una aplicación web moderna de productividad construida con **Next.js 15.5.6** y **React 19**, que integra un sistema de chat con IA, gestión de calendarios (Google Calendar), y capacidades de RAG (Retrieval-Augmented Generation) para procesamiento de documentos.

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

**Frontend:**
- **Next.js 15.5.6** (App Router)
- **React 19.1.0**
- **TypeScript 5**
- **Tailwind CSS 4** (con diseño moderno purple/blue gradient)
- **Lucide React** (iconos)

**Backend/Servicios:**
- **Supabase** (autenticación, base de datos, storage)
  - Autenticación OAuth con Google
  - PostgreSQL con Row Level Security (RLS)
  - Storage para archivos de chat
- **n8n** (webhooks para IA y RAG)
  - Webhook de chat: `NEXT_PUBLIC_N8N_WEBHOOK_CHAT_HOST`
  - Webhook de RAG: `NEXT_PUBLIC_N8N_WEBHOOK_ADD_PDF_TO_RAG_HOST`
- **Google Calendar API** (integración completa)

**Analytics:**
- **Vercel Analytics**
- **Vercel Speed Insights**
- **ContentSquare** (análisis de UX)

---

## 📁 Estructura del Proyecto

```
focus-flow-web-2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Layout principal con providers
│   │   ├── page.tsx            # Página de inicio (redirige a /foco)
│   │   ├── foco/              # Página principal de chat
│   │   │   ├── page.tsx       # Vista de chat simple
│   │   │   └── [chat_id]/     # Vista de chat específico
│   │   ├── dashboard/         # Dashboard con vista dividida
│   │   │   └── [[...params]]/ # Parámetros opcionales
│   │   ├── calendar/          # Vista de calendario
│   │   ├── login/             # Página de login
│   │   └── auth/              # Callbacks de autenticación
│   │
│   ├── components/
│   │   ├── AppLayout.tsx      # Layout wrapper con navbar condicional
│   │   ├── Navbar.tsx         # Barra de navegación principal
│   │   ├── ProtectedRoute.tsx # HOC para rutas protegidas
│   │   ├── chat/              # Componentes de chat
│   │   │   ├── ChatInput.tsx  # Input con archivos e historial
│   │   │   ├── MessageList.tsx # Lista de mensajes
│   │   │   ├── ChatList.tsx   # Lista de chats
│   │   │   ├── ChatSidebar.tsx
│   │   │   ├── ChatNavigation.tsx
│   │   │   └── FileUpload.tsx
│   │   ├── dashboard/         # Componentes del dashboard
│   │   │   ├── SplitView.tsx  # Vista dividida (chat + calendario)
│   │   │   ├── ChatPanel.tsx
│   │   │   └── CalendarPanel.tsx
│   │   ├── calendar/          # Componentes de calendario
│   │   │   └── CalendarPage.tsx
│   │   └── ui/                # Componentes UI base
│   │       ├── button.tsx
│   │       └── card.tsx
│   │
│   ├── contexts/              # React Context Providers
│   │   ├── AuthContext.tsx    # Gestión de autenticación
│   │   ├── ChatContext.tsx    # Estado y lógica de chat
│   │   └── ThemeContext.tsx   # Gestión de temas (light/dark/system)
│   │
│   ├── hooks/                 # Custom React Hooks
│   │   ├── useGoogleCalendar.ts # Hook para Google Calendar API
│   │   └── useFileUpload.ts   # Hook para subida de archivos
│   │
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts      # Cliente de Supabase (browser)
│   │       └── server.ts      # Cliente de Supabase (server)
│   │
│   ├── types/
│   │   └── database.ts        # Tipos TypeScript de Supabase
│   │
│   ├── utils/
│   │   ├── fileAccess.ts      # Utilidades para acceso a archivos
│   │   └── utils.ts           # Utilidades generales
│   │
│   └── middleware.ts          # Middleware de Next.js (autenticación)
│
├── public/                    # Archivos estáticos
├── CALENDAR.md                # Documentación del esquema de calendario
├── CALENDAR_DB.md            # SQL para añadir metadata JSONB
└── package.json

```

---

## 🔐 Sistema de Autenticación

### Flujo de Autenticación

1. **OAuth con Google:**
   - Login básico: `signInWithGoogle()` → redirige a `/auth/callback`
   - Con permisos de calendario: `connectGoogleCalendar()` → solicita scopes adicionales
   - Scopes requeridos: `calendar` y `calendar.events`

2. **Middleware de Protección:**
   - `src/middleware.ts` protege todas las rutas excepto:
     - `/login`
     - `/auth/callback`
     - `/auth/auth-code-error`

3. **AuthContext:**
   - Gestiona estado de usuario, sesión y tokens
   - Proporciona `signInWithGoogle()`, `connectGoogleCalendar()`, `signOut()`
   - Escucha cambios de autenticación en tiempo real

---

## 💬 Sistema de Chat con IA

### Características Principales

1. **Gestión de Chats:**
   - Creación automática de chats al enviar primer mensaje
   - Títulos auto-generados (primeros 50 caracteres del mensaje)
   - Tipos de contexto: `general`, y otros definidos por el usuario
   - Historial persistente en Supabase

2. **Mensajería:**
   - Streaming de respuestas de IA (Server-Sent Events)
   - Formateo con Markdown (`react-markdown`)
   - Resaltado de código con `highlight.js`
   - Soporte para múltiples tipos de mensajes: `user`, `assistant`, `system`

3. **Integración con n8n:**
   - Webhook: `NEXT_PUBLIC_N8N_WEBHOOK_CHAT_HOST`
   - Formato de request:
     ```json
     {
       "message": "contenido del mensaje",
       "chat_id": "uuid",
       "client_id": "user_id"
     }
     ```
   - Respuesta: Streaming con formato `{ type: "item", content: "..." }`

4. **Componentes Clave:**
   - `ChatInput.tsx`: Input con:
     - Auto-resize de textarea
     - Upload de archivos
     - Historial de chats (dropdown)
     - Botones de navegación (chat/calendario)
     - Indicador visual de panel activo
   - `MessageList.tsx`: Renderiza mensajes con markdown y syntax highlighting
   - `ChatContext.tsx`: Gestiona estado global de chats y mensajes

### Rutas de Chat

- `/foco` → Chat sin chat específico (nuevo)
- `/foco/[chat_id]` → Chat específico
- `/dashboard?chat=[chat_id]` → Dashboard con chat específico

---

## 📄 Sistema RAG (Retrieval-Augmented Generation)

### Procesamiento de Archivos

1. **Upload de Archivos:**
   - Formatos soportados: `.pdf`, `.txt`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.jpg`, `.jpeg`, `.png`, `.gif`
   - Máximo: 10MB
   - Almacenamiento en Supabase Storage bucket: `chat-files`
   - Estructura de paths: `chat-{chatId}/{userId}/{timestamp}-{random}.{ext}`

2. **Flujo RAG:**
   ```
   Usuario sube archivo
   ↓
   Upload a Supabase Storage
   ↓
   Generación de URL firmada (1 hora de expiración)
   ↓
   Webhook a n8n: NEXT_PUBLIC_N8N_WEBHOOK_ADD_PDF_TO_RAG_HOST
   ↓
   Procesamiento con IA (chunking, embedding, indexación)
   ↓
   Respuesta: Array de chunks procesados
   ```

3. **Webhook RAG:**
   - Endpoint: `NEXT_PUBLIC_N8N_WEBHOOK_ADD_PDF_TO_RAG_HOST`
   - Payload:
     ```json
     {
       "file_id": "storage_path",
       "file_path": "signed_url",
       "file_type": "mime_type"
     }
     ```

4. **Estados de Upload:**
   - `uploading` → Progreso 0-90%
   - `processing` → Procesando con IA (95%)
   - `completed` → Guardado en RAG (100%)
   - `error` → Manejo de errores

---

## 📅 Integración con Google Calendar

### Funcionalidades

1. **Sincronización:**
   - `syncEvents(weekStart)` → Sincroniza eventos de una semana
   - Elimina duplicados automáticamente
   - Sincronización automática cada 5 minutos
   - Actualización desde DB cada 1 minuto

2. **CRUD de Eventos:**
   - `createEvent()` → Crea en Google Calendar y DB local
   - `updateEvent()` → Actualiza en ambos sistemas
   - `deleteEvent()` → Elimina en ambos sistemas
   - `updateColorEvent()` → Actualiza color del evento

3. **Base de Datos Local:**
   - Tabla: `calendar_events`
   - Campos clave:
     - `google_event_id` (para sincronización)
     - `user_id`
     - `title`, `description`, `location`
     - `start_time`, `end_time` (UTC)
     - `all_day` (boolean)
     - `color_id`, `color_hex`

4. **Esquema de Calendario (Según CALENDAR.md):**
   - Esquema `calendar` con tablas:
     - `calendar.calendars` → Calendarios del usuario
     - `calendar.events` → Eventos (con recurrencia RRULE)
     - `calendar.attendees` → Invitados a eventos
     - `calendar.reminders` → Recordatorios
   - Row Level Security (RLS) activado
   - Zonas horarias: Almacenamiento en UTC, display con timezone IANA

5. **Manejo de Colores:**
   - Mapeo de colores de Google Calendar a hex
   - 11 colores predefinidos (Lavender, Sage, Grape, etc.)

### Hook useGoogleCalendar

- Gestión de estados: `loading`, `error`
- Funciones de sincronización y limpieza
- Manejo robusto de errores (tokens expirados, permisos insuficientes)

---

## 🎨 Sistema de Diseño

### Tema y Colores

1. **Paleta de Colores:**
   - Primary: Purple (`oklch(0.55 0.18 280.5)`)
   - Secondary: Blue (`oklch(0.65 0.15 240.8)`)
   - Gradientes: Purple → Blue → Purple
   - Modo oscuro/claro soportado

2. **Componentes UI:**
   - Usa `class-variance-authority` para variantes
   - Componentes shadcn/ui base (button, card)
   - Diseño moderno con glassmorphism (backdrop-blur)

3. **Tipografía:**
   - Geist Sans (variable font)
   - Geist Mono (para código)

4. **Características Visuales:**
   - Gradientes animados
   - Sombras suaves
   - Transiciones fluidas
   - Estados hover y focus bien definidos

---

## 🗄️ Base de Datos (Supabase)

### Esquemas

1. **Public Schema:**
   - `chats` → Conversaciones del usuario
     - `id`, `user_id`, `title`, `context_type`, `created_at`, `updated_at`
   - `messages` → Mensajes de chat
     - `id`, `chat_id`, `user_id`, `role`, `content`, `token_count`, `model_used`, `attached_files`, `created_at`
   - `files` → Referencias a archivos subidos
     - `id`, `user_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `created_at`
   - `calendar_events` → Eventos de calendario (tabla local)
     - `id`, `user_id`, `google_event_id`, `title`, `description`, `location`, `start_time`, `end_time`, `all_day`, `color_id`, `color_hex`

2. **Calendar Schema:**
   - `calendar.calendars` → Calendarios con metadata JSONB
   - `calendar.events` → Eventos con RRULE y metadata JSONB
   - `calendar.attendees` → Invitados con metadata JSONB
   - `calendar.reminders` → Recordatorios

### Row Level Security (RLS)

- Todas las tablas protegidas con políticas RLS
- Usuarios solo ven sus propios datos
- Políticas basadas en `auth.uid()`

### Storage

- Bucket: `chat-files`
- Estructura de paths: `chat-{chatId}/{userId}/{filename}`
- URLs firmadas con expiración configurable
- Políticas de acceso en Supabase Storage

---

## 🔄 Flujos de Usuario Principales

### 1. Flujo de Login
```
Usuario visita app
↓
Middleware redirige a /login
↓
Click en "Iniciar con Google"
↓
OAuth flow de Supabase
↓
Callback a /auth/callback
↓
Usuario autenticado → Redirige a /foco
```

### 2. Flujo de Chat
```
Usuario escribe mensaje en ChatInput
↓
Si no hay chat: Crea nuevo chat
↓
Guarda mensaje del usuario en DB
↓
Envía a webhook n8n (streaming)
↓
Recibe respuesta chunk por chunk
↓
Guarda mensaje de IA en DB
↓
Actualiza UI en tiempo real
```

### 3. Flujo de Upload de Archivo
```
Usuario selecciona archivo
↓
Upload a Supabase Storage
↓
Muestra progreso (0-90%)
↓
Genera URL firmada
↓
Llama webhook RAG de n8n
↓
Estado: processing (95%)
↓
Recibe chunks procesados
↓
Estado: completed (100%)
↓
Archivo disponible en RAG para consultas
```

### 4. Flujo de Sincronización de Calendario
```
Usuario abre calendario
↓
Verifica permisos de Google Calendar
↓
Si no tiene: Muestra botón "Conectar Google Calendar"
↓
Si tiene: Sincroniza semana actual
↓
Elimina eventos locales de la semana
↓
Obtiene eventos de Google Calendar API
↓
Procesa y elimina duplicados
↓
Inserta eventos en DB local
↓
Renderiza eventos en UI
```

---

## 🚀 Variables de Entorno Necesarias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# n8n Webhooks
NEXT_PUBLIC_N8N_WEBHOOK_CHAT_HOST=...
NEXT_PUBLIC_N8N_WEBHOOK_ADD_PDF_TO_RAG_HOST=...
```

---

## 🎯 Características Destacadas

### 1. **Vista Dividida (Dashboard)**
- Paneles redimensionables (chat + calendario)
- Intercambio de paneles izquierda/derecha
- Persistencia de chat via URL query params

### 2. **Navegación Inteligente**
- Botones contextuales (navegar entre foco/dashboard)
- Historial de chats accesible desde input
- Rutas dinámicas para chats específicos

### 3. **Sincronización en Tiempo Real**
- Streaming de respuestas de IA
- Actualización automática de calendario
- Estados de carga bien gestionados

### 4. **Seguridad**
- RLS en todas las tablas
- URLs firmadas con expiración
- Middleware de autenticación
- Validación de permisos en Google Calendar

---

## 📊 Puntos Fuertes del Proyecto

✅ **Arquitectura moderna:** Next.js 15, React 19, App Router
✅ **TypeScript:** Tipado completo con tipos de Supabase
✅ **Seguridad:** RLS, autenticación robusta, URLs firmadas
✅ **UX:** Streaming, estados de carga, feedback visual
✅ **Escalabilidad:** Separación de concerns, contextos bien estructurados
✅ **Documentación:** CALENDAR.md y CALENDAR_DB.md bien detallados

---

## 🔧 Áreas de Mejora Potencial

1. **Manejo de Errores:**
   - Algunos errores solo se loguean, podrían mostrarse al usuario
   - Falta retry logic para webhooks fallidos

2. **Optimización:**
   - Podría implementar paginación para chats muy largos
   - Debouncing en sincronización de calendario

3. **Testing:**
   - No se ven tests unitarios o de integración
   - Falta documentación de tests

4. **Accesibilidad:**
   - Revisar ARIA labels y navegación por teclado

5. **Performance:**
   - Considerar lazy loading de componentes pesados
   - Optimización de imágenes en Next.js Image

---

## 📝 Conclusión

**Focus Flow** es un proyecto bien estructurado que combina:
- Chat con IA mediante webhooks
- RAG para procesamiento de documentos
- Integración completa con Google Calendar
- UI moderna y responsive

El código está bien organizado, usa TypeScript correctamente, y sigue buenas prácticas de Next.js y React. La integración con Supabase y n8n está bien implementada, y el sistema de autenticación es robusto.

El proyecto está listo para producción con algunos ajustes menores en manejo de errores y optimizaciones de performance.

