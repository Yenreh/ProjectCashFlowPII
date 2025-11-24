import { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { sql } from "./db"
import "./auth-types"

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@email.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email y contraseña son requeridos")
        }

        try {
          // Buscar usuario en la base de datos
          if (!sql) throw new Error("Database not available")
          
          const result = await sql`SELECT * FROM users WHERE email = ${credentials.email}`

          const user = result[0]

          if (!user) {
            throw new Error("Credenciales inválidas")
          }

          // Verificar contraseña
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!passwordMatch) {
            throw new Error("Credenciales inválidas")
          }

          // Retornar usuario sin la contraseña
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
          }
        } catch (error) {
          console.error("Error en authorize:", error)
          throw new Error("Error al autenticar")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Vercel automáticamente detecta NEXTAUTH_URL en producción
  // Solo necesario en desarrollo local
  ...(process.env.NODE_ENV === "development" && {
    url: process.env.NEXTAUTH_URL,
  }),
}
