# Finanzas Personales

[![Build Status](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/actions/workflows/ci.yml/badge.svg)](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Aplicación web moderna para gestionar finanzas personales de manera simple y efectiva. Controla ingresos, gastos, cuentas bancarias y obtén reportes visuales de tu situación financiera.

## Características Principales

- **Asistente de Voz**: Registra transacciones usando comandos de voz naturales
- **Chat Financiero con IA**: Analiza tus finanzas y obtén recomendaciones personalizadas
- **Escaneo de Recibos**: Extrae información de recibos automáticamente con OCR
- **Dashboard Interactivo**: Visualiza métricas financieras en tiempo real
- **Gestión de Cuentas**: Administra múltiples cuentas bancarias, efectivo y tarjetas
- **Control de Transacciones**: Registra y categoriza ingresos y gastos
- **Reportes Visuales**: Gráficos y análisis detallados por categoría
- **Categorización Inteligente**: Sistema de categorías con iconos y colores
- **Diseño Responsive**: Optimizado para móvil y escritorio
- **Modo Oscuro**: Tema claro y oscuro
- **Modo Offline**: Funciona con datos de demostración sin base de datos

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
- PostgreSQL 14+ (opcional - funciona sin DB usando datos demo)
- Google Gemini API Key (opcional - para IA y OCR)
- ElevenLabs API Key (opcional - para síntesis de voz)

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
```

**Obtener API Keys:**
- Gemini: [Google AI Studio](https://aistudio.google.com/app/apikey)
- ElevenLabs: [elevenlabs.io](https://elevenlabs.io/)

### 4. Configurar base de datos

```bash
# Usando psql
psql $DATABASE_URL -f scripts/01-create-tables.sql
psql $DATABASE_URL -f scripts/02-seed-categories.sql

# O ejecuta los scripts desde tu cliente SQL preferido
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Uso

### Asistente de Voz

1. Click en el botón de micrófono (esquina inferior derecha)
2. Di comandos como:
   - "gasté 50000 pesos en comida"
   - "recibí 1000000 de salario"
   - "pagué 80000 en transporte"
3. Confirma la transacción

### Chat Financiero con IA

1. Click en el botón de chat (junto al micrófono)
2. Pregunta sobre tus finanzas:
   - "¿Cuánto gasté en restaurantes este mes?"
   - "Dame consejos para ahorrar"
   - "¿Cuál es mi balance actual?"
3. Recibe análisis y recomendaciones personalizadas

### Escaneo de Recibos

1. Ve a Transacciones
2. Click en "Escanear Recibo"
3. Toma una foto del recibo
4. Valida y confirma la información extraída

### Dashboard

Visualiza:
- Balance total de cuentas
- Ingresos y gastos del período
- Transacciones recientes
- Análisis de salud financiera con IA

### Reportes

Analiza:
- Gastos por categoría con gráficos
- Ingresos por categoría
- Distribución porcentual
- Filtros por fecha

## Despliegue en Vercel

### Automático vía GitHub

1. Conecta tu repo en [vercel.com](https://vercel.com/)
2. Configura variables de entorno:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `ELEVEN_LABS_API_KEY`
3. Deploy

### Manual vía CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Scripts

```bash
npm run dev          # Desarrollo (puerto 3000)
npm run build        # Build para producción
npm start            # Servidor de producción
npm run lint         # Verificar código con ESLint
```

## Estructura del Proyecto

```
FinanzasPersonales-PyI-II/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── accounts/      # Endpoints de cuentas
│   │   ├── transactions/  # Endpoints de transacciones
│   │   ├── voice/         # Endpoints de asistente de voz
│   │   ├── chat/          # Endpoints de chat IA
│   │   ├── receipts/      # Endpoints de escaneo OCR
│   │   └── dashboard/     # Endpoints de métricas
│   ├── cuentas/           # Página de cuentas
│   ├── transacciones/     # Página de transacciones
│   ├── reportes/          # Página de reportes
│   └── page.tsx           # Dashboard principal
├── components/             # Componentes React
│   ├── voice/             # Asistente de voz
│   ├── chat/              # Chat financiero
│   ├── receipts/          # Escaneo de recibos
│   ├── transactions/      # Transacciones
│   └── ui/                # Componentes base
├── lib/                   # Lógica de negocio
│   ├── db.ts              # Queries de base de datos
│   ├── nlp-service.ts     # Procesamiento de lenguaje natural
│   ├── ocr-service.ts     # Servicio de OCR con Gemini
│   ├── chat-service.ts    # Chat con IA
│   └── types.ts           # Tipos TypeScript
└── scripts/               # Scripts SQL
```

## Licencia

MIT License - ver [LICENSE](LICENSE)
