# Sistema de Versionado

Este proyecto utiliza versionado automático basado en `version.json`.

## Cómo crear una nueva versión

### 1. Actualizar `version.json`

Edita el archivo `version.json` en la raíz del proyecto:

```json
{
  "version": "0.2.0",
  "name": "CashFlow",
  "description": "Sistema de Gestión de Finanzas Personales con IA"
}
```

### 2. Hacer commit y push

```bash
git add version.json
git commit -m "chore: bump version to 0.2.0"
git push origin main
```

### 3. Automático

El workflow de GitHub Actions automáticamente:
- Lee la versión de `version.json`
- Verifica que el tag no exista
- Actualiza `package.json` con la nueva versión
- Crea un commit de sincronización (con `[skip ci]`)
- Crea el tag `vX.Y.Z`
- Genera una GitHub Release con notas automáticas

## Esquema de versionado (Semantic Versioning)

```
v[MAJOR].[MINOR].[PATCH]
```

- **MAJOR** (1.0.0): Cambios incompatibles (breaking changes)
- **MINOR** (0.1.0): Nuevas funcionalidades compatibles
- **PATCH** (0.0.1): Correcciones de bugs

### Ejemplos:

```
v0.1.0 → v0.2.0  (nueva funcionalidad: escaneo de recibos)
v0.2.0 → v0.2.1  (corrección: fix en cálculo de balance)
v0.2.1 → v1.0.0  (breaking: reestructuración de API)
```

## Ver historial de versiones

```bash
# Ver todos los tags
git tag -l

# Ver detalles de un tag específico
git show v0.1.0

# Ver releases en GitHub
# https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/releases
```

## Importante

- No edites `package.json` manualmente para versionar
- Solo edita `version.json` para crear releases
- El workflow solo se ejecuta en pushes a `main`
- Si el tag ya existe, el workflow se saltea automáticamente

## Workflow ubicado en

`.github/workflows/versioning.yml`
