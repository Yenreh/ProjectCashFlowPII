import { NextRequest, NextResponse } from "next/server"
import { getReceiptImageInfo } from "@/lib/storage-service"
import { promises as fs } from "fs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbQueries } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { hash } = params

    if (!hash) {
      return NextResponse.json(
        { error: "Hash de imagen no proporcionado" },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga acceso a este recibo
    // El recibo debe estar vinculado a una transacción del usuario
    const transactions = await dbQueries.getTransactions(parseInt(session.user.id))
    const hasAccess = transactions.some(t => t.image_hash === hash)

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acceso denegado a este recibo" },
        { status: 403 }
      )
    }

    // Obtener información de la imagen
    const imageInfo = await getReceiptImageInfo(hash)

    if (!imageInfo || !imageInfo.exists) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 }
      )
    }

    // Modo Vercel Blob: descargar y servir la imagen (no redirigir para mantener autenticación)
    if (imageInfo.url && !imageInfo.path) {
      try {
        const response = await fetch(imageInfo.url)
        if (!response.ok) {
          throw new Error(`Failed to fetch from Vercel Blob: ${response.status}`)
        }
        
        const imageBuffer = await response.arrayBuffer()
        const mimeType = imageInfo.extension === "png" ? "image/png" : "image/jpeg"
        
        return new NextResponse(imageBuffer as any, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "private, max-age=3600",
            "Content-Length": imageBuffer.byteLength.toString(),
          },
        })
      } catch (error) {
        console.error("[Receipt Image] Error descargando de Vercel Blob:", error)
        return NextResponse.json(
          { error: "Error al descargar imagen desde almacenamiento" },
          { status: 500 }
        )
      }
    }

    // Modo local: servir el archivo desde sistema de archivos
    if (!imageInfo.path) {
      return NextResponse.json(
        { error: "Ruta de imagen no disponible" },
        { status: 500 }
      )
    }

    // Leer el archivo
    const imageBuffer = await fs.readFile(imageInfo.path)

    // Determinar el tipo MIME
    const mimeType = imageInfo.extension === "png" 
      ? "image/png" 
      : "image/jpeg"

    // Retornar la imagen
    return new NextResponse(imageBuffer as any, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": imageInfo.size?.toString() || "",
      },
    })
  } catch (error) {
    console.error("[Receipt Image] Error sirviendo imagen:", error)
    return NextResponse.json(
      { error: "Error al obtener la imagen" },
      { status: 500 }
    )
  }
}
