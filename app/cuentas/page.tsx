"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppLayout } from "@/components/layout/app-layout"
import { AccountCard } from "@/components/accounts/account-card"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import type { Account } from "@/lib/types"

export default function CuentasPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      const data = await response.json()
      setAccounts(data)
    } catch (error) {
      console.error("[v0] Error fetching accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleEdit = (account: Account) => {
    setSelectedAccount(account)
    setDialogOpen(true)
  }

  const handleArchive = async (account: Account) => {
    try {
      await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: 1 }),
      })
      fetchAccounts()
    } catch (error) {
      console.error("[v0] Error archiving account:", error)
    }
  }

  const handleDelete = async (account: Account) => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta "${account.name}"?`)) return

    try {
      await fetch(`/api/accounts/${account.id}`, { method: "DELETE" })
      fetchAccounts()
    } catch (error) {
      console.error("[v0] Error deleting account:", error)
    }
  }

  const handleNewAccount = () => {
    setSelectedAccount(null)
    setDialogOpen(true)
  }

  return (
    <AppLayout onTransactionCreated={fetchAccounts}>
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 xl:px-16 py-4 sm:py-8 pb-32 md:pb-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-balance">Cuentas</h1>
            <p className="text-muted-foreground mt-1">Gestiona tus cuentas bancarias y efectivo</p>
          </div>
          <Button onClick={handleNewAccount}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cuenta
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando cuentas...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No tienes cuentas registradas</p>
            <Button onClick={handleNewAccount}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primera Cuenta
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
        onSuccess={fetchAccounts}
      />
    </AppLayout>
  )
}
