import { NextRequest, NextResponse } from "next/server"
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"

export const dynamic = 'force-dynamic'

function getElevenLabsClient() {
  return new ElevenLabsClient({
    apiKey: process.env.ELEVEN_LABS_API_KEY || "",
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json(
        { error: "No se proporcionó archivo de audio" },
        { status: 400 }
      )
    }

    // Convertir el archivo a buffer
    const buffer = await audioFile.arrayBuffer()
    const audioBlob = new Blob([buffer], { type: audioFile.type })

    // Transcribir usando ElevenLabs Speech to Text
    // Nota: ElevenLabs no tiene API de STT nativa, usaremos su modelo de conversación
    // Para STT real, se recomienda usar Web Speech API en el cliente o servicios como Whisper
    
    // Por ahora, devolvemos un mensaje indicando que se debe usar Web Speech API en el cliente
    return NextResponse.json(
      {
        error: "ElevenLabs no proporciona STT. Usa Web Speech API en el navegador.",
        suggestion: "Implementa MediaRecorder con Web Speech API en el cliente"
      },
      { status: 501 }
    )

  } catch (error) {
    console.error("Error en speech-to-text:", error)
    return NextResponse.json(
      { error: "Error al procesar el audio" },
      { status: 500 }
    )
  }
}
