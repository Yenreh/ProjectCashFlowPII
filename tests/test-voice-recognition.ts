/**
 * Script de prueba para el reconocimiento de voz
 * Prueba diferentes comandos y verifica el mapeo de cuentas
 * 
 * Uso: npx tsx scripts/test-voice-recognition.ts
 */

import { parseVoiceCommandWithAI } from '../lib/nlp-gemini-service'
import type { Category, Account } from '../lib/types'

// Datos de prueba simulados
const mockCategories: Category[] = [
  { id: 1, name: 'Alimentación', type: 'gasto', icon: '🍔', created_at: new Date().toISOString() } as Category,
  { id: 2, name: 'Transporte', type: 'gasto', icon: '🚗', created_at: new Date().toISOString() } as Category,
  { id: 3, name: 'Servicios', type: 'gasto', icon: '💡', created_at: new Date().toISOString() } as Category,
  { id: 4, name: 'Entretenimiento', type: 'gasto', icon: '🎮', created_at: new Date().toISOString() } as Category,
  { id: 5, name: 'Salario', type: 'ingreso', icon: '💰', created_at: new Date().toISOString() } as Category,
  { id: 6, name: 'Otros Gastos', type: 'gasto', icon: '📦', created_at: new Date().toISOString() } as Category,
  { id: 7, name: 'Otros Ingresos', type: 'ingreso', icon: '💵', created_at: new Date().toISOString() } as Category,
]

const mockAccounts: Account[] = [
  { id: 1, name: 'Bancolombia Ahorros', balance: 500000, created_at: new Date().toISOString() } as Account,
  { id: 2, name: 'Efectivo', balance: 100000, created_at: new Date().toISOString() } as Account,
  { id: 3, name: 'Caja Social', balance: 250000, created_at: new Date().toISOString() } as Account,
  { id: 4, name: 'Nequi', balance: 50000, created_at: new Date().toISOString() } as Account,
]

// Casos de prueba
const testCases = [
  // Casos básicos de gastos
  "gasté 50000 en comida",
  "gasté 50 mil en comida",
  "pagué 30000 en transporte",
  "compré 120000 en ropa",
  
  // Casos con mención de cuenta
  "gasté 50000 en comida en banco",
  "gasté 50 mil en comida del banco",
  "pagué 30000 en transporte con efectivo",
  "gasté 15000 en taxi con la caja",
  "pagué 20000 en nequi",
  "saqué 50000 de bancolombia",
  
  // Casos con variaciones de nombres de cuenta
  "gasté 25000 en almuerzo en bancolombia",
  "pagué 10000 en bus con efectivo",
  "gasté 5000 en la caja social",
  "transferí 30000 desde nequi",
  
  // Casos de ingresos
  "recibí 200000 por freelance",
  "me entró 1500000 de salario",
  "me pagaron 80000",
  
  // Casos con cuentas e ingresos
  "recibí 100000 en banco",
  "me entró 50000 en efectivo",
  "cobré 200000 en la caja",
  
  // Casos ambiguos o difíciles
  "gasté en banco",
  "50000 en comida",
  "gasté 50 mil",
  "efectivo",
  
  // Consultas
  "cuál fue mi último gasto",
  "cuánto gasté hoy",
  "cuál es mi balance",
]

async function runTest(transcription: string) {
  console.log('\n' + '='.repeat(80))
  console.log(`📝 PRUEBA: "${transcription}"`)
  console.log('='.repeat(80))
  
  try {
    const result = await parseVoiceCommandWithAI(transcription, mockCategories, mockAccounts)
    
    console.log('\n✅ RESULTADO:')
    console.log(`   Intención: ${result.intention}`)
    console.log(`   Tipo: ${result.transactionType || 'N/A'}`)
    console.log(`   Monto: ${result.amount ? `$${result.amount.toLocaleString('es-CO')}` : 'N/A'}`)
    console.log(`   Categoría: ${result.categoryName || 'N/A'} ${result.categoryId ? `(ID: ${result.categoryId})` : ''}`)
    console.log(`   Cuenta: ${result.accountName || 'N/A'} ${result.accountId ? `(ID: ${result.accountId})` : ''}`)
    console.log(`   Descripción: ${result.description}`)
    console.log(`   Confianza: ${result.confidence}`)
    
    // Validación
    if (result.transactionType && result.amount && result.categoryId) {
      console.log('\n✅ VÁLIDO para crear transacción')
      if (result.accountId) {
        console.log('   ✅ Cuenta identificada correctamente')
      } else {
        console.log('   ⚠️  Falta identificar cuenta (se usará cuenta por defecto)')
      }
    } else {
      console.log('\n⚠️  INCOMPLETO - Falta información:')
      if (!result.transactionType) console.log('   - Tipo de transacción')
      if (!result.amount) console.log('   - Monto')
      if (!result.categoryId) console.log('   - Categoría')
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : error)
  }
}

async function main() {
  console.log('\n🎤 INICIANDO PRUEBAS DE RECONOCIMIENTO DE VOZ')
  console.log('='.repeat(80))
  console.log('\n📋 Cuentas disponibles:')
  mockAccounts.forEach(a => console.log(`   - ${a.name} (ID: ${a.id})`))
  console.log('\n📋 Categorías disponibles:')
  mockCategories.forEach(c => console.log(`   - ${c.name} (${c.type})`))
  
  // Ejecutar todas las pruebas
  for (const testCase of testCases) {
    await runTest(testCase)
    // Pequeña pausa entre pruebas para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ PRUEBAS COMPLETADAS')
  console.log('='.repeat(80) + '\n')
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

export { runTest, mockCategories, mockAccounts }
