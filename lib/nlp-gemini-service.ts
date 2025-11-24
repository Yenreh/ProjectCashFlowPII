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
    throw new Error("GEMINI_API_KEY no configurada")
  }

  const ai = new GoogleGenAI({ apiKey })

  // Pre-procesar la transcripción para normalizar formatos
  let normalizedTranscription = transcription
    .replace(/\$/g, '')  // Eliminar símbolo $
    .replace(/\s+/g, ' ')  // Normalizar espacios múltiples a uno solo
    .trim()

  // Construir lista de categorías y cuentas disponibles
  const categoryList = dbCategories.map(c => `${c.name} (${c.type})`).join(", ")
  const accountList = dbAccounts.map(a => a.name).join(", ")

  const prompt = `Eres un asistente experto en análisis de comandos de voz para finanzas personales en español colombiano.

CATEGORÍAS DISPONIBLES: ${categoryList}
CUENTAS DISPONIBLES: ${accountList}

COMANDO A ANALIZAR: "${normalizedTranscription}"

Analiza el comando y extrae la información estructurada. IMPORTANTE:

1. **intention** - Identifica la intención principal:
   - "ingreso": Usuario registra dinero que recibió (recibí, gané, me pagaron, ingreso, cobré, me entró)
   - "gasto": Usuario registra dinero que gastó (gasté, compré, pagué, gasto, saqué)
   - "consulta": Usuario pregunta por información (cuánto, balance, saldo, último)
   - "navegacion": Usuario quiere ir a otra sección (ir a, abrir, mostrar)
   - "control": Usuario controla el asistente (activar, desactivar, cancelar)
   - "desconocido": No se puede identificar claramente

2. **amount** - Extrae el monto en pesos colombianos:
   - En Colombia se usa PUNTO como separador de miles: "15.000" = 15000
   - También pueden haber ESPACIOS como separador: "15 000" = 15000
   - Entiende formatos como: "50 mil" = 50000, "dos millones" = 2000000
   - IGNORA símbolos de moneda ($, pesos, COP)
   - Convierte SIEMPRE a número entero SIN separadores
   - Ejemplos de conversión:
     * "$15 000" → 15000
     * "15.000" → 15000
     * "50 mil" → 50000
     * "1.500.000" → 1500000
   - Si no hay monto explícito → null

3. **categoryName** - Encuentra la categoría MÁS APROPIADA de la lista:
   - DEBES seleccionar UNA categoría de las disponibles (nombre EXACTO)
   - Analiza el contexto COMPLETO del comando
   - Mapeo de palabras clave a categorías:
     * "comida", "comer", "almuerzo", "desayuno", "cena", "restaurante", "hamburguesa", "pizza" → Alimentación
     * "taxi", "uber", "bus", "transporte", "gasolina", "buseta" → Transporte
     * "arriendo", "alquiler", "casa", "apartamento" → Vivienda
     * "luz", "agua", "internet", "gas", "servicios", "netflix" → Servicios
     * "cine", "fiesta", "rumba", "concierto", "juegos" → Entretenimiento
     * "ropa", "zapatos", "compras", "mall" → Compras
     * "salario", "sueldo", "nómina", "pago mensual" → Salario
     * "freelance", "proyecto independiente", "trabajo extra" → Freelance
   - Si el comando dice "en [palabra]" o "de [palabra]", esa palabra es la categoría
   - Si NO encuentras match claro: usa "Otros Gastos" (si es gasto) o "Otros Ingresos" (si es ingreso)
   - NUNCA dejes categoryName en null si detectaste intention "gasto" o "ingreso"

4. **accountName** - Encuentra la cuenta mencionada:
   - Debe ser UNA de las cuentas disponibles (nombre EXACTO de la lista)
   - Busca menciones como: "en X", "de X", "desde X", "con X", "usando X"
   - EJEMPLOS IMPORTANTES:
     * "gasté 5000 en caja social" → accountName: "caja social"
     * "ingreso de 100000 en bancolombia" → accountName: "bancolombia"
     * "pagué 15000 con efectivo" → accountName: "efectivo"
     * "transferí desde nequi" → accountName: "nequi"
   - Extrae SOLO el nombre después de "en", "de", "desde", "con", "usando"
   - NO incluyas la preposición en accountName
   - Mapeo flexible para bancos colombianos:
     * "banco", "bancolombia", "banco colombia" → "bancolombia"
     * "caja", "social", "caja social", "bcsc" → "caja social"
     * "efectivo", "cash" → "efectivo"
     * "nequi" → "nequi"
     * "davi", "davivienda" → "davivienda"
   - Si NO se menciona cuenta explícitamente → null

5. **description** - Resumen natural y limpio del comando (máximo 100 caracteres)

6. **transactionType** - Solo para intention "ingreso" o "gasto":
   - Debe coincidir con la intención ("ingreso" o "gasto")
   - Para otras intenciones → null

7. **confidence** - Nivel de confianza del análisis:
   - "alta": Toda la información clave está clara (intention + amount + category para transacciones)
   - "media": Falta algún dato secundario pero el comando es comprensible
   - "baja": Falta información crítica o el comando es muy ambiguo

IMPORTANTE: 
- Responde SOLO con JSON válido, sin texto adicional antes o después
- Usa nombres EXACTOS de categorías y cuentas de las listas proporcionadas
- Si no encuentras un dato, usa null
- Para montos colombianos, el punto (.) es separador de miles

Ejemplo de respuesta correcta:
{
  "intention": "gasto",
  "transactionType": "gasto",
  "amount": 15000,
  "categoryName": "Alimentación",
  "accountName": null,
  "description": "Gasto de 15000 en comida",
  "confidence": "alta"
}`

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
        temperature: 0.2, // Balance entre precisión y flexibilidad
        maxOutputTokens: 400
      }
    })

    const responseText = response.text || 
                        response.candidates?.[0]?.content?.parts?.[0]?.text ||
                        "{}"
    
    // Intentar reparar JSON incompleto
    let parsed: GeminiParseResult
    try {
      parsed = JSON.parse(responseText)
    } catch (error) {
      console.log("[NLP Gemini] ⚠️ JSON incompleto, intentando extraer datos...")
      
      // Intentar extraer datos clave del JSON incompleto antes de reparar
      const partialData: Partial<GeminiParseResult> = {}
      
      // Extraer accountName si existe en el JSON parcial
      const accountMatch = responseText.match(/"accountName"\s*:\s*"([^"]+)"/i)
      if (accountMatch) {
        partialData.accountName = accountMatch[1]
      }
      
      // Extraer amount si existe
      const amountMatch = responseText.match(/"amount"\s*:\s*(\d+)/i)
      if (amountMatch) {
        partialData.amount = parseInt(amountMatch[1], 10)
      }
      
      // Extraer categoryName si existe
      const categoryMatch = responseText.match(/"categoryName"\s*:\s*"([^"]+)"/i)
      if (categoryMatch) {
        partialData.categoryName = categoryMatch[1]
      }
      
      // Extraer intention si existe
      const intentionMatch = responseText.match(/"intention"\s*:\s*"([^"]+)"/i)
      if (intentionMatch) {
        partialData.intention = intentionMatch[1] as VoiceIntention
      }
      
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
      } catch (secondError) {
        console.log("[NLP Gemini] ❌ JSON no reparable, usando valores extraídos")
        parsed = {
          intention: partialData.intention || 'desconocido',
          description: transcription,
          confidence: 'baja',
          ...partialData
        }
      }
    }

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
        category = defaultCategories.find(c => c.name.toLowerCase().includes('otros'))
      }
      
      if (category) {
        categoryId = category.id
        parsed.categoryName = category.name
      }
    }

    // Fallback para detectar cuenta si Gemini no la encontró
    if (!parsed.accountName) {
      const patterns = [
        /\ben\s+([a-záéíóúñ\s]+?)(?:\s|$)/i,
        /\bde\s+([a-záéíóúñ\s]+?)(?:\s|$)/i,
        /\bcon\s+([a-záéíóúñ\s]+?)(?:\s|$)/i,
        /\bdesde\s+([a-záéíóúñ\s]+?)(?:\s|$)/i,
        /\busando\s+([a-záéíóúñ\s]+?)(?:\s|$)/i,
      ]
      
      for (const pattern of patterns) {
        const match = normalizedTranscription.match(pattern)
        if (match && match[1]) {
          const extractedName = match[1].trim().toLowerCase()
          const matchedAccount = dbAccounts.find(a => {
            const accountLower = a.name.toLowerCase()
            return accountLower.includes(extractedName) || extractedName.includes(accountLower)
          })
          
          if (matchedAccount) {
            parsed.accountName = extractedName
            break
          }
        }
      }
    }

    if (parsed.accountName) {
      const normalizedInput = parsed.accountName.toLowerCase().trim()
      
      // Match exacto primero
      let account = dbAccounts.find(
        a => a.name.toLowerCase() === normalizedInput
      )
      
      // Match por inclusión bidireccional
      if (!account) {
        account = dbAccounts.find(a => {
          const accountNameLower = a.name.toLowerCase()
          return accountNameLower.includes(normalizedInput) || 
                 normalizedInput.includes(accountNameLower)
        })
      }
      
      // Match inteligente por palabras clave comunes en Colombia
      if (!account) {
        const keywordMappings: Record<string, string[]> = {
          'bancolombia': ['banco', 'colombia', 'bancol'],
          'davivienda': ['davi', 'vivienda'],
          'bogota': ['banco de bogota', 'bogotá', 'bogota'],
          'occidente': ['banco de occidente', 'occidente'],
          'popular': ['banco popular', 'popular'],
          'bbva': ['bbva'],
          'itau': ['itaú', 'itau'],
          'av villas': ['av villas', 'villas'],
          'agrario': ['banco agrario', 'agrario'],
          'caja social': ['caja', 'social', 'bcsc'],
          'colpatria': ['colpatria', 'scotiabank'],
          'pichincha': ['pichincha'],
          'gnb sudameris': ['gnb', 'sudameris'],
          'banco caja social': ['caja', 'social', 'bcsc'],
          'efectivo': ['efectivo', 'cash', 'billetera'],
          'ahorros': ['ahorros', 'ahorro'],
          'corriente': ['corriente', 'cuenta corriente'],
          'nequi': ['nequi'],
          'daviplata': ['daviplata', 'davi'],
        }
        
        for (const [key, patterns] of Object.entries(keywordMappings)) {
          if (patterns.some(pattern => normalizedInput.includes(pattern))) {
            account = dbAccounts.find(a => {
              const accountLower = a.name.toLowerCase()
              return patterns.some(p => accountLower.includes(p))
            })
            
            if (account) break
          }
        }
      }
      
      // 5. Match por palabras individuales (si el usuario dice parte del nombre)
      if (!account) {
        const inputWords = normalizedInput.split(/\s+/)
        
        account = dbAccounts.find(a => {
          const accountWords = a.name.toLowerCase().split(/\s+/)
          return inputWords.some(iw => 
            accountWords.some(aw => aw.includes(iw) || iw.includes(aw))
          )
        })
        
        if (account) {
          console.log(`[NLP Gemini] ✅ Match por palabras: "${account.name}"`)
        }
      }
      
      if (account) {
        accountId = account.id
        parsed.accountName = account.name
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
