# Arquitectura del Sistema - CashFlow

## Visión General

CashFlow es una aplicación Next.js 14 con App Router que combina Server Components y Client Components para renderizado híbrido optimizado. Diseño escalable, type-safe con TypeScript, y arquitectura de tres capas.

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                   CAPA DE PRESENTACIÓN                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Dashboard  │  │   Cuentas    │  │ Transacciones│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           ↓                 ↓                 ↓              │
│  ┌────────────────────────────────────────────────────┐     │
│  │      Componentes React + shadcn/ui                 │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE APLICACIÓN                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │   Next.js App Router (Server/Client Components)    │     │
│  │   API Routes (/app/api/*) + Middleware             │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE NEGOCIO                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   lib/db.ts  │  │ lib/types.ts │  │  Servicios   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE DATOS                            │
│              PostgreSQL (Neon) + Vercel Blob                 │
└─────────────────────────────────────────────────────────────┘
```

## Stack Tecnológico

**Frontend**
- Next.js 14.2+ (App Router)
- React 18+ (Server/Client Components)
- TypeScript 5+
- Tailwind CSS + shadcn/ui
- Zustand (estado global)

**Backend**
- Next.js API Routes
- NextAuth.js v4 (autenticación)
- PostgreSQL (Neon serverless)
- Vercel Blob (almacenamiento)

**IA/ML**
- OpenAI GPT-4o-mini (OCR, NLP, chat)
- ElevenLabs (TTS)
- Web Speech API (STT)

## Flujo de Datos

### 1. Transacciones
```
Usuario → Form → POST /api/transactions
               ↓
         Validación + Auth (NextAuth)
               ↓
         lib/db.ts → INSERT transacciones
               ↓
         Recalcular balances (balance-utils.ts)
               ↓
         Response → Revalidación UI
```

### 2. Escaneo de Recibos (OCR)
```
Foto → POST /api/receipts/scan
      ↓
Guardar imagen (storage-service.ts)
      ↓
GPT-4 Vision (ocr-service.ts)
      ↓
Extraer: monto, comercio, fecha, categoría
      ↓
Mapeo automático a categorías existentes
      ↓
Response con datos + image_hash
```

### 3. Autenticación
```
Login → NextAuth Provider (Credentials)
       ↓
Validar contra PostgreSQL (usuarios table)
       ↓
Crear JWT session
       ↓
Middleware protege rutas (/cuentas, /transacciones, etc.)
```

### 4. Asistente de Voz
```
Comando voz → Web Speech API (STT)
            ↓
nlp-gemini-service.ts (Gemini 2.0)
            ↓
Detectar intención + extraer datos
            ↓
POST /api/transactions
            ↓
ElevenLabs TTS → Confirmación hablada
```

## Estructura de Directorios

```
app/
├── api/                        # REST API
│   ├── auth/                   # NextAuth handlers
│   ├── transactions/           # CRUD transacciones
│   ├── accounts/               # Gestión de cuentas
│   ├── receipts/               # OCR y almacenamiento
│   │   ├── scan/               # POST - escanear recibo
│   │   └── image/[hash]/       # GET - servir imagen protegida
│   ├── chat/                   # Chat financiero IA
│   └── voice/                  # TTS/STT
├── (pages)/                    # UI routes
│   ├── login/
│   ├── registro/
│   ├── transacciones/
│   ├── cuentas/
│   └── reportes/
└── layout.tsx                  # Layout raíz

components/
├── ui/                         # shadcn/ui base
├── transactions/               # Formularios, lista, filtros
├── receipts/                   # Scanner, validación
├── chat/                       # Chat financiero
├── voice/                      # Interfaz de voz
└── auth/                       # Provider, user menu

lib/
├── db.ts                       # Queries PostgreSQL
├── types.ts                    # Tipos TypeScript centralizados
├── auth.ts                     # Configuración NextAuth
├── ocr-service.ts              # GPT-4 Vision para recibos
├── nlp-gemini-service.ts       # Gemini para comandos de voz
├── chat-service.ts             # GPT para chat financiero
├── storage-service.ts          # Vercel Blob + local storage
├── balance-utils.ts            # Cálculos de balance
└── financial-ai-analyzer.ts    # Análisis financiero con IA

middleware.ts                   # Protección de rutas

scripts/
└── 00-setup-database-complete.sql  # Schema PostgreSQL
```

## Decisiones de Diseño

### 1. App Router vs Pages Router
**Decisión**: App Router (Next.js 14+)
**Razón**: Server Components por defecto, mejor performance, layouts anidados, API Routes mejoradas

### 2. Autenticación con NextAuth
**Decisión**: NextAuth.js v4 con Credentials Provider
**Razón**: Integración nativa con Next.js, sesiones JWT, middleware de protección

### 3. Base de Datos: Neon PostgreSQL
**Decisión**: PostgreSQL serverless (Neon)
**Razón**: Escalable, compatible con Vercel, branching de BD para desarrollo

### 4. Almacenamiento: Vercel Blob
**Decisión**: Vercel Blob para producción, filesystem para desarrollo
**Razón**: Integración nativa con Vercel, CDN global, API simple

### 5. IA: OpenAI + Gemini
**Decisión**: GPT-4o-mini para OCR/Chat, Gemini 2.0 para NLP de voz
**Razón**: GPT-4 Vision mejor para OCR, Gemini más económico para comandos simples

### 6. Estado Global: Zustand
**Decisión**: Zustand para estado de UI (no datos de servidor)
**Razón**: Ligero, sin boilerplate, persiste fácilmente en localStorage

## Patrones de Diseño

### Server Components por defecto
```tsx
// No necesita "use client"
export default async function Page() {
  const data = await fetchData(); // Fetch directo en servidor
  return <View data={data} />;
}
```

### Client Components solo cuando necesario
```tsx
"use client"; // Solo si usa hooks, eventos, estado

import { useState } from "react";
export function InteractiveForm() {
  const [value, setValue] = useState("");
  // ...
}
```

### API Routes con autenticación
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  
  // Lógica protegida
}
```

### Tipos TypeScript centralizados
```typescript
// lib/types.ts - Single source of truth
export interface Transaction {
  id: number;
  type: "gasto" | "ingreso";
  amount: number;
  category: string;
  date: string;
  // ...
}
```

## Seguridad

- **Autenticación**: NextAuth con JWT sessions
- **Protección de rutas**: Middleware bloquea acceso no autenticado
- **API protegida**: Validación de sesión en cada endpoint
- **Recibos protegidos**: `/api/receipts/image/[hash]` valida ownership
- **CORS**: Configurado solo para orígenes permitidos
- **Variables de entorno**: Secretos en `.env.local` (nunca en repo)

## Performance

- Server Components: HTML pre-renderizado, menos JavaScript
- Streaming SSR: Respuestas progresivas
- Image optimization: `next/image` con lazy loading
- Code splitting: Automático por ruta
- Edge middleware: Validación de auth en edge network

## Documentación Relacionada

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Guía de desarrollo
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy y configuración
- [RECEIPT_SCANNING.md](./RECEIPT_SCANNING.md) - Detalles de OCR
- [TESTING.md](./TESTING.md) - Estrategia de pruebas
