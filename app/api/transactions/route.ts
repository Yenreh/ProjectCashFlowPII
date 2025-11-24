import { NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import type { Transaction } from "@/lib/types"
import { validateNumber, calculateNewBalance } from "@/lib/balance-utils"
import { requireAuth } from "@/lib/auth-helpers"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const accountId = searchParams.get("accountId")
    const categoryId = searchParams.get("categoryId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const filters = {
      type: (type === "ingreso" || type === "gasto") ? type as "ingreso" | "gasto" : undefined,
      accountId: accountId ? Number.parseInt(accountId) : undefined,
      categoryId: categoryId ? Number.parseInt(categoryId) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }
    
    const transactionsWithDetails = await dbQueries.getTransactions(user.id, filters)

    // Sort by date descending
    transactionsWithDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(transactionsWithDetails, {
      headers: {
        // Cache solo en navegador, se revalida en cada navegación
        'Cache-Control': 'private, max-age=10, must-revalidate',
      }
    })
  } catch (error) {
    console.error("[v0] Error fetching transactions:", error)
    return NextResponse.json({ error: "Error al obtener transacciones" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    
    const body = await request.json()
    const { account_id, category_id, type, amount, description, date, source, image_hash, ocr_confidence, edited } = body

    // Validation
    if (!account_id || !category_id || !type || !amount || !date) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    if (type !== "ingreso" && type !== "gasto") {
      return NextResponse.json({ error: "Tipo de transacción inválido" }, { status: 400 })
    }

    // Convertir y validar datos usando utilidades
    const accountIdNum = validateNumber(account_id, "ID de cuenta")
    const categoryIdNum = validateNumber(category_id, "ID de categoría")
    const amountNum = validateNumber(amount, "Monto")

    if (accountIdNum <= 0) {
      return NextResponse.json({ error: "ID de cuenta debe ser mayor a 0" }, { status: 400 })
    }

    if (categoryIdNum <= 0) {
      return NextResponse.json({ error: "ID de categoría debe ser mayor a 0" }, { status: 400 })
    }

    if (amountNum <= 0) {
      return NextResponse.json({ error: "Monto debe ser mayor a 0" }, { status: 400 })
    }

    const newTransactionData = {
      account_id: accountIdNum,
      category_id: categoryIdNum,
      type,
      amount: amountNum,
      description: description || null,
      date,
      source: source || 'manual',
      image_hash: image_hash || null,
      ocr_confidence: ocr_confidence || null,
      edited: edited || false,
    }

    let newTransaction: Transaction

    // Obtener la cuenta para calcular el nuevo balance
    const accounts = await dbQueries.getAccounts(user.id, true)
    const account = accounts.find(a => a.id === newTransactionData.account_id)
    
    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
    }
    
    // Crear la transacción
    newTransaction = await dbQueries.createTransaction(user.id, newTransactionData)
    
    // Calcular el nuevo balance usando utilidades
    const newBalance = calculateNewBalance(
      account.balance,
      newTransactionData.amount,
      newTransactionData.type
    )
    
    // Actualizar el balance de la cuenta
    await dbQueries.updateAccount(user.id, newTransactionData.account_id, { balance: newBalance })

    return NextResponse.json(newTransaction, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating transaction:", error)
    return NextResponse.json({ error: "Error al crear transacción" }, { status: 500 })
  }
}
