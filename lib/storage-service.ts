/**
 * Servicio de almacenamiento de imágenes de recibos
 * Soporta dos modos:
 * - LOCAL: Guarda en /public/media/receipts (desarrollo)
 * - VERCEL_BLOB: Usa Vercel Blob Storage (producción)
 * 
 * Configurar con STORAGE_MODE=local o STORAGE_MODE=vercel_blob
 */

import { put, del, head } from "@vercel/blob"
import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"

const STORAGE_MODE = process.env.STORAGE_MODE || "vercel_blob"
const RECEIPTS_DIR = path.join(process.cwd(), "public", "media", "receipts")

/**
 * Genera un hash SHA-256 de los datos de la imagen
 */
export function generateImageHash(imageData: string): string {
  const base64Data = imageData.includes(",") 
    ? imageData.split(",")[1] 
    : imageData

  const hash = createHash("sha256")
    .update(base64Data)
    .digest("hex")

  return hash
}

/**
 * Asegura que el directorio de recibos existe (solo para modo local)
 */
async function ensureReceiptsDirectory(): Promise<void> {
  try {
    await fs.access(RECEIPTS_DIR)
  } catch {
    await fs.mkdir(RECEIPTS_DIR, { recursive: true })
  }
}

/**
 * Guarda una imagen de recibo (local o Vercel Blob según configuración)
 * @returns El hash de la imagen (identificador único)
 */
export async function saveReceiptImage(imageData: string): Promise<string> {
  const hash = generateImageHash(imageData)

  // Extraer el tipo MIME y los datos base64
  let mimeType = "image/jpeg"
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
  const buffer = Buffer.from(base64Data, "base64")

  if (STORAGE_MODE === "local") {
    // Modo LOCAL: Guardar en sistema de archivos
    await ensureReceiptsDirectory()
    const filename = `${hash}.${extension}`
    const filepath = path.join(RECEIPTS_DIR, filename)

    // Verificar si ya existe
    try {
      await fs.access(filepath)
      console.log(`[Storage] ℹ️ Imagen ya existe (local): ${filename}`)
      return hash
    } catch {
      await fs.writeFile(filepath, buffer)
      console.log(`[Storage] ✅ Imagen guardada (local): ${filename}`)
    }
  } else {
    // Modo VERCEL_BLOB: Subir a Vercel Blob
    const filename = `receipts/${hash}.${extension}`
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mimeType,
    })
    console.log(`[Storage] ✅ Imagen guardada (blob): ${blob.url}`)
  }

  return hash
}

/**
 * Obtiene la URL pública de una imagen de recibo
 * @param hash Hash de la imagen
 * @returns URL de la imagen o null si no existe
 */
export async function getReceiptImageUrl(hash: string): Promise<string | null> {
  const extensions = ["jpg", "png"]
  
  if (STORAGE_MODE === "local") {
    // Modo LOCAL: Retornar ruta relativa
    for (const ext of extensions) {
      const filepath = path.join(RECEIPTS_DIR, `${hash}.${ext}`)
      try {
        await fs.access(filepath)
        return `/media/receipts/${hash}.${ext}`
      } catch {
        continue
      }
    }
  } else {
    // Modo VERCEL_BLOB: Consultar Blob Storage
    for (const ext of extensions) {
      try {
        const blobUrl = `receipts/${hash}.${ext}`
        const info = await head(blobUrl)
        return info.url
      } catch {
        continue
      }
    }
  }
  
  return null
}

/**
 * Elimina una imagen de recibo
 */
export async function deleteReceiptImage(hash: string): Promise<boolean> {
  const extensions = ["jpg", "png", "jpeg"]
  
  if (STORAGE_MODE === "local") {
    // Modo LOCAL: Eliminar del sistema de archivos
    for (const ext of extensions) {
      const filepath = path.join(RECEIPTS_DIR, `${hash}.${ext}`)
      try {
        await fs.unlink(filepath)
        console.log(`[Storage] 🗑️ Imagen eliminada (local): ${hash}.${ext}`)
        return true
      } catch {
        continue
      }
    }
  } else {
    // Modo VERCEL_BLOB: Eliminar de Blob Storage
    for (const ext of extensions) {
      try {
        const blobUrl = `receipts/${hash}.${ext}`
        await del(blobUrl)
        console.log(`[Storage] 🗑️ Imagen eliminada (blob): ${blobUrl}`)
        return true
      } catch {
        continue
      }
    }
  }

  return false
}

/**
 * Verifica si una imagen existe
 */
export async function receiptImageExists(hash: string): Promise<boolean> {
  const extensions = ["jpg", "png", "jpeg"]
  
  if (STORAGE_MODE === "local") {
    // Modo LOCAL: Verificar en sistema de archivos
    for (const ext of extensions) {
      const filepath = path.join(RECEIPTS_DIR, `${hash}.${ext}`)
      try {
        await fs.access(filepath)
        return true
      } catch {
        continue
      }
    }
  } else {
    // Modo VERCEL_BLOB: Verificar en Blob Storage
    for (const ext of extensions) {
      try {
        const blobUrl = `receipts/${hash}.${ext}`
        await head(blobUrl)
        return true
      } catch {
        continue
      }
    }
  }
  
  return false
}

/**
 * Obtiene información de una imagen de recibo
 */
export async function getReceiptImageInfo(hash: string): Promise<{
  exists: boolean
  url?: string
  path?: string
  size?: number
  extension?: string
} | null> {
  const extensions = ["jpg", "png", "jpeg"]
  
  if (STORAGE_MODE === "local") {
    // Modo LOCAL: Obtener info del sistema de archivos
    for (const ext of extensions) {
      const filepath = path.join(RECEIPTS_DIR, `${hash}.${ext}`)
      try {
        const stats = await fs.stat(filepath)
        return {
          exists: true,
          path: filepath,
          url: `/media/receipts/${hash}.${ext}`,
          size: stats.size,
          extension: ext,
        }
      } catch {
        continue
      }
    }
  } else {
    // Modo VERCEL_BLOB: Obtener info de Blob Storage
    for (const ext of extensions) {
      try {
        const blobUrl = `receipts/${hash}.${ext}`
        const info = await head(blobUrl)
        return {
          exists: true,
          url: info.url,
          size: info.size,
          extension: ext,
        }
      } catch {
        continue
      }
    }
  }
  
  return { exists: false }
}
