export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    /*
     * Proteger todas las rutas excepto:
     * - /api/auth/* (rutas de autenticación)
     * - /login (página de login)
     * - /registro (página de registro)
     * - /_next/* (archivos estáticos de Next.js)
     * - /favicon.svg (favicon público)
     * NOTA: /media/* NO está excluido para proteger los recibos en /media/receipts
     * Los recibos se sirven a través de /api/receipts/[id]/image con autenticación
     */
    "/((?!api/auth|login|registro|_next|favicon.svg).*)",
  ],
}
