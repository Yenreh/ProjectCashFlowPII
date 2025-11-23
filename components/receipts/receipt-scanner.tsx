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

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen válida")
      return
    }

    // Validar tamaño (máximo 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError("La imagen es demasiado grande (máximo 20MB)")
      return
    }

    setError(null)
    setIsScanning(true)

    try {
      // Convertir a base64
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        const imageBase64 = e.target?.result as string
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
      }

      reader.onerror = () => {
        setError("Error al leer el archivo")
        setIsScanning(false)
      }

      reader.readAsDataURL(file)
    } catch (err) {
      console.error("Error procesando imagen:", err)
      setError("Error al procesar la imagen. Por favor intenta de nuevo.")
      setIsScanning(false)
    }
  }, [onScanComplete])

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
