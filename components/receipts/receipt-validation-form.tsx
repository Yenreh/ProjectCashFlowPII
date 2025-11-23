"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Calendar, DollarSign, Building2, Tag, User, Check, X, Pencil, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CategorySelector } from "@/components/categories/category-selector"
import type { ReceiptScanResult } from "@/lib/receipt-types"
import type { Account } from "@/lib/types"

interface ReceiptValidationFormProps {
  scanResult: ReceiptScanResult
  accounts: Account[]
  onConfirm: (data: ReceiptValidationData) => void
  onCancel: () => void
  imagePreview?: string
  isSubmitting?: boolean
}

export interface ReceiptValidationData {
  merchant: string
  amount: number
  currency: string
  date: string
  categoryId: number
  categoryName: string
  accountId: number
  description: string
  imageHash?: string
  edited: boolean
}

export function ReceiptValidationForm({
  scanResult,
  accounts,
  onConfirm,
  onCancel,
  imagePreview,
  isSubmitting = false,
}: ReceiptValidationFormProps) {
  const [isEdited, setIsEdited] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<number>(
    accounts.length > 0 ? accounts[0].id : 0
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      merchant: scanResult.merchant || "",
      amount: scanResult.amount || 0,
      currency: scanResult.currency || "COP",
      date: scanResult.date || new Date().toISOString().split('T')[0],
      categoryId: scanResult.categoryId || 0,
      description: `Compra en ${scanResult.merchant || "comercio"}`,
    },
  })

  // Actualizar valores cuando cambie scanResult
  useEffect(() => {
    if (scanResult) {
      setValue("merchant", scanResult.merchant || "")
      setValue("amount", scanResult.amount || 0)
      setValue("currency", scanResult.currency || "COP")
      setValue("date", scanResult.date || new Date().toISOString().split('T')[0])
      setValue("categoryId", scanResult.categoryId || 0)
      setValue("description", `Compra en ${scanResult.merchant || "comercio"}`)
    }
  }, [scanResult, setValue])

  const watchedCategoryId = watch("categoryId")

  // Marcar como editado si el usuario cambia algún campo
  const handleFieldChange = () => {
    setIsEdited(true)
  }

  const onSubmit = (data: any) => {
    const validationData: ReceiptValidationData = {
      merchant: data.merchant,
      amount: parseFloat(data.amount),
      currency: data.currency,
      date: data.date,
      categoryId: parseInt(data.categoryId),
      categoryName: scanResult.categoryName,
      accountId: selectedAccountId,
      description: data.description,
      imageHash: scanResult.imageHash,
      edited: isEdited,
    }

    onConfirm(validationData)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Validar Información del Recibo</CardTitle>
            {scanResult.confidence && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Confianza:</span>
                <span className={`font-medium ${
                  scanResult.confidence >= 0.8 ? "text-green-600" :
                  scanResult.confidence >= 0.6 ? "text-yellow-600" :
                  "text-red-600"
                }`}>
                  {Math.round(scanResult.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Preview de la imagen */}
          {imagePreview && (
            <div className="rounded-lg overflow-hidden border bg-muted">
              <img
                src={imagePreview}
                alt="Recibo escaneado"
                className="w-full h-64 object-contain"
              />
            </div>
          )}

          {/* Alerta si el OCR tiene baja confianza */}
          {scanResult.needsRetry && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
              <p className="font-medium">⚠️ Revisa cuidadosamente la información</p>
              <p className="text-xs mt-1">
                La imagen podría estar borrosa o el texto no fue completamente legible. 
                Por favor verifica que todos los datos sean correctos.
              </p>
            </div>
          )}

          {/* Grid de campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Comercio */}
            <div className="space-y-2">
              <Label htmlFor="merchant" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Comercio
              </Label>
              <Input
                id="merchant"
                {...register("merchant", { required: "El comercio es requerido" })}
                onChange={handleFieldChange}
                placeholder="Nombre del comercio"
              />
              {errors.merchant && (
                <p className="text-sm text-destructive">{errors.merchant.message}</p>
              )}
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monto ({scanResult.currency})
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", {
                  required: "El monto es requerido",
                  min: { value: 0.01, message: "El monto debe ser mayor a 0" },
                })}
                onChange={handleFieldChange}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha
              </Label>
              <Input
                id="date"
                type="date"
                {...register("date", { required: "La fecha es requerida" })}
                onChange={handleFieldChange}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Cuenta */}
            <div className="space-y-2">
              <Label htmlFor="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Cuenta
              </Label>
              <select
                id="account"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(parseInt(e.target.value))
                  handleFieldChange()
                }}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categoría
            </Label>
            <CategorySelector
              type="gasto"
              value={watchedCategoryId}
              onValueChange={(categoryId: number) => {
                setValue("categoryId", categoryId)
                handleFieldChange()
              }}
            />
            {!watchedCategoryId && (
              <p className="text-sm text-destructive">La categoría es requerida</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Descripción (opcional)
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              onChange={handleFieldChange}
              placeholder="Agrega una descripción adicional..."
              rows={2}
            />
          </div>

          {/* Indicador de edición */}
          {isEdited && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Pencil className="h-4 w-4" />
              <span>Has modificado la información extraída</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!watchedCategoryId || !selectedAccountId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Guardar Gasto
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
