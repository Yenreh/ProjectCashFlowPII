"use client"

import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { VoiceAssistantButton } from "@/components/voice/voice-assistant-button"
import { FinancialChat } from "@/components/chat/financial-chat"

interface AppLayoutProps {
  children: React.ReactNode
  onTransactionCreated?: () => void
}

export function AppLayout({ children, onTransactionCreated }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1">
        {children}
      </main>
      <MobileNav />
      <VoiceAssistantButton onTransactionCreated={onTransactionCreated} />
      <FinancialChat />
    </div>
  )
}
