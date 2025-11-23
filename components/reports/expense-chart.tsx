"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CategoryIcon } from "@/components/categories/category-icon"
import { formatCurrency } from "@/lib/format"
import type { CategoryExpense } from "@/lib/types"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from "recharts"

export function ExpenseChart() {
  const [expenses, setExpenses] = useState<CategoryExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchExpenses() {
      try {
        const response = await fetch("/api/reports/expenses-by-category")
        const data = await response.json()
        setExpenses(data)
      } catch (error) {
        console.error("[v0] Error fetching expenses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [])

  const chartData = expenses.map((expense, index) => {
    // Paleta de colores cálidos para gastos (naranjas, rojos, amarillos)
    const warmColors = [
      'hsl(25, 70%, 50%)',   // Naranja
      'hsl(15, 80%, 55%)',   // Rojo-naranja
      'hsl(35, 75%, 55%)',   // Naranja claro
      'hsl(5, 70%, 50%)',    // Rojo
      'hsl(45, 85%, 55%)',   // Amarillo-naranja
      'hsl(20, 75%, 45%)',   // Naranja oscuro
      'hsl(10, 65%, 50%)',   // Rojo ladrillo
      'hsl(30, 70%, 60%)',   // Durazno
    ]
    return {
      name: expense.category_name,
      value: expense.total,
      color: warmColors[index % warmColors.length],
      icon: expense.category_icon,
    }
  })

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.total, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoría</CardTitle>
        <CardDescription>Distribución de tus gastos</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No hay gastos para mostrar</div>
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
              {expenses.map((expense, index) => {
                const warmColors = [
                  'hsl(25, 70%, 50%)',
                  'hsl(15, 80%, 55%)',
                  'hsl(35, 75%, 55%)',
                  'hsl(5, 70%, 50%)',
                  'hsl(45, 85%, 55%)',
                  'hsl(20, 75%, 45%)',
                  'hsl(10, 65%, 50%)',
                  'hsl(30, 70%, 60%)',
                ]
                const color = warmColors[index % warmColors.length]
                return (
                  <div key={expense.category_name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <CategoryIcon iconName={expense.category_icon} size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{expense.category_name}</p>
                        <p className="text-xs text-muted-foreground">{expense.percentage.toFixed(1)}% del total</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(expense.total)}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 font-semibold mt-3">
              <span>Total</span>
              <span>{formatCurrency(totalExpenses)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
