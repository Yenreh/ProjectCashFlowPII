"use client"

import { useEffect } from "react"
import { ArrowRight, Wallet } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAccountsStore } from "@/lib/stores/accounts-store"

export function AccountsSummary() {
  const { accounts, loading, fetchAccounts } = useAccountsStore()

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Calcular balance total con conversión explícita a número
  const totalBalance = accounts.reduce((sum, account) => {
    const balance = Number(account.balance) || 0
    return sum + balance
  }, 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 overflow-hidden">
        <CardTitle className="text-lg truncate min-w-0">Resumen de Cuentas</CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-8 flex-shrink-0">
          <Link href="/cuentas">
            <span className="hidden sm:inline">Ver todas</span>
            <ArrowRight className="h-4 w-4 sm:ml-2" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-hidden">{loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No hay cuentas registradas</div>
        ) : (
          <>
            <div className="mb-6 p-3 sm:p-4 rounded-lg bg-primary/5 overflow-hidden">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Balance Total</p>
              <p className={cn("text-2xl sm:text-3xl font-bold truncate", totalBalance < 0 ? "text-destructive" : "text-foreground")}>
                {formatCurrency(totalBalance)}
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3 overflow-x-hidden">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-border overflow-hidden">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="font-medium text-sm truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground capitalize truncate">{account.type}</p>
                  </div>
                  <p className={cn("font-semibold text-xs sm:text-sm whitespace-nowrap flex-shrink-0", account.balance < 0 ? "text-destructive" : "text-foreground")}>
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
