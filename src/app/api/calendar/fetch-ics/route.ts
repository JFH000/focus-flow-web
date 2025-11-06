import { NextRequest, NextResponse } from "next/server"

/**
 * API Route para descargar archivos ICS
 * Evita problemas de CORS al hacer la petición desde el servidor
 */
export async function POST(request: NextRequest) {
  try {
    const { icsUrl } = await request.json()

    if (!icsUrl) {
      return NextResponse.json(
        { error: "URL ICS es requerida" },
        { status: 400 }
      )
    }

    // Validar que sea una URL válida
    let url: URL
    try {
      url = new URL(icsUrl)
    } catch {
      return NextResponse.json(
        { error: "URL inválida" },
        { status: 400 }
      )
    }

    // Solo permitir HTTP/HTTPS
    if (!["http:", "https:"].includes(url.protocol)) {
      return NextResponse.json(
        { error: "Solo se permiten URLs HTTP/HTTPS" },
        { status: 400 }
      )
    }

    console.log(`📥 Descargando ICS desde: ${icsUrl}`)

    // Hacer la petición desde el servidor (sin CORS)
    const response = await fetch(icsUrl, {
      method: "GET",
      headers: {
        "User-Agent": "FocusFlow/1.0",
        Accept: "text/calendar, text/plain, application/octet-stream, */*",
      },
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      console.error(`❌ Error ${response.status}: ${response.statusText}`)
      return NextResponse.json(
        { error: `Error al descargar ICS: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    // Obtener el contenido
    const icsContent = await response.text()

    console.log(`✅ ICS descargado: ${icsContent.length} caracteres`)

    // Validar que sea un archivo ICS válido
    if (!icsContent.includes("BEGIN:VCALENDAR")) {
      console.error("❌ El contenido no es un archivo ICS válido")
      return NextResponse.json(
        { error: "El contenido descargado no es un archivo ICS válido" },
        { status: 400 }
      )
    }

    // Devolver el contenido
    return NextResponse.json({
      success: true,
      content: icsContent,
      size: icsContent.length,
    })
  } catch (error) {
    console.error("Error en fetch-ics API:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json(
          { error: "Tiempo de espera agotado al descargar el calendario" },
          { status: 504 }
        )
      }

      return NextResponse.json(
        { error: `Error al procesar la petición: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Error desconocido al descargar el calendario" },
      { status: 500 }
    )
  }
}

