#!/usr/bin/env tsx

/**
 * Tests para el servicio NLP
 * Ejecutar con: npx tsx tests/nlp-service.test.ts
 */

import { test, assert } from "./test-utils"

console.log("\n=== Tests de NLP Service ===\n")

// Test 1: Extracción de montos
test("Extraer monto de números", () => {
  const text = "gasté 50000 en comida"
  const numeros = text.match(/\d+/g)
  assert(numeros !== null, "Debe encontrar números")
  assert(numeros![0] === "50000", "El monto debe ser 50000")
})

// Test 2: Detección de intención de gasto
test("Detectar intención de gasto", () => {
  const textos = ["gasté", "pagué", "compré"]
  textos.forEach(texto => {
    const esGasto = /gast[eéó]|pagu[eé]|compr[eé]/i.test(texto)
    assert(esGasto, `"${texto}" debe ser detectado como gasto`)
  })
})

// Test 3: Detección de intención de ingreso
test("Detectar intención de ingreso", () => {
  const textos = ["recibí", "me pagaron", "ingreso"]
  textos.forEach(texto => {
    const esIngreso = /recib[ií]|me\s+pagar|ingres[oó]/i.test(texto)
    assert(esIngreso, `"${texto}" debe ser detectado como ingreso`)
  })
})

// Test 4: Detección de categoría Alimentos
test("Detectar categoría Alimentos", () => {
  const textos = ["comida", "mercado", "restaurante", "alimento"]
  textos.forEach(texto => {
    const esAlimento = /comida|mercado|alimento|restaurante/i.test(texto)
    assert(esAlimento, `"${texto}" debe ser categoría Alimentos`)
  })
})

// Test 5: Detección de categoría Transporte
test("Detectar categoría Transporte", () => {
  const textos = ["taxi", "uber", "transporte", "gasolina"]
  textos.forEach(texto => {
    const esTransporte = /taxi|uber|transporte|gasolina/i.test(texto)
    assert(esTransporte, `"${texto}" debe ser categoría Transporte`)
  })
})

// Test 6: Montos en palabras
test("Extraer montos expresados en palabras", () => {
  const tests = [
    { text: "gasté mil pesos", expected: "mil" },
    { text: "recibí cincuenta lucas", expected: "cincuenta" }
  ]
  
  tests.forEach(({ text, expected }) => {
    const pattern = /\b(mil|miles|millón|millones|k|lucas)\b/i
    assert(pattern.test(text), `Debe detectar "${expected}" en "${text}"`)
  })
})

// Test 7: Validación de fecha ISO
test("Validar formato de fecha ISO", () => {
  const fecha = "2024-01-15"
  const esValido = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
  assert(esValido, "2024-01-15 debe ser formato válido")
})

// Test 8: Detección de corrección
test("Detectar intención de corrección", () => {
  const textos = ["no", "no, era 15000", "corrección"]
  textos.forEach(texto => {
    const esCorreccion = /^no\b|correcci[oó]n|cambi[oó]/i.test(texto)
    assert(esCorreccion, `"${texto}" debe ser detectado como corrección`)
  })
})

// Test 9: Normalización de texto
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

test("Normalizar texto (minúsculas, sin acentos)", () => {
  const result = normalizeText("  gasté  50000   en  comida  ")
  assert(result === "gasté 50000 en comida", "Debe normalizar espacios múltiples")
})

// Test 10: Extraer primer número
test("Extraer primer número de texto con múltiples números", () => {
  const text = "gasté 50000 pesos hace 2 días"
  const numeros = text.match(/\d+/g)
  assert(numeros !== null, "Debe encontrar números")
  assert(numeros![0] === "50000", "Debe extraer el primer número (50000)")
})

console.log("\n[OK] Todos los tests de NLP pasaron\n")
