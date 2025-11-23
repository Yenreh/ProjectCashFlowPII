export type TransactionType = "ingreso" | "gasto"
export type AccountType = "efectivo" | "banco" | "tarjeta"

export interface Category {
  id: number
  name: string
  type: TransactionType
  icon: string
  color: string
  created_at: string
}

export interface Account {
  id: number
  name: string
  type: AccountType
  balance: number
  currency: string
  is_archived: boolean | number // Allow both for compatibility
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  account_id: number
  category_id: number
  type: TransactionType
  amount: number
  description: string | null
  date: string
  created_at: string
  updated_at: string
  // Campos para soporte de recibos escaneados
  source?: "manual" | "voice" | "image"
  image_hash?: string | null
  ocr_confidence?: number | null
  edited?: boolean
}

export interface TransactionWithDetails extends Transaction {
  account_name: string
  category_name: string
  category_icon: string
  category_color: string
  // Heredados de Transaction
  source?: "manual" | "voice" | "image"
  image_hash?: string | null
  ocr_confidence?: number | null
  edited?: boolean
}

export interface DashboardMetrics {
  totalIncome: number
  totalExpenses: number
  balance: number
  accountsCount: number
  transactionsCount: number
}

export interface CategoryExpense {
  category_name: string
  category_icon: string
  category_color: string
  total: number
  percentage: number
}
