"use client"

import dynamic from "next/dynamic"
import { AppLayout } from "@/components/layout/app-layout"

// Lazy load de componentes pesados de gráficos
const ExpenseChart = dynamic(
  () => import("@/components/reports/expense-chart").then(mod => ({ default: mod.ExpenseChart })),
  { 
    loading: () => <div className="bg-card rounded-lg p-6 h-[400px] animate-pulse" />,
    ssr: false 
  }
)

const IncomeChart = dynamic(
  () => import("@/components/reports/income-chart").then(mod => ({ default: mod.IncomeChart })),
  { 
    loading: () => <div className="bg-card rounded-lg p-6 h-[400px] animate-pulse" />,
    ssr: false 
  }
)

export default function ReportesPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 xl:px-16 py-4 sm:py-8 pb-32 md:pb-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-balance">Reportes</h1>
          <p className="text-muted-foreground mt-1">Análisis y visualización de tus finanzas</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ExpenseChart />
          <IncomeChart />
        </div>
      </div>
    </AppLayout>
  )
}
