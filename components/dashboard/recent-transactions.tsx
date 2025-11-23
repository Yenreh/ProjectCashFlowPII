"use client"

import { useState, useEffect } from "react"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TransactionItem } from "@/components/transactions/transaction-item"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import type { TransactionWithDetails } from "@/lib/types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface RecentTransactionsProps {
  refreshTrigger?: number
  onDataChange?: () => void
}

export function RecentTransactions({ refreshTrigger, onDataChange }: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const response = await fetch("/api/transactions")
        const data = await response.json()
        setTransactions(data.slice(0, 5)) // Only show 5 most recent
      } catch (error) {
        console.error("[v0] Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [refreshTrigger])

  const handleEdit = (transaction: TransactionWithDetails) => {
    setEditingTransaction(transaction)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (transaction: TransactionWithDetails) => {
    if (!confirm(`¿Estás seguro de eliminar esta transacción?`)) {
      return
    }

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Error al eliminar")

      toast.success("Transacción eliminada")
      
      // 1. Primero notificar al padre para que actualice métricas y cuentas
      onDataChange?.()
      
      // 2. Luego actualizar la lista local de transacciones
      const newResponse = await fetch("/api/transactions")
      const data = await newResponse.json()
      setTransactions(data.slice(0, 5))
      
      // 3. Finalmente hacer router.refresh para asegurar todo esté actualizado
      router.refresh()
    } catch (error) {
      console.error("[v0] Error deleting transaction:", error)
      toast.error("Error al eliminar la transacción")
    }
  }

  const handleSuccess = () => {
    // 1. Primero notificar al padre para actualización inmediata
    onDataChange?.()
    
    // 2. Actualizar lista local de transacciones
    fetch("/api/transactions")
      .then((res) => res.json())
      .then((data) => setTransactions(data.slice(0, 5)))
      .catch((error) => console.error("[v0] Error refreshing transactions:", error))
    
    // 3. Router refresh para sincronización completa
    router.refresh()
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
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No hay transacciones recientes</div>
        ) : (
          <div className="space-y-2 overflow-x-hidden">
            {transactions.map((transaction) => (
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
