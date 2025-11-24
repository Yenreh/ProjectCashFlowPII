/**
 * Analizador de patrones de gasto y generador de sugerencias de ahorro
 * Detecta comportamientos financieros y propone acciones concretas
 */

import type { FinancialContext } from "./chat-types"

export interface SavingsInsight {
  type: "warning" | "opportunity" | "success" | "info"
  title: string
  message: string
  impact: number // Monto estimado de ahorro o impacto
  priority: "high" | "medium" | "low"
  category?: string
  actionable: boolean
  suggestion?: string
}

export interface CategoryTrend {
  category: string
  amount: number
  trend: "aumentando" | "disminuyendo" | "estable"
}

export interface SaveRecommendation {
  action: string
  category: string
  expectedSavings: number
}

export interface SavingsAnalysis {
  insights: SavingsInsight[]
  summary?: string // Opcional ahora
  totalPotentialSavings: number
  healthScore: number // 0-100
  trends?: CategoryTrend[]
  recommendations?: SaveRecommendation[]
  motivationalMessage?: string
}

/**
 * Analiza el contexto financiero y genera insights de ahorro
 */
export function analyzeSavingsOpportunities(context: FinancialContext): SavingsAnalysis {
  const insights: SavingsInsight[] = []
  let totalPotentialSavings = 0

  // 1. Análisis de balance general (Gasto > 80% del ingreso)
  if (context.totalIncome > 0) {
    const expenseRatio = (context.totalExpenses / context.totalIncome) * 100

    if (expenseRatio > 100) {
      insights.push({
        type: "warning",
        title: "Gastos superan ingresos",
        message: `Estás gastando ${expenseRatio.toFixed(0)}% de tus ingresos. Estás en déficit de $${Math.abs(context.balance).toLocaleString("es-CO")} COP.`,
        impact: Math.abs(context.balance),
        priority: "high",
        actionable: true,
        suggestion: "Revisa tus gastos fijos y busca áreas donde puedas reducir. Considera aumentar tus ingresos o eliminar gastos no esenciales.",
      })
    } else if (expenseRatio > 80) {
      const excessAmount = context.totalExpenses - context.totalIncome * 0.7
      totalPotentialSavings += excessAmount
      insights.push({
        type: "warning",
        title: "Gastos muy altos",
        message: `Estás gastando el ${expenseRatio.toFixed(0)}% de tus ingresos. El ideal es mantener los gastos bajo el 70-80%.`,
        impact: excessAmount,
        priority: "high",
        actionable: true,
        suggestion: `Si reduces tus gastos al 70% de tus ingresos, podrías ahorrar $${excessAmount.toLocaleString("es-CO")} COP adicionales.`,
      })
    } else if (expenseRatio < 60) {
      insights.push({
        type: "success",
        title: "Excelente control de gastos",
        message: `Solo gastas el ${expenseRatio.toFixed(0)}% de tus ingresos. ¡Vas muy bien!`,
        impact: context.balance,
        priority: "low",
        actionable: false,
      })
    }
  }

  // 2. Análisis por categoría (Gastos > 40% en una sola categoría)
  if (context.expensesByCategory.length > 0 && context.totalExpenses > 0) {
    context.expensesByCategory.forEach((cat) => {
      const categoryPercentage = (cat.amount / context.totalExpenses) * 100

      if (categoryPercentage > 40) {
        const target = context.totalExpenses * 0.3
        const potentialSaving = cat.amount - target
        totalPotentialSavings += potentialSaving

        insights.push({
          type: "warning",
          title: `Gasto excesivo en ${cat.category}`,
          message: `${cat.category} representa el ${categoryPercentage.toFixed(0)}% de tus gastos totales ($${cat.amount.toLocaleString("es-CO")} COP).`,
          impact: potentialSaving,
          priority: "high",
          category: cat.category,
          actionable: true,
          suggestion: `Si reduces tus gastos en ${cat.category} en un 25%, podrías ahorrar aproximadamente $${(potentialSaving * 0.25).toLocaleString("es-CO")} COP.`,
        })
      } else if (categoryPercentage > 30) {
        const potentialSaving = (cat.amount * 0.1)
        insights.push({
          type: "opportunity",
          title: `Oportunidad en ${cat.category}`,
          message: `${cat.category} es una de tus categorías principales (${categoryPercentage.toFixed(0)}%).`,
          impact: potentialSaving,
          priority: "medium",
          category: cat.category,
          actionable: true,
          suggestion: `Busca alternativas más económicas en ${cat.category}. Un ahorro del 10% serían $${potentialSaving.toLocaleString("es-CO")} COP.`,
        })
      }
    })
  }

  // 3. Análisis de frecuencia de gastos por descripción
  const descriptionExpenses = new Map<string, { amount: number; count: number }>()
  context.recentTransactions
    .filter((tx) => tx.type === "gasto" && tx.description)
    .forEach((tx) => {
      const description = tx.description!
      const existing = descriptionExpenses.get(description)
      if (existing) {
        existing.amount += tx.amount
        existing.count += 1
      } else {
        descriptionExpenses.set(description, { amount: tx.amount, count: 1 })
      }
    })

  // Detectar descripciones con alta frecuencia
  Array.from(descriptionExpenses.entries())
    .filter(([_, data]) => data.count >= 3)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 2)
    .forEach(([description, data]) => {
      const potentialSaving = data.amount * 0.15
      insights.push({
        type: "opportunity",
        title: `Gasto frecuente: ${description}`,
        message: `Has registrado ${data.count} gastos similares por un total de $${data.amount.toLocaleString("es-CO")} COP.`,
        impact: potentialSaving,
        priority: "medium",
        actionable: true,
        suggestion: `Considera reducir la frecuencia de estos gastos. Podrías ahorrar hasta $${potentialSaving.toLocaleString("es-CO")} COP.`,
      })
    })

  // 4. Análisis de transacciones pequeñas frecuentes ("latte factor")
  const smallTransactions = context.recentTransactions.filter(
    (tx) => tx.type === "gasto" && tx.amount < 20000 && tx.amount > 0
  )
  if (smallTransactions.length >= 5) {
    const totalSmall = smallTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    const potentialSaving = totalSmall * 0.3
    insights.push({
      type: "info",
      title: "Gastos pequeños frecuentes",
      message: `Tienes ${smallTransactions.length} gastos pequeños (menos de $20.000) que suman $${totalSmall.toLocaleString("es-CO")} COP.`,
      impact: potentialSaving,
      priority: "low",
      actionable: true,
      suggestion: `Los gastos pequeños se acumulan. Si reduces estos gastos en un 30%, ahorrarías $${potentialSaving.toLocaleString("es-CO")} COP.`,
    })
  }

  // 5. Sugerencia de meta de ahorro
  if (context.totalIncome > 0 && context.balance > 0) {
    const savingsRate = (context.balance / context.totalIncome) * 100
    if (savingsRate < 10) {
      const targetSavings = context.totalIncome * 0.1
      const additionalSavingsNeeded = targetSavings - context.balance
      insights.push({
        type: "opportunity",
        title: "Meta de ahorro recomendada",
        message: `Tu tasa de ahorro actual es del ${savingsRate.toFixed(1)}%. Se recomienda ahorrar al menos el 10% de tus ingresos.`,
        impact: additionalSavingsNeeded,
        priority: "medium",
        actionable: true,
        suggestion: `Para alcanzar el 10% de ahorro, necesitas reducir gastos o aumentar ingresos en $${additionalSavingsNeeded.toLocaleString("es-CO")} COP.`,
      })
    } else if (savingsRate >= 20) {
      insights.push({
        type: "success",
        title: "¡Excelente ahorro!",
        message: `Estás ahorrando el ${savingsRate.toFixed(1)}% de tus ingresos ($${context.balance.toLocaleString("es-CO")} COP). ¡Sigue así!`,
        impact: context.balance,
        priority: "low",
        actionable: false,
      })
    }
  }

  // Ordenar por prioridad
  insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Calcular health score (0-100)
  const healthScore = calculateHealthScore(context, insights)

  // Generar mensaje motivacional
  const motivationalMessage = generateMotivationalMessage(context, healthScore)

  // Limitar insights a máximo 5
  const limitedInsights = insights.slice(0, 5)

  return {
    insights: limitedInsights,
    totalPotentialSavings,
    healthScore,
    motivationalMessage,
  }
}

/**
 * Calcula un score de salud financiera (0-100)
 */
function calculateHealthScore(context: FinancialContext, insights: SavingsInsight[]): number {
  let score = 100

  // Penalizar por balance negativo
  if (context.balance < 0) {
    score -= 40
  }

  // Penalizar por ratio de gastos alto
  if (context.totalIncome > 0) {
    const expenseRatio = context.totalExpenses / context.totalIncome
    if (expenseRatio > 1) score -= 30
    else if (expenseRatio > 0.9) score -= 20
    else if (expenseRatio > 0.8) score -= 10
  }

  // Penalizar por insights de alta prioridad
  const highPriorityIssues = insights.filter((i) => i.priority === "high" && i.type === "warning")
  score -= highPriorityIssues.length * 15

  // Bonificar por buenos hábitos
  const successInsights = insights.filter((i) => i.type === "success")
  score += successInsights.length * 10

  return Math.max(0, Math.min(100, score))
}

/**
 * Genera un mensaje motivacional basado en el health score
 */
function generateMotivationalMessage(context: FinancialContext, healthScore: number): string {
  if (healthScore >= 80) {
    return "¡Excelente manejo de tus finanzas! Tu disciplina está dando frutos. Sigue así y considera invertir para hacer crecer tu patrimonio."
  } else if (healthScore >= 60) {
    return "Vas por buen camino. Con algunos ajustes en tus gastos, podrás mejorar significativamente tu situación financiera."
  } else if (healthScore >= 40) {
    return "Tu situación requiere atención, pero no te desanimes. Pequeños cambios consistentes pueden generar grandes mejoras."
  } else {
    return "Es momento de tomar acción. Enfócate en reducir gastos no esenciales y busca aumentar tus ingresos. ¡Tú puedes hacerlo!"
  }
}

/**
 * Emoji según el health score
 */
function getHealthEmoji(score: number): string {
  if (score >= 80) return "🟢"
  if (score >= 60) return "🟡"
  if (score >= 40) return "🟠"
  return "🔴"
}
