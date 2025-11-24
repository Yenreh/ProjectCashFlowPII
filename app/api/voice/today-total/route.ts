import { NextRequest, NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"

/**
 * GET /api/voice/today-total
 * Calcula el total de transacciones del día actual
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") as "ingreso" | "gasto" | null

    // Obtener fecha de hoy en formato YYYY-MM-DD
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    // Obtener transacciones del día
    const todayTransactions = await dbQueries.getTransactions(user.id, {
      type: type || undefined,
      startDate: todayStr,
      endDate: todayStr,
    })

    // Calcular total (convertir a número porque la DB retorna strings)
    const total = todayTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0
    )

    const response = {
      success: true,
      message: "Total del día calculado",
      data: {
        date: todayStr,
        type: type || "todas",
        total,
        count: todayTransactions.length,
        transactions: todayTransactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),  // Convertir a número también aquí
          categoryName: t.category_name,
          description: t.description,
        })),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error al calcular total del día:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al calcular el total del día",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
