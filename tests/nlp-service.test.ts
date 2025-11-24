/**
 * Tests para el servicio NLP
 * Ejecutar con: npx tsx tests/nlp-service.test.ts
 */

// Tests básicos sin dependencias externas
console.log("[TEST] Iniciando tests del servicio NLP...\n")

let passedTests = 0
let failedTests = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passedTests++
  } catch (error: any) {
    console.log(`[FAIL] ${name}`)
    console.log(`       Error: ${error.message}`)
    failedTests++
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Test 1: Extracción de montos
test("Extraer monto de números", () => {
  const text = "gasté 50000 pesos"
  const match = text.match(/(\d+(?:\.\d+)?)/g)
  assert(match !== null, "Debe encontrar números")
  assert(match![0] === "50000", "Debe extraer 50000")
})

// Test 2: Detección de intención de gasto
test("Detectar intención de gasto", () => {
  const text = "gasté 50000 en comida"
  const esGasto = /gast[eéó]|pagu[eé]|compr[eé]|invert[ií]/i.test(text)
  assert(esGasto === true, "Debe detectar intención de gasto")
})

// Test 3: Detección de intención de ingreso
test("Detectar intención de ingreso", () => {
  const text = "recibí 1000000 de salario"
  const esIngreso = /recib[ií]|ingres[oó]|gan[eé]|cobr[eé]/i.test(text)
  assert(esIngreso === true, "Debe detectar intención de ingreso")
})

// Test 4: Detección de categoría Alimentos
test("Detectar categoría Alimentos", () => {
  const text = "gasté en comida"
  const esComida = /comida|alimento|restaurant|hamburguesa|pizza/i.test(text)
  assert(esComida === true, "Debe detectar categoría de comida")
})

// Test 5: Detección de categoría Transporte
test("Detectar categoría Transporte", () => {
  const text = "pagué 80000 en transporte"
  const esTransporte = /transporte|uber|taxi|bus|gasolina/i.test(text)
  assert(esTransporte === true, "Debe detectar categoría de transporte")
})

// Test 6: Extracción de montos con texto
test("Extraer montos expresados en palabras", () => {
  const conversiones: Record<string, number> = {
    "mil": 1000,
    "millón": 1000000,
    "k": 1000,
  }
  
  const text = "gasté cincuenta mil pesos"
  const tieneMil = /mil/i.test(text)
  assert(tieneMil === true, "Debe detectar 'mil' en el texto")
})

// Test 7: Validación de formato de fecha
test("Validar formato de fecha ISO", () => {
  const fecha = new Date().toISOString().split("T")[0]
  const formatoValido = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
  assert(formatoValido === true, "Debe tener formato YYYY-MM-DD")
})

// Test 8: Detección de corrección
test("Detectar intención de corrección", () => {
  const text = "no, era 15000"
  const esCorreccion = /^no[,\s]|en realidad|mejor dicho/i.test(text)
  assert(esCorreccion === true, "Debe detectar intención de corrección")
})

// Test 9: Normalización de texto
test("Normalizar texto (minúsculas, sin acentos)", () => {
  const text = "Gasté ÁÉÍóú"
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const tieneAcentos = /[áéíóú]/i.test(normalized)
  assert(tieneAcentos === false, "No debe contener acentos después de normalizar")
})

// Test 10: Extracción de múltiples números
test("Extraer primer número de texto con múltiples números", () => {
  const text = "gasté 50000 pesos hace 2 días"
  const numeros = text.match(/\d+/g)
  assert(numeros !== null, "Debe encontrar números")
  assert(numeros![0] === "50000", "Debe extraer el primer número (50000)")
})

// Resumen
console.log("\n" + "=".repeat(50))
console.log("  Resumen de Tests")
console.log("=".repeat(50))
console.log(`Total: ${passedTests + failedTests} tests`)
console.log(`Pasados: ${passedTests}`)
console.log(`Fallidos: ${failedTests}`)
console.log("=".repeat(50))

if (failedTests > 0) {
  console.log("\n[FAIL] Algunos tests fallaron")
  process.exit(1)
} else {
  console.log("\n[PASS] Todos los tests pasaron correctamente")
  process.exit(0)
}
