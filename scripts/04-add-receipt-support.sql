-- Migración para soportar escaneo de recibos
-- Agrega campos para almacenar información de imágenes y OCR

-- Agregar columnas para soporte de recibos escaneados
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'image')),
ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(3,2) CHECK (ocr_confidence >= 0 AND ocr_confidence <= 1),
ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;

-- Crear índice para búsquedas por fuente
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);

-- Crear índice para transacciones con imagen (búsqueda por hash)
CREATE INDEX IF NOT EXISTS idx_transactions_image ON transactions(image_hash) WHERE image_hash IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN transactions.source IS 'Fuente de la transacción: manual, voice (comando de voz), o image (recibo escaneado)';
COMMENT ON COLUMN transactions.image_hash IS 'Hash SHA-256 de la imagen del recibo (nombre del archivo en /media/receipts/)';
COMMENT ON COLUMN transactions.ocr_confidence IS 'Nivel de confianza del OCR (0-1)';
COMMENT ON COLUMN transactions.edited IS 'Indica si la transacción fue editada por el usuario después del escaneo';
