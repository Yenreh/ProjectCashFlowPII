import { NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import type { Category } from "@/lib/types"
import { getCurrentUser } from "@/lib/auth-helpers"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get current user (optional - returns global categories if not logged in)
    const user = await getCurrentUser()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const typeFilter = (type === "ingreso" || type === "gasto") ? type as "ingreso" | "gasto" : undefined
    
    // Pass userId only if user is logged in, otherwise undefined to get only global categories
    const categories = await dbQueries.getCategories(user?.id, typeFilter)

    return NextResponse.json(categories)
  } catch (error) {
    console.error("[v0] Error fetching categories:", error)
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 })
  }
}
