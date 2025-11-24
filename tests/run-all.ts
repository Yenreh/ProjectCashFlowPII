#!/usr/bin/env tsx

/**
 * Script para ejecutar todos los tests del proyecto
 * Uso: npm run test o npx tsx tests/run-all.ts
 */

import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface TestResult {
  name: string
  passed: boolean
  output: string
  error?: string
}

const tests = [
  { name: "Conexión a Base de Datos", script: "tests/test-connection.ts" },
  { name: "Servicio NLP", script: "tests/nlp-service.test.ts" },
  { name: "Balance Utils", script: "tests/balance-utils.test.ts" },
  { name: "Format Utils", script: "tests/format.test.ts" },
  { name: "OCR Utils", script: "tests/ocr-utils.test.ts" },
  { name: "Savings Analyzer", script: "tests/savings-analyzer.test.ts" },
  { name: "Chat Utils", script: "tests/chat-utils.test.ts" },
]

async function runTest(testScript: string): Promise<{ passed: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync(`npx tsx ${testScript}`)
    return {
      passed: true,
      output: stdout + (stderr ? `\nStderr: ${stderr}` : ""),
    }
  } catch (error: any) {
    return {
      passed: false,
      output: error.stdout || error.stderr || error.message,
    }
  }
}

async function runAllTests() {
  console.log("====================================")
  console.log("  CashFlow - Suite de Tests")
  console.log("====================================\n")

  const results: TestResult[] = []
  let passedCount = 0
  let failedCount = 0

  for (const test of tests) {
    console.log(`\n[Ejecutando] ${test.name}...`)
    console.log("-".repeat(50))

    const result = await runTest(test.script)
    
    results.push({
      name: test.name,
      passed: result.passed,
      output: result.output,
    })

    if (result.passed) {
      passedCount++
      console.log(`[OK] ${test.name}`)
    } else {
      failedCount++
      console.log(`[FAIL] ${test.name}`)
      console.log(result.output)
    }
  }

  // Resumen
  console.log("\n" + "=".repeat(50))
  console.log("  Resumen de Tests")
  console.log("=".repeat(50))
  
  results.forEach((result) => {
    const status = result.passed ? "[PASS]" : "[FAIL]"
    console.log(`${status} ${result.name}`)
  })

  console.log("\n" + "-".repeat(50))
  console.log(`Total: ${tests.length} tests`)
  console.log(`Pasados: ${passedCount}`)
  console.log(`Fallidos: ${failedCount}`)
  console.log("-".repeat(50))

  if (failedCount > 0) {
    console.log("\nAlgunos tests fallaron. Revisa los errores arriba.")
    process.exit(1)
  } else {
    console.log("\nTodos los tests pasaron correctamente.")
    process.exit(0)
  }
}

runAllTests().catch((error) => {
  console.error("Error ejecutando tests:", error)
  process.exit(1)
})
