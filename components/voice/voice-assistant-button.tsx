"use client"

import { useState } from "react"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VoiceAssistant } from "./voice-assistant"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface VoiceAssistantButtonProps {
  onTransactionCreated?: () => void
}

export function VoiceAssistantButton({ onTransactionCreated }: VoiceAssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  function handleTransactionCreated() {
    onTransactionCreated?.()
    // Cerrar el diálogo después de 2 segundos
    setTimeout(() => {
      setIsOpen(false)
    }, 2000)
  }

  return (
    <>
      {/* Botón flotante - arriba del menú inferior en móvil */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 md:bottom-4 md:right-20 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg z-40 hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
      >
        <Mic className="h-5 w-5" />
        <span className="sr-only">Abrir asistente de voz</span>
      </Button>

      {/* Diálogo con el asistente - SIN padding extra */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Asistente de Voz</DialogTitle>
            <DialogDescription>
              Usa tu voz para registrar transacciones, consultar información y navegar en la aplicación
            </DialogDescription>
          </VisuallyHidden>
          <VoiceAssistant onTransactionCreated={handleTransactionCreated} />
        </DialogContent>
      </Dialog>
    </>
  )
}
