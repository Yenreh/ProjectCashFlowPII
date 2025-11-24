# Finanzas Personales

[![Build Status](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/actions/workflows/ci.yml/badge.svg)](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Aplicación web moderna para gestionar finanzas personales de manera simple y efectiva. Sistema multiusuario completo con autenticación, control de ingresos, gastos, cuentas bancarias y reportes visuales de tu situación financiera.

## Características Principales

- **Sistema Multiusuario**: Registro, login y gestión de usuarios con autenticación segura
- **Asistente de Voz**: Registra transacciones usando comandos de voz naturales
- **Chat Financiero con IA**: Analiza tus finanzas y obtén recomendaciones personalizadas
- **Escaneo de Recibos**: Extrae información de recibos automáticamente con OCR
- **Dashboard Interactivo**: Visualiza métricas financieras en tiempo real con análisis de IA
- **Gestión de Cuentas**: Administra múltiples cuentas bancarias, efectivo y tarjetas
- **Control de Transacciones**: Registra y categoriza ingresos y gastos
- **Reportes Visuales**: Gráficos y análisis detallados por categoría y período
- **Categorización Inteligente**: Sistema de categorías globales y personalizadas con iconos
- **Análisis de Salud Financiera**: Evalúa tu situación financiera con métricas y consejos
- **Diseño Responsive**: Optimizado para móvil, tablet y escritorio
- **Modo Oscuro**: Tema claro y oscuro con transiciones suaves
- **Búsqueda y Filtros**: Filtra transacciones por tipo, cuenta, categoría y fecha

## Tecnologías

- **Frontend**: [Next.js 14](https://nextjs.org/) + [TypeScript 5](https://www.typescriptlang.org/)
- **UI**: [Radix UI](https://www.radix-ui.com/) + [Tailwind CSS v4](https://tailwindcss.com/)
- **Gráficos**: [Recharts](https://recharts.org/)
- **Base de Datos**: [PostgreSQL](https://www.postgresql.org/) via [Neon](https://neon.tech/)
- **IA**: [Google Gemini 2.5 Flash](https://ai.google.dev/) para NLP, OCR y análisis
- **Voz**: [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) + [ElevenLabs](https://elevenlabs.io/)
- **Formularios**: [React Hook Form](https://react-hook-form.com/)

## Requisitos

- Node.js 18.x o superior
- npm 9.x o superior
- PostgreSQL 14+
- Google Gemini API Key
- ElevenLabs API Key

## Instalación

### 1. Clonar repositorio

```bash
git clone https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II.git
cd FinanzasPersonales-PyI-II
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea `.env.local` en la raíz:

```bash
# Base de datos
DATABASE_URL="postgresql://user:password@host:5432/database"

# Google Gemini API
GEMINI_API_KEY="tu_api_key_de_gemini"

# ElevenLabs
ELEVEN_LABS_API_KEY="tu_api_key_de_elevenlabs"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # Solo para desarrollo local
NEXTAUTH_SECRET="genera_un_secret_aleatorio_aqui"
```

**Obtener API Keys:**
- Gemini: [Google AI Studio](https://aistudio.google.com/app/apikey)
- ElevenLabs: [elevenlabs.io](https://elevenlabs.io/)
- NextAuth Secret: Genera con `openssl rand -base64 32` o [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)

### 4. Configurar base de datos

**Opción 1: Script completo (recomendado)**

```bash
# Ejecuta el script completo que crea todas las tablas y categorías
psql $DATABASE_URL -f scripts/00-setup-database-complete.sql
```

**Usando Neon (recomendado para desarrollo):**

1. Crea una cuenta en [neon.tech](https://neon.tech/)
2. Crea un nuevo proyecto
3. Copia el connection string
4. Ejecuta los scripts desde su SQL Editor o usando psql

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Uso

### Registro e Inicio de Sesión

1. Abre la aplicación en [http://localhost:3000](http://localhost:3000)
2. Si no tienes cuenta, ve a "Registrarse"
3. Crea tu cuenta con email y contraseña
4. Inicia sesión con tus credenciales

### Dashboard Principal

Visualiza:
- Balance total de todas tus cuentas
- Ingresos y gastos del período actual
- Últimas transacciones recientes
- Análisis de salud financiera con IA
- Recomendaciones personalizadas

### Gestión de Cuentas

1. Ve a la sección "Cuentas"
2. Crea nuevas cuentas (Efectivo, Banco, Tarjeta)
3. Define el balance inicial
4. Archiva cuentas que no uses

### Asistente de Voz

1. Click en el botón de micrófono (esquina inferior derecha)
2. Di comandos naturales como:
   - "gasté 50000 pesos en comida"
   - "recibí 1000000 de salario"
   - "pagué 80000 en transporte"
   - "invertí 500000 en educación"
3. Confirma o edita la transacción detectada
4. La transacción se registra automáticamente

### Chat Financiero con IA

1. Click en el botón de chat (junto al micrófono)
2. Pregunta sobre tus finanzas:
   - "¿Cuánto gasté en restaurantes este mes?"
   - "Dame consejos para ahorrar"
   - "¿Cuál es mi balance actual?"
3. Recibe análisis y recomendaciones personalizadas

### Escaneo de Recibos

1. Ve a "Transacciones"
2. Click en "Escanear Recibo" (ícono de cámara)
3. Toma una foto clara del recibo
4. El sistema extrae automáticamente:
   - Monto total
   - Fecha de compra
   - Categoría sugerida
5. Valida y ajusta la información si es necesario
6. Confirma para registrar la transacción

### Transacciones Manuales

1. Ve a "Transacciones"
2. Click en "Nueva Transacción"
3. Selecciona tipo (Ingreso/Gasto)
4. Completa el formulario:
   - Monto
   - Categoría (con buscador)
   - Cuenta
   - Fecha
   - Descripción (opcional)
5. Guarda la transacción

### Dashboard

Visualiza:
- Balance total de cuentas
- Ingresos y gastos del período
- Transacciones recientes
- Análisis de salud financiera con IA

### Reportes

Analiza tus finanzas:
- **Gastos por categoría**: Gráfico circular con distribución
- **Ingresos por categoría**: Desglose de fuentes de ingreso
- **Porcentajes**: Ve qué porcentaje representa cada categoría
- **Filtros avanzados**: 
  - Por rango de fechas
  - Por cuenta específica
  - Exporta datos (próximamente)

### Tips de Uso

- **Búsqueda rápida**: Usa el buscador de categorías para encontrar rápidamente
- **Scroll suave**: El selector de categorías ahora tiene scroll mejorado
- **Atajos de teclado**: Navega categorías con flechas arriba/abajo
- **Validación inteligente**: El sistema valida montos y fechas automáticamente
- **Categorías personalizadas**: Crea tus propias categorías además de las globales

## Despliegue en Vercel

### Automático vía GitHub

1. Conecta tu repo en [vercel.com](https://vercel.com/)
2. Configura variables de entorno en Vercel Dashboard:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `ELEVEN_LABS_API_KEY`
   - `NEXTAUTH_SECRET` (genera con `openssl rand -base64 32`)
   - **Nota**: `NEXTAUTH_URL` NO es necesaria en Vercel (se detecta automáticamente)
3. Deploy automático con cada push a main

### Manual vía CLI

```bash
# Instala Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy a producción
vercel --prod

# Configura variables de entorno
vercel env add DATABASE_URL
vercel env add GEMINI_API_KEY
vercel env add NEXTAUTH_SECRET
# No agregues NEXTAUTH_URL - Vercel lo maneja automáticamente
```

### Recomendaciones de Producción

- Usa [Neon](https://neon.tech/) para PostgreSQL serverless (gratis hasta 3GB)
- Configura límites de rate en las APIs de voz y chat
- Habilita HTTPS (Vercel lo hace automáticamente)
- Monitorea uso de APIs (Gemini tiene límites gratuitos generosos)
- Vercel detecta automáticamente la URL de producción para NextAuth

## Scripts

```bash
npm run dev          # Desarrollo (puerto 3000)
npm run build        # Build para producción
npm start            # Servidor de producción
npm run lint         # Verificar código con ESLint
npm run type-check   # Verificar tipos TypeScript
```

## Arquitectura Técnica

### Base de Datos

- **PostgreSQL 14+** con queries parametrizadas para seguridad
- **Tablas principales**:
  - `users`: Usuarios del sistema
  - `categories`: Categorías globales y personalizadas
  - `accounts`: Cuentas bancarias por usuario
  - `transactions`: Registro de ingresos/gastos
- **Seguridad**: Todas las queries usan parámetros seguros (prevención SQL injection)
- **Multiusuario**: Aislamiento completo de datos por usuario

### APIs Inteligentes

- **NLP con Gemini**: Procesa comandos de voz naturales
- **OCR con Gemini Vision**: Extrae datos de recibos escaneados
- **Chat con contexto**: Analiza tus datos y responde preguntas
- **Análisis financiero**: Evalúa salud financiera con métricas

### Características de Seguridad

- Autenticación con NextAuth
- Passwords hasheados con bcrypt
- Queries SQL parametrizadas
- Validación de entrada en APIs
- Aislamiento de datos por usuario
- Rate limiting en endpoints sensibles

## Troubleshooting

### Error de conexión a base de datos

```bash
# Verifica que DATABASE_URL esté configurada
echo $DATABASE_URL

# Prueba la conexión
psql $DATABASE_URL -c "SELECT 1"
```

### API Keys no funcionan

- Verifica que las keys estén en `.env.local`
- Reinicia el servidor de desarrollo: `npm run dev`
- Chequea límites de uso en Google AI Studio

### Problemas con el scroll del selector de categorías

El scroll con mouse wheel está optimizado. Si no funciona:
- Usa la barra de scroll lateral
- Navega con teclado (flechas arriba/abajo)
- Usa la búsqueda para filtrar categorías

## Contribuir

Ver [CONTRIBUTING.md](docs/CONTRIBUTING.md) para guías de contribución.

## Documentación Adicional

- [Arquitectura del Sistema](docs/ARCHITECTURE.md)
- [Guía de Desarrollo](docs/DEVELOPER_GUIDE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Escaneo de Recibos](docs/RECEIPT_SCANNING.md)

## Estructura del Proyecto

```
FinanzasPersonales-PyI-II/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Autenticación (registro, login, NextAuth)
│   │   ├── accounts/      # CRUD de cuentas
│   │   ├── transactions/  # CRUD de transacciones
│   │   ├── categories/    # Gestión de categorías
│   │   ├── voice/         # Asistente de voz (STT + NLP)
│   │   ├── chat/          # Chat financiero con IA
│   │   ├── receipts/      # Escaneo OCR de recibos
│   │   ├── dashboard/     # Métricas y análisis IA
│   │   ├── reports/       # Reportes por categoría
│   │   └── savings/       # Insights de ahorro
│   ├── cuentas/           # Página de gestión de cuentas
│   ├── transacciones/     # Página de transacciones
│   ├── reportes/          # Página de reportes visuales
│   ├── registro/          # Página de registro
│   ├── login/             # Página de inicio de sesión
│   └── page.tsx           # Dashboard principal
├── components/            # Componentes React
│   ├── auth/              # Componentes de autenticación
│   ├── voice/             # Asistente de voz
│   ├── chat/              # Chat financiero
│   ├── receipts/          # Escaneo de recibos
│   ├── transactions/      # Gestión de transacciones
│   ├── accounts/          # Gestión de cuentas
│   ├── categories/        # Selector de categorías
│   ├── dashboard/         # Widgets del dashboard
│   ├── reports/           # Gráficos y reportes
│   ├── savings/           # Panel de insights de ahorro
│   ├── layout/            # Navegación y layout
│   └── ui/                # Componentes base (Shadcn)
├── lib/                   # Lógica de negocio
│   ├── db.ts              # Queries SQL con Neon
│   ├── auth.ts            # Configuración NextAuth
│   ├── auth-helpers.ts    # Utilidades de autenticación
│   ├── auth-types.ts      # Tipos de autenticación
│   ├── nlp-gemini-service.ts  # NLP con Gemini
│   ├── nlp-service.ts     # Servicio de procesamiento NLP
│   ├── ocr-service.ts     # OCR de recibos
│   ├── chat-service.ts    # Chat con contexto financiero
│   ├── financial-ai-analyzer.ts  # Análisis de salud
│   ├── savings-analyzer.ts       # Análisis de ahorros
│   ├── balance-utils.ts   # Cálculo de balances
│   ├── health-cache.ts    # Cache de métricas
│   ├── storage-service.ts # Almacenamiento de recibos
│   ├── format.ts          # Formateo de números/fechas
│   ├── types.ts           # Tipos TypeScript principales
│   ├── voice-types.ts     # Tipos para asistente de voz
│   ├── chat-types.ts      # Tipos para chat
│   ├── receipt-types.ts   # Tipos para recibos
│   ├── hooks/             # React Hooks personalizados
│   ├── stores/            # Estado global (Zustand)
│   ├── contexts/          # React Contexts
│   └── __tests__/         # Tests unitarios
├── scripts/               # Scripts de base de datos
│   └──  00-setup-database-complete.sql  # Setup completo
├── docs/                  # Documentación técnica
├── public/                # Archivos estáticos
│   └── media/
│       └── receipts/      # Almacenamiento de recibos
└── middleware.ts          # Middleware de autenticación
```

## Licencia

MIT License - ver [LICENSE](LICENSE)
