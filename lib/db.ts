import { neon } from "@neondatabase/serverless"
import type { Account, Category, Transaction, TransactionWithDetails, DashboardMetrics, CategoryExpense } from "./types"

// Conexión a la base de datos
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null

// Consultas de base de datos
export const dbQueries = {
  // Categories
  async getCategories(type?: "ingreso" | "gasto"): Promise<Category[]> {
    if (!sql) return []

    let query = `
      SELECT id, name, category_type as type, icon, color, 
             created_at::text as created_at
      FROM categories
    `

    if (type) {
      const result = await sql.query(query + ` WHERE category_type = $1`, [type])
      return result as Category[]
    }

    const result = await sql.query(query)
    return result as Category[]
  },

  // Accounts
  async getAccounts(includeArchived = false): Promise<Account[]> {
    if (!sql) return []

    let query = `
      SELECT id, name, account_type as type, balance::text, currency, is_archived,
             created_at::text as created_at, updated_at::text as updated_at
      FROM accounts
    `

    if (!includeArchived) {
      query += ` WHERE is_archived = false`
    }

    const result = await sql.query(query)
    
    // Convert balance from string to number
    return result.map((account: any) => ({
      ...account,
      balance: Number(account.balance)
    })) as Account[]
  },

  async createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
    if (!sql) throw new Error("Database not available")

    const result = await sql.query(`
      INSERT INTO accounts (name, account_type, balance, currency, is_archived)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, account_type as type, balance::text, currency, 
                is_archived, created_at::text as created_at, updated_at::text as updated_at
    `, [account.name, account.type, account.balance, account.currency, account.is_archived])

    const createdAccount = result[0] as any
    return {
      ...createdAccount,
      balance: Number(createdAccount.balance)
    } as Account
  },

  async updateAccount(id: number, updates: Partial<Account>): Promise<Account> {
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

  async deleteAccount(id: number): Promise<boolean> {
    if (!sql) throw new Error("Database not available")

    await sql.query(`DELETE FROM accounts WHERE id = $1`, [id])
    return true
  },

  // Transactions
  async getTransactions(filters: {
    type?: "ingreso" | "gasto"
    accountId?: number
    categoryId?: number
    startDate?: string
    endDate?: string
  } = {}): Promise<TransactionWithDetails[]> {
    if (!sql) return []

    let query = `
      SELECT t.id, t.account_id, t.category_id, t.transaction_type as type, 
             t.amount, t.description, t.transaction_date::text as date,
             t.created_at::text as created_at, t.updated_at::text as updated_at,
             t.source, t.image_hash, t.ocr_confidence, t.edited,
             a.name as account_name,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `

    const values: any[] = []
    let paramIndex = 1

    if (filters.type) {
      query += ` AND t.transaction_type = $${paramIndex++}`
      values.push(filters.type)
    }
    if (filters.accountId) {
      query += ` AND t.account_id = $${paramIndex++}`
      values.push(filters.accountId)
    }
    if (filters.categoryId) {
      query += ` AND t.category_id = $${paramIndex++}`
      values.push(filters.categoryId)
    }
    if (filters.startDate) {
      query += ` AND t.transaction_date >= $${paramIndex++}`
      values.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ` AND t.transaction_date <= $${paramIndex++}`
      values.push(filters.endDate)
    }

    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`

    const result = await sql.query(query, values)
    
    // Convert amount from string to number
    return result.map((transaction: any) => ({
      ...transaction,
      amount: Number(transaction.amount)
    })) as TransactionWithDetails[]
  },

  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    if (!sql) throw new Error("Database not available")

    const result = await sql.query(`
      INSERT INTO transactions (account_id, category_id, transaction_type, amount, description, transaction_date, source, image_hash, ocr_confidence, edited)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, account_id, category_id, transaction_type as type, amount::text, description,
                transaction_date::text as date, created_at::text as created_at, updated_at::text as updated_at,
                source, image_hash, ocr_confidence, edited
    `, [
      transaction.account_id, 
      transaction.category_id, 
      transaction.type, 
      transaction.amount, 
      transaction.description, 
      transaction.date,
      transaction.source || 'manual',
      transaction.image_hash || null,
      transaction.ocr_confidence || null,
      transaction.edited || false
    ])

    const created = result[0] as any
    return {
      ...created,
      amount: Number(created.amount)
    } as Transaction
  },

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction> {
    if (!sql) throw new Error("Database not available")

    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.account_id !== undefined) {
      fields.push(`account_id = $${paramIndex++}`)
      values.push(updates.account_id)
    }
    if (updates.category_id !== undefined) {
      fields.push(`category_id = $${paramIndex++}`)
      values.push(updates.category_id)
    }
    if (updates.type !== undefined) {
      fields.push(`transaction_type = $${paramIndex++}`)
      values.push(updates.type)
    }
    if (updates.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`)
      values.push(updates.amount)
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`)
      values.push(updates.description)
    }
    if (updates.date !== undefined) {
      fields.push(`transaction_date = $${paramIndex++}`)
      values.push(updates.date)
    }
    if (updates.source !== undefined) {
      fields.push(`source = $${paramIndex++}`)
      values.push(updates.source)
    }
    if (updates.image_hash !== undefined) {
      fields.push(`image_hash = $${paramIndex++}`)
      values.push(updates.image_hash)
    }
    if (updates.ocr_confidence !== undefined) {
      fields.push(`ocr_confidence = $${paramIndex++}`)
      values.push(updates.ocr_confidence)
    }
    if (updates.edited !== undefined) {
      fields.push(`edited = $${paramIndex++}`)
      values.push(updates.edited)
    }

    values.push(id)

    const result = await sql.query(`
      UPDATE transactions 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, account_id, category_id, transaction_type as type, amount::text, description,
                transaction_date::text as date, created_at::text as created_at, updated_at::text as updated_at,
                source, image_hash, ocr_confidence, edited
    `, values)

    const updated = result[0] as any
    return {
      ...updated,
      amount: Number(updated.amount)
    } as Transaction
  },

  async deleteTransaction(id: number): Promise<boolean> {
    if (!sql) throw new Error("Database not available")

    await sql.query(`DELETE FROM transactions WHERE id = $1`, [id])
    return true
  },

  // Dashboard metrics
  async getDashboardMetrics(filters: { startDate?: string; endDate?: string } = {}): Promise<DashboardMetrics> {
    if (!sql) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        accountsCount: 0,
        transactionsCount: 0
      }
    }

    let whereClause = ''
    const values: any[] = []
    let paramIndex = 1

    if (filters.startDate || filters.endDate) {
      const conditions: string[] = []

      if (filters.startDate) {
        conditions.push(`transaction_date >= $${paramIndex++}`)
        values.push(filters.startDate)
      }
      if (filters.endDate) {
        conditions.push(`transaction_date <= $${paramIndex++}`)
        values.push(filters.endDate)
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`
      }
    }

    const metricsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'ingreso' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'gasto' THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as transactions_count
      FROM transactions
      ${whereClause}
    `

    const accountsQuery = `
      SELECT COUNT(*) as accounts_count, COALESCE(SUM(balance), 0) as total_balance
      FROM accounts 
      WHERE is_archived = false
    `

    const [metricsResult, accountsResult] = await Promise.all([
      sql.query(metricsQuery, values),
      sql.query(accountsQuery)
    ])

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
  async getExpensesByCategory(filters: { startDate?: string; endDate?: string } = {}): Promise<CategoryExpense[]> {
    if (!sql) return []

    let whereClause = `WHERE t.transaction_type = 'gasto'`
    const conditions: string[] = []

    if (filters.startDate) {
      conditions.push(`t.transaction_date >= '${filters.startDate}'`)
    }
    if (filters.endDate) {
      conditions.push(`t.transaction_date <= '${filters.endDate}'`)
    }
    
    if (conditions.length > 0) {
      whereClause += ` AND ${conditions.join(' AND ')}`
    }

    const query = `
      SELECT 
        c.name as category_name,
        c.icon as category_icon, 
        c.color as category_color,
        SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total DESC
    `

    const result = await sql.query(query)
    
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
  async getIncomesByCategory(filters: { startDate?: string; endDate?: string } = {}): Promise<CategoryExpense[]> {
    if (!sql) return []

    let whereClause = `WHERE t.transaction_type = 'ingreso'`
    const conditions: string[] = []

    if (filters.startDate) {
      conditions.push(`t.transaction_date >= '${filters.startDate}'`)
    }
    if (filters.endDate) {
      conditions.push(`t.transaction_date <= '${filters.endDate}'`)
    }
    
    if (conditions.length > 0) {
      whereClause += ` AND ${conditions.join(' AND ')}`
    }

    const query = `
      SELECT 
        c.name as category_name,
        c.icon as category_icon, 
        c.color as category_color,
        SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total DESC
    `

    const result = await sql.query(query)
    
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
