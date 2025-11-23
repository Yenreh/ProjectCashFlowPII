export function formatCurrency(amount: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  let d: Date
  if (typeof date === "string") {
    // Parsear la fecha correctamente para evitar problemas de zona horaria
    // La fecha viene como "YYYY-MM-DD" de la DB
    const [year, month, day] = date.split('-').map(Number)
    d = new Date(year, month - 1, day) // month es 0-indexed
  } else {
    d = date
  }
  
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d)
}

export function formatDateShort(date: string | Date): string {
  let d: Date
  if (typeof date === "string") {
    // Parsear la fecha correctamente para evitar problemas de zona horaria
    const [year, month, day] = date.split('-').map(Number)
    d = new Date(year, month - 1, day) // month es 0-indexed
  } else {
    d = date
  }
  
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

export function formatDateInput(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toISOString().split("T")[0]
}
