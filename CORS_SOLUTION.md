# 🔒 Solución de CORS para Calendarios ICS

## ❌ Problema Original

```
Access to fetch at 'https://bloqueneon.uniandes.edu.co/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### ¿Qué es CORS?

**CORS** (Cross-Origin Resource Sharing) es una política de seguridad del navegador que bloquea peticiones entre diferentes orígenes (dominios).

```
Frontend (localhost:3000)  →  ❌  →  Bloque Neón (bloqueneon.uniandes.edu.co)
                              CORS
```

El servidor de Bloque Neón no tiene configurado el header `Access-Control-Allow-Origin`, por lo que el navegador bloquea la petición.

---

## ✅ Solución Implementada: Proxy en el Backend

Creamos una **API Route en Next.js** que actúa como intermediario:

```
Frontend (localhost:3000)
    ↓ (petición al propio servidor)
API Route (/api/calendar/fetch-ics)
    ↓ (petición desde el servidor, sin CORS)
Bloque Neón (bloqueneon.uniandes.edu.co)
```

### ¿Por qué funciona?

- ✅ **CORS solo aplica en navegadores**, no en servidores
- ✅ El frontend hace la petición a su propio dominio (localhost:3000)
- ✅ La API Route (servidor) descarga el ICS sin restricciones
- ✅ La API Route devuelve el contenido al frontend

---

## 📁 Archivo Creado

### `src/app/api/calendar/fetch-ics/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { icsUrl } = await request.json()
  
  // 1. Validar URL
  const url = new URL(icsUrl)
  
  // 2. Descargar desde el servidor (sin CORS)
  const response = await fetch(icsUrl, {
    headers: {
      "User-Agent": "FocusFlow/1.0",
      Accept: "text/calendar, text/plain, */*",
    },
    signal: AbortSignal.timeout(30000), // 30s timeout
  })
  
  // 3. Validar contenido ICS
  const icsContent = await response.text()
  if (!icsContent.includes("BEGIN:VCALENDAR")) {
    throw new Error("No es un archivo ICS válido")
  }
  
  // 4. Devolver al frontend
  return NextResponse.json({
    success: true,
    content: icsContent,
  })
}
```

---

## 🔄 Flujo Completo

### Antes (con CORS ❌)
```javascript
// En useICalendar.ts
const response = await fetch(calendar.ics_url) // ❌ Bloqueado por CORS
```

### Después (sin CORS ✅)
```javascript
// En useICalendar.ts
const response = await fetch("/api/calendar/fetch-ics", {
  method: "POST",
  body: JSON.stringify({ icsUrl: calendar.ics_url })
})

const data = await response.json()
const icsContent = data.content // ✅ Funciona!
```

---

## 🛡️ Seguridad

La API Route incluye múltiples validaciones:

### 1. Validación de URL
```typescript
// Solo HTTP/HTTPS permitidos
if (!["http:", "https:"].includes(url.protocol)) {
  return error(400, "Solo se permiten URLs HTTP/HTTPS")
}
```

### 2. Timeout
```typescript
// Máximo 30 segundos
signal: AbortSignal.timeout(30000)
```

### 3. Validación de Contenido
```typescript
// Debe ser un archivo ICS válido
if (!icsContent.includes("BEGIN:VCALENDAR")) {
  return error(400, "No es un archivo ICS válido")
}
```

### 4. User-Agent
```typescript
// Identificación del cliente
headers: {
  "User-Agent": "FocusFlow/1.0"
}
```

---

## 🎯 Ventajas de Esta Solución

| Ventaja | Descripción |
|---------|-------------|
| ✅ **Universal** | Funciona con cualquier servidor ICS |
| ✅ **Seguro** | Validaciones en backend |
| ✅ **Robusto** | Timeout y manejo de errores |
| ✅ **Escalable** | Next.js maneja múltiples peticiones |
| ✅ **Estándar** | Patrón común en desarrollo web |

---

## 📊 Comparación de Soluciones

| Solución | Ventajas | Desventajas |
|----------|----------|-------------|
| **Proxy Backend** ✅ | • Funciona siempre<br>• Control total<br>• Seguro | • Carga en servidor<br>• Latencia extra |
| Configurar CORS en origen | • Sin proxy<br>• Más rápido | • No controlamos Bloque Neón<br>• Imposible en la práctica |
| Extensión de navegador | • Sin backend | • No portable<br>• Solo desarrollo |
| JSONP (obsoleto) | • Sin CORS | • Inseguro<br>• Obsoleto |

---

## 🧪 Prueba

### Petición de Ejemplo

```bash
# POST a la API Route
curl -X POST http://localhost:3000/api/calendar/fetch-ics \
  -H "Content-Type: application/json" \
  -d '{
    "icsUrl": "https://bloqueneon.uniandes.edu.co/d2l/le/calendar/feed/user/feed.ics?token=..."
  }'
```

### Respuesta Esperada

```json
{
  "success": true,
  "content": "BEGIN:VCALENDAR\nVERSION:2.0\n...",
  "size": 12345
}
```

---

## 🐛 Solución de Problemas

### "Failed to fetch" persiste
**Solución**: 
- Verifica que el archivo existe: `src/app/api/calendar/fetch-ics/route.ts`
- Reinicia el servidor de desarrollo (`npm run dev`)

### "Timeout"
**Solución**: 
- La URL puede ser lenta
- Aumenta el timeout en `route.ts` si es necesario
- Verifica tu conexión a internet

### "No es un archivo ICS válido"
**Solución**: 
- Verifica la URL en el navegador
- Debe descargar un archivo `.ics`
- Debe contener `BEGIN:VCALENDAR`

---

## 📚 Referencias

- **CORS MDN**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **Next.js API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **iCalendar RFC 5545**: https://tools.ietf.org/html/rfc5545

---

## ✅ Conclusión

El problema de CORS se resuelve con un **proxy backend simple pero efectivo**. Esta es una solución estándar en desarrollo web moderno y funciona perfectamente para nuestro caso de uso con calendarios ICS.

**¡Ahora puedes suscribirte a Bloque Neón sin problemas de CORS! 🎉**

