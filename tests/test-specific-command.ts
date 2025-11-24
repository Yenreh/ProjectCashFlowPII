/**
 * Script de prueba para un comando específico problemático
 * 
 * Uso: npx tsx scripts/test-specific-command.ts
 */

import { parseVoiceCommandWithAI } from '../lib/nlp-gemini-service'
import type { Category, Account } from '../lib/types'

// Datos de prueba simulados (ajustar según tu base de datos real)
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
]

async function testCommand(transcription: string) {
  console.log('\n' + '='.repeat(80))
  console.log(`🎤 COMANDO DE PRUEBA: "${transcription}"`)
  console.log('='.repeat(80))
  
  try {
    const result = await parseVoiceCommandWithAI(transcription, mockCategories, mockAccounts)
    
    console.log('\n📊 RESULTADO COMPLETO:')
    console.log(JSON.stringify(result, null, 2))
    
    console.log('\n✅ VALIDACIÓN:')
    
    // Validar campos esperados
    if (result.intention === 'gasto' || result.intention === 'ingreso') {
      console.log(`   Intención: ${result.intention} ✅`)
      console.log(`   Tipo: ${result.transactionType} ${result.transactionType === result.intention ? '✅' : '❌'}`)
      console.log(`   Monto: ${result.amount ? `$${result.amount.toLocaleString('es-CO')} ✅` : '❌ FALTA'}`)
      console.log(`   Categoría: ${result.categoryName || '❌ FALTA'} ${result.categoryId ? `(ID: ${result.categoryId}) ✅` : '❌'}`)
      console.log(`   Cuenta: ${result.accountName || 'Sin especificar'} ${result.accountId ? `(ID: ${result.accountId})` : ''}`)
      console.log(`   Confianza: ${result.confidence}`)
      
      // Verificar si tiene todo lo necesario
      const isComplete = result.transactionType && result.amount && result.categoryId
      console.log(`\n   Estado: ${isComplete ? '✅ COMPLETO - Listo para crear transacción' : '❌ INCOMPLETO - Falta información'}`)
      
      if (!isComplete) {
        console.log('\n   ⚠️  Información faltante:')
        if (!result.transactionType) console.log('      - Tipo de transacción')
        if (!result.amount) console.log('      - Monto')
        if (!result.categoryId) console.log('      - Categoría')
      }
    } else {
      console.log(`   Intención: ${result.intention}`)
      console.log(`   Mensaje: ${result.description}`)
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : error)
  }
  
  console.log('\n' + '='.repeat(80) + '\n')
}

async function main() {
  console.log('\n🧪 TEST DE COMANDO ESPECÍFICO')
  console.log('='.repeat(80))
  
  // El comando problemático de la captura
  await testCommand('gasté $15 000 en comida')
  
  // Variaciones del mismo comando
  await testCommand('gasté 15000 en comida')
  await testCommand('gasté 15 mil en comida')
  await testCommand('gasté quince mil en comida')
  
  // Otros casos similares
  await testCommand('gasté $50.000 en transporte')
  await testCommand('pagué $30 000 en servicios')
}

if (require.main === module) {
  main().catch(console.error)
}

export { testCommand }
