import { NextRequest, NextResponse } from "next/server"
import {
  parseVoiceCommand,
  validateParsedCommand,
  generateConfirmationMessage,
  generateSuggestions,
  detectCorrection,
  applyCorrection,
  enrichWithDatabaseIds,
  validateBackendFormat,
} from "@/lib/nlp-service"
import {
  parseVoiceCommandWithAI,
  detectCorrectionWithAI,
  applyCorrectionWithAI,
} from "@/lib/nlp-gemini-service"
import { dbQueries } from "@/lib/db"
import type { VoiceProcessingResult } from "@/lib/voice-types"
import { requireAuth } from "@/lib/auth-helpers"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { transcription, confirmed, parsedData, isCorrection, originalCommand, pendingCommand } = await request.json()

    if (!transcription && !confirmed) {
      return NextResponse.json(
        { error: "Se requiere transcripción o confirmación" },
        { status: 400 }
      )
    }

    // Obtener contexto de la base de datos
    const [categories, accounts] = await Promise.all([
      dbQueries.getCategories(user.id),
      dbQueries.getAccounts(user.id),
    ])

    // Si hay un comando pendiente (esperando información adicional como cuenta)
    if (pendingCommand && transcription) {
      console.log('[Voice] Procesando respuesta a pregunta pendiente:', transcription)
      console.log('[Voice] Comando pendiente:', pendingCommand)
      
      // Usar AI para parsear la respuesta con mejor comprensión
      let newParsed
      try {
        newParsed = await parseVoiceCommandWithAI(transcription, categories, accounts)
        console.log('[Voice] 🤖 AI parseó respuesta pendiente')
      } catch (error) {
        console.log('[Voice] ⚠️ AI falló, usando regex fallback')
        newParsed = parseVoiceCommand(transcription, categories, accounts)
      }
      
      // Combinar: tomar cuenta/categoría de la nueva respuesta, resto del comando pendiente
      const combined = {
        ...pendingCommand,
        categoryName: newParsed.categoryName || pendingCommand.categoryName,
        categoryId: newParsed.categoryId || pendingCommand.categoryId,
        accountName: newParsed.accountName || pendingCommand.accountName,
        accountId: newParsed.accountId || pendingCommand.accountId,
        originalText: `${pendingCommand.originalText} + ${transcription}`,
      }
      
      // Enriquecer con IDs de la base de datos
      const enriched = enrichWithDatabaseIds(combined, categories, accounts)
      const backendValidation = validateBackendFormat(enriched)
      
      console.log('[Voice] Comando combinado:', enriched)
      console.log('[Voice] Validación backend:', backendValidation)
      
      if (backendValidation.valid) {
        const confirmationMessage = generateConfirmationMessage(enriched)
        
        const result: VoiceProcessingResult = {
          success: true,
          message: confirmationMessage,
          parsedCommand: enriched,
          needsConfirmation: true,
        }
        
        return NextResponse.json(result)
      } else {
        // Aún falta información
        const result: VoiceProcessingResult = {
          success: false,
          message: `Todavía falta información: ${backendValidation.errors.join(", ")}`,
          parsedCommand: enriched,
          needsConfirmation: false,
          needsAdditionalInfo: true,  // Aún esperando más información
          suggestions: generateSuggestions(enriched, categories, accounts),
        }
        
        return NextResponse.json(result)
      }
    }

    // Si es una corrección, aplicarla al comando original
    if (isCorrection && originalCommand && transcription) {
      let correction
      let corrected
      
      // Intentar detectar corrección con AI
      try {
        correction = await detectCorrectionWithAI(transcription, originalCommand, categories, accounts)
        console.log('[Voice] 🤖 AI detectó corrección:', correction)
        
        if (correction.isCorrection) {
          corrected = applyCorrectionWithAI(originalCommand, correction)
        }
      } catch (error) {
        console.log('[Voice] ⚠️ AI falló detectando corrección, usando regex')
        correction = detectCorrection(transcription, categories, accounts)
        if (correction.isCorrection) {
          corrected = applyCorrection(originalCommand, correction)
        }
      }
      
      if (correction.isCorrection && corrected) {
        const enriched = enrichWithDatabaseIds(corrected, categories, accounts)
        const backendValidation = validateBackendFormat(enriched)
        
        if (backendValidation.valid) {
          const confirmationMessage = generateConfirmationMessage(enriched)
          
          const result: VoiceProcessingResult = {
            success: true,
            message: `Corrección aplicada. ${confirmationMessage}`,
            parsedCommand: enriched,
            needsConfirmation: true,
          }
          
          return NextResponse.json(result)
        } else {
          const result: VoiceProcessingResult = {
            success: false,
            message: `Corrección incompleta. ${backendValidation.errors.join(", ")}`,
            parsedCommand: enriched,
            needsConfirmation: false,
            suggestions: generateSuggestions(enriched, categories, accounts),
          }
          
          return NextResponse.json(result)
        }
      }
    }

    // Si es una confirmación, procesar la transacción directamente
    if (confirmed && parsedData) {
      return await processConfirmedTransaction(parsedData, user.id)
    }

    // Analizar el comando de voz CON AI (fallback a regex si falla)
    let parsed
    try {
      console.log('[Voice] 🎤 Transcripción recibida:', transcription)
      console.log('[Voice] 🤖 Intentando parsear con Gemini AI...')
      parsed = await parseVoiceCommandWithAI(transcription, categories, accounts)
      console.log('[Voice] ✅ AI parseó exitosamente:', {
        intention: parsed.intention,
        amount: parsed.amount,
        category: parsed.categoryName,
        categoryId: parsed.categoryId,
        account: parsed.accountName,
        accountId: parsed.accountId,
        confidence: parsed.confidence
      })
    } catch (error) {
      console.log('[Voice] ⚠️ AI falló, usando regex fallback:', error)
      parsed = parseVoiceCommand(transcription, categories, accounts)
      console.log('[Voice] 📝 Regex parseó:', {
        intention: parsed.intention,
        amount: parsed.amount,
        category: parsed.categoryName,
        account: parsed.accountName,
        confidence: parsed.confidence
      })
    }
    
    // Si es una consulta, procesarla directamente
    if (parsed.intention === "consulta") {
      return await processQuery(parsed, user.id)
    }

    // Si es navegación, procesarla directamente (HU-011)
    if (parsed.intention === "navegacion") {
      const navigationMessages: Record<string, string> = {
        cuentas: "Abriendo la sección de cuentas",
        transacciones: "Abriendo el historial de transacciones",
        reportes: "Abriendo los reportes financieros",
        inicio: "Regresando a la página principal",
      }
      
      const message = parsed.navigationType 
        ? navigationMessages[parsed.navigationType] 
        : "Navegando"

      const result: VoiceProcessingResult = {
        success: true,
        message,
        parsedCommand: parsed,
        needsConfirmation: false,
      }
      return NextResponse.json(result)
    }
    
    // Enriquecer con IDs de la base de datos (para transacciones)
    // Solo si el AI no los asignó ya
    if (!parsed.categoryId || !parsed.accountId) {
      parsed = enrichWithDatabaseIds(parsed, categories, accounts)
    }
    
    const validation = validateParsedCommand(parsed)
    const backendValidation = validateBackendFormat(parsed)

    // NUEVO: Si hay múltiples cuentas y no se especificó cuál, preguntar (mantener contexto)
    if (parsed.transactionType && !parsed.accountId && accounts.length > 1) {
      const accountsList = accounts.map(a => a.name).join(", ")
      const result: VoiceProcessingResult = {
        success: false,
        message: `Tienes ${accounts.length} cuentas: ${accountsList}. ¿En cuál cuenta quieres registrar esta transacción?`,
        parsedCommand: parsed,  // Guardar el comando actual
        needsConfirmation: false,
        needsAdditionalInfo: true,  // Bandera para indicar que espera más info
        suggestions: accounts.map(a => `en ${a.name.toLowerCase()}`),
      }
      return NextResponse.json(result)
    }

    // Si el comando es válido para el backend, generar confirmación
    if (validation.valid && backendValidation.valid && parsed.transactionType && parsed.amount) {
      const confirmationMessage = generateConfirmationMessage(parsed)

      const result: VoiceProcessingResult = {
        success: true,
        message: confirmationMessage,
        parsedCommand: parsed,
        needsConfirmation: true,
      }

      return NextResponse.json(result)
    }

    // Si falta información, solicitar más datos
    const suggestions = generateSuggestions(parsed, categories, accounts)

    // Crear mensaje de error MÁS CONCISO
    let errorMessage = "Falta información"
    if (validation.missingFields.includes("categoría")) {
      errorMessage = "Falta categoría"
    } else if (validation.missingFields.includes("monto")) {
      errorMessage = "Falta monto"
    } else if (validation.missingFields.includes("tipo de transacción")) {
      errorMessage = "¿Ingreso o gasto?"
    }

    const result: VoiceProcessingResult = {
      success: false,
      message: errorMessage,
      parsedCommand: parsed,
      needsConfirmation: false,
      suggestions,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error procesando comando de voz:", error)
    return NextResponse.json(
      { error: "Error al procesar el comando" },
      { status: 500 }
    )
  }
}

/**
 * Procesa consultas de voz (última transacción, total del día, etc.)
 */
async function processQuery(parsed: any, userId: number) {
  try {
    const queryType = parsed.queryType || "general"

    switch (queryType) {
      case "ultimo_gasto": {
        // Obtener transacciones de tipo gasto directamente
        const allTransactions = await dbQueries.getTransactions(userId, { type: "gasto" })

        if (allTransactions.length === 0) {
          const result: VoiceProcessingResult = {
            success: true,
            message: "No tienes gastos registrados todavía",
            parsedCommand: parsed,
            needsConfirmation: false,
          }
          return NextResponse.json(result)
        }

        const lastTransaction = allTransactions[0]
        const amount = Number(lastTransaction.amount).toLocaleString("es-CO")
        const result: VoiceProcessingResult = {
          success: true,
          message: `Tu último gasto fue de ${amount} pesos en ${lastTransaction.category_name}`,
          parsedCommand: parsed,
          needsConfirmation: false,
        }
        return NextResponse.json(result)
      }

      case "ultimo_ingreso": {
        // Obtener transacciones de tipo ingreso directamente
        const allTransactions = await dbQueries.getTransactions(userId, { type: "ingreso" })

        if (allTransactions.length === 0) {
          const result: VoiceProcessingResult = {
            success: true,
            message: "No tienes ingresos registrados todavía",
            parsedCommand: parsed,
            needsConfirmation: false,
          }
          return NextResponse.json(result)
        }

        const lastTransaction = allTransactions[0]
        const amount = Number(lastTransaction.amount).toLocaleString("es-CO")
        const result: VoiceProcessingResult = {
          success: true,
          message: `Tu último ingreso fue de ${amount} pesos en ${lastTransaction.category_name}`,
          parsedCommand: parsed,
          needsConfirmation: false,
        }
        return NextResponse.json(result)
      }

      case "total_hoy": {
        const text = parsed.originalText.toLowerCase()
        const isGasto = text.includes("gast") || text.includes("egres")
        const isIngreso = text.includes("ingres") || text.includes("recib")

        let type: "gasto" | "ingreso" | undefined = undefined
        if (isGasto && !isIngreso) {
          type = "gasto"
        } else if (isIngreso && !isGasto) {
          type = "ingreso"
        }

        // Obtener fecha de hoy
        const today = new Date().toISOString().split("T")[0]

        // Obtener transacciones del día directamente
        const todayTransactions = await dbQueries.getTransactions(userId, {
          type,
          startDate: today,
          endDate: today,
        })

        const total = todayTransactions.reduce(
          (sum, transaction) => sum + Number(transaction.amount),
          0
        )

        if (total === 0) {
          const result: VoiceProcessingResult = {
            success: true,
            message: "No tienes transacciones registradas para hoy",
            parsedCommand: parsed,
            needsConfirmation: false,
          }
          return NextResponse.json(result)
        }

        const typeText = type === "gasto" ? "Gastaste" : type === "ingreso" ? "Recibiste" : "Moviste"
        const amount = total.toLocaleString("es-CO")
        const message = `${typeText} ${amount} pesos el día de hoy`

        const result: VoiceProcessingResult = {
          success: true,
          message,
          parsedCommand: parsed,
          needsConfirmation: false,
        }
        return NextResponse.json(result)
      }

      case "balance": {
        // Obtener todas las cuentas con sus balances
        const accounts = await dbQueries.getAccounts(userId)

        if (accounts.length === 0) {
          const result: VoiceProcessingResult = {
            success: true,
            message: "No tienes cuentas creadas todavía. Crea una cuenta para comenzar a registrar tus finanzas",
            parsedCommand: parsed,
            needsConfirmation: false,
          }
          return NextResponse.json(result)
        }

        // Calcular balance total
        const totalBalance = accounts.reduce((sum, account) => {
          return sum + Number(account.balance)
        }, 0)

        const balanceText = totalBalance.toLocaleString("es-CO")
        // Si solo hay una cuenta, mencionar su nombre
        const message = accounts.length === 1
          ? `Tu balance en ${accounts[0].name} es de ${balanceText} pesos`
          : `Tu balance total es de ${balanceText} pesos en ${accounts.length} cuentas`

        const result: VoiceProcessingResult = {
          success: true,
          message,
          parsedCommand: parsed,
          needsConfirmation: false,
        }
        return NextResponse.json(result)
      }

      default: {
        const result: VoiceProcessingResult = {
          success: false,
          message: "No entendí tu consulta. Puedes preguntar por tu último gasto, último ingreso, cuánto gastaste hoy o cuál es tu balance",
          parsedCommand: parsed,
          needsConfirmation: false,
        }
        return NextResponse.json(result)
      }
    }
  } catch (error) {
    console.error("Error procesando consulta:", error)
    const result: VoiceProcessingResult = {
      success: false,
      message: "Ocurrió un error al procesar tu consulta",
      parsedCommand: parsed,
      needsConfirmation: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
    return NextResponse.json(result)
  }
}

async function processConfirmedTransaction(parsedData: any, userId: number) {
  try {
    // Validar que tengamos los IDs necesarios
    if (!parsedData.categoryId || !parsedData.accountId) {
      // Intentar obtener los IDs si solo tenemos nombres
      const [categories, accounts] = await Promise.all([
        dbQueries.getCategories(userId, parsedData.transactionType),
        dbQueries.getAccounts(userId),
      ])

      if (!parsedData.categoryId && parsedData.categoryName) {
        const category = categories.find(
          (c) => c.name.toLowerCase() === parsedData.categoryName?.toLowerCase()
        )
        if (category) {
          parsedData.categoryId = category.id
        }
      }

      if (!parsedData.accountId && parsedData.accountName) {
        const account = accounts.find(
          (a) => a.name.toLowerCase() === parsedData.accountName?.toLowerCase()
        )
        if (account) {
          parsedData.accountId = account.id
        }
      }

      // Si aún no hay cuenta, usar la primera disponible
      if (!parsedData.accountId && accounts.length > 0) {
        parsedData.accountId = accounts[0].id
      }
    }

    if (!parsedData.categoryId) {
      return NextResponse.json(
        {
          success: false,
          message: `No se encontró la categoría "${parsedData.categoryName}"`,
          needsConfirmation: false,
          error: "Categoría no encontrada",
        } as VoiceProcessingResult,
        { status: 404 }
      )
    }

    if (!parsedData.accountId) {
      return NextResponse.json(
        {
          success: false,
          message: "No hay cuentas disponibles. Por favor crea una cuenta primero.",
          needsConfirmation: false,
          error: "No hay cuentas disponibles",
        } as VoiceProcessingResult,
        { status: 404 }
      )
    }

    // Obtener la cuenta para actualizar balance
    const accounts = await dbQueries.getAccounts(userId)
    const account = accounts.find(a => a.id === parsedData.accountId)

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          message: "Cuenta no encontrada",
          needsConfirmation: false,
          error: "Cuenta no válida",
        } as VoiceProcessingResult,
        { status: 404 }
      )
    }

    // HU-009: Verificar duplicados en ventana de 1 minuto
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)
    const recentTransactions = await dbQueries.getTransactions(userId, {
      accountId: parsedData.accountId,
      startDate: oneMinuteAgo.toISOString().split("T")[0],
    })

    const isDuplicate = recentTransactions.some(
      (t) =>
        t.amount === parsedData.amount &&
        t.category_id === parsedData.categoryId &&
        t.type === parsedData.transactionType &&
        Math.abs(new Date(t.date).getTime() - now.getTime()) < 60000
    )

    if (isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Ya registraste una transacción similar hace menos de un minuto. ¿Estás seguro de que no es un duplicado?",
          needsConfirmation: false,
          error: "Posible transacción duplicada",
        } as VoiceProcessingResult,
        { status: 409 }
      )
    }

    // Crear la transacción
    const transaction = await dbQueries.createTransaction(userId, {
      account_id: parsedData.accountId,
      category_id: parsedData.categoryId,
      type: parsedData.transactionType,
      amount: parsedData.amount,
      description: parsedData.description || "Transacción por voz",
      date: new Date().toISOString().split("T")[0],
      source: 'voice',
      image_hash: null,
      ocr_confidence: null,
      edited: false,
    })

    console.log(`[Voice] Transacción creada: ID=${transaction.id}, Tipo=${parsedData.transactionType}, Monto=${parsedData.amount}, Cuenta=${parsedData.accountId}, Source=voice`)

    // Actualizar el balance de la cuenta
    const oldBalance = Number(account.balance) || 0  // Convertir a número por si viene como string
    const amount = Number(parsedData.amount) || 0
    
    const newBalance =
      parsedData.transactionType === "ingreso"
        ? oldBalance + amount
        : oldBalance - amount

    console.log(`[Voice] Actualizando balance: Cuenta=${parsedData.accountId} (${account.name}), Balance anterior=${oldBalance} (${typeof account.balance}), Monto=${amount}, Nuevo balance=${newBalance}`)

    try {
      const updatedAccount = await dbQueries.updateAccount(userId, parsedData.accountId, { balance: newBalance })
      console.log(`[Voice] Balance actualizado exitosamente. Balance en DB: ${updatedAccount.balance}`)
    } catch (error) {
      console.error(`[Voice] ERROR actualizando balance:`, error)
      throw error
    }

    // Mensaje de confirmación CONCISO con nuevo balance
    const typeText = parsedData.transactionType === "ingreso" ? "Ingreso" : "Gasto"
    const amountText = parsedData.amount.toLocaleString("es-CO")
    const balanceText = newBalance.toLocaleString("es-CO")
    
    const result: VoiceProcessingResult = {
      success: true,
      message: `Listo. ${typeText} de ${amountText} guardado. Nuevo balance: ${balanceText} pesos`,
      transactionId: transaction.id,
      needsConfirmation: false,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error creando transacción:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear la transacción",
        needsConfirmation: false,
        error: "Error interno del servidor",
      } as VoiceProcessingResult,
      { status: 500 }
    )
  }
}
