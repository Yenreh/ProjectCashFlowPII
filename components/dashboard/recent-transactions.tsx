"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TransactionItem } from "@/components/transactions/transaction-item"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import type { TransactionWithDetails } from "@/lib/types"
import { toast } from "sonner"
import { useTransactionsStore, useStoreSync } from "@/lib/stores"

interface RecentTransactionsProps {
  onDataChange?: () => void
}

export function RecentTransactions({ onDataChange }: RecentTransactionsProps) {
  const { transactions, loading, fetchTransactions, deleteTransaction } = useTransactionsStore()
  const { invalidateAll } = useStoreSync()
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Obtener solo las 5 más recientes
  const recentTransactions = transactions.slice(0, 5)

  const handleEdit = (transaction: TransactionWithDetails) => {
    setEditingTransaction(transaction)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (transaction: TransactionWithDetails) => {
    if (!confirm(`¿Estás seguro de eliminar esta transacción?`)) {
      return
    }

    try {
      await deleteTransaction(transaction.id)
      toast.success("Transacción eliminada")
      
      // Invalidar todos los stores y notificar al padre
      invalidateAll()
      onDataChange?.()
    } catch (error) {
      console.error("[Recent Transactions] Error deleting:", error)
      toast.error("Error al eliminar la transacción")
    }
  }

  const handleSuccess = () => {
    // Invalidar todos los stores y notificar al padre
    invalidateAll()
    onDataChange?.()
    
    // Refrescar lista de transacciones
    fetchTransactions()
  }

  return (
    <>
      <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 overflow-hidden">
        <CardTitle className="text-lg truncate min-w-0">Transacciones Recientes</CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-8 flex-shrink-0">
          <Link href="/transacciones">
            <span className="hidden sm:inline">Ver todas</span>
            <ArrowRight className="h-4 w-4 sm:ml-2" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-hidden">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No hay transacciones recientes</div>
        ) : (
          <div className="space-y-2 overflow-x-hidden">
            {recentTransactions.map((transaction) => (
              <TransactionItem 
                key={transaction.id} 
                transaction={transaction} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <TransactionFormDialog
      open={isEditDialogOpen}
      onOpenChange={setIsEditDialogOpen}
      transaction={editingTransaction}
      onSuccess={handleSuccess}
    />
    </>
  )
}

