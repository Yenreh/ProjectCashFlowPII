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
    const { text, voiceId } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: "No se proporcionó texto para sintetizar" },
        { status: 400 }
      )
    }

    // Voice ID por defecto - Rachel (voz femenina en español)
    // Puedes cambiar esto por otra voz de ElevenLabs
    const selectedVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"

    const elevenlabs = getElevenLabsClient()
    
    // Generar audio usando ElevenLabs TTS
    const audio = await elevenlabs.textToSpeech.convert(selectedVoiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
      },
    })

    // Convertir el stream a buffer
    const chunks: Uint8Array[] = []
    const reader = audio.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }

    // Combinar todos los chunks
    const audioBuffer = Buffer.concat(chunks)

    // Devolver el audio como respuesta
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error("Error en text-to-speech:", error)
    return NextResponse.json(
      { error: "Error al sintetizar el audio" },
      { status: 500 }
    )
  }
}
