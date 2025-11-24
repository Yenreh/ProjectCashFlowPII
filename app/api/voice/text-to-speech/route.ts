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
    // Verificar si la API key está configurada
    const apiKey = process.env.ELEVEN_LABS_API_KEY
    console.log("[TTS] Verificando configuración...")
    console.log("[TTS] API Key presente:", !!apiKey)
    console.log("[TTS] API Key length:", apiKey?.length || 0)
    
    if (!apiKey) {
      console.error("[TTS] ❌ ELEVEN_LABS_API_KEY no configurada")
      return NextResponse.json(
        { error: "Servicio de síntesis de voz no configurado" },
        { status: 503 }
      )
    }

    const { text, voiceId } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: "No se proporcionó texto para sintetizar" },
        { status: 400 }
      )
    }

    // Voice ID por defecto - Rachel (voz femenina en español)
    const selectedVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"

    console.log(`[TTS] Generando audio para: "${text.substring(0, 50)}..."`)
    console.log(`[TTS] Voice ID: ${selectedVoiceId}`)

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
    
    console.log(`[TTS] ✅ Audio generado exitosamente (${audioBuffer.length} bytes)`)

    // Devolver el audio como respuesta
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error("[TTS] ❌ Error generando audio:", error)
    if (error instanceof Error) {
      console.error("[TTS] Error message:", error.message)
      console.error("[TTS] Error stack:", error.stack)
    }
    return NextResponse.json(
      { 
        error: "Error al sintetizar el audio",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}
