import { NextRequest, NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import { generateChatResponse, generateFallbackResponse } from "@/lib/chat-service"
import { analyzeSavingsOpportunities } from "@/lib/savings-analyzer"
import { analyzeFinancesWithAI } from "@/lib/financial-ai-analyzer"
import type { ChatRequest, ChatResponse, FinancialContext } from "@/lib/chat-types"

export const dynamic = "force-dynamic"

/**
 * Endpoint principal del chat con RAG
 * POST /api/chat/query
 * 
 * Recibe una pregunta del usuario, construye contexto financiero desde la DB,
 * y genera una respuesta usando un LLM (Gemini) con el contexto.
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, history = [] } = body

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "El mensaje es requerido" } as ChatResponse,
        { status: 400 }
      )
    }

    // 1. Obtener contexto financiero desde la DB
    const context = await buildFinancialContext()

    // 2. Analizar oportunidades de ahorro con AI (fallback a estático si falla)
    const savingsAnalysis = await analyzeFinancesWithAI(context)

    // 3. Generar respuesta con LLM (o fallback si no hay API key)
    let answer: string
    const hasApiKey = !!process.env.GEMINI_API_KEY

    if (hasApiKey) {
      try {
        answer = await generateChatResponse(message, context, history, savingsAnalysis)
      } catch (error) {
        console.error("[Chat API] Error con LLM:", error)
        answer = generateFallbackResponse(message, context, savingsAnalysis)
      }
    } else {
      answer = generateFallbackResponse(message, context, savingsAnalysis)
    }

    const response: ChatResponse = {
      success: true,
      answer,
      context,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[Chat API] Error procesando consulta:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al procesar la consulta. Por favor intenta de nuevo.",
      } as ChatResponse,
      { status: 500 }
    )
  }
}

/**
 * Construye el contexto financiero desde la base de datos
 * Incluye transacciones recientes, gastos por categoría, y resumen general
 */
async function buildFinancialContext(): Promise<FinancialContext> {
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
