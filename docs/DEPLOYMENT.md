# Guía de Despliegue - CashFlow

Esta guía cubre despliegue en Vercel. Para inicio rápido, ver [README](../README.md).

## Vercel

### Setup Inicial

```bash
# Via CLI
npm install -g vercel
vercel login
vercel

# Via GitHub
# 1. Conecta tu repo en vercel.com
# 2. Import Project automáticamente detecta Next.js
# 3. Configura variables de entorno
# 4. Deploy
```

### Variables de Entorno

```bash
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="tu_key"
ELEVEN_LABS_API_KEY="tu_key"
NEXTAUTH_SECRET="generate_with_openssl"
STORAGE_MODE="vercel_blob"
```

**Nota**: `NEXTAUTH_URL` NO es necesaria en Vercel.

### Vercel Blob Storage

Para recibos escaneados:

1. Dashboard → Storage → Create Database → Blob
2. Vercel inyecta automáticamente `BLOB_READ_WRITE_TOKEN`
3. Configura `STORAGE_MODE=vercel_blob`

### Dominios Personalizados

```
Settings → Domains → Add
Tipo: CNAME
Valor: cname.vercel-dns.com
```

SSL se configura automáticamente.

## Base de Datos

### Neon (Recomendado)

1. Crea proyecto en [neon.tech](https://neon.tech/)
2. Copia connection string
3. Ejecuta migrations:

```bash
psql $DATABASE_URL -f scripts/00-setup-database-complete.sql
```

### Supabase

1. Crea proyecto en [supabase.com](https://supabase.com/)
2. SQL Editor → pega contenido de `scripts/00-setup-database-complete.sql`
3. Copia connection string de Settings → Database

## Troubleshooting

### Build Falla

```bash
# Limpiar y rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Error de Conexión a BD

Verifica:
- Connection string correcta
- SSL requerido? Añade `?sslmode=require`
- Migrations ejecutadas

### Variables de Entorno No Funcionan

1. Verifica nombre exacto (case-sensitive)
2. Configura en todos los ambientes (Production/Preview/Development)
3. Redeploy: `vercel --force`

## Rollback

```bash
# En Vercel Dashboard
Deployments → [anterior] → "..." → Promote to Production

# O via CLI
vercel rollback
```

## Checklist Pre-Despliegue

- [ ] `npm run build` exitoso
- [ ] Variables de entorno configuradas
- [ ] Migrations ejecutadas
- [ ] Blob Storage habilitado (si usas recibos)
- [ ] Dominios configurados (opcional)

---

Ver [README](../README.md) para más detalles de instalación y uso.
