import { NextResponse } from "next/server"
import { dbQueries, sql } from "@/lib/db"
import { mockTransactions } from "@/lib/mock-data"
import type { Transaction } from "@/lib/types"
import { 
  validateNumber, 
  revertTransactionEffect, 
  calculateNewBalance,
  formatBalanceForLog 
} from "@/lib/balance-utils"
import { requireAuth } from "@/lib/auth-helpers"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const transactionId = Number.parseInt(id)
    const body = await request.json()

    // Convertir y validar account_id
    if (body.account_id !== undefined) {
      body.account_id = Number(body.account_id)
      if (isNaN(body.account_id)) {
        return NextResponse.json({ error: "ID de cuenta inválido" }, { status: 400 })
      }
    }

    // Convertir y validar amount
    if (body.amount !== undefined) {
      body.amount = Number(body.amount)
      if (isNaN(body.amount) || body.amount <= 0) {
        return NextResponse.json({ error: "Monto inválido" }, { status: 400 })
      }
    }

    let updatedTransaction: Transaction

    // Use database if available, otherwise fallback to mock data
    if (sql) {
      try {
        // Obtener la transacción original para revertir su efecto
        const transactions = await dbQueries.getTransactions(user.id, {})
        const originalTransaction = transactions.find(t => t.id === transactionId)
        
        if (!originalTransaction) {
          return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })
        }

        // Obtener todas las cuentas
        const accounts = await dbQueries.getAccounts(user.id, true)
        const originalAccount = accounts.find(a => a.id === originalTransaction.account_id)
        
        if (!originalAccount) {
          return NextResponse.json({ error: "Cuenta original no encontrada" }, { status: 404 })
        }

        // Determinar los nuevos valores (usar valores actuales si no se proporcionan nuevos)
        const newAccountId = body.account_id !== undefined ? body.account_id : originalTransaction.account_id
        const newType = body.type !== undefined ? body.type : originalTransaction.type
        const newAmount = body.amount !== undefined ? body.amount : validateNumber(originalTransaction.amount, "Original amount")

        // PASO 1: Revertir el efecto de la transacción original usando utilidades
        const revertedBalance = revertTransactionEffect(
          originalAccount.balance,
          originalTransaction.amount,
          originalTransaction.type
        )

        // PASO 2: Actualizar la transacción en la base de datos
        updatedTransaction = await dbQueries.updateTransaction(user.id, transactionId, body)

        // PASO 3: Aplicar el efecto de la nueva transacción
        if (newAccountId !== originalTransaction.account_id) {
          // Caso A: La cuenta cambió - actualizar ambas cuentas
          
          // Guardar el balance revertido en la cuenta original
          await dbQueries.updateAccount(user.id, originalTransaction.account_id, { balance: revertedBalance })
          
          // Obtener la nueva cuenta
          const newAccount = accounts.find(a => a.id === newAccountId)
          if (!newAccount) {
            return NextResponse.json({ error: "Nueva cuenta no encontrada" }, { status: 404 })
          }
          
          // Aplicar el efecto en la nueva cuenta usando utilidades
          const newAccountBalance = calculateNewBalance(
            newAccount.balance,
            newAmount,
            newType
          )
          
          await dbQueries.updateAccount(user.id, newAccountId, { balance: newAccountBalance })
        } else {
          // Caso B: Misma cuenta - aplicar el efecto de la nueva transacción sobre el balance revertido
          
          const finalBalance = calculateNewBalance(
            revertedBalance,
            newAmount,
            newType
          )
          
          await dbQueries.updateAccount(user.id, originalTransaction.account_id, { balance: finalBalance })
        }

      } catch (error) {
        console.error("[v0] Database error, falling back to mock data:", error)
        // Fallback to mock data update
        const transactionIndex = mockTransactions.findIndex((t) => t.id === transactionId)
        if (transactionIndex === -1) {
          return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })
        }

        mockTransactions[transactionIndex] = {
          ...mockTransactions[transactionIndex],
          ...body,
          updated_at: new Date().toISOString(),
        }
        updatedTransaction = mockTransactions[transactionIndex]
      }
    } else {
      // Mock data update
      const transactionIndex = mockTransactions.findIndex((t) => t.id === transactionId)
      if (transactionIndex === -1) {
        return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })
      }

      mockTransactions[transactionIndex] = {
        ...mockTransactions[transactionIndex],
        ...body,
        updated_at: new Date().toISOString(),
      }
      updatedTransaction = mockTransactions[transactionIndex]
    }

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error("[v0] Error updating transaction:", error)
    return NextResponse.json({ error: "Error al actualizar transacción" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const transactionId = Number.parseInt(id)

    // Use database if available, otherwise fallback to mock data
    if (sql) {
      try {
        // Obtener la transacción antes de eliminarla para revertir su efecto
        const transactions = await dbQueries.getTransactions(user.id, {})
        const transaction = transactions.find(t => t.id === transactionId)
        
        if (!transaction) {
          return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })
        }

        console.log("[Transaction DELETE] 📄 Transaction to delete:", {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          account_id: transaction.account_id
        })

        // Obtener la cuenta
        const accounts = await dbQueries.getAccounts(user.id, true)
        const account = accounts.find(a => a.id === transaction.account_id)
        
        if (!account) {
          return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
        }

        console.log("[Transaction DELETE] 💰 Account balance before:", formatBalanceForLog(account.balance))

        // Revertir el efecto de la transacción usando utilidades
        const newBalance = revertTransactionEffect(
          account.balance,
          transaction.amount,
          transaction.type
        )

        console.log("[Transaction DELETE] ⚖️  New balance after revert:", formatBalanceForLog(newBalance))

        // Actualizar el balance de la cuenta
        await dbQueries.updateAccount(user.id, transaction.account_id, { balance: newBalance })
        console.log("[Transaction DELETE] ✅ Updated account balance to:", formatBalanceForLog(newBalance))

        // Eliminar la transacción
        const success = await dbQueries.deleteTransaction(user.id, transactionId)
        if (!success) {
          return NextResponse.json({ error: "Error al eliminar transacción" }, { status: 500 })
        }

        console.log("[Transaction DELETE] ✅ Transaction deleted successfully")
      } catch (error) {
        console.error("[v0] Database error, falling back to mock data:", error)
        // Fallback to mock data deletion
        const transactionIndex = mockTransactions.findIndex((t) => t.id === transactionId)
        if (transactionIndex === -1) {
          return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })
        }
        mockTransactions.splice(transactionIndex, 1)
      }
    } else {
      // Mock data deletion
      const transactionIndex = mockTransactions.findIndex((t) => t.id === transactionId)
      if (transactionIndex === -1) {
        return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })
      }
      mockTransactions.splice(transactionIndex, 1)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting transaction:", error)
    return NextResponse.json({ error: "Error al eliminar transacción" }, { status: 500 })
  }
}
