/**
 * Script para probar la conexión con ElevenLabs TTS
 * 
 * Uso: npx tsx scripts/test-elevenlabs.ts
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"
import { writeFileSync } from "fs"
import { resolve } from "path"

// Las variables de entorno se cargan automáticamente en Next.js

async function testElevenLabs() {
  console.log('\n🎵 TEST DE ELEVENLABS TTS')
  console.log('='.repeat(80))
  
  // Verificar API key
  const apiKey = process.env.ELEVEN_LABS_API_KEY
  console.log('\n1. Verificando configuración...')
  console.log(`   API Key presente: ${!!apiKey}`)
  console.log(`   API Key length: ${apiKey?.length || 0}`)
  
  if (!apiKey) {
    console.error('\n❌ ERROR: ELEVEN_LABS_API_KEY no está configurada en .env')
    console.log('\n💡 Solución: Agrega esto a tu archivo .env:')
    console.log('   ELEVEN_LABS_API_KEY=tu_clave_aqui')
    process.exit(1)
  }
  
  console.log('   ✅ API Key configurada')
  
  try {
    // Crear cliente
    console.log('\n2. Creando cliente de ElevenLabs...')
    const elevenlabs = new ElevenLabsClient({ apiKey })
    console.log('   ✅ Cliente creado')
    
    // Obtener voces disponibles
    console.log('\n3. Obteniendo voces disponibles...')
    try {
      const voices = await elevenlabs.voices.getAll()
      console.log(`   ✅ ${voices.voices.length} voces disponibles`)
      
      // Mostrar primeras 5 voces
      console.log('\n   Voces disponibles (primeras 5):')
      voices.voices.slice(0, 5).forEach((voice: any) => {
        console.log(`   - ${voice.name} (${voice.voice_id})`)
      })
    } catch (error) {
      console.error('   ⚠️  No se pudieron obtener las voces:', error instanceof Error ? error.message : error)
    }
    
    // Generar audio de prueba
    const testText = "Hola, esta es una prueba de síntesis de voz"
    const voiceId = "21m00Tcm4TlvDq8ikWAM" // Rachel
    
    console.log(`\n4. Generando audio de prueba...`)
    console.log(`   Texto: "${testText}"`)
    console.log(`   Voice ID: ${voiceId}`)
    
    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: testText,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
      },
    })
    
    console.log('   ✅ Audio generado')
    
    // Convertir a buffer
    console.log('\n5. Convirtiendo stream a buffer...')
    const chunks: Uint8Array[] = []
    const reader = audio.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    
    const audioBuffer = Buffer.concat(chunks)
    console.log(`   ✅ Buffer creado: ${audioBuffer.length} bytes`)
    
    // Guardar archivo de prueba
    const outputPath = resolve(process.cwd(), 'test-tts.mp3')
    writeFileSync(outputPath, audioBuffer)
    console.log(`\n6. Archivo guardado en: ${outputPath}`)
    console.log('   ✅ Puedes reproducir el archivo para verificar')
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ PRUEBA EXITOSA - ElevenLabs funciona correctamente')
    console.log('='.repeat(80) + '\n')
    
  } catch (error) {
    console.error('\n' + '='.repeat(80))
    console.error('❌ ERROR AL PROBAR ELEVENLABS')
    console.error('='.repeat(80))
    console.error('\nError:', error)
    
    if (error instanceof Error) {
      console.error('\nMensaje:', error.message)
      console.error('\nStack:', error.stack)
      
      // Mensajes de ayuda específicos
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.error('\n💡 La API key parece ser inválida')
        console.error('   Verifica que copiaste la clave completa de ElevenLabs')
      } else if (error.message.includes('404')) {
        console.error('\n💡 El voice ID no existe')
        console.error('   Prueba con otro voice ID o verifica la documentación')
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        console.error('\n💡 Has excedido tu cuota de ElevenLabs')
        console.error('   Verifica tu plan en elevenlabs.io')
      }
    }
    
    console.error('\n')
    process.exit(1)
  }
}

if (require.main === module) {
  testElevenLabs().catch(console.error)
}

export { testElevenLabs }
