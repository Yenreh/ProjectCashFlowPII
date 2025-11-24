import { NextRequest, NextResponse } from "next/server"
import { getReceiptImageInfo } from "@/lib/storage-service"
import { promises as fs } from "fs"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params

    if (!hash) {
      return NextResponse.json(
        { error: "Hash de imagen no proporcionado" },
        { status: 400 }
      )
    }

    // Obtener información de la imagen
    const imageInfo = await getReceiptImageInfo(hash)

    if (!imageInfo || !imageInfo.exists || !imageInfo.path) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 }
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
        "Cache-Control": "public, max-age=31536000, immutable",
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
