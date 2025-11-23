import { NextRequest, NextResponse } from "next/server"
import { scanReceiptWithAI, validateImageQuality } from "@/lib/ocr-service"
import { saveReceiptImage } from "@/lib/storage-service"
import { dbQueries } from "@/lib/db"
import type { ReceiptScanResponse } from "@/lib/receipt-types"

export async function POST(request: NextRequest) {
  try {
    // Parsear el body
    const body = await request.json()
    const { image } = body

    // Validar que se envió una imagen
    if (!image) {
      const response: ReceiptScanResponse = {
        success: false,
        error: "No se proporcionó ninguna imagen",
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validar calidad de la imagen
    const validation = validateImageQuality(image)
    if (!validation.valid) {
      const response: ReceiptScanResponse = {
        success: false,
        error: validation.error,
        message: "Por favor, toma otra foto con mejor calidad",
      }
      return NextResponse.json(response, { status: 422 })
    }

    // Guardar la imagen y obtener el hash
    const imageHash = await saveReceiptImage(image)

    // Obtener categorías para mapeo inteligente
    const categories = await dbQueries.getCategories()

    // Procesar la imagen con IA
    const scanResult = await scanReceiptWithAI(image, categories)

    // Si necesita retry por baja calidad
    if (scanResult.needsRetry) {
      const response: ReceiptScanResponse = {
        success: false,
        error: "IMAGE_QUALITY_TOO_LOW",
        message: "La imagen es muy borrosa o no se puede leer el monto. Por favor, toma otra foto.",
        data: scanResult,
      }
      return NextResponse.json(response, { status: 422 })
    }

    // Agregar el hash de la imagen al resultado
    const response: ReceiptScanResponse = {
      success: true,
      data: {
        ...scanResult,
        imageHash, // Agregar el hash para que el frontend lo pueda usar
      } as any,
      message: "Recibo procesado correctamente",
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("[Receipt Scan] ❌ Error procesando recibo:", error)

    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    
    const response: ReceiptScanResponse = {
      success: false,
      error: "Error al procesar el recibo",
      message: errorMessage.includes("OPENAI_API_KEY") 
        ? "Configuración de API incorrecta. Contacta al administrador."
        : "Ocurrió un error al procesar la imagen. Por favor, intenta de nuevo.",
    }

    return NextResponse.json(response, { status: 500 })
  }
}
