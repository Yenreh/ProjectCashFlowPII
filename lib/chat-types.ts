/**
 * Tipos para el sistema de chat con RAG
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface ChatRequest {
  message: string
  history?: ChatMessage[]
}

export interface ChatResponse {
  success: boolean
  message?: string
  answer?: string
  context?: FinancialContext
  error?: string
}

export interface FinancialContext {
  totalExpenses: number
  totalIncome: number
  balance: number
  expensesByCategory: Array<{
    category: string
    amount: number
    count: number
  }>
  recentTransactions: Array<{
    id: number
    type: string
    amount: number
    description: string
    date: string
    categoryName?: string
    source?: string
  }>
  dateRange: {
    start: string
    end: string
  }
}
