# CashFlow

[![Build Status](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/actions/workflows/ci.yml/badge.svg)](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Aplicación web moderna para gestionar tus finanzas personales de manera simple y efectiva. Sistema multiusuario completo con autenticación, control de ingresos, gastos, cuentas bancarias y reportes visuales.

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

# Storage Mode (opcional - default: vercel_blob)
STORAGE_MODE="local"  # Usa "local" en desarrollo, "vercel_blob" en producción
```

**Obtener API Keys:**
- Gemini: [Google AI Studio](https://aistudio.google.com/app/apikey)
- ElevenLabs: [elevenlabs.io](https://elevenlabs.io/)
- NextAuth Secret: Genera con `openssl rand -base64 32`

### 4. Configurar base de datos

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
4. El sistema extrae automáticamente: monto, fecha, comercio, categoría
5. Valida y ajusta la información
6. Confirma para registrar la transacción

**Nota sobre almacenamiento:**
- En **desarrollo local**: Las imágenes se guardan en `/public/media/receipts`
- En **producción (Vercel)**: Se usa Vercel Blob Storage automáticamente
- Configura `STORAGE_MODE=local` o `STORAGE_MODE=vercel_blob` en variables de entorno

### Transacciones Manuales

1. Ve a "Transacciones"
2. Click en "Nueva Transacción"
3. Selecciona tipo (Ingreso/Gasto)
4. Completa el formulario: monto, categoría, cuenta, fecha, descripción
5. Guarda la transacción

### Reportes

Analiza tus finanzas:
- **Gastos por categoría**: Gráfico circular con distribución
- **Ingresos por categoría**: Desglose de fuentes de ingreso
- **Filtros avanzados**: Por rango de fechas, por cuenta específica

## Despliegue en Vercel

### Automático vía GitHub

1. Conecta tu repo en [vercel.com](https://vercel.com/)
2. **Habilita Vercel Blob Storage**:
   - Ve a tu proyecto → Storage → Create Database → Blob
   - Esto configurará automáticamente `BLOB_READ_WRITE_TOKEN`
3. Configura variables de entorno en Vercel Dashboard:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `ELEVEN_LABS_API_KEY`
   - `NEXTAUTH_SECRET` (genera con `openssl rand -base64 32`)
   - `STORAGE_MODE=vercel_blob`
   - **Nota**: `NEXTAUTH_URL` NO es necesaria en Vercel (se detecta automáticamente)
4. Deploy automático con cada push a main

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
vercel env add STORAGE_MODE
```

### Configuración de Blob Storage

Para que el escaneo de recibos funcione en Vercel:

1. **Habilita Blob Storage** en tu proyecto de Vercel:
   - Dashboard → Storage → Create Database → Blob
   - Vercel inyectará automáticamente `BLOB_READ_WRITE_TOKEN`

2. **Configura el modo de almacenamiento**:
   ```bash
   vercel env add STORAGE_MODE
   # Valor: vercel_blob
   ```

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
- **Tablas principales**: users, categories, accounts, transactions
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

### Problemas con el escaneo de recibos en Vercel

Si obtienes errores de "read-only file system" en Vercel:

1. Verifica que `STORAGE_MODE=vercel_blob` esté configurado
2. Asegúrate de haber habilitado Blob Storage en tu proyecto de Vercel
3. Reinicia el deployment después de configurar las variables

Para desarrollo local, usa `STORAGE_MODE=local` en tu `.env.local`

## Contribuir

Ver [CONTRIBUTING.md](docs/CONTRIBUTING.md) para guías de contribución.

## Documentación Adicional

- [Arquitectura del Sistema](docs/ARCHITECTURE.md)
- [Guía de Desarrollo](docs/DEVELOPER_GUIDE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Escaneo de Recibos](docs/RECEIPT_SCANNING.md)
- [Versionado](docs/VERSIONING.md)
- [Changelog](docs/CHANGELOG.md)

## Estructura del Proyecto

```
FinanzasPersonales-PyI-II/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Autenticación
│   │   ├── accounts/      # CRUD de cuentas
│   │   ├── transactions/  # CRUD de transacciones
│   │   ├── categories/    # Gestión de categorías
│   │   ├── voice/         # Asistente de voz
│   │   ├── chat/          # Chat financiero
│   │   ├── receipts/      # Escaneo OCR
│   │   ├── dashboard/     # Métricas
│   │   ├── reports/       # Reportes
│   │   └── savings/       # Insights de ahorro
│   ├── cuentas/           # Página de cuentas
│   ├── transacciones/     # Página de transacciones
│   ├── reportes/          # Página de reportes
│   ├── registro/          # Página de registro
│   ├── login/             # Página de login
│   └── page.tsx           # Dashboard principal
├── components/            # Componentes React
├── lib/                   # Lógica de negocio
├── scripts/               # Scripts de base de datos
├── docs/                  # Documentación técnica
├── public/                # Archivos estáticos
└── middleware.ts          # Middleware de autenticación
```

## Licencia

MIT License - ver [LICENSE](LICENSE)
