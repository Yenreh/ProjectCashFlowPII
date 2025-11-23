import { NextRequest, NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import { analyzeSavingsOpportunities } from "@/lib/savings-analyzer"
import type { FinancialContext } from "@/lib/chat-types"

export const dynamic = "force-dynamic"

/**
 * Endpoint para análisis de ahorro y sugerencias
 * GET /api/savings/analyze
 * 
 * Analiza patrones de gasto y genera sugerencias proactivas
 */
export async function GET(request: NextRequest) {
  try {
    // Definir rango de fechas (últimos 30 días por defecto)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    // Obtener transacciones del período
    const allTransactions = await dbQueries.getTransactions({
      startDate: startDateStr,
      endDate: endDateStr,
    })

    // Calcular totales
    const expenses = allTransactions.filter((t) => t.type === "gasto")
    const incomes = allTransactions.filter((t) => t.type === "ingreso")

    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0)
    const balance = totalIncome - totalExpenses

    // Agrupar gastos por categoría
    const categoryMap = new Map<
      string,
      { category: string; amount: number; count: number }
    >()

    expenses.forEach((tx) => {
      const categoryName = tx.category_name || "Sin categoría"
      const existing = categoryMap.get(categoryName)

      if (existing) {
        existing.amount += tx.amount
        existing.count += 1
      } else {
        categoryMap.set(categoryName, {
          category: categoryName,
          amount: tx.amount,
          count: 1,
        })
      }
    })

    const expensesByCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    )

    // Transacciones recientes
    const recentTransactions = allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
      .map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description || "",
        date: tx.date,
        categoryName: tx.category_name,
        source: tx.source,
      }))

    const context: FinancialContext = {
      totalExpenses,
      totalIncome,
      balance,
      expensesByCategory,
      recentTransactions,
      dateRange: {
        start: startDateStr,
        end: endDateStr,
      },
    }

    // Analizar oportunidades de ahorro
    const analysis = analyzeSavingsOpportunities(context)

    return NextResponse.json({
      success: true,
      analysis,
      context,
    })
  } catch (error) {
    console.error("[Savings API] Error analizando ahorros:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al analizar oportunidades de ahorro",
      },
      { status: 500 }
    )
  }
}
