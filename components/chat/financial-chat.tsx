"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { ChatMessage, ChatResponse } from "@/lib/chat-types"

export function FinancialChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-10), // Últimos 10 mensajes de contexto
        }),
      })

      const data: ChatResponse = await response.json()

      if (data.success && data.answer) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.answer,
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: data.error || "Lo siento, hubo un error al procesar tu consulta.",
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error("Error enviando mensaje:", error)
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Lo siento, no pude conectar con el servidor. Por favor intenta de nuevo.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-20 md:bottom-4 md:right-4 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
        size="icon"
      >
        <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-24 right-4 md:bottom-4 md:right-4 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] sm:h-[600px] shadow-2xl z-50 flex flex-col rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-3 bg-card">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          <CardTitle className="text-base font-semibold">Asistente Financiero</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 rounded-full hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">¡Hola! 👋</p>
            <p className="text-xs mt-2">
              Pregúntame sobre tus gastos, ingresos o balance.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Pensando...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="border-t pt-2">
        <div className="flex items-center gap-2 w-full">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            className="resize-none min-h-[60px]"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
