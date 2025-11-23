/**
 * Servicio de Chat con RAG (Retrieval-Augmented Generation)
 * Usa Google Gemini API (SDK oficial @google/genai) para responder preguntas sobre finanzas personales
 * con contexto de la base de datos.
 */

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai"
import { ChatMessage, FinancialContext } from "./chat-types"
import { analyzeSavingsOpportunities, SavingsAnalysis } from "./savings-analyzer"

const SYSTEM_PROMPT = `Eres CashFlow AI, un asistente financiero personal experto.

REGLAS CRÍTICAS:
1. USA ÚNICAMENTE los datos del CONTEXTO FINANCIERO proporcionado
2. NUNCA inventes, estimes o adivines números - usa solo los datos exactos del contexto
3. Si no tienes un dato específico, di "No tengo esa información en el período analizado"
4. Siempre verifica que los números que menciones coincidan EXACTAMENTE con el contexto

FORMATO DE RESPUESTAS:
- Usa emojis moderadamente: 💰 📊 ✅ 🎯 💸 📈 ⚠️ 💡
- Formato de moneda: $1.234.567 COP
- Sé conciso pero completo (2-4 párrafos máximo)
- Cita números EXACTOS del contexto

ESTRUCTURA:
1. Responde directamente la pregunta con datos exactos
2. Da 1-2 insights relevantes basados en los datos
3. Sugiere 1 acción práctica si aplica

Responde en español de Colombia.`

/**
 * Construye el contexto financiero en formato de texto para el LLM
 */
function buildContextPrompt(context: FinancialContext, savingsAnalysis?: SavingsAnalysis): string {
  const { totalExpenses, totalIncome, balance, expensesByCategory, recentTransactions, dateRange } = context

  let prompt = `═══════════════════════════════════════════
CONTEXTO FINANCIERO VERIFICADO
Período: ${dateRange.start} hasta ${dateRange.end}
═══════════════════════════════════════════

📊 RESUMEN TOTAL:
• Total Ingresos: $${totalIncome.toLocaleString("es-CO")} COP
• Total Gastos: $${totalExpenses.toLocaleString("es-CO")} COP  
• Balance Final: $${balance.toLocaleString("es-CO")} COP
• Estado: ${balance >= 0 ? "POSITIVO ✅" : "NEGATIVO ⚠️"}

`

  // Gastos por categoría (más claro)
  if (expensesByCategory.length > 0) {
    prompt += `💳 GASTOS POR CATEGORÍA (ordenados de mayor a menor):\n`
    expensesByCategory.forEach((cat, idx) => {
      const percentage = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : "0"
      prompt += `${idx + 1}. ${cat.category}:\n`
      prompt += `   - Monto: $${cat.amount.toLocaleString("es-CO")} COP\n`
      prompt += `   - Porcentaje: ${percentage}% del total\n`
      prompt += `   - Transacciones: ${cat.count}\n\n`
    })
  }

  // Análisis de ahorro si está disponible
  if (savingsAnalysis && savingsAnalysis.insights.length > 0) {
    prompt += `💰 OPORTUNIDADES DE AHORRO DETECTADAS:\n`
    prompt += `• Score de salud: ${savingsAnalysis.healthScore}/100\n`
    prompt += `• Ahorro potencial: $${savingsAnalysis.totalPotentialSavings.toLocaleString("es-CO")} COP\n\n`
    
    prompt += `🎯 INSIGHTS PRINCIPALES:\n`
    savingsAnalysis.insights.slice(0, 3).forEach((insight, idx) => {
      prompt += `${idx + 1}. ${insight.title}\n`
      prompt += `   ${insight.message}\n`
      if (insight.suggestion) {
        prompt += `   Sugerencia: ${insight.suggestion}\n`
      }
      prompt += `\n`
    })
  }

  // Transacciones recientes (más detalle)
  if (recentTransactions.length > 0) {
    prompt += `📝 TRANSACCIONES RECIENTES (últimas ${Math.min(recentTransactions.length, 15)}):\n`
    recentTransactions.slice(0, 15).forEach((tx, idx) => {
      const type = tx.type === "gasto" ? "GASTO" : "INGRESO"
      const emoji = tx.type === "gasto" ? "💸" : "💰"
      const source = tx.source === "image" ? "Recibo" : tx.source === "voice" ? "Voz" : "Manual"
      prompt += `${idx + 1}. [${type}] ${emoji} $${tx.amount.toLocaleString("es-CO")} COP`
      if (tx.description) prompt += ` | ${tx.description}`
      if (tx.categoryName) prompt += ` | ${tx.categoryName}`
      prompt += ` | ${tx.date} (${source})\n`
    })
  }

  prompt += `\n═══════════════════════════════════════════\n`
  prompt += `IMPORTANTE: Usa SOLO estos números. No estimes ni inventes datos.\n`
  prompt += `═══════════════════════════════════════════`

  return prompt
}

/**
 * Genera una respuesta del chat usando Google Gemini (SDK oficial)
 */
export async function generateChatResponse(
  userMessage: string,
  context: FinancialContext,
  history: ChatMessage[] = [],
  savingsAnalysis?: SavingsAnalysis
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada")
  }

  // Inicializar cliente de Gemini
  const ai = new GoogleGenAI({ apiKey })

  // Construir el contexto (con análisis de ahorro si está disponible)
  const contextPrompt = buildContextPrompt(context, savingsAnalysis)

  // Combinar system prompt con contexto financiero
  const fullSystemInstruction = `${SYSTEM_PROMPT}\n\n${contextPrompt}`

  // Construir historial de conversación en formato de Gemini
  const contents = history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }))

  // Agregar mensaje actual del usuario
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  })

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 800,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ]
      }
    })

    // Log de la respuesta para debugging
    console.log('🤖 [Chat Service] Gemini Response:', {
      finishReason: response.candidates?.[0]?.finishReason,
      hasText: !!response.text,
      response: response
    });

    // Extraer el texto de la respuesta
    const text = response.text || 
                 response.candidates?.[0]?.content?.parts?.[0]?.text ||
                 "No pude generar una respuesta."
    
    return text
  } catch (error) {
    console.error("[Chat Service] Error calling Gemini:", error)
    throw new Error("Error al generar respuesta del chat")
  }
}

/**
 * Respuesta de fallback para cuando no hay API key configurada
 */
export function generateFallbackResponse(
  userMessage: string,
  context: FinancialContext,
  savingsAnalysis?: SavingsAnalysis
): string {
  const lowerMessage = userMessage.toLowerCase()

  // Respuestas relacionadas con ahorro
  if (
    lowerMessage.includes("ahorro") ||
    lowerMessage.includes("ahorrar") ||
    lowerMessage.includes("sugerencia") ||
    lowerMessage.includes("consejo") ||
    lowerMessage.includes("mejorar")
  ) {
    if (savingsAnalysis) {
      let response = savingsAnalysis.summary + "\n\n"

      if (savingsAnalysis.insights.length > 0) {
        response += "**Recomendaciones principales:**\n\n"
        savingsAnalysis.insights
          .filter((i) => i.actionable)
          .slice(0, 3)
          .forEach((insight, idx) => {
            response += `${idx + 1}. ${insight.title}\n`
            response += `   ${insight.message}\n`
            if (insight.suggestion) {
              response += `   ${insight.suggestion}\n`
            }
            response += `\n`
          })
      }

      return response
    }
  }

  // Respuestas simples basadas en keywords
  if (lowerMessage.includes("cuánto") && (lowerMessage.includes("gastado") || lowerMessage.includes("gasté"))) {
    return `💰 En el período analizado, has gastado un total de $${context.totalExpenses.toLocaleString("es-CO")} COP.

📊 **Desglose por categoría:**
${context.expensesByCategory
  .sort((a, b) => b.amount - a.amount)
  .map((cat) => `- ${cat.category}: $${cat.amount.toLocaleString("es-CO")} COP`)
  .join("\n")}`
  }

  if (lowerMessage.includes("balance") || lowerMessage.includes("estado")) {
    const status = context.balance >= 0 ? "positivo ✅" : "negativo ⚠️"
    return `📊 **Resumen financiero:**
- Ingresos: $${context.totalIncome.toLocaleString("es-CO")} COP
- Gastos: $${context.totalExpenses.toLocaleString("es-CO")} COP
- Balance: $${context.balance.toLocaleString("es-CO")} COP (${status})`
  }

  if (lowerMessage.includes("categoría") || lowerMessage.includes("categoria")) {
    if (context.expensesByCategory.length === 0) {
      return "No tienes gastos registrados en el período seleccionado."
    }
    const topCategory = context.expensesByCategory[0]
    return `🎯 Tu categoría con más gastos es **${topCategory.category}** con $${topCategory.amount.toLocaleString("es-CO")} COP (${topCategory.count} transacciones).

**Todas las categorías:**
${context.expensesByCategory
  .map((cat, idx) => `${idx + 1}. ${cat.category}: $${cat.amount.toLocaleString("es-CO")} COP`)
  .join("\n")}`
  }

  // Respuesta genérica
  return `Hola! 👋 Puedo ayudarte a analizar tus finanzas.

📊 **Tu resumen:**
- Ingresos: $${context.totalIncome.toLocaleString("es-CO")} COP
- Gastos: $${context.totalExpenses.toLocaleString("es-CO")} COP
- Balance: $${context.balance.toLocaleString("es-CO")} COP

Puedes preguntarme cosas como:
- "¿Cuánto gasté en restaurantes?"
- "¿Cuál es mi categoría con más gastos?"
- "Dame un resumen de esta semana"
- "¿Cómo va mi balance?"`
}
