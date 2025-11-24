/**
 * Analizador Financiero Inteligente con Gemini AI
 * Análisis dinámico y personalizado de finanzas personales
 * Se actualiza en tiempo real con cada transacción
 */

import { GoogleGenAI } from "@google/genai"
import type { FinancialContext } from "./chat-types"
import type { SavingsInsight, SavingsAnalysis } from "./savings-analyzer"

interface AIFinancialAnalysis {
  healthScore: number
  healthStatus: "excelente" | "bueno" | "regular" | "critico"
  summary?: string // Opcional
  keyInsights: Array<{
    type: "warning" | "opportunity" | "success" | "info"
    category?: string
    title: string
    message: string
    impact: number
    priority: "high" | "medium" | "low"
    actionable: boolean
    suggestion?: string
  }>
  trends: Array<{
    trend: "aumentando" | "disminuyendo" | "estable"
    category: string
    message: string
  }>
  recommendations: string[]
  motivationalMessage: string
}

/**
 * Analiza el contexto financiero usando Gemini AI
 * Proporciona análisis más profundo y personalizado que reglas estáticas
 */
export async function analyzeFinancesWithAI(
  context: FinancialContext
): Promise<SavingsAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY
  
  // Si no hay API key, usar analizador estático como fallback
  if (!apiKey) {
    console.warn("[Financial AI] No GEMINI_API_KEY, usando análisis estático")
    const { analyzeSavingsOpportunities } = await import("./savings-analyzer")
    return analyzeSavingsOpportunities(context)
  }

  try {
    const ai = new GoogleGenAI({ apiKey })

    // Preparar datos para el análisis
    const analysisData = {
      periodo: `${context.dateRange.start} a ${context.dateRange.end}`,
      ingresos: {
        total: context.totalIncome,
        transacciones: context.recentTransactions.filter(t => t.type === "ingreso").length
      },
      gastos: {
        total: context.totalExpenses,
        transacciones: context.recentTransactions.filter(t => t.type === "gasto").length,
        porCategoria: context.expensesByCategory
      },
      balance: context.balance,
      ratioGastosIngresos: context.totalIncome > 0 
        ? ((context.totalExpenses / context.totalIncome) * 100).toFixed(1) 
        : "N/A",
      transaccionesRecientes: context.recentTransactions.slice(0, 10).map(t => ({
        tipo: t.type,
        monto: t.amount,
        categoria: t.categoryName,
        fecha: t.date
      }))
    }

    const prompt = `Eres un asesor financiero personal experto en finanzas personales colombianas.

Analiza el siguiente contexto financiero de un usuario y proporciona un análisis completo y personalizado.

DATOS FINANCIEROS:
${JSON.stringify(analysisData, null, 2)}

REGLAS DE ANÁLISIS:
1. **healthScore**: Calcula un puntaje de 0-100 basado en:
   - Balance positivo/negativo (peso: 30%)
   - Ratio gastos/ingresos (peso: 30%)
   - Diversificación de gastos (peso: 20%)
   - Consistencia de ingresos (peso: 20%)

2. **healthStatus**: 
   - "excelente" (80-100): Balance positivo, gastos <70% ingresos, ahorro >20%
   - "bueno" (60-79): Balance positivo, gastos 70-85% ingresos
   - "regular" (40-59): Balance ajustado o gastos 85-100% ingresos
   - "critico" (0-39): Balance negativo o gastos >100% ingresos

3. **keyInsights**: Identifica 3-5 insights ACCIONABLES:
   - "warning": Problemas urgentes (balance negativo, sobregasto en categorías)
   - "opportunity": Oportunidades de ahorro (reducir gastos, optimizar categorías)
   - "success": Logros y buenos hábitos (ahorro alto, control de gastos)
   - "info": Información relevante (patrones de gasto, tendencias)
   
   Para cada insight incluye:
   - type: El tipo de insight
   - title: Título CORTO del insight (máximo 5 palabras)
   - message: Descripción del problema u oportunidad
   - impact: Monto en COP del ahorro potencial o impacto
   - priority: "high" para urgente, "medium" para importante, "low" para sugerencias
   - actionable: true si requiere acción
   - suggestion: Acción concreta y específica para resolver

4. **trends**: Analiza tendencias por categoría:
   - "aumentando": Gasto creciente en la categoría
   - "disminuyendo": Gasto decreciente
   - "estable": Sin cambios significativos

5. **recommendations**: Array de 3-5 STRINGS con recomendaciones ESPECÍFICAS y ACCIONABLES
   - Cada elemento debe ser un STRING simple (NO objetos)
   - Deben ser concretas (no generales)
   - Mencionar montos específicos cuando sea posible
   - Priorizar por impacto
   - Ejemplo: ["Reduce gastos en alimentación en 15%", "Crea un fondo de emergencia"]

6. **motivationalMessage**: Mensaje personalizado motivacional
   - Si va bien: Refuerza comportamientos positivos
   - Si va mal: Motiva sin desanimar
   - Máximo 2 frases

IMPORTANTE:
- Todos los montos en COP (pesos colombianos)
- Usa lenguaje colombiano (no uses "dólares", usa "pesos")
- Sé específico con números y porcentajes
- Las sugerencias deben ser prácticas y realizables
- Considera el contexto colombiano (comidas, transporte típico, etc.)

Responde SOLO con JSON válido sin texto adicional.`

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite", // Modelo ligero sin thoughts
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3, // Balance entre creatividad y consistencia
        maxOutputTokens: 4000,
      }
    })
    
    let responseText = response.text || 
                       response.candidates?.[0]?.content?.parts?.[0]?.text ||
                       "{}"
    
    // Limpiar markdown code blocks (```json ... ``` o ``` ... ```)
    responseText = responseText
      .replace(/^```(?:json)?\s*/gm, '')
      .replace(/```\s*$/gm, '')
      .trim()
    
    let aiAnalysis: AIFinancialAnalysis
    try {
      aiAnalysis = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[Financial AI] JSON parse error:', parseError)
      console.error('[Financial AI] Failed response text:', responseText)
      throw new Error("Failed to parse AI analysis response")
    }

    // Validar que la respuesta tenga la estructura esperada
    if (!aiAnalysis || typeof aiAnalysis !== 'object') {
      console.error('[Financial AI] Invalid response structure')
      throw new Error("Invalid AI analysis response structure")
    }
    
    if (!Array.isArray(aiAnalysis.keyInsights)) {
      console.warn('[Financial AI] keyInsights is not an array, setting to empty')
      aiAnalysis.keyInsights = []
    }
    
    if (!Array.isArray(aiAnalysis.trends)) {
      console.warn('[Financial AI] trends is not an array, setting to empty')
      aiAnalysis.trends = []
    }
    
    if (!Array.isArray(aiAnalysis.recommendations)) {
      console.warn('[Financial AI] recommendations is not an array, setting to empty')
      aiAnalysis.recommendations = []
    }
    
    // Si todos los arrays están vacíos, es probable que el análisis falló
    if (aiAnalysis.keyInsights.length === 0 && 
        aiAnalysis.trends.length === 0 && 
        aiAnalysis.recommendations.length === 0) {
      console.warn('[Financial AI] Response contains no insights, using static fallback')
      throw new Error("Empty analysis response from AI")
    }

    // Convertir al formato SavingsAnalysis esperado
    const savingsAnalysis: SavingsAnalysis = {
      healthScore: aiAnalysis.healthScore,
      summary: aiAnalysis.summary, // Opcional
      totalPotentialSavings: aiAnalysis.keyInsights
        .filter(i => i.type === "opportunity" || i.type === "warning")
        .reduce((sum, i) => sum + i.impact, 0),
      insights: aiAnalysis.keyInsights.map(insight => ({
        type: insight.type,
        title: insight.title,
        message: insight.message,
        impact: insight.impact,
        priority: insight.priority,
        category: insight.category,
        actionable: insight.actionable,
        suggestion: insight.suggestion
      })),
      trends: aiAnalysis.trends.map(trend => {
        // Buscar el monto de la categoría en el contexto
        const categoryData = context.expensesByCategory.find(
          c => c.category.toLowerCase() === trend.category.toLowerCase()
        )
        return {
          category: trend.category,
          amount: categoryData?.amount || 0,
          trend: trend.trend
        }
      }),
      recommendations: aiAnalysis.recommendations.map((rec) => {
        // Manejar tanto strings como objetos
        if (typeof rec === 'string') {
          return {
            action: rec,
            category: "",
            expectedSavings: 0
          }
        }
        // Si es objeto con estructura {suggestion, priority, etc}
        const recObj = rec as any
        return {
          action: recObj.suggestion || recObj.action || String(rec),
          category: "",
          expectedSavings: 0
        }
      }),
      motivationalMessage: aiAnalysis.motivationalMessage
    }

    return savingsAnalysis

  } catch (error) {
    console.error("[Financial AI] Error analyzing with AI:", error)
    
    // Fallback a análisis estático
    const { analyzeSavingsOpportunities } = await import("./savings-analyzer")
    return analyzeSavingsOpportunities(context)
  }
}

/**
 * Genera un análisis rápido después de una transacción
 * Útil para mostrar impacto inmediato
 */
export async function quickAnalysisAfterTransaction(
  transactionType: "ingreso" | "gasto",
  amount: number,
  categoryName: string,
  currentContext: FinancialContext
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    // Mensaje simple sin AI
    if (transactionType === "gasto") {
      const newBalance = currentContext.balance - amount
      return `Nuevo balance: $${newBalance.toLocaleString("es-CO")} COP`
    } else {
      const newBalance = currentContext.balance + amount
      return `Nuevo balance: $${newBalance.toLocaleString("es-CO")} COP`
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey })

    const newBalance = transactionType === "gasto" 
      ? currentContext.balance - amount 
      : currentContext.balance + amount

    const newExpenses = transactionType === "gasto"
      ? currentContext.totalExpenses + amount
      : currentContext.totalExpenses

    const newExpenseRatio = currentContext.totalIncome > 0
      ? ((newExpenses / currentContext.totalIncome) * 100).toFixed(1)
      : "N/A"

    const prompt = `Genera un mensaje BREVE (1-2 frases) sobre el impacto de esta transacción:

TRANSACCIÓN:
- Tipo: ${transactionType}
- Monto: $${amount.toLocaleString("es-CO")} COP
- Categoría: ${categoryName}

CONTEXTO ACTUALIZADO:
- Nuevo balance: $${newBalance.toLocaleString("es-CO")} COP
- Gastos del período: $${newExpenses.toLocaleString("es-CO")} COP
- Ratio gastos/ingresos: ${newExpenseRatio}%

El mensaje debe:
- Ser motivacional y positivo (incluso si el balance baja)
- Mencionar el nuevo balance
- Si es gasto alto (>50000), dar tip de ahorro
- Si mejora el balance, felicitar
- Máximo 2 frases

Responde SOLO con el texto del mensaje, sin comillas ni formato adicional.`

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 150
      }
    })

    const message = response.text || 
                   response.candidates?.[0]?.content?.parts?.[0]?.text ||
                   `Nuevo balance: $${newBalance.toLocaleString("es-CO")} COP`

    return message.trim()

  } catch (error) {
    console.error("[Financial AI] Error in quick analysis:", error)
    const newBalance = transactionType === "gasto" 
      ? currentContext.balance - amount 
      : currentContext.balance + amount
    return `Nuevo balance: $${newBalance.toLocaleString("es-CO")} COP`
  }
}
