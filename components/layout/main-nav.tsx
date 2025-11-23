"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Receipt, Wallet, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/transacciones", label: "Transacciones", icon: Receipt },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 xl:px-16 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <img
                  src="/favicon.svg"
                  alt="CashFlow logo"
                  className="h-7 w-6 rounded-lg object-contain"
                />
              </div>
              <span className="text-lg font-semibold">CashFlow</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
