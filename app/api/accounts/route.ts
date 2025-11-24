import { NextResponse } from "next/server"
import { dbQueries } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"
import type { Account } from "@/lib/types"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get("includeArchived") === "true"

    const accounts = await dbQueries.getAccounts(user.id, includeArchived)

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("[v0] Error fetching accounts:", error)
    if ((error as any).message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error al obtener cuentas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name, type, balance, currency } = body

    // Validation
    if (!name || !type || balance === undefined) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const newAccountData = {
      name,
      type,
      balance: Number.parseFloat(balance),
      currency: currency || "COP",
      is_archived: false,
    }

    const newAccount = await dbQueries.createAccount(user.id, newAccountData)

    return NextResponse.json(newAccount, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating account:", error)
    if ((error as any).message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 })
  }
}
