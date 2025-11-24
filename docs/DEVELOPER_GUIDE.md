# Guía para Desarrolladores - CashFlow

## Prerequisitos

Conocimiento requerido:
- TypeScript/JavaScript (ES6+)
- React 18+ (Hooks, Context API)
- Next.js 14 (App Router, Server Components)
- Tailwind CSS
- PostgreSQL (básico)
- Git (branches, PRs)

Herramientas recomendadas:
- VS Code con extensiones: ESLint, Prettier, Tailwind CSS IntelliSense
- Cliente DB: pgAdmin, DBeaver o Neon Console
- Cliente API: Postman, Thunder Client o Insomnia

## Setup Rápido

```bash
# Clonar y configurar
git clone https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II.git
cd FinanzasPersonales-PyI-II
npm install

# Variables de entorno (ver README)
cp .env.example .env.local

# Desarrollo
npm run dev
```

## Estructura del Código

```
app/                    # Pages y API Routes (App Router)
├── (paginas)/          # Rutas de UI
└── api/                # Endpoints REST

components/             # Componentes React
├── ui/                 # Componentes base (shadcn/ui)
├── auth/               # Autenticación
├── transactions/       # Transacciones
└── ...                 # Por feature

lib/                    # Lógica de negocio
├── db.ts               # Queries a PostgreSQL
├── types.ts            # Tipos TypeScript
├── auth.ts             # Configuración NextAuth
└── ...                 # Servicios

docs/                   # Documentación técnica
```

## Flujo de Desarrollo

### 1. Crear Branch
```bash
git checkout -b feature/nombre-feature
# o
git checkout -b fix/nombre-bug
```

### 2. Desarrollo con Hot Reload
```bash
npm run dev  # http://localhost:3000
```

### 3. Tipos TypeScript
```typescript
// Siempre definir tipos en lib/types.ts
export interface MiTipo {
  id: number;
  nombre: string;
}

// Usar en componentes
import { MiTipo } from '@/lib/types';
```

### 4. API Routes
```typescript
// app/api/miendpoint/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  
  // Tu lógica aquí
  return Response.json({ data: resultado });
}
```

### 5. Componentes
```tsx
// components/mi-feature/mi-componente.tsx
"use client"; // Solo si usa hooks/estado

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MiComponente() {
  const [estado, setEstado] = useState(false);
  
  return (
    <div>
      <Button onClick={() => setEstado(!estado)}>
        Toggle
      </Button>
    </div>
  );
}
```

## Testing

```bash
# Tests unitarios (NLP service)
npx tsx lib/__tests__/nlp-service.test.ts

# Test conexión DB
npx tsx tests/test-connection.js

# Test balance
npx tsx tests/test-balance.ts
```

Ver [TESTING.md](./TESTING.md) para detalles completos.

## Debugging

### Errores comunes

**Error: `NEXT_PUBLIC_DATABASE_URL` no definida**
```bash
# Verificar .env.local tiene todas las variables del README
```

**Error de autenticación**
```bash
# Verificar NEXTAUTH_SECRET está configurado
# Regenerar: openssl rand -base64 32
```

**Error de conexión a DB**
```bash
# Verificar que Neon esté activo
# Probar conexión: npx tsx tests/test-connection.js
```

### Console Logs vs Debugger

```typescript
// Development: console logs
console.log("Debug:", variable);

// Production: usar try/catch
try {
  // código
} catch (error) {
  console.error("Error en X:", error);
}
```

## Buenas Prácticas

### Código
- Seguir convenciones de nombres del proyecto
- Componentes en PascalCase, archivos en kebab-case
- Usar tipos TypeScript explícitos
- Comentarios solo cuando agregan valor

### Git
- Commits descriptivos: `feat: agregar filtro de transacciones`
- Branches descriptivos: `feature/filtro-transacciones`
- PR con contexto claro del cambio

### Performance
- Componentes Server por defecto
- `"use client"` solo cuando necesario
- Lazy loading para componentes pesados
- Optimizar imágenes con next/image

## Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

Consulta también:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Diseño del sistema
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy y producción
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guía de contribución
