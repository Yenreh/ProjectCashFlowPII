"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CategoryIcon } from "@/components/categories/category-icon"
import { formatCurrency } from "@/lib/format"
import type { CategoryExpense } from "@/lib/types"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from "recharts"

export function IncomeChart() {
  const [incomes, setIncomes] = useState<CategoryExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchIncomes() {
      try {
        const response = await fetch("/api/reports/incomes-by-category")
        const data = await response.json()
        
        // Validar que data sea un array
        if (Array.isArray(data)) {
          setIncomes(data)
        } else {
          console.error("[IncomeChart] Invalid data format:", data)
          setIncomes([])
        }
      } catch (error) {
        console.error("[IncomeChart] Error fetching incomes:", error)
        setIncomes([])
      } finally {
        setLoading(false)
      }
    }

    fetchIncomes()
  }, [])

  const chartData = incomes.map((income, index) => {
    // Paleta de colores fríos para ingresos (azules, verdes, morados)
    const coolColors = [
      'hsl(145, 60%, 45%)',  // Verde
      'hsl(200, 70%, 50%)',  // Azul
      'hsl(160, 65%, 45%)',  // Verde azulado
      'hsl(220, 70%, 55%)',  // Azul intenso
      'hsl(280, 60%, 50%)',  // Morado
      'hsl(180, 60%, 45%)',  // Cian
      'hsl(260, 65%, 55%)',  // Morado claro
      'hsl(170, 60%, 50%)',  // Turquesa
    ]
    return {
      name: income.category_name,
      value: income.total,
      color: coolColors[index % coolColors.length],
      icon: income.category_icon,
    }
  })

  const totalIncomes = incomes.reduce((sum, income) => sum + income.total, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos por Categoría</CardTitle>
        <CardDescription>Distribución de tus ingresos</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando...</div>
        ) : incomes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No hay ingresos para mostrar</div>
        ) : (
          <>
            <div className="h-[350px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                    label={(props: PieLabelRenderProps) => {
                      const percent = Number(props.percent ?? 0)
                      return `${(percent * 100).toFixed(0)}%`
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="max-h-[230px] overflow-y-auto space-y-3 pr-2">
              {incomes.map((income, index) => {
                const coolColors = [
                  'hsl(145, 60%, 45%)',
                  'hsl(200, 70%, 50%)',
                  'hsl(160, 65%, 45%)',
                  'hsl(220, 70%, 55%)',
                  'hsl(280, 60%, 50%)',
                  'hsl(180, 60%, 45%)',
                  'hsl(260, 65%, 55%)',
                  'hsl(170, 60%, 50%)',
                ]
                const color = coolColors[index % coolColors.length]
                return (
                  <div key={income.category_name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <CategoryIcon iconName={income.category_icon} size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{income.category_name}</p>
                        <p className="text-xs text-muted-foreground">{income.percentage.toFixed(1)}% del total</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(income.total)}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 font-semibold mt-3">
              <span>Total</span>
              <span>{formatCurrency(totalIncomes)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
