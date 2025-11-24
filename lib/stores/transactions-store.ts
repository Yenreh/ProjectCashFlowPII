import { create } from 'zustand'
import type { Transaction, TransactionWithDetails } from '@/lib/types'

interface TransactionsState {
  transactions: TransactionWithDetails[]
  loading: boolean
  error: string | null
  lastFetch: number | null
  
  // Actions
  fetchTransactions: (filters?: {
    startDate?: string
    endDate?: string
    accountId?: number
    type?: 'ingreso' | 'gasto'
  }) => Promise<void>
  
  createTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<TransactionWithDetails>
  updateTransaction: (id: number, transaction: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: number) => Promise<void>
  
  setTransactions: (transactions: TransactionWithDetails[]) => void
  invalidate: () => void
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchTransactions: async (filters) => {
    const { loading, lastFetch } = get()
    
    if (loading) return

    // Caché de 10 segundos para transacciones
    if (!filters && lastFetch && Date.now() - lastFetch < 10000) return

    set({ loading: true, error: null })

    try {
      const params = new URLSearchParams()
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)
      if (filters?.accountId) params.append('accountId', filters.accountId.toString())
      if (filters?.type) params.append('type', filters.type)
      
      const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Error fetching transactions')
      }

      const data = await response.json()
      
      // Validar que data sea un array
      if (Array.isArray(data)) {
        set({ 
          transactions: data, 
          loading: false,
          lastFetch: Date.now()
        })
      } else {
        console.error('[Transactions Store] Invalid data format:', data)
        set({ 
          transactions: [],
          loading: false,
          lastFetch: Date.now()
        })
      }
    } catch (error) {
      console.error('[Transactions Store] Error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        loading: false,
        transactions: [] // Establecer array vacío en caso de error
      })
    }
  },

  createTransaction: async (transaction) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      })

      if (!response.ok) {
        throw new Error('Error creating transaction')
      }

      const newTransaction = await response.json()
      
      // Agregar a la lista local
      set(state => ({
        transactions: [newTransaction, ...state.transactions],
        lastFetch: Date.now()
      }))

      return newTransaction
    } catch (error) {
      console.error('[Transactions Store] Error creating:', error)
      throw error
    }
  },

  updateTransaction: async (id, transaction) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      })

      if (!response.ok) {
        throw new Error('Error updating transaction')
      }

      const updatedTransaction = await response.json()
      
      // Actualizar en la lista local
      set(state => ({
        transactions: state.transactions.map(t => 
          t.id === id ? updatedTransaction : t
        ),
        lastFetch: Date.now()
      }))
    } catch (error) {
      console.error('[Transactions Store] Error updating:', error)
      throw error
    }
  },

  deleteTransaction: async (id) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error deleting transaction')
      }

      // Eliminar de la lista local
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== id),
        lastFetch: Date.now()
      }))
    } catch (error) {
      console.error('[Transactions Store] Error deleting:', error)
      throw error
    }
  },

  setTransactions: (transactions) => {
    set({ transactions, lastFetch: Date.now() })
  },

  invalidate: () => {
    set({ lastFetch: null })
  }
}))
