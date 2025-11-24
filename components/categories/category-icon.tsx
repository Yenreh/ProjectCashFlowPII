// Imports optimizados: solo los iconos que realmente se usan
import {
  Briefcase,
  Laptop,
  TrendingUp,
  ShoppingBag,
  Plus,
  UtensilsCrossed,
  Car,
  Home,
  Zap,
  Film,
  Heart,
  GraduationCap,
  ShoppingCart,
  MoreHorizontal,
  Circle,
  type LucideIcon
} from "lucide-react"

// Mapa de iconos para acceso rápido
const iconMap: Record<string, LucideIcon> = {
  Briefcase,
  Laptop,
  TrendingUp,
  ShoppingBag,
  Plus,
  UtensilsCrossed,
  Car,
  Home,
  Zap,
  Film,
  Heart,
  GraduationCap,
  ShoppingCart,
  MoreHorizontal,
  Circle,
}

interface CategoryIconProps {
  iconName: string
  className?: string
  size?: number
}

export function CategoryIcon({ iconName, className, size = 20 }: CategoryIconProps) {
  const Icon = iconMap[iconName] || Circle

  return <Icon className={className} size={size} />
}
