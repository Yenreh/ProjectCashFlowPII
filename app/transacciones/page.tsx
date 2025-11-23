"use client"

import { useState, useEffect } from "react"
import { Plus, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppLayout } from "@/components/layout/app-layout"
import { TransactionList } from "@/components/transactions/transaction-list"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { QuickTransactionButtons } from "@/components/transactions/quick-transaction-buttons"
import { TransactionFilters, type FilterValues } from "@/components/transactions/transaction-filters"
import { ReceiptScanDialog } from "@/components/receipts/receipt-scan-dialog"
import type { TransactionWithDetails, Account } from "@/lib/types"

export default function TransaccionesPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null)
  const [filters, setFilters] = useState<FilterValues>({})

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      const data = await response.json()
      setAccounts(data)
    } catch (error) {
      console.error("[v0] Error fetching accounts:", error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.type) params.append("type", filters.type)
      if (filters.accountId) params.append("accountId", filters.accountId.toString())
      if (filters.categoryId) params.append("categoryId", filters.categoryId.toString())
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)

      const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ""}`
      const response = await fetch(url)
      const data = await response.json()
      setTransactions(data)
    } catch (error) {
      console.error("[v0] Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
    fetchTransactions()
  }, [filters])

  const handleEdit = (transaction: TransactionWithDetails) => {
    setSelectedTransaction(transaction)
    setDialogOpen(true)
  }

  const handleDelete = async (transaction: TransactionWithDetails) => {
    if (!confirm(`¿Estás seguro de eliminar esta transacción?`)) return

    try {
      await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" })
      fetchTransactions()
    } catch (error) {
      console.error("[v0] Error deleting transaction:", error)
    }
  }

  const handleNewTransaction = () => {
    setSelectedTransaction(null)
    setDialogOpen(true)
  }

  return (
    <AppLayout onTransactionCreated={fetchTransactions}>
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 xl:px-16 py-4 sm:py-8 pb-32 md:pb-8 max-w-7xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-balance">Transacciones</h1>
              <p className="text-muted-foreground mt-1">Historial de ingresos y gastos</p>
            </div>
            <div className="hidden md:flex gap-2">
              <ReceiptScanDialog
                accounts={accounts}
                onTransactionCreated={fetchTransactions}
                trigger={
                  <Button variant="outline" className="gap-2">
                    <Receipt className="h-4 w-4" />
                    Escanear Recibo
                  </Button>
                }
              />
              <Button onClick={handleNewTransaction}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <QuickTransactionButtons onSuccess={fetchTransactions} />
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
        onSuccess={fetchTransactions}
      />
    </AppLayout>
  )
}
