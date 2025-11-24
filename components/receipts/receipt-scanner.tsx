"use client"

import { useState, useRef, useCallback } from "react"
import { Camera, Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ReceiptScanResponse } from "@/lib/receipt-types"

interface ReceiptScannerProps {
  onScanComplete: (result: ReceiptScanResponse, preview?: string) => void
  onCancel?: () => void
}

export function ReceiptScanner({ onScanComplete, onCancel }: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  /**
   * Comprime una imagen agresivamente para OCR
   * Reduce a 1200px max y calidad 0.7 (similar a WhatsApp)
   */
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('No se pudo crear el canvas'))
            return
          }
          
          // Calcular nuevas dimensiones (máximo 1200px es suficiente para OCR)
          let width = img.width
          let height = img.height
          const maxDimension = 1200
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension
              width = maxDimension
            } else {
              width = (width / height) * maxDimension
              height = maxDimension
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          // Dibujar imagen redimensionada con suavizado
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convertir a JPEG con calidad 0.7 (agresivo pero legible)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
          
          // Log del tamaño
          const originalSize = file.size / (1024 * 1024)
          const compressedSize = (compressedBase64.length * 3 / 4) / (1024 * 1024)
          console.log(`[Receipt Scanner] 📦 Compresión: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB (${((1 - compressedSize/originalSize) * 100).toFixed(0)}% reducción)`)
          
          resolve(compressedBase64)
        }
        
        img.onerror = () => reject(new Error('Error al cargar la imagen'))
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen válida")
      return
    }

    setError(null)
    setIsScanning(true)

    try {
      // Comprimir la imagen automáticamente
      const imageBase64 = await compressImage(file)
      
      // Validar tamaño después de comprimir (máximo 5MB)
      const compressedSize = (imageBase64.length * 3 / 4) / (1024 * 1024)
      if (compressedSize > 5) {
        setError(`La imagen es demasiado grande (${compressedSize.toFixed(1)}MB). Intenta con otra foto más cercana al recibo.`)
        setIsScanning(false)
        return
      }
      
      setPreview(imageBase64)

      // Enviar al endpoint de escaneo
      const response = await fetch("/api/receipts/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageBase64 }),
      })

      const result: ReceiptScanResponse = await response.json()

      if (!response.ok || !result.success) {
        setError(result.message || result.error || "Error al procesar el recibo")
        setIsScanning(false)
        return
      }

      // Notificar al componente padre con el resultado y el preview
      onScanComplete(result, imageBase64)
      setIsScanning(false)
    } catch (err) {
      console.error("Error procesando imagen:", err)
      setError("Error al procesar la imagen. Por favor intenta de nuevo.")
      setIsScanning(false)
    }
  }, [onScanComplete, compressImage])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleClear = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        {/* Preview de la imagen */}
        {preview && (
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Preview del recibo"
              className="w-full h-auto max-h-96 object-contain"
            />
            {!isScanning && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Estado de carga */}
        {isScanning && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Procesando recibo con IA...</span>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Botones de acción */}
        {!isScanning && !preview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Botón de cámara */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-8 w-8" />
              <span>Tomar Foto</span>
            </Button>

            {/* Botón de galería */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8" />
              <span>Subir Imagen</span>
            </Button>
          </div>
        )}

        {/* Botón de cancelar */}
        {onCancel && !isScanning && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
