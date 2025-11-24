/**
 * Servicio de OCR usando Gemini API (SDK oficial @google/genai)
 * Extrae información estructurada de recibos y facturas usando Gemini 2.5 Flash
 * con capacidades de visión integradas.
 *
 * Configurar `GEMINI_API_KEY` en `.env` para usar la API.
 */

import { GoogleGenAI } from "@google/genai"
import { ReceiptScanResult } from "./receipt-types"
import { Category } from "./types"

export async function scanReceiptWithAI(imageBase64: string, categories: Category[]): Promise<ReceiptScanResult> {
  const start = Date.now()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno")
  }

  // Inicializar cliente de Gemini
  const ai = new GoogleGenAI({ apiKey })

  const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64
  
  // Detectar el tipo MIME de la imagen
  let mimeType = "image/jpeg"
  if (imageBase64.includes("data:image/png")) {
    mimeType = "image/png"
  } else if (imageBase64.includes("data:image/webp")) {
    mimeType = "image/webp"
  } else if (imageBase64.includes("data:image/jpeg") || imageBase64.includes("data:image/jpg")) {
    mimeType = "image/jpeg"
  }

  const categoryList = categories.map(c => c.name).join(", ")

  const prompt = `Analiza esta imagen de un recibo o factura colombiano y extrae la siguiente información en formato JSON:

{
  "merchant": "nombre del comercio o establecimiento",
  "amount": número entero (TOTAL a pagar sin separadores de miles, sin puntos, sin comas, sin símbolos - ejemplo: si ves $65.600 o 65.600, debes devolver 65600),
  "date": "fecha en formato YYYY-MM-DD",
  "category": "categoría más apropiada entre: ${categoryList}"
}

IMPORTANTE para el campo "amount":
- En Colombia los miles se separan con PUNTO (.), NO con coma
- Debes convertir el número a su valor entero SIN separadores
- Ejemplos: 
  * Si ves "65.600" en el recibo → devuelve 65600
  * Si ves "1.500" → devuelve 1500
  * Si ves "123.456" → devuelve 123456
- Busca el TOTAL FINAL a pagar (puede decir "TOTAL", "Total a Pagar", etc.)

Si no encuentras algún dato, usa valores por defecto:
- merchant: "Desconocido"
- amount: 0
- date: fecha actual
- category: "Otros Gastos"

Responde SOLO con el objeto JSON, sin texto adicional.`

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            merchant: { type: "string", description: "Nombre del comercio" },
            amount: { type: "number", description: "Monto total en pesos colombianos SIN separadores (ejemplo: 65600 no 65.600)" },
            date: { type: "string", format: "date", description: "Fecha en formato YYYY-MM-DD" },
            category: { type: "string", description: "Categoría del gasto" }
          },
          required: ["merchant", "amount", "date", "category"]
        }
      }
    })

    const latencyMs = Date.now() - start

    let merchant = "Desconocido"
    let amount = 0
    let date = new Date().toISOString().split("T")[0]
    let categoryName = "Otros Gastos"
    let confidence = 0.5

    const responseText = response.text || ""
    
    // Con structured output, la respuesta siempre es JSON válido
    const parsed = JSON.parse(responseText)
    merchant = parsed.merchant || merchant
    amount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(String(parsed.amount).replace(/[^0-9.]/g, '')) || 0
    date = parsed.date || date
    categoryName = parsed.category || categoryName
      
    // Calcular confianza basada en completitud
    confidence = 0.7
    if (amount > 0) confidence += 0.15
    if (merchant !== "Desconocido") confidence += 0.1
    if (parsed.date && parsed.date !== new Date().toISOString().split("T")[0]) confidence += 0.05

    // Encontrar ID de categoría
    const category = categories.find(c => c.name === categoryName)
    const categoryId = category?.id

    const result: ReceiptScanResult = {
      merchant,
      amount,
      currency: "COP",
      date,
      categoryName,
      categoryId,
      confidence,
      rawText: responseText,
      needsRetry: confidence < 0.6 || amount === 0,
      llmMetadata: { model: "gemini-2.5-flash", latencyMs },
    }

    return result
  } catch (error) {
    console.error("[OCR Service] Error processing OCR:", error)
    throw new Error("Error al procesar el recibo con Gemini")
  }
}

export function validateImageQuality(imageBase64: string): { valid: boolean; error?: string } {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return { valid: false, error: "Imagen inválida" }
  }
  const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
    return { valid: false, error: "Formato de imagen no soportado" }
  }
  const sizeInBytes = Math.floor((base64.length * 3) / 4)
  const sizeInMB = sizeInBytes / (1024 * 1024)
  if (sizeInMB < 0.01) return { valid: false, error: "La imagen es demasiado pequeña" }
  if (sizeInMB > 5) return { valid: false, error: `La imagen es muy grande (${sizeInMB.toFixed(1)}MB). Máximo 5MB.` }
  return { valid: true }
}

/**
 * Comprime una imagen en base64 si es muy grande
 * Convierte a JPEG con calidad reducida para optimizar
 */
export function compressImageIfNeeded(imageBase64: string): string {
  const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64
  const sizeInBytes = Math.floor((base64.length * 3) / 4)
  const sizeInMB = sizeInBytes / (1024 * 1024)
  
  // Si es menor a 2MB, no comprimir
  if (sizeInMB < 2) {
    console.log(`[OCR Service] Imagen OK (${sizeInMB.toFixed(2)}MB), no se comprime`)
    return imageBase64
  }
  
  console.log(`[OCR Service] ⚠️ Imagen grande (${sizeInMB.toFixed(2)}MB), debería comprimirse en el cliente`)
  return imageBase64
}
