"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CategoryIcon } from "./category-icon"
import { cn } from "@/lib/utils"
import type { Category, TransactionType } from "@/lib/types"

interface CategorySelectorProps {
  value?: number
  onValueChange: (value: number) => void
  type?: TransactionType
  placeholder?: string
}

export function CategorySelector({
  value,
  onValueChange,
  type,
  placeholder = "Seleccionar categoría...",
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const url = type ? `/api/categories?type=${type}` : "/api/categories"
        const response = await fetch(url)
        
        if (!response.ok) {
          console.error("[v0] Error fetching categories: HTTP", response.status)
          setCategories([])
          return
        }
        
        const data = await response.json()
        
        // Validar que data sea un array
        if (!Array.isArray(data)) {
          console.error("[v0] Categories response is not an array:", data)
          setCategories([])
          return
        }
        
        setCategories(data)
      } catch (error) {
        console.error("[v0] Error fetching categories:", error)
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [type])

  const selectedCategory = Array.isArray(categories) ? categories.find((cat) => cat.id === value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent"
        >
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded"
                style={{ backgroundColor: `${selectedCategory.color}20` }}
              >
                <CategoryIcon iconName={selectedCategory.icon} size={14} className="text-foreground" />
              </div>
              <span>{selectedCategory.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar categoría..." />
          <CommandList 
            onWheel={(e: React.WheelEvent) => {
              e.stopPropagation()
              const target = e.currentTarget
              target.scrollBy({
                top: e.deltaY,
                behavior: 'smooth'
              })
            }}
          >
            <CommandEmpty>No se encontraron categorías.</CommandEmpty>
            <CommandGroup>
                {loading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Cargando...</div>
                ) : (
                  categories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => {
                        onValueChange(category.id)
                        setOpen(false)
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <CategoryIcon iconName={category.icon} size={16} />
                        </div>
                        <span>{category.name}</span>
                      </div>
                      <Check className={cn("ml-auto h-4 w-4", value === category.id ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
