"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Mic, MicOff, Loader2, Check, X, Volume2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder"
import type { VoiceProcessingResult, ParsedVoiceCommand } from "@/lib/voice-types"
import { useCategoriesStore, useAccountsStore } from "@/lib/stores"

// HU-012: Comandos sugeridos
const SUGGESTED_COMMANDS = {
  gastos: [
    "gasté 50000 en comida",
    "pagué 30000 en transporte",
    "compré 120000 en ropa",
  ],
  ingresos: [
    "recibí 200000 por freelance",
    "me entró 1500000 de salario",
    "cobré 80000 por venta",
  ],
  consultas: [
    "¿cuál fue mi último gasto?",
    "¿cuánto gasté hoy?",
    "¿cuál es mi balance?",
  ],
  navegacion: [
    "ir a cuentas",
    "abrir transacciones",
    "mostrar reportes",
  ],
  control: [
    "activar asistente",
    "desactivar asistente",
  ],
}

interface VoiceAssistantProps {
  onTransactionCreated?: () => void
}

export function VoiceAssistant({ onTransactionCreated }: VoiceAssistantProps) {
  const router = useRouter()
  const [processingResult, setProcessingResult] = useState<VoiceProcessingResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInCorrectionMode, setIsInCorrectionMode] = useState(false)
  const [originalCommand, setOriginalCommand] = useState<ParsedVoiceCommand | null>(null)
  const [pendingCommand, setPendingCommand] = useState<ParsedVoiceCommand | null>(null)
  const [pendingCommandAttempts, setPendingCommandAttempts] = useState(0)
  const [isContinuousMode, setIsContinuousMode] = useState(false)
  
  // Estados para edición inline
  const [editedType, setEditedType] = useState<string>("")
  const [editedAmount, setEditedAmount] = useState<string>("")
  const [editedCategory, setEditedCategory] = useState<string>("")
  const [editedAccount, setEditedAccount] = useState<string>("")
  const [editedDescription, setEditedDescription] = useState<string>("")
  const [hasManualEdits, setHasManualEdits] = useState(false)

  // Usar stores para categorías y cuentas
  const { categories, fetchCategories } = useCategoriesStore()
  const { accounts, fetchAccounts } = useAccountsStore()

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingCommandRef = useRef<ParsedVoiceCommand | null>(null)
  
  // Sincronizar ref con state
  useEffect(() => {
    pendingCommandRef.current = pendingCommand
  }, [pendingCommand])

  // Cargar categorías y cuentas desde stores
  useEffect(() => {
    fetchCategories()
    fetchAccounts()
  }, [fetchCategories, fetchAccounts])

  const {
    recordingState,
    transcription,
    isListening,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder({
    onTranscriptionComplete: handleTranscriptionComplete,
    onError: handleRecordingError,
  })

  // HU-011: Atajos de teclado accesibles
  useEffect(() => {
    function handleKeyPress(event: KeyboardEvent) {
      // Ctrl+Shift+V para activar grabación
      if (event.ctrlKey && event.shiftKey && event.key === "V") {
        event.preventDefault()
        if (!isListening) {
          startRecording()
        }
      }
      // Escape para cancelar
      if (event.key === "Escape") {
        if (isListening || processingResult) {
          handleCancel()
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isListening, processingResult])

  async function handleTranscriptionComplete(text: string) {
    setIsProcessing(true)
    setError(null)

    try {
      const payload: any = { transcription: text }
      
      console.log('[Voice UI] ===== INICIO DE PROCESAMIENTO =====')
      console.log('[Voice UI] Transcripción:', text)
      console.log('[Voice UI] Comando pendiente actual (state):', pendingCommand)
      console.log('[Voice UI] Comando pendiente actual (ref):', pendingCommandRef.current)
      console.log('[Voice UI] Comando original actual:', originalCommand)
      
      // USAR EL REF en lugar del state para obtener el valor más reciente
      if (pendingCommandRef.current) {
        payload.pendingCommand = pendingCommandRef.current
        console.log('[Voice UI] ➡️ Enviando respuesta con contexto pendiente:', pendingCommandRef.current)
      }
      
      // Si estamos en modo corrección, incluir el comando original
      else if (isInCorrectionMode && originalCommand) {
        payload.isCorrection = true
        payload.originalCommand = originalCommand
        console.log('[Voice UI] ➡️ Enviando corrección con comando original:', originalCommand)
      }

      const response = await fetch("/api/voice/process-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Error al procesar el comando")
      }

      const result: VoiceProcessingResult = await response.json()
      console.log('[Voice UI] ⬅️ Respuesta recibida:', {
        success: result.success,
        needsConfirmation: result.needsConfirmation,
        needsAdditionalInfo: result.needsAdditionalInfo,
        message: result.message,
        parsedCommand: result.parsedCommand
      })
      setProcessingResult(result)

      // Si el resultado indica que necesita información adicional, guardar como pendiente
      if (result.needsAdditionalInfo && result.parsedCommand) {
        // Incrementar intentos
        const attempts = pendingCommandAttempts + 1
        setPendingCommandAttempts(attempts)
        
        // Límite de 3 intentos para evitar bucles infinitos
        if (attempts >= 3) {
          await speakMessage("Lo siento, no pude obtener toda la información necesaria después de varios intentos. Por favor, intenta con un comando completo.")
          setPendingCommand(null)
          setPendingCommandAttempts(0)
          pendingCommandRef.current = null
          console.log('[Voice UI] ⚠️ Límite de intentos alcanzado, cancelando comando pendiente')
        } else {
          setPendingCommand(result.parsedCommand)
          pendingCommandRef.current = result.parsedCommand
          console.log(`[Voice UI] 💾 Guardando comando como pendiente (falta info) - Intento ${attempts}/3`)
        }
      } 
      // Si la transacción fue exitosa o se está pidiendo confirmación, limpiar pendiente
      else if (result.success || result.needsConfirmation) {
        setPendingCommand(null)
        setPendingCommandAttempts(0)
        pendingCommandRef.current = null
        console.log('[Voice UI] 🧹 Limpiando comando pendiente')
      }

      // Guardar el comando parseado para posibles correcciones
      if (result.parsedCommand) {
        setOriginalCommand(result.parsedCommand)
        // Inicializar campos editables
        setEditedType(result.parsedCommand.transactionType || "")
        setEditedAmount(result.parsedCommand.amount?.toString() || "")
        setEditedCategory(result.parsedCommand.categoryName || "")
        setEditedAccount(result.parsedCommand.accountName || "")
        setEditedDescription(result.parsedCommand.description || "")
        setHasManualEdits(false) // Resetear flag de edición manual
      }
      
      console.log('[Voice UI] ===== FIN DE PROCESAMIENTO =====')
      console.log('')

      // HU-010: Manejar comandos de control
      if (result.parsedCommand?.intention === "control") {
        handleControlCommand(result.parsedCommand.controlType, result.message)
        setIsProcessing(false)
        return
      }

      // HU-011: Manejar comandos de navegación
      if (result.parsedCommand?.intention === "navegacion") {
        handleNavigationCommand(result.parsedCommand.navigationType, result.message)
        setIsProcessing(false)
        return
      }

      // Para consultas, reproducir la respuesta directamente sin pedir confirmación
      if (result.parsedCommand?.intention === "consulta") {
        if (result.message) {
          await speakMessage(result.message)
        }
        
        // Mostrar toast con la información
        toast.info("Consulta procesada", {
          description: result.message,
          duration: 6000,
        })

        // Limpiar después de un tiempo
        setTimeout(() => {
          setProcessingResult(null)
          // HU-010: Si está en modo continuo, reiniciar grabación
          if (isContinuousMode) {
            setTimeout(() => startRecording(), 1000)
          }
        }, 6000)

        setIsProcessing(false)
        return
      }

      // Reproducir respuesta de voz para transacciones
      if (result.message) {
        await speakMessage(result.message)
      }

      // HU-013: Si hubo error Y hay sugerencias, reproducir SOLO las 2 primeras de forma concisa
      if (!result.success && result.suggestions && result.suggestions.length > 0) {
        // Tomar solo las 2 primeras sugerencias para ser conciso
        const topSuggestions = result.suggestions.slice(0, 2)
        const suggestionsText = topSuggestions.join(", o ")
        await speakMessage(suggestionsText)
      }

      // Si estábamos en modo corrección y fue exitosa, salir del modo
      if (isInCorrectionMode && result.success) {
        setIsInCorrectionMode(false)
      }

      // HU-010: Si está en modo continuo, reiniciar grabación después de procesar
      if (isContinuousMode && result.success && result.transactionId) {
        setTimeout(() => {
          setProcessingResult(null)
          startRecording()
        }, 3000)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      toast.error("Error al procesar comando", {
        description: errorMessage,
      })
      await speakMessage("Error al procesar comando")
    } finally {
      setIsProcessing(false)
    }
  }

  function handleRecordingError(err: Error) {
    setError(err.message)
    setIsProcessing(false)
  }

  async function speakMessage(message: string) {
    try {
      // Detener cualquier audio anterior antes de reproducir uno nuevo
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      
      setIsSpeaking(true)

      const response = await fetch("/api/voice/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      })

      if (!response.ok) {
        console.error("Error al sintetizar voz")
        setIsSpeaking(false)
        return
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Reproducir el audio
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      audioRef.current.src = audioUrl
      audioRef.current.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      // Manejar errores de reproducción
      audioRef.current.onerror = () => {
        console.error("Error al reproducir audio")
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audioRef.current.play()

    } catch (err) {
      console.error("Error reproduciendo audio:", err)
      setIsSpeaking(false)
    }
  }
  
  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      // Limpiar la URL del blob si existe
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src)
        audioRef.current.src = ''
      }
      setIsSpeaking(false)
    }
  }

  async function handleConfirm() {
    if (!processingResult?.parsedCommand) return

    setIsProcessing(true)
    setError(null)

    try {
      // Aplicar valores editados al comando antes de confirmar
      const updatedCommand = {
        ...processingResult.parsedCommand,
        transactionType: editedType || processingResult.parsedCommand.transactionType,
        amount: editedAmount ? parseFloat(editedAmount) : processingResult.parsedCommand.amount,
        categoryName: editedCategory || processingResult.parsedCommand.categoryName,
        accountName: editedAccount || processingResult.parsedCommand.accountName,
        description: editedDescription || processingResult.parsedCommand.description,
      }

      // Actualizar IDs si el usuario cambió categoría o cuenta manualmente
      if (editedCategory && editedCategory !== processingResult.parsedCommand.categoryName) {
        const category = categories.find((c: any) => c.name === editedCategory)
        if (category) {
          updatedCommand.categoryId = category.id
          updatedCommand.categoryName = category.name
        }
      }

      if (editedAccount && editedAccount !== processingResult.parsedCommand.accountName) {
        const account = accounts.find((a: any) => a.name === editedAccount)
        if (account) {
          updatedCommand.accountId = account.id
          updatedCommand.accountName = account.name
        }
      }

      const response = await fetch("/api/voice/process-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          parsedData: updatedCommand,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al crear la transacción")
      }

      const result: VoiceProcessingResult = await response.json()
      setProcessingResult(result)

      // Reproducir mensaje de confirmación
      if (result.message) {
        await speakMessage(result.message)
      }

      // Notificar que se creó una transacción
      if (result.success && result.transactionId) {
        toast.success("Transacción creada", {
          description: result.message,
          duration: 5000,
        })
        onTransactionCreated?.()
        
        // Limpiar el comando pendiente después de confirmar exitosamente
        setPendingCommand(null)
        pendingCommandRef.current = null
        setOriginalCommand(null)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      toast.error("Error al crear transacción", {
        description: errorMessage,
      })
      await speakMessage("Error al crear transacción")
    } finally {
      setIsProcessing(false)
    }
  }

  function handleCancel() {
    setProcessingResult(null)
    setError(null)
    setIsInCorrectionMode(false)
    setOriginalCommand(null)
    setPendingCommand(null)
    pendingCommandRef.current = null  // Limpiar ref también
    setHasManualEdits(false)
    stopAudio()
    cancelRecording()
  }

  function handleStartNew() {
    setProcessingResult(null)
    setError(null)
    setIsInCorrectionMode(false)
    setOriginalCommand(null)
    stopAudio()
    // NO limpiar pendingCommand aquí - se limpia solo cuando se completa o cancela
  }
  
  function handleCancelAll() {
    // Esta función limpia TODO, incluyendo pendingCommand
    setProcessingResult(null)
    setError(null)
    setIsInCorrectionMode(false)
    setOriginalCommand(null)
    setPendingCommand(null)
    pendingCommandRef.current = null  // Limpiar ref también
    setHasManualEdits(false)
    stopAudio()
  }

  // Verificar si los campos tienen la información mínima necesaria
  function hasMinimumRequiredData(): boolean {
    return !!(editedType && editedAmount && parseFloat(editedAmount) > 0 && editedCategory && editedAccount)
  }

  // HU-010: Manejar comandos de control (modo manos libres)
  async function handleControlCommand(controlType?: string, message?: string) {
    if (controlType === "activar_continuo") {
      setIsContinuousMode(true)
      await speakMessage("Modo continuo activado")
      toast.success("Modo manos libres activado", {
        description: "El asistente seguirá escuchando después de cada comando",
      })
      // Reiniciar grabación automáticamente
      setTimeout(() => startRecording(), 1500)
    } else if (controlType === "desactivar_continuo") {
      setIsContinuousMode(false)
      await speakMessage("Modo continuo desactivado")
      toast.info("Modo manos libres desactivado")
      cancelRecording()
    } else if (controlType === "cancelar") {
      handleCancel()
      await speakMessage("Cancelado")
    }
  }

  // HU-011: Manejar comandos de navegación
  async function handleNavigationCommand(navigationType?: string, message?: string) {
    const routes: Record<string, string> = {
      cuentas: "/cuentas",
      transacciones: "/transacciones",
      reportes: "/reportes",
      inicio: "/",
    }

    const navigationMessages: Record<string, string> = {
      cuentas: "Abriendo la sección de cuentas",
      transacciones: "Abriendo el historial de transacciones",
      reportes: "Abriendo los reportes financieros",
      inicio: "Regresando a la página principal",
    }

    const route = navigationType ? routes[navigationType] : "/"
    const voiceMessage = navigationType ? navigationMessages[navigationType] : navigationMessages.inicio
    
    if (route) {
      await speakMessage(voiceMessage)
      toast.info(`Navegando a ${navigationType || "inicio"}`)
      router.push(route)
    }
  }

  // HU-012: Manejar clic en comando sugerido
  async function handleSuggestedCommand(command: string) {
    // Simular que el usuario dijo el comando
    await handleTranscriptionComplete(command)
  }

  const showRecordButton = recordingState === "idle" && !processingResult?.transactionId
  const showStopButton = isListening
  const showConfirmation = processingResult?.needsConfirmation || (hasManualEdits && hasMinimumRequiredData())
  const showSuccess = processingResult?.success && processingResult.transactionId

  return (
    <div
      className="w-full"
      role="region"
      aria-label="Asistente de voz para finanzas personales"
    >
      {/* Header del modal - Más compacto */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-muted/50 to-muted/30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Mic className="h-4 w-4 text-primary-foreground" />
          </div>
          <h2 className="text-base font-semibold">Asistente de Voz</h2>
          {isContinuousMode && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Manos Libres
            </span>
          )}
        </div>
      </div>

      {/* Contenido del modal */}
      <div className="px-4 py-3 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto" aria-live="polite">
        {/* Botones de control - Más compacto */}
        <div className="flex flex-col items-center gap-3 min-h-[80px] justify-center">
          {showRecordButton && (
            <Button
              size="lg"
              variant="default"
              className="h-16 w-16 rounded-full transition-all shadow-lg hover:shadow-xl"
              onClick={startRecording}
              aria-label="Iniciar grabación de voz"
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}

          {showStopButton && (
            <Button
              size="lg"
              variant="destructive"
              className="h-16 w-16 rounded-full animate-pulse transition-all shadow-lg"
              onClick={stopRecording}
            >
              <MicOff className="h-6 w-6" />
            </Button>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 transition-opacity text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Procesando...</span>
            </div>
          )}

          {isSpeaking && (
            <div className="flex flex-col items-center gap-2 transition-opacity">
              <div className="flex items-center gap-2 text-primary text-sm">
                <Volume2 className="h-5 w-5 animate-pulse" />
                <span>Reproduciendo respuesta...</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={stopAudio}
                className="text-xs text-destructive border-destructive hover:bg-destructive/10 h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Detener
              </Button>
            </div>
          )}
        </div>

        {/* Transcripción - Con transición suave y más compacta */}
        {transcription && (
          <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg transition-all animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-xs font-medium mb-1 text-slate-600">Escuché:</p>
            <p className="text-sm italic text-slate-900">&quot;{transcription}&quot;</p>
          </div>
        )}

        {/* Información detectada - Editable - SOLO PARA TRANSACCIONES (gasto/ingreso) - Más compacta */}
        {processingResult?.parsedCommand && (processingResult.parsedCommand.intention === "gasto" || processingResult.parsedCommand.intention === "ingreso") && (
          <div className="p-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-lg space-y-3 transition-all animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Información detectada</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Tipo */}
              <div className="grid gap-1.5">
                <Label htmlFor="type-edit" className="text-xs text-slate-600">Tipo</Label>
                <Select
                  value={editedType}
                  onValueChange={(value) => {
                    setEditedType(value)
                    setHasManualEdits(true)
                  }}
                >
                  <SelectTrigger id="type-edit" className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasto">Gasto</SelectItem>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Monto */}
              <div className="grid gap-1.5">
                <Label htmlFor="amount-edit" className="text-xs text-slate-600">Monto</Label>
                <Input
                  id="amount-edit"
                  type="number"
                  step="0.01"
                  value={editedAmount}
                  onChange={(e) => {
                    setEditedAmount(e.target.value)
                    setHasManualEdits(true)
                  }}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>
              
              {/* Categoría */}
              <div className="grid gap-1.5">
                <Label htmlFor="category-edit" className="text-xs text-slate-600">Categoría</Label>
                <Select
                  value={editedCategory}
                  onValueChange={(value) => {
                    setEditedCategory(value)
                    setHasManualEdits(true)
                  }}
                >
                  <SelectTrigger id="category-edit" className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((cat: any) => !editedType || cat.type === editedType)
                      .map((category: any) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Cuenta */}
              <div className="grid gap-1.5">
                <Label htmlFor="account-edit" className="text-xs text-slate-600">Cuenta</Label>
                <Select
                  value={editedAccount}
                  onValueChange={(value) => {
                    setEditedAccount(value)
                    setHasManualEdits(true)
                  }}
                >
                  <SelectTrigger id="account-edit" className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.name}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Descripción */}
            <div className="grid gap-1.5">
              <Label htmlFor="description-edit" className="text-xs text-slate-600">Descripción (opcional)</Label>
              <Textarea
                id="description-edit"
                value={editedDescription}
                onChange={(e) => {
                  setEditedDescription(e.target.value)
                  setHasManualEdits(true)
                }}
                placeholder="Ej: Compra en supermercado"
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Mensaje de estado - Más compacto */}
        {processingResult && (
          <div className="min-h-[50px] transition-all">
            <div
              className={`p-3 rounded-lg transition-all animate-in fade-in duration-300 text-sm ${
                processingResult.success 
                  ? "bg-success/10 text-success border-l-4 border-success" 
                  : processingResult.needsAdditionalInfo
                  ? "bg-primary/10 text-foreground border-l-4 border-primary"
                  : "bg-warning/10 text-foreground border-l-4 border-warning"
              }`}
            >
              <p className="text-sm font-medium">{processingResult.message}</p>
            </div>
          </div>
        )}

        {/* Sugerencias - Más compactas */}
        {processingResult?.suggestions && processingResult.suggestions.length > 0 && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg border-l-4 border-primary transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-medium mb-2 text-foreground">Puedes decir:</p>
            <div className="flex flex-wrap gap-1.5">
              {processingResult.suggestions.map((suggestion, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-foreground border border-primary/30"
                >
                  &quot;{suggestion}&quot;
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error - Más compacto */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive-foreground rounded-lg border-l-4 border-destructive transition-all animate-in fade-in duration-300">
            <p className="text-xs font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Botones de acción - Más compactos */}
        <div className="min-h-[40px] transition-all">
          {showConfirmation && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Button
                className="w-full h-9 text-sm"
                onClick={handleConfirm}
                disabled={isProcessing || isSpeaking}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar Transacción
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-sm"
                onClick={handleCancel}
                disabled={isProcessing || isSpeaking}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}

          {showSuccess && (
            <Button 
              className="w-full h-9 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300" 
              onClick={handleStartNew}
            >
              Hacer otra transacción
            </Button>
          )}

          {/* Botones para cuando hay error o falta información */}
          {!showConfirmation && !showSuccess && processingResult && !processingResult.success && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Button className="flex-1 h-9 text-sm" onClick={handleStartNew}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Nuevo
              </Button>
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={handleCancelAll}>
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* HU-012: Comandos sugeridos en pantalla inicial - Rediseñado con cards */}
        {!transcription && !processingResult && !isInCorrectionMode && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-base font-semibold mb-1">Comandos que puedes usar</h3>
              <p className="text-xs text-muted-foreground">Presiona el micrófono y di uno de estos comandos</p>
            </div>
            
            {/* Grid de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Card: Gastos */}
              <div className="bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-destructive flex items-center justify-center">
                    <span className="text-destructive-foreground text-sm font-bold">-</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Registrar gastos</h4>
                </div>
                <div className="space-y-1.5">
                  {SUGGESTED_COMMANDS.gastos.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedCommand(cmd)}
                      className="w-full px-3 py-1.5 text-xs text-left bg-card text-card-foreground rounded-md hover:bg-accent hover:text-accent-foreground hover:shadow-sm transition-all border border-border"
                    >
                      &quot;{cmd}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Card: Ingresos */}
              <div className="bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-success flex items-center justify-center">
                    <span className="text-success-foreground text-sm font-bold">+</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Registrar ingresos</h4>
                </div>
                <div className="space-y-1.5">
                  {SUGGESTED_COMMANDS.ingresos.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedCommand(cmd)}
                      className="w-full px-3 py-1.5 text-xs text-left bg-card text-card-foreground rounded-md hover:bg-accent hover:text-accent-foreground hover:shadow-sm transition-all border border-border"
                    >
                      &quot;{cmd}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Card: Consultas */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-bold">?</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Hacer consultas</h4>
                </div>
                <div className="space-y-1.5">
                  {SUGGESTED_COMMANDS.consultas.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedCommand(cmd)}
                      className="w-full px-3 py-1.5 text-xs text-left bg-card text-card-foreground rounded-md hover:bg-accent hover:text-accent-foreground hover:shadow-sm transition-all border border-border"
                    >
                      &quot;{cmd}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Card: Navegación */}
              <div className="bg-gradient-to-br from-muted to-muted/50 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center">
                    <span className="text-background text-sm font-bold">→</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Navegar</h4>
                </div>
                <div className="space-y-1.5">
                  {SUGGESTED_COMMANDS.navegacion.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedCommand(cmd)}
                      className="w-full px-3 py-1.5 text-xs text-left bg-card text-card-foreground rounded-md hover:bg-accent hover:text-accent-foreground hover:shadow-sm transition-all border border-border"
                    >
                      &quot;{cmd}&quot;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modo corrección - Más compacto */}
        {isInCorrectionMode && !transcription && (
          <div className="text-center p-3 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
            <p className="font-medium mb-1 text-sm text-foreground">Modo Corrección Activado</p>
            <p className="text-xs mb-2 text-muted-foreground">Di tu corrección, por ejemplo:</p>
            <div className="space-y-1 text-xs">
              <div className="bg-card px-2 py-1 rounded text-card-foreground">&quot;No, era 15000&quot;</div>
              <div className="bg-card px-2 py-1 rounded text-card-foreground">&quot;Cambia a Alimentos&quot;</div>
              <div className="bg-card px-2 py-1 rounded text-card-foreground">&quot;En realidad fue un ingreso&quot;</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
