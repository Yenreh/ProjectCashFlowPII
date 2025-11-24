# Guía de Pruebas - CashFlow

## Tests Disponibles

### Suite Completa
```bash
npm test
```

Ejecuta 7 suites de tests automáticamente (86+ tests unitarios):
- Conexión a base de datos
- Servicio NLP (comandos de voz)
- Balance Utils (cálculos financieros)
- Format Utils (formateo moneda/fechas)
- OCR Utils (parsing de recibos)
- Savings Analyzer (análisis de ahorro)
- Chat Utils (utilidades de contexto)

### Test Individual de Base de Datos
```bash
npm run test:db
```

Verifica conectividad a PostgreSQL (Neon) y tablas existentes.

## Estructura de Tests

```
tests/
├── run-all.ts                    # Orquestador principal
├── test-connection.ts            # Conexión BD (READ-ONLY)
├── nlp-service.test.ts           # Comandos de voz (17 tests)
├── balance-utils.test.ts         # Cálculos balance (18 tests)
├── format.test.ts                # Formateo (8 tests)
├── ocr-utils.test.ts             # Parsing recibos (15 tests)
├── savings-analyzer.test.ts      # Análisis ahorro (13 tests)
└── chat-utils.test.ts            # Context financiero (15 tests)
```

## Cobertura por Componente

### 1. Conexión a Base de Datos (test-connection.ts)
**Qué verifica**:
- Conectividad a PostgreSQL
- Variables de entorno correctas
- Existencia de tablas (usuarios, categories, accounts, transactions)
- Conteo de registros

**IMPORTANTE**: Solo ejecuta SELECT (consultas de lectura), no modifica datos.

### 2. Servicio NLP (nlp-service.test.ts)
**Cobertura**: 17 tests
- Detección de intenciones (gasto/ingreso)
- Extracción de montos (números y texto: "mil", "50k", "ochenta mil")
- Detección de categorías (comida, transporte, salud, etc.)
- Validación de comandos
- Detección de correcciones
- Normalización de texto

**Casos de prueba**:
```javascript
Input: "gasté 50000 en comida"
Output: { type: "gasto", amount: 50000, category: "Alimentos" }

Input: "pagué ochenta mil en transporte"
Output: { type: "gasto", amount: 80000, category: "Transporte" }

Input: "no, era 15000"
Output: detección de corrección = true
```

### 3. Balance Utils (balance-utils.test.ts)
**Cobertura**: 18 tests
- Conversión segura a números (safeNumber)
- Validación de números (validateNumber)
- Cálculo de balance con transacciones
- Reversión de efectos de transacciones
- Validación de balances
- Formateo para logging

**Casos críticos**:
- Manejo de valores NaN/undefined/null
- Prevención de balances negativos inadvertidos
- Validación de tipos de transacción

### 4. Format Utils (format.test.ts)
**Cobertura**: 8 tests
- Formateo de moneda colombiana (COP)
- Formateo de fechas en español
- Formateo corto de fechas
- Conversión a formato ISO para inputs

**Ejemplos**:
```typescript
formatCurrency(50000) // "$50.000 COP"
formatDate("2024-01-15") // "15 de enero de 2024"
formatDateShort("2024-01-15") // "15/01/2024"
```

### 5. OCR Utils (ocr-utils.test.ts)
**Cobertura**: 15 tests
- Parsing de montos colombianos (65.600 → 65600)
- Manejo de símbolos de moneda ($)
- Validación de fechas ISO
- Validación de datos de recibos
- Cálculo de confidence score
- Detección de montos irreales

**Lógica de parsing**:
```typescript
parseAmountFromText("$65.600") // 65600
parseAmountFromText("1.500")   // 1500
isValidDate("2024-01-15")      // true
isValidDate("2024-13-01")      // false (mes inválido)
```

### 6. Savings Analyzer (savings-analyzer.test.ts)
**Cobertura**: 13 tests
- Detección de gastos que superan ingresos
- Detección de gastos altos (>80% de ingresos)
- Detección de gasto excesivo por categoría (>40%)
- Detección de gastos pequeños frecuentes (latte factor)
- Sugerencias de metas de ahorro
- Cálculo de health score (0-100)
- Generación de mensajes motivacionales
- Ordenamiento por prioridad

**Escenarios analizados**:
```typescript
// Balance negativo → warning (alta prioridad)
// Gastos > 80% ingresos → warning con sugerencias
// Gastos < 60% ingresos → success (felicitación)
// Categoría > 40% gastos → warning específica
// Ahorro > 20% ingresos → success
```

### 7. Chat Utils (chat-utils.test.ts)
**Cobertura**: 15 tests
- Validación de contexto financiero
- Generación de resúmenes de contexto
- Formateo de respuestas monetarias
- Cálculo de ratio gastos/ingresos
- Obtención de top categorías
- Clasificación de estado financiero (excelente/bueno/regular/crítico)

**Clasificación de estados**:
- **Excelente**: Gastos < 60% ingresos, balance positivo
- **Bueno**: Gastos 60-80% ingresos, balance positivo
- **Regular**: Gastos 80-90% ingresos
- **Crítico**: Gastos > 90% ingresos o balance negativo

## Tests Manuales

### OCR (Escaneo de Recibos)
1. Navegar a `/transacciones`
2. Click en "Escanear Recibo"
3. Subir imagen de recibo
4. Verificar:
   - Extracción correcta de monto
   - Detección de comercio
   - Fecha válida
   - Categoría sugerida apropiada
   - Confidence score > 0.7

**Casos de prueba**:
- Recibo claro y legible (exitoso)
- Recibo con mala iluminación (exitoso)
- Imagen borrosa (debe rechazarse)
- Múltiples formatos (PDF, JPG, PNG)

### Asistente de Voz
1. Click en ícono de micrófono
2. Probar comandos:

```
"gasté 50000 en comida" (válido)
"recibí 1000000 de salario" (válido)
"pagué ochenta mil en transporte" (válido)
"gastó cincuenta lucas en entretenimiento" (válido)
"hola cómo estás" (debe detectar comando inválido)
```

**Verificar**:
- Transcripción correcta (Web Speech API)
- Procesamiento NLP exitoso
- Creación de transacción
- Confirmación por voz (ElevenLabs TTS)
- Manejo de errores (comando no entendido)

### Autenticación
```
Login con credenciales válidas (exitoso)
Login con credenciales inválidas (debe fallar)
Logout exitoso
Protección de rutas (redirect a /login si no autenticado)
Sesión persiste en recargas
```

### Chat Financiero
1. Abrir chat en dashboard
2. Probar consultas:

```
"¿Cuánto gasté en comida este mes?"
"Muéstrame mi balance"
"¿En qué categoría gasto más?"
"Dame tips para ahorrar"
```

**Verificar**:
- Respuestas contextuales
- Datos correctos de la BD
- Latencia < 3s
- Manejo de errores de IA

## Estrategia de Testing

### Unit Tests
**Ubicación**: `tests/`
**Framework**: Custom TypeScript (sin dependencias externas)
**Cobertura**: ~86 tests unitarios en 1,270 líneas de código

**Características**:
- Todos en TypeScript para consistencia
- Sin modificaciones a BD (READ-ONLY)
- Sin dependencias de servicios externos
- Ejecución rápida (< 10 segundos total)
- Framework propio con test() y assert()

**Componentes cubiertos**:
- Lógica de negocio (balance, cálculos)
- Parsing y validación (OCR, NLP, formatos)
- Análisis financiero (savings, health score, insights)
- Utilidades de chat (contexto, clasificación)

### Manual Testing
**Enfoque**: UI/UX, features complejas (OCR, voz, chat)
**Checklist**: Ver sección Tests Manuales arriba

### E2E Testing (Pendiente)
**Propuesta**: Playwright o Cypress
**Prioridad**: Media (después de features core)

## CI/CD y GitHub Actions

### GitHub Actions - Versioning Workflow
**Archivo**: `.github/workflows/versioning.yml`

**Triggers**:
- Push a `main`
- Cambios en `version.json`

**Pipeline**:
```yaml
1. Checkout código
2. Setup Node.js 18
3. Sync version.json → package.json
4. Git tag automático
5. GitHub Release con changelog
```

**NO ejecuta tests automáticamente** - El workflow solo maneja versionado y releases.

**IMPORTANTE**: Los tests en `tests/` son para desarrollo local únicamente. No interfieren con el workflow de versioning porque:
- No están en el pipeline de CI/CD
- Son read-only (no modifican BD)
- Solo se ejecutan manualmente con `npm test`

### Para agregar tests al CI/CD (futuro)
Si en el futuro quieres ejecutar tests automáticamente en GitHub Actions:

```yaml
# Agregar paso antes de crear release
- name: Run tests
  run: npm test
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Pero ten en cuenta:
- Necesitas configurar `DATABASE_URL` en GitHub Secrets
- Los tests de BD verificarían la BD de producción (read-only)
- Mejor opción: crear BD de test separada

## Debugging

### Logs de Desarrollo
```typescript
// En desarrollo
console.log("Debug:", variable)

// En producción (API Routes)
try {
  // código
} catch (error) {
  console.error("Error en endpoint:", error)
  return Response.json({ error: "Internal error" }, { status: 500 })
}
```

### Debug de Tests
```bash
# Ejecutar suite específica directamente
npx tsx tests/nlp-service.test.ts
npx tsx tests/balance-utils.test.ts
npx tsx tests/savings-analyzer.test.ts

# Ver output detallado
npm test
```

### Debug de NLP
```bash
# Test comando específico
npm run test:nlp
```

### Debug de OCR
```typescript
// En ocr-service.ts
console.log("Vision API Response:", response)
console.log("Extracted data:", extractedData)
```

### Debug de Base de Datos
```bash
# Verificar transacciones
psql $DATABASE_URL -c "SELECT * FROM transactions LIMIT 10;"

# Verificar usuarios
psql $DATABASE_URL -c "SELECT id, username, email FROM usuarios;"

# Test de conexión
npm run test:db
```

## Mejores Prácticas

### Antes de Commit
```bash
# 1. Ejecutar tests locales
npm test

# 2. Verificar build
npm run build

# 3. Verificar lint
npm run lint
```

### Testing en Features Nuevas
1. **Escribir tests primero** (si es lógica de negocio)
2. **Test manual exhaustivo** (si es UI/UX)
3. **Documentar casos de prueba** en PR
4. **Verificar edge cases** (valores null, strings vacíos, etc.)

### Agregar Nuevos Tests
Para agregar un nuevo test unitario:

```typescript
// tests/mi-nuevo-test.ts
#!/usr/bin/env tsx

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
  } catch (error: any) {
    console.log(`[FAIL] ${name}`)
    console.log(`       ${error.message}`)
    process.exit(1)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

console.log("\n=== Tests de Mi Componente ===\n")

test("descripción del test", () => {
  // tu lógica aquí
  assert(resultado === esperado, "mensaje de error")
})

console.log("\n[OK] Todos los tests pasaron\n")
```

Luego agregar a `tests/run-all.ts`:
```typescript
const tests = [
  // ... tests existentes
  { name: "Mi Componente", script: "tests/mi-nuevo-test.ts" },
]
```

## Seguridad de los Tests

### Tests NO dañan la BD porque:

1. **test-connection.ts**: Solo ejecuta SELECT (consultas de lectura)
   - `SELECT NOW()` - Obtiene hora del servidor
   - `SELECT table_name FROM information_schema.tables` - Lista tablas
   - `SELECT COUNT(*) FROM ...` - Cuenta registros
   - NO ejecuta INSERT, UPDATE, DELETE, DROP

2. **Todos los demás tests**: No acceden a BD
   - Solo prueban lógica pura y funciones auxiliares
   - No requieren conexión externa
   - Completamente aislados

3. **Ejecutar tests antes de commit es seguro**
   - No alteran datos existentes
   - No crean registros temporales
   - No afectan producción

## Métricas de Cobertura

**Total**: ~86 tests unitarios en 7 suites
**Líneas de código**: 1,270 líneas en tests/

**Por componente**:
- NLP Service: 17 tests (comandos de voz)
- Balance Utils: 18 tests (cálculos financieros)
- Savings Analyzer: 13 tests (análisis de ahorro)
- Chat Utils: 15 tests (contexto financiero)
- OCR Utils: 15 tests (parsing de recibos)
- Format Utils: 8 tests (formateo)
- DB Connection: 1 suite (conectividad)

**Componentes críticos cubiertos**:
- Lógica de negocio: 100%
- Parsing y validación: 100%
- Análisis financiero: 100%
- Formateo: 100%

**Componentes sin cobertura automatizada**:
- API Routes (requieren mocks de BD)
- Componentes React (requieren testing library)
- Integraciones externas (Gemini API, ElevenLabs)

## Roadmap de Testing

**Completado**:
- NLP service tests
- Database connection tests
- Balance calculations tests
- Format utilities tests
- OCR parsing tests
- Savings analyzer tests
- Chat utilities tests

**Prioridad Alta** (Pendiente):
- API Routes tests con mocks
- Auth flow tests

**Prioridad Media** (Pendiente):
- E2E con Playwright
- Component tests con React Testing Library
- Integration tests con servicios externos

**Prioridad Baja** (Pendiente):
- Visual regression tests
- Load testing
- Security testing automatizado
- Performance benchmarks

## Recursos

- [Directorio de Tests](../tests/) - Código fuente de todos los tests
- [Test Runner](../tests/run-all.ts) - Orquestador principal
- [NLP Tests](../tests/nlp-service.test.ts) - Referencia para tests de parsing
- [Savings Tests](../tests/savings-analyzer.test.ts) - Referencia para tests de lógica compleja
