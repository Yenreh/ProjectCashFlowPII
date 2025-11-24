import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SavingsAnalysis } from '@/lib/savings-analyzer'

interface FinancialAnalysisState {
  analysis: SavingsAnalysis | null
  loading: boolean
  error: string | null
  lastFetch: number | null
  
  // Actions
  fetchAnalysis: (force?: boolean) => Promise<void>
  setAnalysis: (analysis: SavingsAnalysis) => void
  invalidate: () => void
  clearCache: () => void
}

export const useFinancialAnalysisStore = create<FinancialAnalysisState>()(
  persist(
    (set, get) => ({
      analysis: null,
      loading: false,
      error: null,
      lastFetch: null,

      fetchAnalysis: async (force = false) => {
        const { loading, lastFetch, analysis } = get()
        
        // Evitar múltiples llamadas simultáneas
        if (loading) return

        // Si no es forzado y ya tenemos un análisis válido, no hacer nada
        // El caché SOLO se invalida manualmente (transacción o apertura de modal)
        if (!force && analysis && lastFetch) return

        set({ loading: true, error: null })

        try {
          const response = await fetch('/api/dashboard/ai-analysis')
          
          const data = await response.json()
          
          // Si es un error (400 = no hay datos), limpiar el análisis
          if (!response.ok) {
            set({ 
              analysis: null,
              loading: false,
              error: data.error || 'No se pudo obtener el análisis',
              lastFetch: null
            })
            return
          }
          
          // Aceptar el análisis incluso si viene como fallback estático
          if (data.analysis) {
            set({ 
              analysis: data.analysis,
              loading: false,
              error: null,
              lastFetch: Date.now()
            })
          } else {
            throw new Error(data.error || 'No se pudo obtener el análisis')
          }
        } catch (error) {
          console.error('[Financial Analysis Store] Error:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Error desconocido',
            loading: false 
          })
        }
      },

      setAnalysis: (analysis) => {
        set({ analysis, lastFetch: Date.now() })
      },

      invalidate: () => {
        set({ lastFetch: null, analysis: null })
      },

      clearCache: () => {
        set({ analysis: null, lastFetch: null, error: null })
      }
    }),
    {
      name: 'financial-analysis-storage',
      // Solo persistir el análisis y la fecha, no el estado de loading/error
      partialize: (state) => ({ 
        analysis: state.analysis,
        lastFetch: state.lastFetch
      })
    }
  )
)
