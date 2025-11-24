"use client"

import { useState, useEffect } from "react"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategorySelector } from "@/components/categories/category-selector"
import type { TransactionType } from "@/lib/types"
import { useAccountsStore } from "@/lib/stores"

interface TransactionFiltersProps {
  onFilterChange: (filters: FilterValues) => void
}

export interface FilterValues {
  type?: TransactionType
  accountId?: number
  categoryId?: number
  startDate?: string
  endDate?: string
}

export function TransactionFilters({ onFilterChange }: TransactionFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const { accounts, fetchAccounts } = useAccountsStore()
  const [filters, setFilters] = useState<FilterValues>({})

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleFilterChange = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
    onFilterChange({})
  }

  const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={filters.type || "all"}
                  onValueChange={(value) => handleFilterChange("type", value === "all" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ingreso">Ingresos</SelectItem>
                    <SelectItem value="gasto">Gastos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Cuenta</Label>
                <Select
                  value={filters.accountId?.toString() || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("accountId", value === "all" ? undefined : Number.parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Categoría</Label>
                <CategorySelector
                  value={filters.categoryId}
                  onValueChange={(value) => handleFilterChange("categoryId", value || undefined)}
                  placeholder="Todas"
                />
              </div>

              <div className="grid gap-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) => handleFilterChange("startDate", e.target.value || undefined)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) => handleFilterChange("endDate", e.target.value || undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
