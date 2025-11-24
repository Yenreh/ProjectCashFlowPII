export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    /*
     * Proteger todas las rutas excepto:
     * - /api/auth/* (rutas de autenticación)
     * - /login (página de login)
     * - /registro (página de registro)
     * - /_next/* (archivos estáticos de Next.js)
     * - /favicon.ico, /media/* (archivos públicos)
     */
    "/((?!api/auth|login|registro|_next|favicon.ico|media).*)",
  ],
}
