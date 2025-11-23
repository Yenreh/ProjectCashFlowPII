# Módulo de Escaneo de Recibos (OCR)

## Descripción

Este módulo implementa la funcionalidad de escanear y extraer información de recibos y facturas usando inteligencia artificial (GPT-4 Vision). Permite a los usuarios tomar fotos de sus recibos y automáticamente extraer el monto, comercio, fecha y categoría.

## Características

- **OCR con IA**: Usa GPT-4o-mini para extracción precisa de datos
- **Almacenamiento eficiente**: Imágenes guardadas con hash SHA-256 (deduplicación automática)
- **Validación de calidad**: Detecta imágenes borrosas o ilegibles
- **Mapeo inteligente**: Asocia automáticamente con categorías existentes
- **Nivel de confianza**: Indica qué tan precisa es la extracción

## Arquitectura

### Flujo de Datos

```
Usuario toma foto → POST /api/receipts/scan
                    ↓
            Validación de imagen
                    ↓
            Guardar en /media/receipts/{hash}.jpg
                    ↓
            Procesar con GPT-4 Vision
                    ↓
            Extraer datos estructurados
                    ↓
            Mapear a categorías existentes
                    ↓
            Retornar JSON con datos + hash
```

### Estructura de Archivos

```
lib/
├── receipt-types.ts       # Tipos TypeScript para recibos
├── ocr-service.ts         # Servicio de OCR con OpenAI
├── storage-service.ts     # Gestión de almacenamiento de imágenes
└── types.ts               # Tipos extendidos (Transaction)

app/api/receipts/
├── scan/route.ts          # POST - Escanear recibo
└── image/[hash]/route.ts  # GET - Obtener imagen por hash

public/media/receipts/     # Directorio de imágenes
├── .gitkeep
└── {hash}.jpg             # Imágenes guardadas

scripts/
└── 04-add-receipt-support.sql  # Migración de BD
```

## Base de Datos

### Campos Agregados a `transactions`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `source` | `VARCHAR(10)` | Fuente: 'manual', 'voice', 'image' |
| `image_hash` | `VARCHAR(64)` | Hash SHA-256 de la imagen |
| `merchant` | `VARCHAR(255)` | Nombre del comercio |
| `ocr_confidence` | `NUMERIC(3,2)` | Nivel de confianza (0-1) |
| `edited` | `BOOLEAN` | Si fue editado después del escaneo |

## API Endpoints

### POST /api/receipts/scan

Escanea un recibo y extrae información estructurada.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Recibo procesado correctamente",
  "data": {
    "merchant": "Éxito",
    "amount": 45000,
    "currency": "COP",
    "date": "2025-11-23",
    "categoryName": "Alimentación",
    "categoryId": 1,
    "confidence": 0.87,
    "imageHash": "a1b2c3d4e5f6...",
    "needsRetry": false,
    "llmMetadata": {
      "model": "gpt-4o-mini",
      "latencyMs": 2300
    }
  }
}
```

**Response Error - Baja Calidad (422):**
```json
{
  "success": false,
  "error": "IMAGE_QUALITY_TOO_LOW",
  "message": "La imagen es muy borrosa. Por favor, toma otra foto."
}
```

### GET /api/receipts/image/[hash]

Obtiene la imagen de un recibo por su hash.

**Response:**
- Imagen JPEG o PNG
- Headers: `Cache-Control: public, max-age=31536000, immutable`

## Configuración

### Variables de Entorno

Agrega a tu archivo `.env`:

```bash
# Requerido para escaneo de recibos
OPENAI_API_KEY="sk-..."
```

### Migración de Base de Datos

Ejecuta el script de migración:

```bash
# Opción 1: psql
psql $DATABASE_URL -f scripts/04-add-receipt-support.sql

# Opción 2: Node.js
node scripts/run-migration.js
```

## Uso

### Desde el Frontend

```typescript
// 1. Capturar imagen (con input file o cámara)
const file = event.target.files[0]
const reader = new FileReader()

reader.onload = async () => {
  const imageBase64 = reader.result as string
  
  // 2. Enviar al endpoint
  const response = await fetch('/api/receipts/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 })
  })
  
  const result = await response.json()
  
  if (result.success) {
    const { merchant, amount, categoryId, imageHash } = result.data
    
    // 3. Mostrar datos extraídos para validación del usuario
    // 4. Crear transacción con los datos confirmados
    await fetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        account_id: selectedAccountId,
        category_id: categoryId,
        type: 'gasto',
        amount: amount,
        description: merchant,
        date: result.data.date,
        source: 'image',
        image_hash: imageHash,
        merchant: merchant,
        ocr_confidence: result.data.confidence,
        edited: false
      })
    })
  }
}

reader.readAsDataURL(file)
```

### Mostrar Imagen de Recibo

```tsx
// Componente React
function ReceiptImage({ imageHash }: { imageHash: string }) {
  return (
    <img 
      src={`/api/receipts/image/${imageHash}`}
      alt="Recibo"
      className="w-full rounded-lg"
    />
  )
}

// O usar la ruta estática directa
<img src={`/media/receipts/${imageHash}.jpg`} alt="Recibo" />
```

## Almacenamiento

### Sistema de Hash

Las imágenes se guardan usando SHA-256:
- **Ventaja**: Deduplicación automática (misma imagen = mismo hash)
- **Seguridad**: No expone información sensible en el nombre
- **Eficiencia**: Búsqueda rápida por hash

### Estructura de Archivos

```
public/media/receipts/
├── .gitkeep
├── a1b2c3d4e5f6789012345678901234567890abcdef.jpg
├── b2c3d4e5f6789012345678901234567890abcdef12.jpg
└── c3d4e5f6789012345678901234567890abcdef1234.jpg
```

### Gestión de Espacio

Para limpiar imágenes antiguas o huérfanas:

```typescript
import { deleteReceiptImage } from '@/lib/storage-service'

// Eliminar imagen específica
await deleteReceiptImage('hash-de-la-imagen')

// Script de limpieza (crear en scripts/)
// Elimina imágenes sin transacciones asociadas
```

## Seguridad

### Validaciones

1. **Formato**: Solo imágenes base64 válidas
2. **Tamaño**: Máximo 20MB
3. **Tipo**: JPEG, PNG
4. **API Key**: No expuesta al cliente (solo en servidor)

### Mejores Prácticas

- Las imágenes están en `/public` pero con nombres hash (no predecibles)
- El hash no es reversible (no se puede obtener la imagen original)
- Se puede agregar autenticación a `/api/receipts/image/[hash]`

## Costos

### OpenAI GPT-4o-mini

- **Modelo**: gpt-4o-mini (económico)
- **Costo**: ~$0.00015 USD por imagen
- **Tokens**: ~1000 tokens por request
- **Latencia**: 2-5 segundos

### Optimizaciones

- Usar `detail: "high"` solo cuando sea necesario
- Cachear resultados si el hash ya fue procesado
- Implementar límite de rate para evitar abuso

## Troubleshooting

### Error: "OPENAI_API_KEY no configurada"

Solución: Agrega la API key en `.env`:
```bash
OPENAI_API_KEY="sk-..."
```

### Error: "IMAGE_QUALITY_TOO_LOW"

Causas:
- Imagen borrosa
- Luz inadecuada
- Recibo arrugado

Solución: Pedir al usuario tomar otra foto

### Error: "No se encontró categoría"

El modelo sugiere una categoría que no existe en la BD.

Solución:
1. Agregar más categorías en `02-seed-categories.sql`
2. Mejorar el mapeo en `ocr-service.ts`
3. Usar categoría por defecto ("Otros Gastos")

## Próximas Mejoras

- [ ] Soporte para múltiples recibos en una foto
- [ ] Extracción de items individuales (no solo total)
- [ ] OCR offline con Tesseract (fallback)
- [ ] Compresión de imágenes automática
- [ ] Detección de duplicados por contenido (no solo hash)
- [ ] Soporte para recibos en otros idiomas
- [ ] Exportación de recibos a PDF

## Referencias

- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [GPT-4o-mini Pricing](https://openai.com/pricing)
- [SHA-256 Hash](https://en.wikipedia.org/wiki/SHA-2)

---

**Implementado**: Noviembre 2025
**Versión**: 1.0.0
