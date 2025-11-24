import { NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const filters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }

    const incomes = await dbQueries.getIncomesByCategory(user.id, filters)
    return NextResponse.json(incomes, {
      headers: {
        // Reportes pueden cachear más tiempo (solo lectura)
        'Cache-Control': 'private, max-age=30, must-revalidate',
      }
    })
  } catch (error) {
    console.error("[v0] Error fetching incomes by category:", error)
    return NextResponse.json(
      { error: "Error al obtener los ingresos por categoría" },
      { status: 500 }
    )
  }
}
