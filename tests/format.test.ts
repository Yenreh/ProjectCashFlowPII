#!/usr/bin/env tsx

/**
 * Tests para format.ts
 * Ejecutar con: npx tsx tests/format.test.ts
 */

import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateInput,
} from "../lib/format"
import { test, assert } from "./test-utils"

// Tests
console.log("\n=== Tests de Format Utils ===\n")

test("formatCurrency formatea pesos colombianos", () => {
  const result = formatCurrency(50000)
  assert(result.includes("50"), "Should contain 50")
  assert(result.includes("000"), "Should contain 000")
  // Puede ser "$ 50.000" o "$50.000" dependiendo del locale
})

test("formatCurrency maneja cero", () => {
  const result = formatCurrency(0)
  assert(result.includes("0"), "Should contain 0")
})

test("formatCurrency maneja números grandes", () => {
  const result = formatCurrency(1000000)
  assert(result.includes("1"), "Should contain 1")
  // Debe tener puntos de miles
})

test("formatDate formatea fechas en español", () => {
  const result = formatDate("2024-01-15")
  assert(result.includes("2024"), "Should contain year")
  assert(result.includes("15"), "Should contain day")
  // Debe incluir nombre del mes en español
})

test("formatDate maneja objetos Date", () => {
  const date = new Date(2024, 0, 15) // Enero 15, 2024
  const result = formatDate(date)
  assert(result.includes("2024"), "Should contain year")
  assert(result.includes("15"), "Should contain day")
})

test("formatDateShort formatea en formato corto", () => {
  const result = formatDateShort("2024-01-15")
  assert(result.includes("2024"), "Should contain year")
  assert(result.includes("01"), "Should contain month")
  assert(result.includes("15"), "Should contain day")
})

test("formatDateInput genera formato ISO", () => {
  const date = new Date(2024, 0, 15) // Enero 15, 2024
  const result = formatDateInput(date)
  assert(result.startsWith("2024-01"), "Should start with 2024-01")
  assert(result.length === 10, "Should be YYYY-MM-DD format")
})

test("formatDateInput maneja strings", () => {
  const result = formatDateInput("2024-01-15T10:00:00Z")
  assert(result.startsWith("2024"), "Should start with 2024")
  assert(result.length === 10, "Should be YYYY-MM-DD format")
})

console.log("\n[OK] Todos los tests de format pasaron\n")
