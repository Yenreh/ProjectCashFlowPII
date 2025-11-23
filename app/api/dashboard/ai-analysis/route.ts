import { NextRequest, NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import { analyzeFinancesWithAI } from "@/lib/financial-ai-analyzer"
import { healthCache } from "@/lib/health-cache"
import type { FinancialContext } from "@/lib/chat-types"

export const dynamic = "force-dynamic"

/**
 * Endpoint de análisis financiero inteligente
 * GET /api/dashboard/ai-analysis
 * 
 * Proporciona análisis financiero en tiempo real usando Gemini AI
 * Usa caché inteligente que se invalida solo cuando hay nuevas transacciones
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el ID de la última transacción para detectar cambios
    const allTransactions = await dbQueries.getTransactions({ })
    const lastTransactionId = allTransactions.length > 0 ? Math.max(...allTransactions.map(t => t.id)) : 0

    // Intentar obtener del caché
    const cachedAnalysis = healthCache.get(lastTransactionId)
    if (cachedAnalysis) {
      console.log("[AI Analysis API] ✅ Retornando análisis desde caché")
      return NextResponse.json({
        success: true,
        analysis: cachedAnalysis,
        cached: true
      })
    }

    console.log("[AI Analysis API] 🔄 Generando nuevo análisis con AI")

    // Obtener contexto financiero desde la DB
    const context = await buildFinancialContext()

    // Analizar con AI
    const analysis = await analyzeFinancesWithAI(context)

    // Guardar en caché
    healthCache.set(analysis, lastTransactionId)

    return NextResponse.json({
      success: true,
      analysis,
      cached: false,
      context: {
        totalIncome: context.totalIncome,
        totalExpenses: context.totalExpenses,
        balance: context.balance,
        dateRange: context.dateRange
      }
    })

  } catch (error) {
    console.error("[AI Analysis API] Error generando análisis:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar análisis financiero"
      },
      { status: 500 }
    )
  }
}

/**
 * Construye el contexto financiero desde la base de datos
 */
async function buildFinancialContext(): Promise<FinancialContext> {
  // Definir rango de fechas (últimos 30 días)
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

  // Transacciones recientes (últimas 20)
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

  return {
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
}
