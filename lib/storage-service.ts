/**
 * Servicio de almacenamiento de imágenes de recibos
 * Guarda las imágenes en /public/media/receipts usando hash SHA-256
 */

import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"

const RECEIPTS_DIR = path.join(process.cwd(), "public", "media", "receipts")

/**
 * Genera un hash SHA-256 de los datos de la imagen
 */
export function generateImageHash(imageData: string): string {
  // Remover el prefijo data:image/... si existe
  const base64Data = imageData.includes(",") 
    ? imageData.split(",")[1] 
    : imageData

  // Crear hash del contenido
  const hash = createHash("sha256")
    .update(base64Data)
    .digest("hex")

  return hash
}

/**
 * Asegura que el directorio de recibos existe
 */
async function ensureReceiptsDirectory(): Promise<void> {
  try {
    await fs.access(RECEIPTS_DIR)
  } catch {
    // El directorio no existe, crearlo recursivamente
    await fs.mkdir(RECEIPTS_DIR, { recursive: true })
  }
}

/**
 * Guarda una imagen de recibo en el sistema de archivos
 * @returns El hash de la imagen (nombre del archivo sin extensión)
 */
export async function saveReceiptImage(imageData: string): Promise<string> {
  await ensureReceiptsDirectory()

  // Generar hash
  const hash = generateImageHash(imageData)

  // Extraer el tipo MIME y los datos base64
  let mimeType = "image/jpeg" // Default
  let base64Data = imageData

  if (imageData.startsWith("data:")) {
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
    if (matches) {
      mimeType = matches[1]
      base64Data = matches[2]
    } else {
      base64Data = imageData.split(",")[1] || imageData
    }
  }

  // Determinar extensión basada en MIME type
  const extension = mimeType.includes("png") ? "png" : "jpg"
  const filename = `${hash}.${extension}`
  const filepath = path.join(RECEIPTS_DIR, filename)

  // Verificar si el archivo ya existe
  try {
    await fs.access(filepath)
    return hash
  } catch {
    // El archivo no existe, guardarlo
  }

  // Convertir base64 a buffer
  const buffer = Buffer.from(base64Data, "base64")

  // Guardar el archivo
  await fs.writeFile(filepath, buffer)

  return hash
}

/**
 * Obtiene la ruta pública de una imagen de recibo
 * @param hash Hash de la imagen
 * @returns URL relativa para usar en el frontend
 */
export function getReceiptImageUrl(hash: string): string {
  // Verificar si existe como .jpg o .png
  const extensions = ["jpg", "png"]
  
  // Por defecto retornar .jpg, pero en producción deberías verificar cuál existe
  return `/media/receipts/${hash}.jpg`
}

/**
 * Elimina una imagen de recibo del sistema de archivos
 */
export async function deleteReceiptImage(hash: string): Promise<boolean> {
  const extensions = ["jpg", "png", "jpeg"]
  
  for (const ext of extensions) {
    const filepath = path.join(RECEIPTS_DIR, `${hash}.${ext}`)
    try {
      await fs.unlink(filepath)
      return true
    } catch (error) {
      // Archivo no existe con esta extensión, intentar la siguiente
    }
  }

  return false
}

/**
 * Verifica si una imagen existe en el almacenamiento
 */
export async function receiptImageExists(hash: string): Promise<boolean> {
  const extensions = ["jpg", "png", "jpeg"]
  
  for (const ext of extensions) {
    const filepath = path.join(RECEIPTS_DIR, `${hash}.${ext}`)
    try {
      await fs.access(filepath)
      return true
    } catch {
      // Continuar con la siguiente extensión
    }
  }
  
  return false
}

/**
 * Obtiene información de una imagen de recibo
 */
export async function getReceiptImageInfo(hash: string): Promise<{
  exists: boolean
  path?: string
  size?: number
  extension?: string
} | null> {
  const extensions = ["jpg", "png", "jpeg"]
  
  for (const ext of extensions) {
    const filepath = path.join(RECEIPTS_DIR, `${hash}.${ext}`)
    try {
      const stats = await fs.stat(filepath)
      return {
        exists: true,
        path: filepath,
        size: stats.size,
        extension: ext,
      }
    } catch {
      // Continuar con la siguiente extensión
    }
  }
  
  return { exists: false }
}
