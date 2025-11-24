import { create } from 'zustand'
import type { Account } from '@/lib/types'

interface AccountsState {
  accounts: Account[]
  loading: boolean
  error: string | null
  lastFetch: number | null
  
  // Actions
  fetchAccounts: () => Promise<void>
  createAccount: (account: Omit<Account, 'id' | 'balance' | 'created_at' | 'is_archived'>) => Promise<Account>
  updateAccount: (id: number, account: Partial<Account>) => Promise<void>
  deleteAccount: (id: number) => Promise<void>
  setAccounts: (accounts: Account[]) => void
  invalidate: () => void
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchAccounts: async () => {
    const { loading, lastFetch } = get()
    
    // Evitar múltiples llamadas simultáneas
    if (loading) return

    // Usar caché de 5 segundos para evitar llamadas innecesarias
    if (lastFetch && Date.now() - lastFetch < 5000) return

    set({ loading: true, error: null })

    try {
      const response = await fetch('/api/accounts')
      
      if (!response.ok) {
        throw new Error('Error fetching accounts')
      }

      const data = await response.json()
      
      // Validar que data sea un array
      if (Array.isArray(data)) {
        set({ 
          accounts: data, 
          loading: false,
          lastFetch: Date.now()
        })
      } else {
        console.error('[Accounts Store] Invalid data format:', data)
        set({ 
          accounts: [],
          loading: false,
          lastFetch: Date.now()
        })
      }
    } catch (error) {
      console.error('[Accounts Store] Error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        loading: false,
        accounts: [] // Establecer array vacío en caso de error
      })
    }
  },

  setAccounts: (accounts) => {
    set({ accounts, lastFetch: Date.now() })
  },

  createAccount: async (account) => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      })

      if (!response.ok) {
        throw new Error('Error creating account')
      }

      const newAccount = await response.json()
      
      // Agregar a la lista local
      set(state => ({
        accounts: [...state.accounts, newAccount],
        lastFetch: Date.now()
      }))

      return newAccount
    } catch (error) {
      console.error('[Accounts Store] Error creating:', error)
      throw error
    }
  },

  updateAccount: async (id, account) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      })

      if (!response.ok) {
        throw new Error('Error updating account')
      }

      const updatedAccount = await response.json()
      
      // Actualizar en la lista local
      set(state => ({
        accounts: state.accounts.map(a => 
          a.id === id ? updatedAccount : a
        ),
        lastFetch: Date.now()
      }))
    } catch (error) {
      console.error('[Accounts Store] Error updating:', error)
      throw error
    }
  },

  deleteAccount: async (id) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error deleting account')
      }

      // Eliminar de la lista local
      set(state => ({
        accounts: state.accounts.filter(a => a.id !== id),
        lastFetch: Date.now()
      }))
    } catch (error) {
      console.error('[Accounts Store] Error deleting:', error)
      throw error
    }
  },

  invalidate: () => {
    set({ lastFetch: null })
  }
}))
