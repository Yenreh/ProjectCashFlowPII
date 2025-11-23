"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { MetricCard } from "@/components/dashboard/metric-card"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { AccountsSummary } from "@/components/dashboard/accounts-summary"
import { QuickTransactionButtons } from "@/components/transactions/quick-transaction-buttons"
import { HealthScoreBadge } from "@/components/dashboard/health-score-badge"
import { formatCurrency } from "@/lib/format"
import type { DashboardMetrics } from "@/lib/types"

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/dashboard/metrics")
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error("[v0] Error fetching metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDataRefresh = () => {
    fetchMetrics()
    setRefreshTrigger((prev) => prev + 1)
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  return (
    <AppLayout onTransactionCreated={handleDataRefresh}>
      <div className="w-full overflow-x-hidden">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 xl:px-16 py-4 sm:py-6 pb-32 md:pb-8 max-w-7xl">
          <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3 overflow-hidden">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-balance mb-1">Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Resumen de tus finanzas personales</p>
            </div>
            <HealthScoreBadge />
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Cargando métricas...</div>
          ) : metrics ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6 overflow-hidden">
                <MetricCard
                  title="Balance de Movimientos"
                  value={formatCurrency(metrics.balance)}
                  icon={Wallet}
                  className={metrics.balance < 0 ? "border-destructive/50" : "border-success/50"}
                />
                <MetricCard
                  title="Ingresos"
                  value={formatCurrency(metrics.totalIncome)}
                  icon={TrendingUp}
                  className="border-success/50"
                />
                <MetricCard
                  title="Gastos"
                  value={formatCurrency(metrics.totalExpenses)}
                  icon={TrendingDown}
                  className="border-destructive/50"
                />
                <MetricCard 
                  title="Transacciones" 
                  value={metrics.transactionsCount.toString()} 
                  icon={Receipt}
                  className="border-primary/50"
                />
              </div>

              <div className="mb-4 sm:mb-6 overflow-hidden">
                <QuickTransactionButtons onSuccess={handleDataRefresh} />
              </div>

              <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 overflow-hidden">
                <div className="lg:col-span-2 min-w-0">
                  <RecentTransactions refreshTrigger={refreshTrigger} onDataChange={handleDataRefresh} />
                </div>
                <div className="min-w-0">
                  <AccountsSummary refreshTrigger={refreshTrigger} />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Error al cargar las métricas</div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
