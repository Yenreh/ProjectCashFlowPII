#!/usr/bin/env tsx

/**
 * Tests para utilidades de chat (context building y validación)
 * Ejecutar con: npx tsx tests/chat-utils.test.ts
 * 
 * NOTA: No prueba la API de Gemini (requeriría API key)
 * Solo prueba las funciones auxiliares de construcción de contexto
 */

import type { FinancialContext } from "../lib/chat-types"

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

// Funciones auxiliares extraídas de la lógica del chat
function validateFinancialContext(context: FinancialContext): boolean {
  if (!context || typeof context !== "object") return false
  if (typeof context.totalIncome !== "number") return false
  if (typeof context.totalExpenses !== "number") return false
  if (typeof context.balance !== "number") return false
  if (!Array.isArray(context.expensesByCategory)) return false
  if (!Array.isArray(context.recentTransactions)) return false
  if (!context.dateRange || !context.dateRange.start || !context.dateRange.end) return false
  return true
}

function summarizeContext(context: FinancialContext): string {
  const income = context.totalIncome.toLocaleString("es-CO")
  const expenses = context.totalExpenses.toLocaleString("es-CO")
  const balance = context.balance.toLocaleString("es-CO")
  const status = context.balance >= 0 ? "positivo" : "negativo"
  
  return `Ingresos: $${income} | Gastos: $${expenses} | Balance: $${balance} (${status})`
}

function formatMoneyResponse(amount: number): string {
  return `$${amount.toLocaleString("es-CO")} COP`
}

function calculateExpenseRatio(context: FinancialContext): number {
  if (context.totalIncome === 0) return 0
  return (context.totalExpenses / context.totalIncome) * 100
}

function getTopCategories(context: FinancialContext, limit: number = 3): Array<{category: string, amount: number}> {
  return context.expensesByCategory
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

function detectFinancialStatus(context: FinancialContext): "excelente" | "bueno" | "regular" | "critico" {
  const ratio = calculateExpenseRatio(context)
  
  if (context.balance < 0) return "critico"
  if (ratio > 90) return "critico"
  if (ratio > 80) return "regular"
  if (ratio > 60) return "bueno"
  return "excelente"
}

// Tests
console.log("\n=== Tests de Chat Utils ===\n")

test("validateFinancialContext acepta contexto válido", () => {
  const validContext: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 500000,
    balance: 500000,
    expensesByCategory: [
      { category: "Alimentos", amount: 300000, count: 10 },
    ],
    recentTransactions: [
      {
        id: 1,
        type: "ingreso",
        amount: 1000000,
        description: "Pago mensual",
        date: "2024-01-15",
        categoryName: "Salario",
      },
    ],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  assert(validateFinancialContext(validContext), "Debe aceptar contexto válido")
})

test("validateFinancialContext rechaza contexto inválido", () => {
  const invalidContext = {
    totalIncome: "1000000", // string en lugar de number
    totalExpenses: 500000,
    balance: 500000,
  } as any

  assert(!validateFinancialContext(invalidContext), "Debe rechazar contexto con tipos incorrectos")
})

test("summarizeContext genera resumen correcto", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 600000,
    balance: 400000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const summary = summarizeContext(context)
  
  assert(summary.includes("1.000.000"), "Debe incluir ingresos formateados")
  assert(summary.includes("600.000"), "Debe incluir gastos formateados")
  assert(summary.includes("400.000"), "Debe incluir balance formateado")
  assert(summary.includes("positivo"), "Debe indicar balance positivo")
})

test("formatMoneyResponse formatea moneda colombiana", () => {
  assert(formatMoneyResponse(50000).includes("50"), "Debe formatear 50000")
  assert(formatMoneyResponse(1000000).includes("1.000"), "Debe usar separador de miles")
  assert(formatMoneyResponse(0).includes("0"), "Debe manejar cero")
})

test("calculateExpenseRatio calcula porcentaje correcto", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 800000,
    balance: 200000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const ratio = calculateExpenseRatio(context)
  assert(ratio === 80, `Ratio debe ser 80%, obtuvo ${ratio}`)
})

test("calculateExpenseRatio maneja ingresos cero", () => {
  const context: FinancialContext = {
    totalIncome: 0,
    totalExpenses: 500000,
    balance: -500000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const ratio = calculateExpenseRatio(context)
  assert(ratio === 0, "Debe retornar 0 si no hay ingresos")
})

test("getTopCategories retorna categorías ordenadas", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 900000,
    balance: 100000,
    expensesByCategory: [
      { category: "Transporte", amount: 300000, count: 5 },
      { category: "Alimentos", amount: 400000, count: 10 },
      { category: "Entretenimiento", amount: 200000, count: 3 },
    ],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const top = getTopCategories(context, 2)
  
  assert(top.length === 2, "Debe retornar 2 categorías")
  assert(top[0].category === "Alimentos", "Primera debe ser Alimentos")
  assert(top[0].amount === 400000, "Monto debe ser correcto")
  assert(top[1].category === "Transporte", "Segunda debe ser Transporte")
})

test("getTopCategories maneja lista vacía", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 0,
    balance: 1000000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const top = getTopCategories(context, 3)
  assert(top.length === 0, "Debe retornar lista vacía")
})

test("detectFinancialStatus clasifica correctamente - excelente", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 500000,
    balance: 500000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  assert(detectFinancialStatus(context) === "excelente", "Debe ser excelente")
})

test("detectFinancialStatus clasifica correctamente - bueno", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 700000,
    balance: 300000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  assert(detectFinancialStatus(context) === "bueno", "Debe ser bueno")
})

test("detectFinancialStatus clasifica correctamente - regular", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 850000,
    balance: 150000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  assert(detectFinancialStatus(context) === "regular", "Debe ser regular")
})

test("detectFinancialStatus clasifica correctamente - crítico", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 1200000,
    balance: -200000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  assert(detectFinancialStatus(context) === "critico", "Debe ser crítico")
})

console.log("\n[OK] Todos los tests de chat-utils pasaron\n")
