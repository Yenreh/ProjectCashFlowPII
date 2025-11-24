# Módulo de Escaneo de Recibos (OCR) - CashFlow

## Descripción

Escaneo automático de recibos y facturas usando GPT-4 Vision (OCR con IA). Extrae monto, comercio, fecha y categoría de fotos de recibos, con almacenamiento eficiente mediante hash SHA-256.

## Características

- **OCR con IA**: GPT-4o-mini para extracción precisa
- **Deduplicación**: Hash SHA-256 evita duplicados
- **Validación de calidad**: Detecta imágenes borrosas o ilegibles
- **Mapeo inteligente**: Asocia automáticamente con categorías existentes
- **Confidence score**: Nivel de confianza de la extracción (0.0-1.0)
- **Almacenamiento seguro**: Vercel Blob (producción) o local (desarrollo)
- **Protección de acceso**: Middleware + API autenticada con validación de ownership

## Arquitectura

### Flujo de Datos

```
1. Usuario toma foto
   ↓
2. POST /api/receipts/scan
   ↓
3. Validación imagen (tamaño, formato, calidad)
   ↓
4. Generar hash SHA-256 (deduplicación)
   ↓
5. Guardar en storage:
   - Vercel Blob (producción): put(blob, metadata)
   - Local (dev): /media/receipts/{hash}.jpg
   ↓
6. OCR con GPT-4 Vision
   ↓
7. Extraer datos estructurados:
   {
     amount: number,
     merchant: string,
     date: string,
     category: string,
     confidence: 0.0-1.0
   }
   ↓
8. Mapear a categorías existentes
   ↓
9. Response con datos + image_hash
   ↓
10. Frontend usa image_hash para:
    - GET /api/receipts/image/[hash] (protegido)
```

### Seguridad

**Protección de imágenes**:
```
middleware.ts
  ↓ Bloquea /media/* (no excluye)
  
/api/receipts/image/[hash]
  ↓ Validar sesión (NextAuth)
  ↓ Verificar ownership (user_id match)
  ↓ Servir imagen:
    - Vercel Blob: fetch interno + pipe
    - Local: readFile + stream
```

**Storage Service** (`lib/storage-service.ts`):
```typescript
// URLs protegidas
return `/api/receipts/image/${hash}`;
// NO exponer /media directamente
```

## API

### POST /api/receipts/scan

**Request**:
```typescript
// FormData
{
  file: File,  // JPG, PNG o PDF
  userId: string
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "amount": 25000,
    "merchant": "Supermercado XYZ",
    "date": "2025-01-15",
    "category": "Comida",
    "confidence": 0.92,
    "image_hash": "a3f4b2c1d5e..."
  }
}
```

**Errores**:
```json
// Imagen borrosa
{
  "success": false,
  "error": "Imagen ilegible o de baja calidad"
}

// Formato inválido
{
  "success": false,
  "error": "Formato no soportado. Use JPG, PNG o PDF"
}
```

### GET /api/receipts/image/[hash]

**Auth**: Requiere sesión NextAuth

**Validación**:
1. Verificar sesión activa
2. Buscar transacciones del usuario con `image_hash`
3. Si no hay match → 404

**Response**:
- `Content-Type: image/jpeg`
- Stream de imagen

## Configuración

### Variables de Entorno

```bash
# OpenAI (OCR)
OPENAI_API_KEY=sk-...

# Storage mode
STORAGE_MODE=vercel_blob  # o "local"

# Vercel Blob (solo producción)
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

### Estructura de Archivos

```
lib/
├── receipt-types.ts       # Tipos: ReceiptData, OCRResult
├── ocr-service.ts         # scanReceipt(image) → ReceiptData
├── storage-service.ts     # saveImage(), getImageUrl()
└── types.ts               # Transaction con image_hash

app/api/receipts/
├── scan/route.ts          # POST - Escanear
└── image/[hash]/route.ts  # GET - Servir (protegido)

public/media/receipts/     # Solo en desarrollo
├── .gitkeep
└── {hash}.jpg
```

## Uso en Frontend

### Componente Scanner

```tsx
// components/receipts/receipt-scanner.tsx
"use client";

import { scanReceipt } from '@/lib/ocr-service';

export function ReceiptScanner() {
  const handleScan = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', session.user.id);
    
    const response = await fetch('/api/receipts/scan', {
      method: 'POST',
      body: formData
    });
    
    const { data } = await response.json();
    
    // Usar data.image_hash para mostrar imagen
    // GET /api/receipts/image/{data.image_hash}
  };
  
  return (
    <input 
      type="file" 
      accept="image/*,application/pdf"
      onChange={(e) => handleScan(e.target.files[0])} 
    />
  );
}
```

### Mostrar Imagen de Recibo

```tsx
// components/transactions/transaction-item.tsx
import Image from 'next/image';

{transaction.image_hash && (
  <Image 
    src={`/api/receipts/image/${transaction.image_hash}`}
    alt="Recibo"
    width={200}
    height={200}
    className="rounded"
  />
)}
```

## Formato de Prompt OCR

```typescript
// ocr-service.ts
const prompt = `Analiza este recibo y extrae:
1. Monto total (número)
2. Nombre del comercio
3. Fecha (YYYY-MM-DD)
4. Categoría sugerida (una de: ${categories.join(', ')})
5. Nivel de confianza (0.0-1.0)

Responde en JSON:
{
  "amount": number,
  "merchant": string,
  "date": "YYYY-MM-DD",
  "category": string,
  "confidence": number
}`;
```

## Validaciones

### Pre-upload
- Tamaño máximo: 10MB
- Formatos: JPG, PNG, PDF
- Dimensiones mínimas: 200x200px

### Post-OCR
- `confidence < 0.5` → Solicitar re-escaneo
- `amount <= 0` → Rechazar
- `date` inválida → Usar fecha actual
- `category` no existe → Mapear a "Otros"

## Troubleshooting

**Error: "Imagen borrosa"**
```bash
# Ajustar threshold de confianza en ocr-service.ts
const MIN_CONFIDENCE = 0.5; // Bajar a 0.3 si es muy estricto
```

**Error: "OPENAI_API_KEY no definida"**
```bash
# Verificar .env.local
echo $OPENAI_API_KEY
```

**Error: "Imagen no se muestra"**
```bash
# Verificar que middleware NO excluya /media
# Verificar que API route valida sesión
# Verificar ownership en transacciones table
```

**Error: "Categoría incorrecta"**
```typescript
// Mejorar mapeo en ocr-service.ts
const categoryMapping = {
  "supermercado": "Comida",
  "restaurant": "Comida",
  "uber": "Transporte",
  // ...
};
```

## Mejoras Futuras

**Prioridad Alta**:
- Tests unitarios para OCR service (pendiente)
- Retry automático en fallos de extracción (pendiente)
- Preview de imagen antes de confirmar (pendiente)

**Prioridad Media**:
- Soporte para múltiples recibos en una imagen (pendiente)
- Extracción de items individuales (pendiente)
- Detección de duplicados por contenido (no solo hash) (pendiente)

**Prioridad Baja**:
- OCR offline con Tesseract.js (pendiente)
- Entrenamiento de modelo custom para recibos locales (pendiente)
- Exportar recibos como PDF (pendiente)

## Recursos

- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Storage Service](../lib/storage-service.ts)
- [OCR Service](../lib/ocr-service.ts)
