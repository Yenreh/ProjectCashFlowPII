"use client"

import { useState, useRef, useCallback } from "react"
import type { RecordingState } from "@/lib/voice-types"

interface UseVoiceRecorderOptions {
  onTranscriptionComplete?: (transcription: string) => void
  onError?: (error: Error) => void
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [transcription, setTranscription] = useState<string>("")
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Inicializar Web Speech API
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      options.onError?.(
        new Error("Tu navegador no soporta reconocimiento de voz")
      )
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "es-CO"  // Español colombiano para mejor reconocimiento
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 3  // Aumentar alternativas para mejor precisión

    recognition.onstart = () => {
      setIsListening(true)
      setRecordingState("recording")
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setTranscription(transcript)
      setRecordingState("idle")
      setIsListening(false)
      options.onTranscriptionComplete?.(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error("Error en reconocimiento de voz:", event.error)
      setRecordingState("idle")
      setIsListening(false)
      
      // Si el error es "no-speech", mostrar mensaje más amigable
      if (event.error === "no-speech") {
        options.onError?.(new Error("No se detectó ningún audio. Por favor, intenta de nuevo."))
      } else {
        options.onError?.(new Error(`Error de reconocimiento: ${event.error}`))
      }
    }

    recognition.onend = () => {
      console.log("[Voice Recorder] Recognition ended, current state:", recordingState)
      setIsListening(false)
      
      // Si terminó pero no hubo resultado, volver a idle
      if (recordingState === "recording" || recordingState === "processing") {
        // Esperar un momento para ver si llega onresult
        setTimeout(() => {
          // Si después de 500ms sigue en processing y no hay transcripción, volver a idle
          if (recordingState === "processing") {
            console.log("[Voice Recorder] No result received, resetting to idle")
            setRecordingState("idle")
          }
        }, 500)
      }
    }

    return recognition
  }, [options, recordingState])

  // Iniciar grabación
  const startRecording = useCallback(async () => {
    try {
      setTranscription("")
      setRecordingState("recording")

      // Inicializar Speech Recognition
      if (!recognitionRef.current) {
        recognitionRef.current = initializeSpeechRecognition()
      }

      if (recognitionRef.current) {
        recognitionRef.current.start()
      } else {
        throw new Error("No se pudo inicializar el reconocimiento de voz")
      }

      // También iniciar MediaRecorder para tener el audio (opcional)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder

    } catch (error) {
      console.error("Error iniciando grabación:", error)
      setRecordingState("error")
      options.onError?.(error as Error)
    }
  }, [initializeSpeechRecognition, options])

  // Detener grabación
  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }

    setRecordingState("processing")
  }, [isListening])

  // Cancelar grabación
  const cancelRecording = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.abort()
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }

    audioChunksRef.current = []
    setTranscription("")
    setRecordingState("idle")
    setIsListening(false)
  }, [isListening])

  // Obtener el audio grabado
  const getAudioBlob = useCallback((): Blob | null => {
    if (audioChunksRef.current.length === 0) return null

    return new Blob(audioChunksRef.current, { type: "audio/webm" })
  }, [])

  // Limpiar recursos
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      mediaRecorderRef.current = null
    }

    audioChunksRef.current = []
    setTranscription("")
    setRecordingState("idle")
    setIsListening(false)
  }, [])

  return {
    recordingState,
    transcription,
    isListening,
    startRecording,
    stopRecording,
    cancelRecording,
    getAudioBlob,
    cleanup,
  }
}
