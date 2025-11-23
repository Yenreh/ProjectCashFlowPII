import type { SavingsAnalysis } from './savings-analyzer'

interface CacheEntry {
  analysis: SavingsAnalysis
  lastTransactionId: number
  timestamp: number
}

class HealthCache {
  private cache: CacheEntry | null = null
  private readonly MAX_AGE = 1000 * 60 * 60 // 1 hora

  /**
   * Obtiene el análisis en caché si es válido
   */
  get(currentTransactionId: number): SavingsAnalysis | null {
    if (!this.cache) {
      return null
    }

    // Si hay una nueva transacción, invalidar caché
    if (this.cache.lastTransactionId !== currentTransactionId) {
      console.log('[Health Cache] Nueva transacción detectada, invalidando caché')
      this.cache = null
      return null
    }

    // Si el caché es muy viejo, invalidar
    const age = Date.now() - this.cache.timestamp
    if (age > this.MAX_AGE) {
      console.log('[Health Cache] Caché expirado, invalidando')
      this.cache = null
      return null
    }

    console.log('[Health Cache] ✅ Usando caché (edad: ' + Math.round(age / 1000) + 's)')
    return this.cache.analysis
  }

  /**
   * Guarda un análisis en caché
   */
  set(analysis: SavingsAnalysis, transactionId: number): void {
    this.cache = {
      analysis,
      lastTransactionId: transactionId,
      timestamp: Date.now()
    }
    console.log('[Health Cache] 💾 Análisis guardado en caché')
  }

  /**
   * Invalida el caché manualmente
   */
  invalidate(): void {
    this.cache = null
    console.log('[Health Cache] 🗑️ Caché invalidado manualmente')
  }
}

// Instancia global del caché
export const healthCache = new HealthCache()
