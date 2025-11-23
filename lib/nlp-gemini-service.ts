/**
 * Servicio NLP mejorado con Gemini AI
 * Reemplaza el análisis basado en regex con IA para mejor comprensión del lenguaje natural
 * 
 * Flujo:
 * 1. ElevenLabs convierte voz → texto
 * 2. Este servicio analiza el texto con Gemini → datos estructurados
 * 3. ElevenLabs convierte respuesta → voz
 */

import { GoogleGenAI } from "@google/genai"
import { ParsedVoiceCommand, VoiceIntention } from "./voice-types"
import { Category, Account } from "./types"

interface GeminiParseResult {
  intention: VoiceIntention
  transactionType?: "ingreso" | "gasto"
  amount?: number
  categoryName?: string
  accountName?: string
  description: string
  queryType?: "balance" | "ultimo_gasto" | "ultimo_ingreso" | "total_hoy" | "general"
  navigationType?: "inicio" | "cuentas" | "transacciones" | "reportes"
  controlType?: "activar_continuo" | "desactivar_continuo" | "cancelar"
  confidence: "alta" | "media" | "baja"
}

/**
 * Analiza un comando de voz usando Gemini AI
 * Mucho más flexible y preciso que regex
 */
export async function parseVoiceCommandWithAI(
  transcription: string,
  dbCategories: Category[],
  dbAccounts: Account[]
): Promise<ParsedVoiceCommand> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn("[NLP Gemini] No GEMINI_API_KEY, using fallback regex parser")
    // Aquí podrías llamar al parser original como fallback
    throw new Error("GEMINI_API_KEY no configurada")
  }

  const ai = new GoogleGenAI({ apiKey })

  // Construir lista de categorías y cuentas disponibles
  const categoryList = dbCategories.map(c => `${c.name} (${c.type})`).join(", ")
  const accountList = dbAccounts.map(a => a.name).join(", ")

  const prompt = `Eres un asistente de análisis de comandos de voz para una app de finanzas personales en español colombiano.

Analiza el siguiente comando de voz y extrae la información en formato JSON estructurado.

CATEGORÍAS DISPONIBLES: ${categoryList}
CUENTAS DISPONIBLES: ${accountList}

REGLAS IMPORTANTES:
1. **intention**: Identifica la intención principal
   - "ingreso": Usuario registra dinero que recibió (recibí, gané, me pagaron, ingreso, cobré)
   - "gasto": Usuario registra dinero que gastó (gasté, compré, pagué, gasto)
   - "consulta": Usuario pregunta por información (cuánto, balance, saldo, último)
   - "navegacion": Usuario quiere ir a otra sección (ir a, abrir, mostrar)
   - "control": Usuario controla el asistente (activar, desactivar, cancelar)
   - "desconocido": No se puede identificar

2. **amount**: Extrae el monto en pesos colombianos
   - En Colombia se usa PUNTO para miles: "65.600" = 65600
   - Convierte a número entero SIN separadores
   - Ejemplos: "50 mil" = 50000, "1.500" = 1500, "dos millones" = 2000000
   - Si dice "mil", multiplica por 1000
   - Si no hay monto, deja en null

3. **categoryName**: Encuentra la categoría más apropiada
   - DEBES seleccionar UNA de las categorías disponibles (nombre exacto de la lista)
   - Analiza el contexto completo del comando, no solo palabras específicas
   - Ejemplos de mapeo:
     * "comida", "comer", "hamburguesa", "pizza", "almuerzo", "desayuno", "restaurante" → Alimentación
     * "taxi", "uber", "bus", "gasolina" → Transporte
     * "arriendo", "alquiler", "casa" → Vivienda
     * "luz", "agua", "internet", "netflix" → Servicios
     * "cine", "concierto", "juegos" → Entretenimiento
     * "medicina", "doctor", "farmacia" → Salud
     * "curso", "libro", "universidad" → Educación
     * "ropa", "zapatos", "compras" → Compras
     * "salario", "sueldo", "pago", "nómina" → Salario
     * "freelance", "proyecto independiente" → Freelance
     * "dividendos", "rendimiento" → Inversiones
     * "venta", "vendí" → Ventas
   - Si el usuario dice "en X" o "de X", X es la categoría
   - Si NO encuentras coincidencia clara y es gasto → "Otros Gastos"
   - Si NO encuentras coincidencia clara y es ingreso → "Otros Ingresos"
   - NUNCA dejes categoryName en null si detectaste intention "gasto" o "ingreso"

4. **accountName**: Encuentra la cuenta mencionada
   - Debe ser UNA de las cuentas disponibles (nombre exacto)
   - Busca: "en X", "de X", "desde X", "con X"
   - Si no se menciona cuenta, deja en null

5. **description**: Texto descriptivo limpio
   - Resume lo que el usuario dijo de forma natural
   - Elimina muletillas y palabras redundantes
   - Máximo 100 caracteres

6. **transactionType**: Solo para intention "ingreso" o "gasto"
   - Debe coincidir con el tipo de la categoría elegida
   - Si no es transacción, deja en null

7. **queryType**: Solo para intention "consulta"
   - "balance": Pregunta por saldo o balance total
   - "ultimo_gasto": Pregunta por el último gasto
   - "ultimo_ingreso": Pregunta por el último ingreso
   - "total_hoy": Pregunta por totales de hoy
   - "general": Otra pregunta general

8. **navigationType**: Solo para intention "navegacion"
   - "inicio": Ir a inicio/home
   - "cuentas": Ir a cuentas
   - "transacciones": Ir a transacciones
   - "reportes": Ir a reportes

9. **controlType**: Solo para intention "control"
   - "activar_continuo": Activar modo escucha continua
   - "desactivar_continuo": Desactivar asistente
   - "cancelar": Cancelar operación actual

10. **confidence**: Nivel de confianza del análisis
    - "alta": Toda la información clave está clara (intention + amount + category para transacciones)
    - "media": Falta algún dato secundario o hay ambigüedad menor
    - "baja": Falta información crítica o el comando es muy ambiguo

IMPORTANTE: 
- Responde SOLO con JSON válido, sin texto adicional
- Usa nombres EXACTOS de categorías y cuentas de las listas proporcionadas
- Si no encuentras un dato, usa null (no inventes)
- Para montos colombianos, recuerda que el punto es separador de miles

COMANDO A ANALIZAR: "${transcription}"`

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            intention: {
              type: "string",
              enum: ["ingreso", "gasto", "consulta", "navegacion", "control", "desconocido"],
              description: "Intención principal del comando"
            },
            transactionType: {
              type: ["string", "null"],
              enum: ["ingreso", "gasto", null],
              description: "Tipo de transacción (solo para intention ingreso/gasto)"
            },
            amount: {
              type: ["number", "null"],
              description: "Monto en pesos colombianos (número entero sin separadores)"
            },
            categoryName: {
              type: ["string", "null"],
              description: "Nombre exacto de la categoría de las disponibles"
            },
            accountName: {
              type: ["string", "null"],
              description: "Nombre exacto de la cuenta de las disponibles"
            },
            description: {
              type: "string",
              description: "Descripción limpia del comando"
            },
            queryType: {
              type: ["string", "null"],
              enum: ["balance", "ultimo_gasto", "ultimo_ingreso", "total_hoy", "general", null],
              description: "Tipo de consulta (solo para intention consulta)"
            },
            navigationType: {
              type: ["string", "null"],
              enum: ["inicio", "cuentas", "transacciones", "reportes", null],
              description: "Tipo de navegación (solo para intention navegacion)"
            },
            controlType: {
              type: ["string", "null"],
              enum: ["activar_continuo", "desactivar_continuo", "cancelar", null],
              description: "Tipo de control (solo para intention control)"
            },
            confidence: {
              type: "string",
              enum: ["alta", "media", "baja"],
              description: "Nivel de confianza del análisis"
            }
          },
          required: ["intention", "description", "confidence"]
        },
        temperature: 0.1, // Muy bajo para respuestas consistentes
        maxOutputTokens: 500
      }
    })

    const responseText = response.text || 
                        response.candidates?.[0]?.content?.parts?.[0]?.text ||
                        "{}"
    
    console.log("[NLP Gemini] 📝 Raw AI response:", responseText)
    
    // Intentar reparar JSON incompleto
    let parsed: GeminiParseResult
    try {
      parsed = JSON.parse(responseText)
    } catch (error) {
      console.log("[NLP Gemini] ⚠️ JSON incompleto, intentando reparar...")
      // Intentar cerrar llaves faltantes
      let repairedJson = responseText.trim()
      const openBraces = (repairedJson.match(/{/g) || []).length
      const closeBraces = (repairedJson.match(/}/g) || []).length
      const missingBraces = openBraces - closeBraces
      
      if (missingBraces > 0) {
        repairedJson += '}'.repeat(missingBraces)
      }
      
      // Intentar parsear de nuevo
      try {
        parsed = JSON.parse(repairedJson)
        console.log("[NLP Gemini] ✅ JSON reparado exitosamente")
      } catch (secondError) {
        console.log("[NLP Gemini] ❌ No se pudo reparar JSON, usando valores por defecto")
        parsed = {
          intention: 'desconocido',
          description: transcription,
          confidence: 'baja'
        }
      }
    }

    console.log("[NLP Gemini] 🤖 AI parsed command:", {
      transcription,
      intention: parsed.intention,
      amount: parsed.amount,
      category: parsed.categoryName,
      account: parsed.accountName,
      confidence: parsed.confidence,
      description: parsed.description
    })

    // Enriquecer con IDs de categoría y cuenta
    let categoryId: number | undefined
    let accountId: number | undefined

    if (parsed.categoryName) {
      // Intentar match exacto primero
      let category = dbCategories.find(
        c => c.name.toLowerCase() === parsed.categoryName?.toLowerCase()
      )
      
      // Si no hay match exacto, intentar match parcial
      if (!category) {
        category = dbCategories.find(
          c => c.name.toLowerCase().includes(parsed.categoryName?.toLowerCase() || '') ||
               parsed.categoryName?.toLowerCase().includes(c.name.toLowerCase())
        )
      }
      
      // Si aún no hay match y es una transacción, usar categoría por defecto según tipo
      if (!category && parsed.transactionType) {
        const defaultCategories = dbCategories.filter(c => c.type === parsed.transactionType)
        // Buscar "Otros Gastos" o "Otros Ingresos"
        category = defaultCategories.find(c => c.name.toLowerCase().includes('otros'))
        
        if (category) {
          console.log(`[NLP Gemini] ⚠️ No se encontró "${parsed.categoryName}", usando categoría por defecto: ${category.name}`)
        }
      }
      
      if (category) {
        categoryId = category.id
        parsed.categoryName = category.name // Nombre exacto de DB
      } else {
        console.log(`[NLP Gemini] ❌ No se pudo mapear categoría: "${parsed.categoryName}"`)
        console.log(`[NLP Gemini] 📋 Categorías disponibles:`, dbCategories.map(c => c.name))
      }
    }

    if (parsed.accountName) {
      // Intentar match exacto primero
      let account = dbAccounts.find(
        a => a.name.toLowerCase() === parsed.accountName?.toLowerCase()
      )
      
      // Si no hay match exacto, intentar match parcial
      if (!account) {
        account = dbAccounts.find(
          a => a.name.toLowerCase().includes(parsed.accountName?.toLowerCase() || '') ||
               parsed.accountName?.toLowerCase().includes(a.name.toLowerCase())
        )
      }
      
      // Si aún no hay match, intentar buscar por palabras clave
      if (!account) {
        const normalizedInput = parsed.accountName.toLowerCase()
        
        // Buscar "bancolombia", "banco colombia", etc.
        if (normalizedInput.includes('banco') || normalizedInput.includes('colombia')) {
          account = dbAccounts.find(a => a.name.toLowerCase().includes('banco'))
        }
        
        // Buscar "caja social", "caja", "social"
        if (!account && (normalizedInput.includes('caja') || normalizedInput.includes('social'))) {
          account = dbAccounts.find(a => 
            a.name.toLowerCase().includes('caja') || 
            a.name.toLowerCase().includes('social')
          )
        }
        
        // Buscar "efectivo", "cash"
        if (!account && (normalizedInput.includes('efectivo') || normalizedInput.includes('cash'))) {
          account = dbAccounts.find(a => a.name.toLowerCase().includes('efectivo'))
        }
      }
      
      if (account) {
        accountId = account.id
        parsed.accountName = account.name // Nombre exacto de DB
        console.log(`[NLP Gemini] ✅ Cuenta encontrada: "${parsed.accountName}" (ID: ${accountId})`)
      } else {
        console.log(`[NLP Gemini] ❌ No se pudo mapear cuenta: "${parsed.accountName}"`)
        console.log(`[NLP Gemini] 📋 Cuentas disponibles:`, dbAccounts.map(a => a.name))
      }
    }

    // Si no hay cuenta especificada y solo hay una, usarla automáticamente
    if (!accountId && dbAccounts.length === 1) {
      accountId = dbAccounts[0].id
      parsed.accountName = dbAccounts[0].name
    }

    // Construir resultado final
    const result: ParsedVoiceCommand = {
      intention: parsed.intention,
      transactionType: parsed.transactionType,
      amount: parsed.amount,
      categoryName: parsed.categoryName,
      categoryId,
      accountName: parsed.accountName,
      accountId,
      description: parsed.description,
      originalText: transcription,
      confidence: parsed.confidence,
      queryType: parsed.queryType,
      navigationType: parsed.navigationType,
      controlType: parsed.controlType
    }

    return result

  } catch (error) {
    console.error("[NLP Gemini] ❌ Error parsing with AI:", error)
    if (error instanceof Error) {
      console.error("[NLP Gemini] Error message:", error.message)
      console.error("[NLP Gemini] Error stack:", error.stack)
    }
    
    // En caso de error, retornar un comando con confianza baja
    return {
      intention: "desconocido",
      description: transcription,
      originalText: transcription,
      confidence: "baja"
    }
  }
}

/**
 * Detecta si un texto es una corrección usando Gemini
 */
export async function detectCorrectionWithAI(
  text: string,
  previousCommand: ParsedVoiceCommand,
  dbCategories: Category[],
  dbAccounts: Account[]
): Promise<{
  isCorrection: boolean
  field?: "amount" | "category" | "type" | "description" | "account"
  newValue?: string | number
  originalText: string
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { isCorrection: false, originalText: text }
  }

  const ai = new GoogleGenAI({ apiKey })

  const categoryList = dbCategories.map(c => `${c.name} (${c.type})`).join(", ")
  const accountList = dbAccounts.map(a => a.name).join(", ")

  const prompt = `Analiza si el siguiente texto es una CORRECCIÓN a un comando anterior de finanzas.

COMANDO ANTERIOR:
- Tipo: ${previousCommand.transactionType || "no especificado"}
- Monto: ${previousCommand.amount || "no especificado"}
- Categoría: ${previousCommand.categoryName || "no especificado"}
- Cuenta: ${previousCommand.accountName || "no especificado"}

CATEGORÍAS DISPONIBLES: ${categoryList}
CUENTAS DISPONIBLES: ${accountList}

TEXTO NUEVO: "${text}"

¿Es esto una corrección? Detecta si el usuario está:
1. Diciendo "no", "error", "mal", "incorrecto", "cambia", "corrige"
2. Simplemente especificando un campo que faltaba (ej: "en alimentación")
3. Dando un nuevo valor para un campo

Identifica:
- isCorrection: true si es una corrección o especificación de campo faltante
- field: qué campo está corrigiendo/especificando ("amount", "category", "type", "account", "description")
- newValue: el nuevo valor (número para amount, string para los demás)

Responde SOLO con JSON.`

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            isCorrection: { type: "boolean" },
            field: {
              type: ["string", "null"],
              enum: ["amount", "category", "type", "account", "description", null]
            },
            newValue: {
              type: ["string", "number", "null"],
              description: "Nuevo valor (número para amount, string para otros)"
            }
          },
          required: ["isCorrection"]
        },
        temperature: 0.1,
        maxOutputTokens: 200
      }
    })

    const responseText = response.text || 
                        response.candidates?.[0]?.content?.parts?.[0]?.text ||
                        "{}"
    
    const result = JSON.parse(responseText)

    console.log("[NLP Gemini] 🔄 Correction detected:", result)

    return {
      ...result,
      originalText: text
    }

  } catch (error) {
    console.error("[NLP Gemini] Error detecting correction:", error)
    return { isCorrection: false, originalText: text }
  }
}

/**
 * Aplica una corrección detectada por AI
 */
export function applyCorrectionWithAI(
  original: ParsedVoiceCommand,
  correction: {
    isCorrection: boolean
    field?: string
    newValue?: string | number
    originalText: string
  }
): ParsedVoiceCommand {
  if (!correction.isCorrection || !correction.field) {
    return original
  }

  const updated = { ...original }

  switch (correction.field) {
    case "amount":
      if (typeof correction.newValue === "number") {
        updated.amount = correction.newValue
      }
      break

    case "category":
      if (typeof correction.newValue === "string") {
        updated.categoryName = correction.newValue
      }
      break

    case "type":
      if (correction.newValue === "ingreso" || correction.newValue === "gasto") {
        updated.transactionType = correction.newValue
        updated.intention = correction.newValue
      }
      break

    case "description":
      if (typeof correction.newValue === "string") {
        updated.description = correction.newValue
      }
      break

    case "account":
      if (typeof correction.newValue === "string") {
        updated.accountName = correction.newValue
      }
      break
  }

  // Recalcular confianza
  let score = 0
  if (updated.intention && updated.intention !== "desconocido") score += 2
  if (updated.amount && updated.amount > 0) score += 2
  if (updated.categoryName) score += 1
  
  updated.confidence = score >= 4 ? "alta" : score >= 2 ? "media" : "baja"
  updated.originalText = correction.originalText

  return updated
}
