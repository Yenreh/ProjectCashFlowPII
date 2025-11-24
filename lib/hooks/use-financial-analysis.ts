"use client"

import { useState, useEffect, useCallback } from "react"
import type { SavingsAnalysis } from "@/lib/savings-analyzer"

const CACHE_KEY = "financial_analysis_cache"
const CACHE_TRANSACTION_KEY = "financial_analysis_last_transaction_id"
const CACHE_DURATION = 1000 * 60 * 60 // 1 hora

interface CachedAnalysis {
  analysis: SavingsAnalysis
  timestamp: number
  lastTransactionId: number
}

/**
 * Hook para acceder al análisis financiero AI
 * Usa caché en localStorage para evitar llamadas innecesarias al API
 * El caché se invalida cuando hay nuevas transacciones o después de 1 hora
 */
export function useFinancialAnalysis() {
  const [analysis, setAnalysis] = useState<SavingsAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCached, setIsCached] = useState(false)

  // Obtener último ID de transacción desde el API
  const getLastTransactionId = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch("/api/transactions")
      if (!response.ok) return 0
      
      const transactions = await response.json()
      if (!Array.isArray(transactions) || transactions.length === 0) return 0
      
      return Math.max(...transactions.map((t: any) => t.id))
    } catch {
      return 0
    }
  }, [])

  // Verificar si el caché es válido
  const getCachedAnalysis = useCallback(async (): Promise<SavingsAnalysis | null> => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null

      const data: CachedAnalysis = JSON.parse(cached)
      
      // Verificar edad del caché
      const age = Date.now() - data.timestamp
      if (age > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }

      // Verificar si hay nuevas transacciones
      const currentTransactionId = await getLastTransactionId()
      if (currentTransactionId !== data.lastTransactionId) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }

      return data.analysis
    } catch (err) {
      console.error("[Financial Analysis] Error leyendo caché:", err)
      return null
    }
  }, [getLastTransactionId])

  // Guardar análisis en caché
  const saveToCache = useCallback(async (analysis: SavingsAnalysis) => {
    try {
      const lastTransactionId = await getLastTransactionId()
      const cached: CachedAnalysis = {
        analysis,
        timestamp: Date.now(),
        lastTransactionId
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
    } catch (err) {
      console.error("[Financial Analysis] Error guardando caché:", err)
    }
  }, [getLastTransactionId])

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    try {
      setError(null)
      
      // Intentar obtener desde caché primero
      if (!forceRefresh) {
        const cachedAnalysis = await getCachedAnalysis()
        if (cachedAnalysis) {
          setAnalysis(cachedAnalysis)
          setIsCached(true)
          setLoading(false)
          return
        }
      }

      setIsCached(false)
      
      const response = await fetch("/api/dashboard/ai-analysis")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.analysis) {
        setAnalysis(data.analysis)
        // Guardar en caché local
        await saveToCache(data.analysis)
      } else {
        throw new Error(data.error || "No se pudo obtener el análisis")
      }
    } catch (err) {
      console.error("[Financial Analysis] Error:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [getCachedAnalysis, saveToCache])

  useEffect(() => {
    fetchAnalysis()
    
    // Escuchar eventos de invalidación global
    const handleInvalidation = () => {
      fetchAnalysis(true)
    }
    
    window.addEventListener("financial-analysis-invalidate", handleInvalidation)
    
    return () => {
      window.removeEventListener("financial-analysis-invalidate", handleInvalidation)
    }
  }, [fetchAnalysis])

  const refresh = useCallback(async () => {
    setLoading(true)
    // Invalidar caché y forzar nueva consulta
    localStorage.removeItem(CACHE_KEY)
    await fetchAnalysis(true)
  }, [fetchAnalysis])

  // Función para invalidar caché manualmente (ej: después de crear transacción)
  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY)
  }, [])

  return {
    analysis,
    loading,
    error,
    refresh,
    invalidateCache,
    isCached
  }
}
