#!/usr/bin/env tsx

/**
 * Tests para balance-utils.ts
 * Ejecutar con: npx tsx tests/balance-utils.test.ts
 */

import {
  safeNumber,
  validateNumber,
  calculateNewBalance,
  revertTransactionEffect,
  isValidBalance,
  formatBalanceForLog,
} from "../lib/balance-utils"

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

function assertThrows(fn: () => void, expectedMessage?: string) {
  try {
    fn()
    throw new Error("Function should have thrown an error")
  } catch (error: any) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}", but got "${error.message}"`
      )
    }
  }
}

// Tests
console.log("\n=== Tests de Balance Utils ===\n")

test("safeNumber convierte strings numéricos", () => {
  assertEquals(safeNumber("100"), 100)
  assertEquals(safeNumber("0"), 0)
  assertEquals(safeNumber("-50"), -50)
})

test("safeNumber maneja valores inválidos con default", () => {
  assertEquals(safeNumber("abc"), 0)
  assertEquals(safeNumber(undefined), 0)
  assertEquals(safeNumber(null), 0)
  assertEquals(safeNumber("abc", 999), 999)
})

test("validateNumber acepta números válidos", () => {
  assertEquals(validateNumber(100), 100)
  assertEquals(validateNumber("50"), 50)
  assertEquals(validateNumber(0), 0)
})

test("validateNumber lanza error con valores inválidos", () => {
  assertThrows(() => validateNumber("abc"), "no es un número válido")
  assertThrows(() => validateNumber(undefined), "no es un número válido")
})

test("calculateNewBalance suma ingresos correctamente", () => {
  assertEquals(calculateNewBalance(1000, 500, "ingreso"), 1500)
  assertEquals(calculateNewBalance(0, 1000, "ingreso"), 1000)
  assertEquals(calculateNewBalance("1000", "500", "ingreso"), 1500)
})

test("calculateNewBalance resta gastos correctamente", () => {
  assertEquals(calculateNewBalance(1000, 500, "gasto"), 500)
  assertEquals(calculateNewBalance(1000, 1000, "gasto"), 0)
  assertEquals(calculateNewBalance("1000", "300", "gasto"), 700)
})

test("calculateNewBalance rechaza montos negativos", () => {
  assertThrows(
    () => calculateNewBalance(1000, -500, "ingreso"),
    "no puede ser negativo"
  )
})

test("calculateNewBalance rechaza tipos inválidos", () => {
  assertThrows(
    () => calculateNewBalance(1000, 500, "invalido" as any),
    "Tipo de transacción inválido"
  )
})

test("revertTransactionEffect revierte ingresos", () => {
  // Si agregamos 500, revertir debe restar 500
  assertEquals(revertTransactionEffect(1500, 500, "ingreso"), 1000)
  assertEquals(revertTransactionEffect(1000, 1000, "ingreso"), 0)
})

test("revertTransactionEffect revierte gastos", () => {
  // Si restamos 500, revertir debe sumar 500
  assertEquals(revertTransactionEffect(500, 500, "gasto"), 1000)
  assertEquals(revertTransactionEffect(0, 300, "gasto"), 300)
})

test("isValidBalance identifica números válidos", () => {
  assert(isValidBalance(100), "100 should be valid")
  assert(isValidBalance(0), "0 should be valid")
  assert(isValidBalance(-50), "-50 should be valid")
  assert(isValidBalance("1000"), "'1000' should be valid")
})

test("isValidBalance rechaza valores inválidos", () => {
  assert(!isValidBalance("abc"), "abc should be invalid")
  assert(!isValidBalance(undefined), "undefined should be invalid")
  assert(!isValidBalance(NaN), "NaN should be invalid")
  assert(!isValidBalance(Infinity), "Infinity should be invalid")
})

test("formatBalanceForLog formatea números válidos", () => {
  const formatted = formatBalanceForLog(50000)
  assert(formatted.includes("50"), "Should contain 50")
  assert(formatted.includes("000"), "Should contain 000")
})

test("formatBalanceForLog maneja valores inválidos", () => {
  const formatted = formatBalanceForLog("abc")
  assert(formatted.includes("INVALID"), "Should show INVALID")
})

console.log("\n[OK] Todos los tests de balance-utils pasaron\n")
