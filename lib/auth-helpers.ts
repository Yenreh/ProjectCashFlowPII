import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  return {
    id: parseInt(session.user.id),
    email: session.user.email || "",
    name: session.user.name || "",
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  return user
}
