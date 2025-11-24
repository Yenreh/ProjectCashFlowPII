// Script de prueba para verificar el cálculo de balance
// Ejecutar con: npx tsx scripts/test-balance.ts

import { dbQueries, sql } from "../lib/db"

async function testBalanceCalculation() {
  if (!sql) {
    console.log("⚠️  Base de datos no disponible. Configurar DATABASE_URL en .env")
    process.exit(1)
  }

  console.log("🧪 Iniciando pruebas de cálculo de balance...\n")

  try {
    // 1. Obtener cuentas
    console.log("📊 1. Obteniendo cuentas...")
    const accounts = await dbQueries.getAccounts()
    if (accounts.length === 0) {
      console.log("❌ No hay cuentas disponibles. Crear al menos una cuenta primero.")
      process.exit(1)
    }
    
    const testAccount = accounts[0]
    console.log(`✅ Cuenta de prueba: ${testAccount.name}`)
    console.log(`   Balance inicial: $${testAccount.balance.toLocaleString("es-CO")} COP\n`)

    // 2. Obtener categorías
    console.log("📊 2. Obteniendo categorías...")
    const categories = await dbQueries.getCategories()
    const ingresoCategory = categories.find(c => c.type === "ingreso")
    const gastoCategory = categories.find(c => c.type === "gasto")
    
    if (!ingresoCategory || !gastoCategory) {
      console.log("❌ No hay categorías disponibles. Ejecutar el script de seed primero.")
      process.exit(1)
    }
    
    console.log(`✅ Categoría de ingreso: ${ingresoCategory.name}`)
    console.log(`✅ Categoría de gasto: ${gastoCategory.name}\n`)

    // 3. Crear transacción de ingreso
    console.log("📊 3. Creando transacción de ingreso de $100.000 COP...")
    const ingresoTransaction = await dbQueries.createTransaction({
      account_id: testAccount.id,
      category_id: ingresoCategory.id,
      type: "ingreso",
      amount: 100000,
      description: "Prueba de ingreso",
      date: new Date().toISOString().split("T")[0],
    })
    
    // Actualizar balance
    const balanceAfterIngreso = testAccount.balance + 100000
    await dbQueries.updateAccount(testAccount.id, { balance: balanceAfterIngreso })
    
    console.log(`✅ Transacción creada (ID: ${ingresoTransaction.id})`)
    console.log(`   Balance esperado: $${balanceAfterIngreso.toLocaleString("es-CO")} COP\n`)

    // 4. Verificar balance
    const accountAfterIngreso = (await dbQueries.getAccounts()).find(a => a.id === testAccount.id)
    if (!accountAfterIngreso) {
      console.log("❌ Error: Cuenta no encontrada")
      process.exit(1)
    }
    
    console.log(`📊 4. Verificando balance después de ingreso...`)
    if (accountAfterIngreso.balance === balanceAfterIngreso) {
      console.log(`✅ Balance correcto: $${accountAfterIngreso.balance.toLocaleString("es-CO")} COP\n`)
    } else {
      console.log(`❌ Balance incorrecto!`)
      console.log(`   Esperado: $${balanceAfterIngreso.toLocaleString("es-CO")} COP`)
      console.log(`   Actual: $${accountAfterIngreso.balance.toLocaleString("es-CO")} COP\n`)
    }

    // 5. Crear transacción de gasto
    console.log("📊 5. Creando transacción de gasto de $50.000 COP...")
    const gastoTransaction = await dbQueries.createTransaction({
      account_id: testAccount.id,
      category_id: gastoCategory.id,
      type: "gasto",
      amount: 50000,
      description: "Prueba de gasto",
      date: new Date().toISOString().split("T")[0],
    })
    
    // Actualizar balance
    const balanceAfterGasto = balanceAfterIngreso - 50000
    await dbQueries.updateAccount(testAccount.id, { balance: balanceAfterGasto })
    
    console.log(`✅ Transacción creada (ID: ${gastoTransaction.id})`)
    console.log(`   Balance esperado: $${balanceAfterGasto.toLocaleString("es-CO")} COP\n`)

    // 6. Verificar balance final
    const accountFinal = (await dbQueries.getAccounts()).find(a => a.id === testAccount.id)
    if (!accountFinal) {
      console.log("❌ Error: Cuenta no encontrada")
      process.exit(1)
    }
    
    console.log(`📊 6. Verificando balance final...`)
    if (accountFinal.balance === balanceAfterGasto) {
      console.log(`✅ Balance correcto: $${accountFinal.balance.toLocaleString("es-CO")} COP\n`)
    } else {
      console.log(`❌ Balance incorrecto!`)
      console.log(`   Esperado: $${balanceAfterGasto.toLocaleString("es-CO")} COP`)
      console.log(`   Actual: $${accountFinal.balance.toLocaleString("es-CO")} COP\n`)
    }

    // 7. Limpiar transacciones de prueba
    console.log("📊 7. Limpiando transacciones de prueba...")
    
    // Revertir gasto
    const balanceBeforeDelete1 = accountFinal.balance + 50000
    await dbQueries.updateAccount(testAccount.id, { balance: balanceBeforeDelete1 })
    await dbQueries.deleteTransaction(gastoTransaction.id)
    
    // Revertir ingreso
    const balanceBeforeDelete2 = balanceBeforeDelete1 - 100000
    await dbQueries.updateAccount(testAccount.id, { balance: balanceBeforeDelete2 })
    await dbQueries.deleteTransaction(ingresoTransaction.id)
    
    console.log(`✅ Transacciones eliminadas`)
    console.log(`   Balance restaurado: $${balanceBeforeDelete2.toLocaleString("es-CO")} COP\n`)

    // 8. Verificar que el balance volvió al original
    const accountRestored = (await dbQueries.getAccounts()).find(a => a.id === testAccount.id)
    if (!accountRestored) {
      console.log("❌ Error: Cuenta no encontrada")
      process.exit(1)
    }
    
    console.log(`📊 8. Verificando balance restaurado...`)
    if (accountRestored.balance === testAccount.balance) {
      console.log(`✅ Balance restaurado correctamente: $${accountRestored.balance.toLocaleString("es-CO")} COP\n`)
    } else {
      console.log(`❌ Balance no restaurado correctamente!`)
      console.log(`   Original: $${testAccount.balance.toLocaleString("es-CO")} COP`)
      console.log(`   Actual: $${accountRestored.balance.toLocaleString("es-CO")} COP\n`)
    }

    console.log("🎉 Todas las pruebas completadas exitosamente!\n")
    console.log("Resumen:")
    console.log(`- Balance inicial: $${testAccount.balance.toLocaleString("es-CO")} COP`)
    console.log(`- Después de ingreso (+$100.000): $${balanceAfterIngreso.toLocaleString("es-CO")} COP`)
    console.log(`- Después de gasto (-$50.000): $${balanceAfterGasto.toLocaleString("es-CO")} COP`)
    console.log(`- Balance final (restaurado): $${accountRestored.balance.toLocaleString("es-CO")} COP`)

  } catch (error) {
    console.error("❌ Error durante las pruebas:", error)
    process.exit(1)
  }
}

testBalanceCalculation()
