# Changelog - CashFlow

Todos los cambios notables del proyecto serán documentados aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.1.2] - 2024-11-24

### Cambiado
- Mejorada presentación de página de login con logo oficial
- Logo CashFlow centrado con fondo circular y gradiente
- Diseño visual mejorado con sombra y spacing optimizado

## [1.1.1] - 2024-11-24

### Cambiado
- Actualizado título de página de registro a "CashFlow"
- Mejoras menores en consistencia de branding

## [1.1.0] - 2024-11-24

### Agregado
- Suite completa de tests unitarios (86+ tests en 7 suites)
  - Tests de conexión a base de datos (READ-ONLY)
  - Tests de servicio NLP (17 casos de comandos de voz)
  - Tests de balance utils (18 casos de cálculos financieros)
  - Tests de format utils (8 casos de formateo)
  - Tests de OCR utils (15 casos de parsing de recibos)
  - Tests de savings analyzer (13 casos de análisis de ahorro)
  - Tests de chat utils (15 casos de contexto financiero)
- Framework de testing custom en TypeScript (1,270 líneas de código)
- Test runner con orquestación de todas las suites
- Scripts npm para testing (`npm test`, `npm run test:db`)
- Documentación completa de testing (473 líneas)

### Cambiado
- Documentación de testing actualizada con cobertura completa
- Documentación de deployment simplificada (solo Vercel)
- Documentación de contribución actualizada y simplificada
- Autoría generalizada en toda la documentación
- Eliminación de referencias a plataformas no utilizadas (Docker, Railway, Netlify)

### Eliminado
- SUMMARY.md (redundante con README.md)
- Tests obsoletos y redundantes (test-balance, check-accounts, test-elevenlabs, etc.)
- Emojis en toda la documentación markdown
- Secciones innecesarias de documentación

## [1.0.1] - 2024-11-24

### Cambiado
- Renombrado proyecto de "Finanzas Personales" a "CashFlow"
- Actualizado package.json y package-lock.json con nuevo nombre
- Actualizado título en página de login
- Actualizado logo y título en navegación principal

## [1.0.0] - 2024-11-24

### Agregado

**Autenticación y Seguridad**
- Sistema de autenticación completo con NextAuth
- Registro de usuarios con hash de contraseñas (bcryptjs)
- Login con validación de credenciales
- Protección de rutas y API endpoints
- Sesiones persistentes con cookies
- Middleware de autenticación
- Validación de ownership en recursos (recibos, transacciones)

**Escaneo de Recibos (OCR)**
- OCR con Gemini Vision API (gemini-2.5-flash)
- Extracción automática de: monto, comercio, fecha, categoría
- Compresión agresiva de imágenes para optimización
- Validación de calidad y tamaño de imágenes
- Almacenamiento con Vercel Blob (producción)
- Modo de almacenamiento local para desarrollo
- Protección de imágenes con autenticación
- Verificación de imágenes duplicadas
- Confidence score para validar extracción
- Soporte para formatos: JPG, PNG, WEBP

**Asistente de Voz**
- Reconocimiento de voz con Web Speech API
- Procesamiento de lenguaje natural con Gemini 2.5 Flash
- Detección de intenciones (gasto/ingreso)
- Extracción de montos (números y texto: "mil", "50k", "ochenta mil")
- Detección automática de categorías
- Soporte para correcciones ("no, era 15000")
- Síntesis de voz con ElevenLabs (confirmaciones habladas)
- Procesamiento optimizado consultando BD directamente
- Manejo de selección manual de categorías y cuentas

**Chat Financiero con IA**
- Chat interactivo con contexto financiero
- Análisis personalizado con Gemini AI
- Respuestas basadas en datos reales del usuario
- Consultas sobre gastos, ingresos, balance
- Tips y recomendaciones de ahorro
- Formato de respuestas optimizado para legibilidad

**Análisis Financiero Inteligente**
- Health score (0-100) calculado automáticamente
- Detección de gastos que superan ingresos
- Identificación de categorías con gasto excesivo (>40%)
- Detección de gastos pequeños frecuentes ("latte factor")
- Sugerencias de metas de ahorro
- Mensajes motivacionales personalizados
- Análisis de ratios de gasto/ingreso
- Identificación de oportunidades de ahorro

**Gestión de Transacciones**
- CRUD completo de transacciones
- Filtrado por tipo, categoría, cuenta, fecha
- Ordenamiento por fecha de creación
- Validación de balances al crear/editar/eliminar
- Cálculos automáticos de balance
- Prevención de errores NaN en balances
- Soporte para descripciones y notas

**Dashboard y Reportes**
- Métricas en tiempo real
- Gráficos de gastos por categoría
- Gráficos de ingresos mensuales
- Resumen de cuentas
- Health score badge con indicador visual
- Transacciones recientes
- Panel de insights de ahorro

**UI/UX**
- Componentes de UI con Radix UI (30+ componentes)
- Theme provider con modo claro/oscuro (next-themes)
- Gestión de estado con Zustand
- Formularios con react-hook-form + Zod
- Gráficos con Recharts
- Toasts y notificaciones con Sonner
- Diseño responsive con Tailwind CSS
- Animaciones con tailwindcss-animate

**Infraestructura**
- Base de datos PostgreSQL con Neon
- Fallback a datos mock si BD no disponible
- API Routes con Next.js 14.2.33
- Deployment en Vercel
- CI/CD automático con GitHub Actions
- Versioning basado en version.json
- Cache control headers en APIs
- Force dynamic rendering en rutas críticas
- Analytics con Vercel Analytics

**Dependencias Clave**
- Next.js 14.2.33
- React 18
- TypeScript 5
- Tailwind CSS 4.1.9
- @google/genai 1.30.0 (Gemini AI)
- @elevenlabs/elevenlabs-js 2.20.1
- @neondatabase/serverless
- next-auth 4.24.13
- bcryptjs 3.0.3
- zustand 5.0.8
- react-hook-form 7.60.0
- zod 3.25.67
- recharts (latest)
- 30+ componentes Radix UI

### Cambiado
- Migración completa de USD a COP (pesos colombianos)
- Formateo de números con separador de miles (punto en Colombia)
- Fechas en formato colombiano
- Actualización a Next.js 14.2.33 (estabilidad y performance)
- Refactorización de layout con AppLayout component
- Optimización de imports en componentes
- Mejora en UI consistency y spacing
- Refactorización de ElevenLabs client a función dedicada

### Corregido
- Título de página de login
- Ordenamiento de transacciones incluyendo fecha de creación
- Validación de tamaño de imágenes en OCR (límite 5MB)
- Manejo de transacciones y validaciones mejorado
- Prevención de NaN en cálculos de balance
- Favicon y app title actualizados

## [0.9.0] - 2024-10-15

### Agregado
- Integración con PostgreSQL (Neon) como base de datos principal
- Fallback automático a datos mock si BD no disponible
- Scripts SQL completos para setup de base de datos
  - Tabla usuarios con autenticación
  - Tabla categories con categorías predefinidas
  - Tabla accounts para cuentas del usuario
  - Tabla transactions con foreign keys
- Documentación de testing y CI/CD
- Test de conexión a base de datos
- Guías de integración y deployment

### Cambiado
- Refactorización de tablas SQL para compatibilidad PostgreSQL
- Actualización de inserts de categorías
- Mejora en componentes UI con forwardRef
- Estructura de datos normalizada

### Corregido
- Compatibilidad con tipos de PostgreSQL
- Manejo de fechas en zona horaria correcta

## [0.5.0] - 2024-10-01

### Agregado
- Estructura base del MVP de finanzas personales
- Setup inicial de base de datos SQL
- Componentes base de UI con React y Tailwind
- Sistema de categorías predefinidas:
  - Ingresos: Salario, Freelance, Inversiones, Otros Ingresos
  - Gastos: Alimentos, Transporte, Vivienda, Entretenimiento, Salud, Educación, etc.
- Gestión básica de cuentas (Efectivo, Banco, Tarjeta)
- Registro de transacciones (ingresos y gastos)
- Dashboard con métricas básicas
- Reportes visuales con gráficos
- Navegación principal
- Páginas: Dashboard, Transacciones, Cuentas, Reportes
- README.md con documentación inicial
- Licencia MIT

### Cambiado
- Estructura de carpetas siguiendo convenciones Next.js 14
- Configuración de Tailwind CSS
- Setup de TypeScript

---

**Notas de Desarrollo**:
- Para ver el historial completo de commits: https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/commits/main
- El proyecto usa Conventional Commits para mensajes consistentes
- Versioning sigue Semantic Versioning (MAJOR.MINOR.PATCH)

**Roadmap Futuro**:
- Tests E2E con Playwright
- Tests de componentes React
- API routes tests con mocks
- Performance benchmarks
- Visual regression tests
- Load testing
