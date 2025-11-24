import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { Suspense } from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "CashFlow",
  description: "Gestiona tus finanzas personales de manera simple y efectiva",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          <Toaster richColors position="top-right" />
          {/* <Analytics /> */}
        </AuthProvider>
      </body>
    </html>
  )
}
