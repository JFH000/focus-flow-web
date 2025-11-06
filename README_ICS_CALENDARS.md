# 📅 Suscripción a Calendarios ICS - Guía Rápida

## 🚀 Inicio Rápido

### 1. Ejecutar SQL (Una vez)
```sql
-- En Supabase SQL Editor, ejecutar:
sql/add_ics_calendar_support.sql
```

### 2. Obtener URL ICS

**Bloque Neón (Uniandes):**
```
1. Ir a https://bloqueneon.uniandes.edu.co
2. Calendario → Suscribirse
3. Copiar URL que termina en .ics
```

**Google Calendar:**
```
1. Google Calendar → Configuración
2. Seleccionar calendario → Integrar calendario
3. Copiar "Dirección secreta en formato iCal"
```

### 3. Suscribirse en Focus Flow

```
1. Abrir Calendario
2. Click en "Sincronizar" (⟳)
3. Buscar "Calendarios Externos"
4. Click en "Calendario ICS"
5. Pegar URL y dar nombre
6. ¡Listo!
```

---

## ✨ Ejemplo

```
Nombre: Bloque Neón
URL: https://bloqueneon.uniandes.edu.co/d2l/le/calendar/feed/user/feed.ics?token=abc123
Color: Verde
```

Los eventos aparecen automáticamente y se sincronizan cada hora.

---

## 📚 Documentación Completa

- **Guía de Usuario**: `ICS_CALENDAR_GUIDE.md`
- **Detalles Técnicos**: `ICS_IMPLEMENTATION_SUMMARY.md`
- **Orden de SQL**: `SQL_EXECUTION_ORDER.md`

---

## ❓ Problemas Comunes

### "URL no válida"
✅ Asegúrate que empiece con `https://` y contenga `.ics`

### "Ya estás suscrito"
✅ Ya agregaste esa URL antes. Búscala en el selector de calendarios.

### "No se muestran eventos"
✅ Espera 1-2 minutos para la primera sincronización
✅ Verifica que el calendario esté marcado como visible

---

## 🎯 Características

- ✅ Sincronización automática cada 60 minutos
- ✅ Compatible con cualquier URL ICS estándar
- ✅ Soporte para eventos de todo el día
- ✅ Solo lectura (no editable)
- ✅ Múltiples calendarios ICS por usuario
- ✅ Colores personalizables

---

**¿Listo para empezar? Ejecuta el SQL y suscríbete a tu primer calendario! 🎊**

