import { useAccountsStore } from './accounts-store'
import { useTransactionsStore } from './transactions-store'
import { useMetricsStore } from './metrics-store'
import { useFinancialAnalysisStore } from './financial-analysis-store'

/**
 * Hook central para sincronizar todos los stores
 * Se debe llamar después de cualquier operación que afecte los datos
 */
export function useStoreSync() {
  const invalidateAccounts = useAccountsStore(state => state.invalidate)
  const invalidateTransactions = useTransactionsStore(state => state.invalidate)
  const invalidateMetrics = useMetricsStore(state => state.invalidate)
  const invalidateAnalysis = useFinancialAnalysisStore(state => state.invalidate)

  const fetchAccounts = useAccountsStore(state => state.fetchAccounts)
  const fetchTransactions = useTransactionsStore(state => state.fetchTransactions)
  const fetchMetrics = useMetricsStore(state => state.fetchMetrics)

  /**
   * Invalida todos los cachés
   * Úsalo cuando crees/edites/elimines una transacción o cuenta
   */
  const invalidateAll = () => {
    console.log('[Store Sync] 🔄 Invalidando todos los stores')
    invalidateAccounts()
    invalidateTransactions()
    invalidateMetrics()
    invalidateAnalysis()
  }

  /**
   * Refresca todos los datos inmediatamente
   * Útil después de operaciones críticas
   */
  const refreshAll = async () => {
    console.log('[Store Sync] 🔄 Refrescando todos los stores')
    await Promise.all([
      fetchAccounts(),
      fetchTransactions(),
      fetchMetrics()
    ])
  }

  return {
    invalidateAll,
    refreshAll
  }
}
