import { NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import type { DashboardMetrics } from "@/lib/types"
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
    
    const metrics = await dbQueries.getDashboardMetrics(user.id, filters)

    return NextResponse.json(metrics, {
      headers: {
        // Cache solo en navegador, se revalida en cada navegación
        'Cache-Control': 'private, max-age=10, must-revalidate',
      }
    })
  } catch (error) {
    console.error("[v0] Error fetching dashboard metrics:", error)
    return NextResponse.json({ error: "Error al obtener métricas" }, { status: 500 })
  }
}
