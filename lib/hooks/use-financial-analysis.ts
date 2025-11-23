"use client"

import { useState, useEffect, useCallback } from "react"
import type { SavingsAnalysis } from "@/lib/savings-analyzer"

/**
 * Hook para acceder al análisis financiero AI
 * Se actualiza automáticamente cada 30 segundos
 * Proporciona función para forzar actualización
 */
export function useFinancialAnalysis() {
  const [analysis, setAnalysis] = useState<SavingsAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/dashboard/ai-analysis")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.analysis) {
        setAnalysis(data.analysis)
      } else {
        throw new Error(data.error || "No se pudo obtener el análisis")
      }
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalysis()
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchAnalysis, 30000)
    
    return () => clearInterval(interval)
  }, [fetchAnalysis])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchAnalysis()
  }, [fetchAnalysis])

  return {
    analysis,
    loading,
    error,
    refresh
  }
}
