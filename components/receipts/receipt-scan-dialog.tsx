"use client"

import { useState } from "react"
import { Receipt } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ReceiptScanner } from "./receipt-scanner"
import { ReceiptValidationForm, type ReceiptValidationData } from "./receipt-validation-form"
import type { ReceiptScanResponse } from "@/lib/receipt-types"
import type { Account } from "@/lib/types"
import { toast } from "sonner"
import { useTransactionsStore, useStoreSync } from "@/lib/stores"

interface ReceiptScanDialogProps {
  accounts: Account[]
  onTransactionCreated?: () => void
  trigger?: React.ReactNode
}

type Step = "scan" | "validate"

export function ReceiptScanDialog({
  accounts,
  onTransactionCreated,
  trigger,
}: ReceiptScanDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("scan")
  const [scanResult, setScanResult] = useState<ReceiptScanResponse | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const { createTransaction } = useTransactionsStore()
  const { invalidateAll } = useStoreSync()

  const handleScanComplete = (result: ReceiptScanResponse, preview?: string) => {
    if (result.success && result.data) {
      setScanResult(result)
      if (preview) {
        setImagePreview(preview)
      } else if (result.data.imageHash) {
        // Si no tenemos preview pero tenemos hash, construir URL de imagen
        setImagePreview(`/api/receipts/image/${result.data.imageHash}`)
      }
      setStep("validate")
    }
  }

  const handleConfirm = async (data: ReceiptValidationData) => {
    setIsCreating(true)

    try {
      // Crear la transacción usando el store
      await createTransaction({
        account_id: data.accountId,
        category_id: data.categoryId,
        type: "gasto",
        amount: data.amount,
        description: data.description,
        date: data.date,
        source: "image",
        image_hash: data.imageHash,
        ocr_confidence: scanResult?.data?.confidence,
        edited: data.edited,
      } as any)

      toast.success("Gasto registrado", {
        description: `$${data.amount.toLocaleString("es-CO")} ${data.currency} - ${data.description}`,
      })

      // Invalidar todos los stores y notificar
      invalidateAll()
      onTransactionCreated?.()

      // Resetear el diálogo
      handleClose()

      // Notificar al componente padre
      if (onTransactionCreated) {
        onTransactionCreated()
      }
    } catch (error) {
      console.error("Error creando transacción:", error)
      toast.error("Error", {
        description: "No se pudo registrar el gasto. Por favor intenta de nuevo.",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Resetear después de cerrar para evitar flash de contenido
    setTimeout(() => {
      setStep("scan")
      setScanResult(null)
      setImagePreview(null)
    }, 300)
  }

  const handleCancel = () => {
    if (step === "validate") {
      setStep("scan")
      setScanResult(null)
    } else {
      handleClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Receipt className="h-4 w-4" />
            Escanear Recibo
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "scan" ? "Escanear Recibo" : "Validar Información"}
          </DialogTitle>
        </DialogHeader>

        {step === "scan" ? (
          <ReceiptScanner
            onScanComplete={handleScanComplete}
            onCancel={handleClose}
          />
        ) : scanResult?.data ? (
          <ReceiptValidationForm
            scanResult={scanResult.data}
            accounts={accounts}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            imagePreview={imagePreview || undefined}
            isSubmitting={isCreating}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
