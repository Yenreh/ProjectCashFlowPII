import { NextResponse } from "next/server"
import { dbQueries, sql } from "@/lib/db"
import { mockAccounts } from "@/lib/mock-data"
import { requireAuth } from "@/lib/auth-helpers"
import type { Account } from "@/lib/types"

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const accountId = Number.parseInt(id)
    const body = await request.json()

    let updatedAccount: Account

    // Use database if available, otherwise fallback to mock data
    if (sql) {
      try {
        updatedAccount = await dbQueries.updateAccount(user.id, accountId, body)
      } catch (error) {
        console.error("[v0] Database error, falling back to mock data:", error)
        // Fallback to mock data update
        const accountIndex = mockAccounts.findIndex((acc) => acc.id === accountId)
        if (accountIndex === -1) {
          return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
        }

        mockAccounts[accountIndex] = {
          ...mockAccounts[accountIndex],
          ...body,
          updated_at: new Date().toISOString(),
        }
        updatedAccount = mockAccounts[accountIndex]
      }
    } else {
      // Mock data update
      const accountIndex = mockAccounts.findIndex((acc) => acc.id === accountId)
      if (accountIndex === -1) {
        return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
      }

      mockAccounts[accountIndex] = {
        ...mockAccounts[accountIndex],
        ...body,
        updated_at: new Date().toISOString(),
      }
      updatedAccount = mockAccounts[accountIndex]
    }

    return NextResponse.json(updatedAccount)
  } catch (error) {
    console.error("[v0] Error updating account:", error)
    if ((error as any).message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error al actualizar cuenta" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const accountId = Number.parseInt(id)

    // Use database if available, otherwise fallback to mock data
    if (sql) {
      try {
        const success = await dbQueries.deleteAccount(user.id, accountId)
        if (!success) {
          return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
        }
      } catch (error) {
        console.error("[v0] Database error, falling back to mock data:", error)
        // Fallback to mock data deletion
        const accountIndex = mockAccounts.findIndex((acc) => acc.id === accountId)
        if (accountIndex === -1) {
          return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
        }
        mockAccounts.splice(accountIndex, 1)
      }
    } else {
      // Mock data deletion
      const accountIndex = mockAccounts.findIndex((acc) => acc.id === accountId)
      if (accountIndex === -1) {
        return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
      }
      mockAccounts.splice(accountIndex, 1)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting account:", error)
    if ((error as any).message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 })
  }
}
