"use client"

import { useState, useEffect } from "react"
import { TrendingUp, AlertCircle, Lightbulb, CheckCircle, Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/format"
import type { SavingsAnalysis, SavingsInsight } from "@/lib/savings-analyzer"
import { cn } from "@/lib/utils"

export function SavingsInsightsPanel() {
  const [analysis, setAnalysis] = useState<SavingsAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const response = await fetch("/api/savings/analyze")
        const data = await response.json()
        if (data.success && data.analysis) {
          setAnalysis(data.analysis)
        }
      } catch (error) {
        console.error("[v0] Error fetching savings analysis:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [])

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

  if (loading) {
    return (
      <Card className="p-4 overflow-hidden">
        <div className="text-center py-4 text-muted-foreground text-sm">Analizando tus finanzas...</div>
      </Card>
    )
  }

  if (!analysis || analysis.insights.length === 0) {
    return (
      <Card className="p-4 overflow-hidden">
        <div className="text-center py-4 text-muted-foreground text-sm">
          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
          <p>¡Todo bien! No hay sugerencias en este momento.</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card 
        className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-base sm:text-lg">Salud Financiera</h3>
          
          <div className={cn(
            "h-12 w-12 sm:h-16 sm:w-16 rounded-full flex items-center justify-center flex-shrink-0",
            "bg-gradient-to-br shadow-md",
            getHealthScoreColor(analysis.healthScore)
          )}>
            <span className="text-xl sm:text-2xl font-bold text-white">{analysis.healthScore}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className={cn("text-sm sm:text-base font-medium mb-1 truncate", getHealthScoreTextColor(analysis.healthScore))}>
              {getHealthLabel(analysis.healthScore)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {analysis.insights.length} sugerencia{analysis.insights.length !== 1 ? "s" : ""} disponible{analysis.insights.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Button variant="outline" size="sm" className="flex-shrink-0 hidden sm:flex">
            Ver detalles
          </Button>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span>Análisis de Ahorro</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* Health Score Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 p-6 border border-border/50 shadow-sm">
              <div className="flex items-center justify-center gap-6">
                <div className="relative">
                  <div className={cn(
                    "h-24 w-24 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br shadow-lg ring-4 ring-background",
                    getHealthScoreColor(analysis.healthScore)
                  )}>
                    <span className="text-4xl font-bold text-white">{analysis.healthScore}</span>
                  </div>
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br opacity-20 blur-xl"
                       style={{
                         background: analysis.healthScore >= 80 ? 'linear-gradient(to bottom right, rgb(34 197 94), rgb(5 150 105))' :
                                    analysis.healthScore >= 60 ? 'linear-gradient(to bottom right, rgb(234 179 8), rgb(249 115 22))' :
                                    'linear-gradient(to bottom right, rgb(239 68 68), rgb(225 29 72))'
                       }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                    Salud Financiera
                  </p>
                  <p className={cn("text-2xl sm:text-3xl font-bold mb-1", getHealthScoreTextColor(analysis.healthScore))}>
                    {getHealthLabel(analysis.healthScore)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all bg-gradient-to-r", getHealthScoreColor(analysis.healthScore))}
                        style={{ width: `${analysis.healthScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{analysis.healthScore}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="rounded-xl bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 p-5 border border-blue-200/50 dark:border-blue-800/30">
              <p className="text-sm leading-relaxed text-foreground/80 mb-3 whitespace-pre-line">{analysis.summary}</p>
              {analysis.totalPotentialSavings > 0 && (
                <div className="flex items-center gap-2 pt-3 border-t border-blue-200/50 dark:border-blue-800/30">
                  <span className="text-sm font-medium text-muted-foreground">Ahorro potencial total:</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-500">
                    {formatCurrency(analysis.totalPotentialSavings)}
                  </span>
                </div>
              )}
            </div>

            {/* Insights Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-base">Sugerencias Personalizadas</h4>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {analysis.insights.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {analysis.insights.map((insight, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "rounded-xl border p-4 transition-all hover:shadow-md",
                      getInsightColor(insight.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 h-9 w-9 rounded-lg bg-background/40 backdrop-blur-sm flex items-center justify-center">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-sm sm:text-base leading-snug">{insight.title}</h4>
                          {insight.impact > 0 && (
                            <span className="text-xs font-bold whitespace-nowrap bg-background/40 backdrop-blur-sm px-2 py-1 rounded-md">
                              {formatCurrency(insight.impact)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm opacity-90 leading-relaxed">{insight.message}</p>
                        {insight.suggestion && (
                          <div className="mt-3 pt-3 border-t border-current/20">
                            <div className="flex items-start gap-2">
                              <span className="text-base flex-shrink-0">💡</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">Sugerencia</p>
                                <p className="text-sm opacity-90 leading-relaxed">{insight.suggestion}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
