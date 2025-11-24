"use client"

import { useState } from "react"
import { AlertCircle, Lightbulb, CheckCircle, Info, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { useFinancialAnalysisStore } from "@/lib/stores/financial-analysis-store"
import type { SavingsInsight } from "@/lib/savings-analyzer"
import { cn } from "@/lib/utils"

export function HealthScoreBadge() {
  const { analysis, loading, fetchAnalysis, invalidate } = useFinancialAnalysisStore()
  const [refreshing, setRefreshing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Cuando se abre el modal, invalidar caché y hacer nueva petición
  const handleOpenModal = async () => {
    setIsModalOpen(true)
    setRefreshing(true)
    invalidate() // Forzar nueva petición
    await fetchAnalysis(true) // Force refresh
    setRefreshing(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalysis(true) // Force refresh
    setRefreshing(false)
  }

  const getInsightIcon = (type: SavingsInsight["type"]) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5" />
      case "opportunity":
        return <Lightbulb className="h-5 w-5" />
      case "success":
        return <CheckCircle className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getInsightColor = (type: SavingsInsight["type"]) => {
    switch (type) {
      case "warning":
        return "border-destructive/50 bg-destructive/5 text-destructive"
      case "opportunity":
        return "border-yellow-500/50 bg-yellow-500/5 text-yellow-700 dark:text-yellow-500"
      case "success":
        return "border-success/50 bg-success/5 text-success"
      default:
        return "border-blue-500/50 bg-blue-500/5 text-blue-700 dark:text-blue-500"
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-600"
    if (score >= 60) return "from-yellow-500 to-orange-500"
    return "from-red-500 to-rose-600"
  }

  const getHealthScoreTextColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-500"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-500"
    return "text-red-600 dark:text-red-500"
  }

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Excelente"
    if (score >= 60) return "Buena"
    if (score >= 40) return "Regular"
    return "Necesita atención"
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "aumentando":
        return <TrendingUp className="h-4 w-4" />
      case "disminuyendo":
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "aumentando":
        return "text-red-600 dark:text-red-500"
      case "disminuyendo":
        return "text-green-600 dark:text-green-500"
      default:
        return "text-muted-foreground"
    }
  }

  // Siempre mostrar el badge, incluso mientras carga
  const displayScore = analysis?.healthScore ?? 0
  const hasData = analysis && analysis.insights && analysis.insights.length > 0

  return (
    <>
      <div 
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleOpenModal}
      >
        <div className={cn(
          "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 relative",
          "bg-gradient-to-br shadow-md transition-all",
          loading ? "from-gray-400 to-gray-500" : getHealthScoreColor(displayScore),
          refreshing && "animate-pulse"
        )}>
          <span className="text-sm sm:text-base font-bold text-white">
            {loading ? "..." : displayScore}
          </span>
          {refreshing && (
            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-spin" 
                 style={{ borderTopColor: 'white' }} />
          )}
        </div>
        <span className={cn(
          "text-xs sm:text-sm font-medium hidden md:inline",
          loading ? "text-muted-foreground" : getHealthScoreTextColor(displayScore)
        )}>
          {loading ? "Cargando..." : getHealthLabel(displayScore)}
        </span>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <DialogTitle className="text-xl font-semibold">
              Análisis Financiero Inteligente
            </DialogTitle>
          </div>
          {/* <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button> */}
        </div>
          </DialogHeader>

          <div className="space-y-5">
            {/* Health Score Card */}
            {hasData && (
              <>
                <div className="flex items-center gap-6 p-5 rounded-lg bg-muted/30">
                  <div className={cn(
                    "h-20 w-20 rounded-full flex items-center justify-center flex-shrink-0",
                    "bg-gradient-to-br shadow-md",
                    getHealthScoreColor(analysis!.healthScore)
                  )}>
                    <span className="text-3xl font-bold text-white">{analysis!.healthScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Salud Financiera</p>
                    <p className={cn("text-2xl font-semibold mb-2", getHealthScoreTextColor(analysis!.healthScore))}>
                      {getHealthLabel(analysis!.healthScore)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all bg-gradient-to-r", getHealthScoreColor(analysis!.healthScore))}
                          style={{ width: `${analysis!.healthScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{analysis!.healthScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Ahorro Potencial Card */}
                {analysis!.totalPotentialSavings > 0 && (
                  <div className="rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ahorro potencial identificado:</span>
                      </div>
                      <span className="text-xl font-bold text-green-600 dark:text-green-500">
                        {formatCurrency(analysis!.totalPotentialSavings)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Insights Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Sugerencias ({analysis!.insights.length})
                    </h4>
                  </div>
                  
                  <div className="space-y-2.5">
                    {analysis!.insights.map((insight, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "rounded-lg border p-4",
                      getInsightColor(insight.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          {insight.impact > 0 && (
                            <span className="text-xs font-semibold whitespace-nowrap">
                              {formatCurrency(insight.impact)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm opacity-90 leading-relaxed">{insight.message}</p>
                        {insight.suggestion && (
                          <div className="mt-2.5 pt-2.5 border-t border-current/20">
                            <p className="text-xs font-medium opacity-70 mb-1">💡 Recomendación:</p>
                            <p className="text-sm opacity-90">{insight.suggestion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                </div>

                {/* Trends Section */}
                {analysis!.trends && analysis!.trends.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Tendencias de gastos
                      </h4>
                    </div>
                    
                    <div className="grid gap-2">
                      {analysis!.trends.map((trend, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn("flex items-center gap-1.5", getTrendColor(trend.trend))}>
                          {getTrendIcon(trend.trend)}
                          <span className="text-sm font-medium">{trend.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total gastado</p>
                          <p className="text-sm font-semibold">{formatCurrency(trend.amount)}</p>
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium",
                          trend.trend === "aumentando" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                          trend.trend === "disminuyendo" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                          trend.trend === "estable" && "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                        )}>
                          {trend.trend}
                        </div>
                      </div>
                    </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Section - Oculto porque las sugerencias principales ya tienen toda la info */}
                {false && (analysis?.recommendations?.length ?? 0) > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Recomendaciones personalizadas
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      {analysis?.recommendations?.map((rec, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors"
                    >
                      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{rec.action}</p>
                        {rec.expectedSavings > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ahorro estimado: <span className="font-semibold text-green-600 dark:text-green-500">
                              {formatCurrency(rec.expectedSavings)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

                {/* Motivational Message */}
                {analysis!.motivationalMessage && (
                  <div className="rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-4">
                    <p className="text-sm text-center italic">{analysis!.motivationalMessage}</p>
                  </div>
                )}
              </>
            )}

            {/* Loading state */}
            {!hasData && loading && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p>Generando análisis financiero...</p>
              </div>
            )}

            {/* No data state */}
            {!hasData && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No hay suficientes datos para generar el análisis.</p>
                <p className="text-sm mt-2">Agrega algunas transacciones para comenzar.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
