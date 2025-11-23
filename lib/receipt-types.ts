/**
 * Tipos para el módulo de escaneo de recibos
 */

export interface ReceiptScanRequest {
  image: string // Base64 encoded image
  userId?: string // Para futura implementación de autenticación
}

export interface ReceiptScanResult {
  merchant: string
  amount: number
  currency: string
  date: string // YYYY-MM-DD
  categoryName: string
  categoryId?: number
  confidence: number // 0-1
  rawText?: string
  needsRetry: boolean
  imageHash?: string // Hash de la imagen guardada
  llmMetadata?: {
    model: string
    latencyMs: number
  }
}

export interface ReceiptScanResponse {
  success: boolean
  data?: ReceiptScanResult
  error?: string
  message?: string
}

export interface ReceiptValidationRequest {
  amount: number
  currency: string
  date: string
  categoryId: number
  categoryName: string
  accountId: number
  description: string
  imageHash?: string // Hash de la imagen guardada
  edited: boolean
}
