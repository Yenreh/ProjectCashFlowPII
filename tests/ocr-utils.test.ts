#!/usr/bin/env tsx

/**
 * Tests para OCR utilities (parsing y validación)
 * Ejecutar con: npx tsx tests/ocr-utils.test.ts
 * 
 * NOTA: No prueba la API de Gemini (requeriría API key y créditos)
 * Solo prueba las funciones de parsing y validación
 */

// Framework de testing simple
function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
  } catch (error: any) {
    console.log(`[FAIL] ${name}`)
    console.log(`       ${error.message}`)
    process.exit(1)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    )
  }
}

// Funciones auxiliares extraídas de la lógica del OCR
function parseAmountFromText(text: string): number {
  // Simula el parsing de montos colombianos
  // En Colombia: 65.600 = sesenta y cinco mil seiscientos
  const cleaned = text.replace(/[$.]/g, "").trim()
  const amount = parseInt(cleaned)
  return isNaN(amount) ? 0 : amount
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  
  // Validar que la fecha sea realista
  const [year, month, day] = dateString.split('-').map(Number)
  if (year < 1900 || year > 2100) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  
  // Crear fecha y verificar que no sea inválida
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function validateReceiptData(data: any): boolean {
  if (!data || typeof data !== "object") return false
  if (!data.merchant || typeof data.merchant !== "string") return false
  if (typeof data.amount !== "number" || data.amount < 0) return false
  if (!isValidDate(data.date)) return false
  if (!data.category || typeof data.category !== "string") return false
  return true
}

function calculateConfidence(data: any): number {
  let score = 0
  
  // Merchant válido (+25%)
  if (data.merchant && data.merchant !== "Desconocido") {
    score += 0.25
  }
  
  // Amount válido y razonable (+35%)
  if (data.amount > 0 && data.amount < 100000000) {
    score += 0.35
  }
  
  // Date válida (+20%)
  if (isValidDate(data.date)) {
    score += 0.20
  }
  
  // Category válida (+20%)
  if (data.category && data.category !== "Otros Gastos") {
    score += 0.20
  }
  
  return Math.min(score, 1.0)
}

// Tests
console.log("\n=== Tests de OCR Utils ===\n")

test("parseAmountFromText maneja formato colombiano", () => {
  assertEquals(parseAmountFromText("65.600"), 65600)
  assertEquals(parseAmountFromText("1.500"), 1500)
  assertEquals(parseAmountFromText("123.456"), 123456)
})

test("parseAmountFromText maneja símbolos de moneda", () => {
  assertEquals(parseAmountFromText("$65.600"), 65600)
  assertEquals(parseAmountFromText("$ 1.500"), 1500)
})

test("parseAmountFromText maneja números sin formato", () => {
  assertEquals(parseAmountFromText("50000"), 50000)
  assertEquals(parseAmountFromText("100"), 100)
})

test("parseAmountFromText retorna 0 para valores inválidos", () => {
  assertEquals(parseAmountFromText("abc"), 0)
  assertEquals(parseAmountFromText(""), 0)
  assertEquals(parseAmountFromText("N/A"), 0)
})

test("isValidDate acepta fechas ISO válidas", () => {
  assert(isValidDate("2024-01-15"), "2024-01-15 should be valid")
  assert(isValidDate("2023-12-31"), "2023-12-31 should be valid")
  assert(isValidDate("2024-06-30"), "2024-06-30 should be valid")
})

test("isValidDate rechaza fechas inválidas", () => {
  assert(!isValidDate("2024-13-01"), "Invalid month")
  assert(!isValidDate("2024-02-30"), "Invalid day")
  assert(!isValidDate("15/01/2024"), "Wrong format")
  assert(!isValidDate("abc"), "Not a date")
})

test("validateReceiptData acepta datos válidos", () => {
  const validData = {
    merchant: "Éxito",
    amount: 65600,
    date: "2024-01-15",
    category: "Alimentos"
  }
  assert(validateReceiptData(validData), "Valid data should pass")
})

test("validateReceiptData rechaza merchant inválido", () => {
  const invalidData = {
    merchant: "",
    amount: 65600,
    date: "2024-01-15",
    category: "Alimentos"
  }
  assert(!validateReceiptData(invalidData), "Empty merchant should fail")
})

test("validateReceiptData rechaza amount negativo", () => {
  const invalidData = {
    merchant: "Éxito",
    amount: -100,
    date: "2024-01-15",
    category: "Alimentos"
  }
  assert(!validateReceiptData(invalidData), "Negative amount should fail")
})

test("validateReceiptData rechaza fecha inválida", () => {
  const invalidData = {
    merchant: "Éxito",
    amount: 65600,
    date: "invalid-date",
    category: "Alimentos"
  }
  assert(!validateReceiptData(invalidData), "Invalid date should fail")
})

test("calculateConfidence da score alto para datos completos", () => {
  const goodData = {
    merchant: "Carulla",
    amount: 50000,
    date: "2024-01-15",
    category: "Alimentos"
  }
  const confidence = calculateConfidence(goodData)
  assert(confidence >= 0.8, `Confidence should be >= 0.8, got ${confidence}`)
})

test("calculateConfidence da score bajo para datos por defecto", () => {
  const poorData = {
    merchant: "Desconocido",
    amount: 0,
    date: "2024-01-15",
    category: "Otros Gastos"
  }
  const confidence = calculateConfidence(poorData)
  assert(confidence < 0.5, `Confidence should be < 0.5, got ${confidence}`)
})

test("calculateConfidence penaliza montos irreales", () => {
  const unrealisticData = {
    merchant: "Tienda",
    amount: 999999999,
    date: "2024-01-15",
    category: "Alimentos"
  }
  const confidence = calculateConfidence(unrealisticData)
  assert(confidence < 1.0, "Should penalize unrealistic amounts")
})

console.log("\n[OK] Todos los tests de OCR utils pasaron\n")
