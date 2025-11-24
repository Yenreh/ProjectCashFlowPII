"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppLayout } from "@/components/layout/app-layout"
import { TransactionList } from "@/components/transactions/transaction-list"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { QuickTransactionButtons } from "@/components/transactions/quick-transaction-buttons"
import { TransactionFilters, type FilterValues } from "@/components/transactions/transaction-filters"
import type { TransactionWithDetails } from "@/lib/types"
import { useTransactionsStore, useAccountsStore, useStoreSync } from "@/lib/stores"
import { toast } from "sonner"

export default function TransaccionesPage() {
  const { transactions, loading, fetchTransactions, deleteTransaction } = useTransactionsStore()
  const { accounts, fetchAccounts } = useAccountsStore()
  const { invalidateAll } = useStoreSync()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null)
  const [filters, setFilters] = useState<FilterValues>({})

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    fetchTransactions(filters)
  }, [filters, fetchTransactions])

  const handleEdit = (transaction: TransactionWithDetails) => {
    setSelectedTransaction(transaction)
    setDialogOpen(true)
  }

  const handleDelete = async (transaction: TransactionWithDetails) => {
    if (!confirm(`¿Estás seguro de eliminar esta transacción?`)) return

    try {
      await deleteTransaction(transaction.id)
      toast.success("Transacción eliminada")
      invalidateAll()
    } catch (error) {
      console.error("[Transacciones] Error deleting:", error)
      toast.error("Error al eliminar la transacción")
    }
  }

  const handleNewTransaction = () => {
    setSelectedTransaction(null)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    invalidateAll()
    fetchTransactions(filters)
  }

  return (
    <AppLayout onTransactionCreated={handleSuccess}>
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 xl:px-16 py-4 sm:py-8 pb-32 md:pb-8 max-w-7xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-balance">Transacciones</h1>
              <p className="text-muted-foreground mt-1">Historial de ingresos y gastos</p>
            </div>
            <div className="hidden md:flex gap-2">
              <Button onClick={handleNewTransaction}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <QuickTransactionButtons onSuccess={handleSuccess} />
          </div>

          <div className="mb-6">
            <TransactionFilters onFilterChange={setFilters} />
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Cargando transacciones...</div>
          ) : (
            <TransactionList transactions={transactions} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </div>
      </div>

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={selectedTransaction}
        onSuccess={handleSuccess}
      />
    </AppLayout>
  )
}
