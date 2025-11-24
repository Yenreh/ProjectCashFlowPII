import { create } from 'zustand'
import type { Category } from '@/lib/types'

interface CategoriesState {
  categories: Category[]
  loading: boolean
  error: string | null
  lastFetch: number | null
  
  // Actions
  fetchCategories: () => Promise<void>
  setCategories: (categories: Category[]) => void
  
  // Helpers
  getCategoriesByType: (type: 'ingreso' | 'gasto') => Category[]
  getCategoryById: (id: number) => Category | undefined
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchCategories: async () => {
    const { loading, lastFetch } = get()
    
    if (loading) return

    // Categorías rara vez cambian, caché de 5 minutos
    if (lastFetch && Date.now() - lastFetch < 300000) return

    set({ loading: true, error: null })

    try {
      const response = await fetch('/api/categories')
      
      if (!response.ok) {
        throw new Error('Error fetching categories')
      }

      const data = await response.json()
      set({ 
        categories: data, 
        loading: false,
        lastFetch: Date.now()
      })
    } catch (error) {
      console.error('[Categories Store] Error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        loading: false 
      })
    }
  },

  setCategories: (categories) => {
    set({ categories, lastFetch: Date.now() })
  },

  getCategoriesByType: (type) => {
    return get().categories.filter(cat => cat.type === type)
  },

  getCategoryById: (id) => {
    return get().categories.find(cat => cat.id === id)
  }
}))
