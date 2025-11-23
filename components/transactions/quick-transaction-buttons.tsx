"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionFormDialog } from "./transaction-form-dialog"
import { ReceiptScanDialog } from "@/components/receipts/receipt-scan-dialog"
import type { TransactionType, Account } from "@/lib/types"

interface QuickTransactionButtonsProps {
  onSuccess?: () => void
}

export function QuickTransactionButtons({ onSuccess }: QuickTransactionButtonsProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<TransactionType>("gasto")
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch("/api/accounts")
        const data = await response.json()
        setAccounts(data)
      } catch (error) {
        console.error("Error fetching accounts:", error)
      }
    }
    fetchAccounts()
  }, [])

  const handleOpenDialog = (type: TransactionType) => {
    setTransactionType(type)
    setDialogOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button onClick={() => handleOpenDialog("gasto")} variant="outline" className="h-auto py-4">
          <TrendingDown className="mr-2 h-5 w-5 text-destructive" />
          <span className="text-sm font-medium">Nuevo Gasto</span>
        </Button>
        
        <ReceiptScanDialog
          accounts={accounts}
          onTransactionCreated={onSuccess}
          trigger={
            <Button variant="outline" className="h-auto py-4">
              <Receipt className="mr-2 h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Escanear Recibo</span>
            </Button>
          }
        />
        
        <Button onClick={() => handleOpenDialog("ingreso")} variant="outline" className="h-auto py-4">
          <TrendingUp className="mr-2 h-5 w-5 text-success" />
          <span className="text-sm font-medium">Nuevo Ingreso</span>
        </Button>
      </div>

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={transactionType}
        onSuccess={onSuccess}
      />
    </>
  )
}
