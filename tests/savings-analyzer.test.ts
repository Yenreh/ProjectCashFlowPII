#!/usr/bin/env tsx

/**
 * Tests para savings-analyzer.ts
 * Ejecutar con: npx tsx tests/savings-analyzer.test.ts
 */

import { analyzeSavingsOpportunities } from "../lib/savings-analyzer"
import type { FinancialContext } from "../lib/chat-types"
import { test, assert, assertGreaterThan } from "./test-utils"

// Tests
console.log("\n=== Tests de Savings Analyzer ===\n")

test("detecta gastos que superan ingresos", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 1200000,
    balance: -200000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  assert(analysis.insights.length > 0, "Debe generar insights")
  const warning = analysis.insights.find(i => i.type === "warning" && i.title.includes("superan"))
  assert(!!warning, "Debe detectar que gastos superan ingresos")
  assert(analysis.healthScore < 70, "Health score debe ser bajo")
})

test("detecta gastos altos (>80% de ingresos)", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 850000,
    balance: 150000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  const warning = analysis.insights.find(i => i.type === "warning" && i.title.includes("muy altos"))
  assert(!!warning, "Debe detectar gastos altos")
  assert(warning!.priority === "high", "Debe ser prioridad alta")
})

test("felicita por buen control de gastos (<60%)", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 500000,
    balance: 500000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  const success = analysis.insights.find(i => i.type === "success")
  assert(!!success, "Debe generar mensaje de éxito")
  assert(analysis.healthScore >= 70, "Health score debe ser alto")
})

test("detecta gasto excesivo en una categoría (>40%)", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 800000,
    balance: 200000,
    expensesByCategory: [
      { category: "Entretenimiento", amount: 400000, count: 10 },
      { category: "Alimentos", amount: 400000, count: 15 },
    ],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  const categoryWarning = analysis.insights.find(
    i => i.type === "warning" && i.category === "Entretenimiento"
  )
  assert(!!categoryWarning, "Debe detectar gasto excesivo en categoría")
  assert(categoryWarning!.actionable, "Debe ser accionable")
})

test("detecta gastos pequeños frecuentes (latte factor)", () => {
  const transactions = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    type: "gasto" as const,
    amount: 15000,
    date: "2024-01-15",
    categoryName: "Alimentos",
    description: `Café ${i + 1}`,
  }))

  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 90000,
    balance: 910000,
    expensesByCategory: [{ category: "Alimentos", amount: 90000, count: 6 }],
    recentTransactions: transactions,
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  const latteFactorInsight = analysis.insights.find(
    i => i.title.includes("pequeños frecuentes")
  )
  assert(!!latteFactorInsight, "Debe detectar gastos pequeños frecuentes")
})

test("sugiere meta de ahorro si tasa es baja (<10%)", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 950000,
    balance: 50000, // 5% de ahorro
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  const savingsGoal = analysis.insights.find(
    i => i.title.includes("Meta de ahorro")
  )
  assert(!!savingsGoal, "Debe sugerir meta de ahorro")
  assert(savingsGoal!.actionable, "Debe ser accionable")
})

test("felicita por alta tasa de ahorro (>=20%)", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 700000,
    balance: 300000, // 30% de ahorro
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  const excellentSavings = analysis.insights.find(
    i => i.type === "success" && i.title.includes("ahorro")
  )
  assert(!!excellentSavings, "Debe felicitar por buen ahorro")
  assert(analysis.healthScore >= 80, "Health score debe ser alto")
})

test("calcula health score correctamente", () => {
  // Caso crítico: balance negativo
  const criticalContext: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 1500000,
    balance: -500000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const criticalAnalysis = analyzeSavingsOpportunities(criticalContext)
  assert(criticalAnalysis.healthScore < 40, "Health score crítico debe ser bajo")

  // Caso excelente: buen ahorro
  const excellentContext: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 600000,
    balance: 400000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const excellentAnalysis = analyzeSavingsOpportunities(excellentContext)
  assert(excellentAnalysis.healthScore >= 70, "Health score excelente debe ser alto")
})

test("genera mensaje motivacional apropiado", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 700000,
    balance: 300000,
    expensesByCategory: [],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  assert(!!analysis.motivationalMessage, "Debe generar mensaje motivacional")
  assert((analysis.motivationalMessage || "").length > 20, "Mensaje debe tener contenido")
})

test("limita insights a máximo 5", () => {
  // Contexto que generaría muchos insights
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 950000,
    balance: 50000,
    expensesByCategory: [
      { category: "Entretenimiento", amount: 400000, count: 10 },
      { category: "Transporte", amount: 350000, count: 8 },
      { category: "Alimentos", amount: 200000, count: 12 },
    ],
    recentTransactions: Array.from({ length: 10 }, (_, i) => ({
      id: i,
      type: "gasto" as const,
      amount: 15000,
      date: "2024-01-15",
      categoryName: "Alimentos",
      description: `Compra ${i}`,
    })),
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  assert(analysis.insights.length <= 5, `Debe limitar a 5 insights, obtuvo ${analysis.insights.length}`)
})

test("ordena insights por prioridad", () => {
  const context: FinancialContext = {
    totalIncome: 1000000,
    totalExpenses: 850000,
    balance: 150000,
    expensesByCategory: [
      { category: "Entretenimiento", amount: 450000, count: 10 },
    ],
    recentTransactions: [],
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
  }

  const analysis = analyzeSavingsOpportunities(context)
  
  // Verificar que insights de alta prioridad estén primero
  if (analysis.insights.length > 1) {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    for (let i = 0; i < analysis.insights.length - 1; i++) {
      const currentPriority = priorityOrder[analysis.insights[i].priority]
      const nextPriority = priorityOrder[analysis.insights[i + 1].priority]
      assert(
        currentPriority <= nextPriority,
        "Insights deben estar ordenados por prioridad"
      )
    }
  }
})

console.log("\n[OK] Todos los tests de savings-analyzer pasaron\n")
