import { neon } from "@neondatabase/serverless"
import type { Account, Category, Transaction, TransactionWithDetails, DashboardMetrics, CategoryExpense } from "./types"

// Conexión a la base de datos
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null

// Consultas de base de datos
export const dbQueries = {
  // Categories - Returns global categories (user_id IS NULL) plus user's custom categories
  async getCategories(userId?: number, type?: "ingreso" | "gasto"): Promise<Category[]> {
    if (!sql) return []

    // Build query dynamically based on parameters
    if (userId && type) {
      // User ID + Type filter
      const result = await sql`
        SELECT id, name, category_type as type, icon, color, 
               created_at::text as created_at
        FROM categories
        WHERE (user_id IS NULL OR user_id = ${userId})
          AND category_type = ${type}
        ORDER BY name
      `
      return result as Category[]
    } else if (userId) {
      // Only user ID filter
      const result = await sql`
        SELECT id, name, category_type as type, icon, color, 
               created_at::text as created_at
        FROM categories
        WHERE (user_id IS NULL OR user_id = ${userId})
        ORDER BY name
      `
      return result as Category[]
    } else if (type) {
      // Only type filter (global categories only)
      const result = await sql`
        SELECT id, name, category_type as type, icon, color, 
               created_at::text as created_at
        FROM categories
        WHERE user_id IS NULL AND category_type = ${type}
        ORDER BY name
      `
      return result as Category[]
    } else {
      // No filters (global categories only)
      const result = await sql`
        SELECT id, name, category_type as type, icon, color, 
               created_at::text as created_at
        FROM categories
        WHERE user_id IS NULL
        ORDER BY name
      `
      return result as Category[]
    }
  },

  // Accounts
  async getAccounts(userId: number, includeArchived = false): Promise<Account[]> {
    if (!sql) return []

    const result = includeArchived
      ? await sql`
          SELECT id, name, account_type as type, balance::text, currency, is_archived,
                 created_at::text as created_at, updated_at::text as updated_at
          FROM accounts
          WHERE user_id = ${userId}
        `
      : await sql`
          SELECT id, name, account_type as type, balance::text, currency, is_archived,
                 created_at::text as created_at, updated_at::text as updated_at
          FROM accounts
          WHERE user_id = ${userId} AND is_archived = false
        `
    
    // Convert balance from string to number
    return result.map((account: any) => ({
      ...account,
      balance: Number(account.balance)
    })) as Account[]
  },

  async createAccount(userId: number, account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
    if (!sql) throw new Error("Database not available")

    const result = await sql`
      INSERT INTO accounts (user_id, name, account_type, balance, currency, is_archived)
      VALUES (${userId}, ${account.name}, ${account.type}, ${account.balance}, ${account.currency}, ${account.is_archived})
      RETURNING id, name, account_type as type, balance::text, currency, 
                is_archived, created_at::text as created_at, updated_at::text as updated_at
    `

    const createdAccount = result[0] as any
    return {
      ...createdAccount,
      balance: Number(createdAccount.balance)
    } as Account
  },

  async updateAccount(userId: number, id: number, updates: Partial<Account>): Promise<Account> {
    if (!sql) throw new Error("Database not available")

    // Validar balance si se está actualizando
    if (updates.balance !== undefined) {
      const balanceNum = Number(updates.balance)
      if (isNaN(balanceNum)) {
        console.error("[DB] ❌ Attempted to update account with NaN balance:", updates.balance)
        throw new Error("Balance inválido: no es un número")
      }
      updates.balance = balanceNum
    }

    // Verificar que la cuenta pertenece al usuario
    const ownership = await sql`
      SELECT id FROM accounts WHERE id = ${id} AND user_id = ${userId}
    `
    
    if (ownership.length === 0) {
      throw new Error(`Cuenta con ID ${id} no encontrada o no tienes permiso`)
    }

    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`)
      values.push(updates.name)
    }
    if (updates.type !== undefined) {
      fields.push(`account_type = $${paramIndex++}`)
      values.push(updates.type)
    }
    if (updates.balance !== undefined) {
      fields.push(`balance = $${paramIndex++}`)
      values.push(updates.balance)
    }
    if (updates.currency !== undefined) {
      fields.push(`currency = $${paramIndex++}`)
      values.push(updates.currency)
    }
    if (updates.is_archived !== undefined) {
      fields.push(`is_archived = $${paramIndex++}`)
      values.push(updates.is_archived)
    }

    if (fields.length === 0) {
      throw new Error("No hay campos para actualizar")
    }

    values.push(id)

    const result = await sql.query(`
      UPDATE accounts 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, account_type as type, balance::text, currency, 
                is_archived, created_at::text as created_at, updated_at::text as updated_at
    `, values)

    if (!result || result.length === 0) {
      throw new Error(`Cuenta con ID ${id} no encontrada`)
    }

    const updatedAccount = result[0] as any
    const finalBalance = Number(updatedAccount.balance)
    
    if (isNaN(finalBalance)) {
      console.error("[DB] ❌ Account balance is NaN after update:", updatedAccount.balance)
      throw new Error("Balance corrupto después de actualizar")
    }

    return {
      ...updatedAccount,
      balance: finalBalance
    } as Account
  },

  async deleteAccount(userId: number, id: number): Promise<boolean> {
    if (!sql) throw new Error("Database not available")

    await sql`DELETE FROM accounts WHERE id = ${id} AND user_id = ${userId}`
    return true
  },

  // Transactions
  async getTransactions(userId: number, filters: {
    type?: "ingreso" | "gasto"
    accountId?: number
    categoryId?: number
    startDate?: string
    endDate?: string
  } = {}): Promise<TransactionWithDetails[]> {
    if (!sql) return []

    // Build conditions array
    const conditions: string[] = []
    const params: any[] = [userId]
    let paramIndex = 2

    conditions.push(`t.user_id = $1`)

    if (filters.type) {
      conditions.push(`t.transaction_type = $${paramIndex}`)
      params.push(filters.type)
      paramIndex++
    }
    if (filters.accountId) {
      conditions.push(`t.account_id = $${paramIndex}`)
      params.push(filters.accountId)
      paramIndex++
    }
    if (filters.categoryId) {
      conditions.push(`t.category_id = $${paramIndex}`)
      params.push(filters.categoryId)
      paramIndex++
    }
    if (filters.startDate) {
      conditions.push(`t.transaction_date >= $${paramIndex}`)
      params.push(filters.startDate)
      paramIndex++
    }
    if (filters.endDate) {
      conditions.push(`t.transaction_date <= $${paramIndex}`)
      params.push(filters.endDate)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')
    const query = `
      SELECT t.id, t.account_id, t.category_id, t.transaction_type as type, 
             t.amount::text, t.description, t.transaction_date::text as date,
             t.created_at::text as created_at, t.updated_at::text as updated_at,
             t.source, t.image_hash, t.ocr_confidence, t.edited,
             a.name as account_name,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `

    const result: any[] = await sql.query(query, params) as any
    
    // Validar que result sea un array
    if (!Array.isArray(result)) {
      console.error("[DB] getTransactions returned non-array:", result)
      return []
    }
    
    // Convert amount from string to number
    return result.map((transaction: any) => ({
      ...transaction,
      amount: Number(transaction.amount)
    })) as TransactionWithDetails[]
  },

  async createTransaction(userId: number, transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    if (!sql) throw new Error("Database not available")

    const result = await sql`
      INSERT INTO transactions (user_id, account_id, category_id, transaction_type, amount, description, transaction_date, source, image_hash, ocr_confidence, edited)
      VALUES (${userId}, ${transaction.account_id}, ${transaction.category_id}, ${transaction.type}, ${transaction.amount}, ${transaction.description}, ${transaction.date}, ${transaction.source || 'manual'}, ${transaction.image_hash || null}, ${transaction.ocr_confidence || null}, ${transaction.edited || false})
      RETURNING id, account_id, category_id, transaction_type as type, amount::text, description,
                transaction_date::text as date, created_at::text as created_at, updated_at::text as updated_at,
                source, image_hash, ocr_confidence, edited
    `

    const created = result[0] as any
    return {
      ...created,
      amount: Number(created.amount)
    } as Transaction
  },

  async updateTransaction(userId: number, id: number, updates: Partial<Transaction>): Promise<Transaction> {
    if (!sql) throw new Error("Database not available")

    // Verificar ownership
    const ownership = await sql`
      SELECT id FROM transactions WHERE id = ${id} AND user_id = ${userId}
    `
    
    if (ownership.length === 0) {
      throw new Error(`Transacción con ID ${id} no encontrada o no tienes permiso`)
    }

    // Construir SET clause dinámicamente
    const updates_parts: string[] = []
    if (updates.account_id !== undefined) updates_parts.push(`account_id = ${updates.account_id}`)
    if (updates.category_id !== undefined) updates_parts.push(`category_id = ${updates.category_id}`)
    if (updates.type !== undefined) updates_parts.push(`transaction_type = '${updates.type}'`)
    if (updates.amount !== undefined) updates_parts.push(`amount = ${updates.amount}`)
    if (updates.description !== undefined) updates_parts.push(`description = '${updates.description}'`)
    if (updates.date !== undefined) updates_parts.push(`transaction_date = '${updates.date}'`)
    if (updates.source !== undefined) updates_parts.push(`source = '${updates.source}'`)
    if (updates.image_hash !== undefined) updates_parts.push(`image_hash = '${updates.image_hash}'`)
    if (updates.ocr_confidence !== undefined) updates_parts.push(`ocr_confidence = ${updates.ocr_confidence}`)
    if (updates.edited !== undefined) updates_parts.push(`edited = ${updates.edited}`)

    if (updates_parts.length === 0) {
      throw new Error("No hay campos para actualizar")
    }

    const query = `
      UPDATE transactions 
      SET ${updates_parts.join(', ')}
      WHERE id = ${id}
      RETURNING id, account_id, category_id, transaction_type as type, amount::text, description,
                transaction_date::text as date, created_at::text as created_at, updated_at::text as updated_at,
                source, image_hash, ocr_confidence, edited
    `

    const result: any[] = await sql.unsafe(query) as any
    const updated = result[0] as any
    
    return {
      ...updated,
      amount: Number(updated.amount)
    } as Transaction
  },

  async deleteTransaction(userId: number, id: number): Promise<boolean> {
    if (!sql) throw new Error("Database not available")

    await sql`DELETE FROM transactions WHERE id = ${id} AND user_id = ${userId}`
    return true
  },

  // Dashboard metrics
  async getDashboardMetrics(userId: number, filters: { startDate?: string; endDate?: string } = {}): Promise<DashboardMetrics> {
    if (!sql) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        accountsCount: 0,
        transactionsCount: 0
      }
    }

    // Build dynamic parameters for metrics query
    const conditions: string[] = []
    const params: any[] = [userId]
    let paramIndex = 2

    conditions.push(`user_id = $1`)

    if (filters.startDate) {
      conditions.push(`transaction_date >= $${paramIndex}`)
      params.push(filters.startDate)
      paramIndex++
    }
    if (filters.endDate) {
      conditions.push(`transaction_date <= $${paramIndex}`)
      params.push(filters.endDate)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    const metricsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'ingreso' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'gasto' THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as transactions_count
      FROM transactions
      WHERE ${whereClause}
    `

    const metricsResult: any[] = await sql.query(metricsQuery, params) as any
    const accountsResult: any[] = await sql`
      SELECT COUNT(*) as accounts_count, COALESCE(SUM(balance), 0) as total_balance
      FROM accounts 
      WHERE is_archived = false AND user_id = ${userId}
    `

    // Validar que los resultados sean arrays y tengan datos
    if (!Array.isArray(metricsResult) || metricsResult.length === 0) {
      console.error("[DB] getDashboardMetrics: metricsResult is invalid:", metricsResult)
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        accountsCount: 0,
        transactionsCount: 0
      }
    }

    if (!Array.isArray(accountsResult) || accountsResult.length === 0) {
      console.error("[DB] getDashboardMetrics: accountsResult is invalid:", accountsResult)
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        accountsCount: 0,
        transactionsCount: 0
      }
    }

    const metrics = metricsResult[0]
    const accounts = accountsResult[0]

    return {
      totalIncome: Number(metrics.total_income) || 0,
      totalExpenses: Number(metrics.total_expenses) || 0,
      balance: Number(metrics.total_income) - Number(metrics.total_expenses),
      accountsCount: Number(accounts.accounts_count) || 0,
      transactionsCount: Number(metrics.transactions_count) || 0
    }
  },

  // Expenses by category report
  async getExpensesByCategory(userId: number, filters: { startDate?: string; endDate?: string } = {}): Promise<CategoryExpense[]> {
    if (!sql) return []

    // Build dynamic parameters
    const conditions: string[] = []
    const params: any[] = [userId]
    let paramIndex = 2

    conditions.push(`t.transaction_type = 'gasto'`)
    conditions.push(`t.user_id = $1`)

    if (filters.startDate) {
      conditions.push(`t.transaction_date >= $${paramIndex}`)
      params.push(filters.startDate)
      paramIndex++
    }
    if (filters.endDate) {
      conditions.push(`t.transaction_date <= $${paramIndex}`)
      params.push(filters.endDate)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    const query = `
      SELECT 
        c.name as category_name,
        c.icon as category_icon, 
        c.color as category_color,
        SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total DESC
    `

    const result: any[] = await sql.query(query, params) as any
    
    if (!Array.isArray(result)) {
      console.error("[DB] getExpensesByCategory returned non-array:", result)
      return []
    }
    
    // Calcular el total para los porcentajes
    const total = result.reduce((sum: number, row: any) => sum + Number(row.total), 0)
    
    return result.map(row => {
      const amount = Number(row.total)
      const percentage = total > 0 ? (amount / total) * 100 : 0
      return {
        category_name: row.category_name,
        category_icon: row.category_icon,
        category_color: row.category_color,
        total: amount,
        percentage: percentage
      }
    })
  },

  // Incomes by category report
  async getIncomesByCategory(userId: number, filters: { startDate?: string; endDate?: string } = {}): Promise<CategoryExpense[]> {
    if (!sql) return []

    // Build dynamic parameters
    const conditions: string[] = []
    const params: any[] = [userId]
    let paramIndex = 2

    conditions.push(`t.transaction_type = 'ingreso'`)
    conditions.push(`t.user_id = $1`)

    if (filters.startDate) {
      conditions.push(`t.transaction_date >= $${paramIndex}`)
      params.push(filters.startDate)
      paramIndex++
    }
    if (filters.endDate) {
      conditions.push(`t.transaction_date <= $${paramIndex}`)
      params.push(filters.endDate)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    const query = `
      SELECT 
        c.name as category_name,
        c.icon as category_icon, 
        c.color as category_color,
        SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total DESC
    `

    const result: any[] = await sql.query(query, params) as any
    
    if (!Array.isArray(result)) {
      console.error("[DB] getIncomesByCategory returned non-array:", result)
      return []
    }
    
    // Calcular el total para los porcentajes
    const total = result.reduce((sum: number, row: any) => sum + Number(row.total), 0)
    
    return result.map(row => {
      const amount = Number(row.total)
      const percentage = total > 0 ? (amount / total) * 100 : 0
      return {
        category_name: row.category_name,
        category_icon: row.category_icon,
        category_color: row.category_color,
        total: amount,
        percentage: percentage
      }
    })
  }
}

export { sql }
