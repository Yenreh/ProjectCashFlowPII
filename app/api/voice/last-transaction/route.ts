import { NextRequest, NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"

/**
 * GET /api/voice/last-transaction
 * Obtiene la última transacción del usuario
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") as "ingreso" | "gasto" | null

    // Obtener todas las transacciones ordenadas por fecha
    const allTransactions = await dbQueries.getTransactions(user.id, {
      type: type || undefined,
    })

    if (allTransactions.length === 0) {
      return NextResponse.json({
        success: false,
        message: type 
          ? `No tienes ningún ${type} registrado`
          : "No tienes ninguna transacción registrada",
        transaction: null,
      })
    }

    // La primera transacción es la más reciente (ya vienen ordenadas DESC)
    const lastTransaction = allTransactions[0]

    const response = {
      success: true,
      message: "Última transacción obtenida",
      transaction: {
        id: lastTransaction.id,
        type: lastTransaction.type,
        amount: Number(lastTransaction.amount),  // Convertir a número
        description: lastTransaction.description,
        categoryName: lastTransaction.category_name,
        accountName: lastTransaction.account_name,
        date: lastTransaction.date,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error al obtener última transacción:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener la última transacción",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
