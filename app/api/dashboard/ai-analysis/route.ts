import { NextRequest, NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import { analyzeFinancesWithAI } from "@/lib/financial-ai-analyzer"
import { healthCache } from "@/lib/health-cache"
import type { FinancialContext } from "@/lib/chat-types"
import { requireAuth } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"
export const maxDuration = 30 // Timeout de 30 segundos para AI

/**
 * Endpoint de análisis financiero inteligente
 * GET /api/dashboard/ai-analysis
 * 
 * Proporciona análisis financiero en tiempo real usando Gemini AI
 * Usa caché en servidor como fallback (principalmente el cliente usa localStorage)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Obtener el ID de la última transacción para detectar cambios
    const allTransactions = await dbQueries.getTransactions(user.id, { })
    const lastTransactionId = allTransactions.length > 0 ? Math.max(...allTransactions.map(t => t.id)) : 0

    // Intentar obtener del caché del servidor (fallback)
    // NOTE: El caché necesitaría ser por usuario en una implementación completa
    const cachedAnalysis = healthCache.get(lastTransactionId)
    if (cachedAnalysis) {
      console.log("[AI Analysis API] ✅ Retornando análisis desde caché del servidor")
      return NextResponse.json({
        success: true,
        analysis: cachedAnalysis,
        cached: true
      })
    }

    console.log("[AI Analysis API] 🔄 Generando nuevo análisis con AI")

    // Obtener contexto financiero desde la DB
    const context = await buildFinancialContext(user.id)
    
    // Si no hay transacciones, no generar análisis
    if (context.recentTransactions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No hay suficientes datos para generar un análisis. Registra al menos una transacción."
      }, { status: 400 })
    }

    // Analizar con AI
    const analysis = await analyzeFinancesWithAI(context)

    // Guardar en caché del servidor
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
    
    // Si hay error de quota, intentar devolver análisis desde caché aunque esté desactualizado
    const staleCache = healthCache.get(-1) // Ignorar validación de transacción
    if (staleCache) {
      console.log("[AI Analysis API] ⚠️ Error de API, usando caché desactualizado")
      return NextResponse.json({
        success: true,
        analysis: staleCache,
        cached: true,
        stale: true,
        warning: "Análisis desde caché debido a error temporal"
      })
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al generar análisis financiero"
      },
      { status: 500 }
    )
  }
}

/**
 * Construye el contexto financiero desde la base de datos
 */
async function buildFinancialContext(userId: number): Promise<FinancialContext> {
  // Definir rango de fechas (últimos 30 días)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  const startDateStr = startDate.toISOString().split("T")[0]
  const endDateStr = endDate.toISOString().split("T")[0]

  // Obtener transacciones del período
  const allTransactions = await dbQueries.getTransactions(userId, {
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
