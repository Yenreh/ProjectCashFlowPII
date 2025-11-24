import { create } from 'zustand'
import type { DashboardMetrics } from '@/lib/types'

interface MetricsState {
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastFetch: number | null
  
  // Actions
  fetchMetrics: () => Promise<void>
  setMetrics: (metrics: DashboardMetrics) => void
  invalidate: () => void
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  metrics: null,
  loading: false,
  error: null,
  lastFetch: null,

  fetchMetrics: async () => {
    const { loading, lastFetch } = get()
    
    if (loading) return

    // Caché de 5 segundos
    if (lastFetch && Date.now() - lastFetch < 5000) return

    set({ loading: true, error: null })

    try {
      const response = await fetch('/api/dashboard/metrics')
      
      if (!response.ok) {
        throw new Error('Error fetching metrics')
      }

      const data = await response.json()
      
      // Validar que data tenga la estructura correcta
      if (data && typeof data === 'object' && 'totalIncome' in data) {
        set({ 
          metrics: data, 
          loading: false,
          lastFetch: Date.now()
        })
      } else {
        console.error('[Metrics Store] Invalid data format:', data)
        // Establecer métricas en 0 por defecto
        set({
          metrics: {
            totalIncome: 0,
            totalExpenses: 0,
            balance: 0,
            accountsCount: 0,
            transactionsCount: 0
          },
          loading: false,
          lastFetch: Date.now()
        })
      }
    } catch (error) {
      console.error('[Metrics Store] Error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        loading: false,
        // Establecer métricas en 0 en caso de error
        metrics: {
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
          accountsCount: 0,
          transactionsCount: 0
        }
      })
    }
  },

  setMetrics: (metrics) => {
    set({ metrics, lastFetch: Date.now() })
  },

  invalidate: () => {
    set({ lastFetch: null })
  }
}))
