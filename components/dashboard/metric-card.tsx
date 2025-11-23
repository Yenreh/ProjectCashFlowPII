import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: {
    value: string
    isPositive: boolean
  }
  className?: string
}

export function MetricCard({ title, value, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn("transition-all hover:shadow-md overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold truncate">{value}</p>
            {trend && (
              <p className={cn("text-xs sm:text-sm mt-2", trend.isPositive ? "text-success" : "text-destructive")}>
                {trend.isPositive ? "+" : ""}
                {trend.value}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
