-- ============================================
-- SCRIPT COMPLETO DE BASE DE DATOS
-- FinanzasPersonales - Sistema Multiusuario
-- ============================================
-- Este script crea toda la estructura de la BD
-- e incluye datos de prueba para testing
-- ============================================

-- ============================================
-- 1. LIMPIAR BASE DE DATOS (OPCIONAL - DESCOMENTAR SI NECESITAS)
-- ============================================
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS accounts CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP FUNCTION IF EXISTS set_updated_at CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- ============================================
-- 2. CREAR TABLA DE USUARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda rápida por email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 3. CREAR TABLAS PRINCIPALES
-- ============================================

-- Categories (con soporte para categorías globales y personalizadas)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('ingreso', 'gasto')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Accounts (cuentas bancarias/efectivo por usuario)
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('efectivo', 'banco', 'tarjeta')),
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'COP',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions (con soporte de recibos OCR y asistente de voz)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('ingreso', 'gasto')),
  amount NUMERIC(18,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  source VARCHAR(10) DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'image')),
  image_hash VARCHAR(64),
  ocr_confidence NUMERIC(3,2) CHECK (ocr_confidence >= 0 AND ocr_confidence <= 1),
  edited BOOLEAN DEFAULT FALSE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_image ON transactions(image_hash) WHERE image_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_archived ON accounts(is_archived);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- ============================================
-- 5. CREAR FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para accounts
DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Triggers para transactions
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Trigger para users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================
COMMENT ON COLUMN transactions.source IS 'Fuente de la transacción: manual, voice (comando de voz), o image (recibo escaneado)';
COMMENT ON COLUMN transactions.image_hash IS 'Hash SHA-256 de la imagen del recibo';
COMMENT ON COLUMN transactions.ocr_confidence IS 'Nivel de confianza del OCR (0-1)';
COMMENT ON COLUMN transactions.edited IS 'Indica si la transacción fue editada por el usuario después del escaneo';
COMMENT ON COLUMN categories.user_id IS 'NULL = categoría global disponible para todos los usuarios';

-- ============================================
-- 7. SEED: CATEGORÍAS GLOBALES
-- ============================================
-- Categorías de ingresos (user_id = NULL = global)
INSERT INTO categories (name, category_type, icon, color, user_id) VALUES
  ('Salario', 'ingreso', 'Briefcase', 'hsl(145, 60%, 45%)', NULL),
  ('Freelance', 'ingreso', 'Laptop', 'hsl(200, 70%, 50%)', NULL),
  ('Inversiones', 'ingreso', 'TrendingUp', 'hsl(160, 65%, 45%)', NULL),
  ('Ventas', 'ingreso', 'ShoppingBag', 'hsl(220, 70%, 55%)', NULL),
  ('Otros Ingresos', 'ingreso', 'Plus', 'hsl(280, 60%, 50%)', NULL)
ON CONFLICT (name, user_id) DO NOTHING;

-- Categorías de gastos (user_id = NULL = global)
INSERT INTO categories (name, category_type, icon, color, user_id) VALUES
  ('Alimentación', 'gasto', 'UtensilsCrossed', 'hsl(25, 70%, 50%)', NULL),
  ('Transporte', 'gasto', 'Car', 'hsl(15, 80%, 55%)', NULL),
  ('Vivienda', 'gasto', 'Home', 'hsl(35, 75%, 55%)', NULL),
  ('Servicios', 'gasto', 'Zap', 'hsl(5, 70%, 50%)', NULL),
  ('Entretenimiento', 'gasto', 'Film', 'hsl(45, 85%, 55%)', NULL),
  ('Salud', 'gasto', 'Heart', 'hsl(20, 75%, 45%)', NULL),
  ('Educación', 'gasto', 'GraduationCap', 'hsl(10, 65%, 50%)', NULL),
  ('Compras', 'gasto', 'ShoppingCart', 'hsl(30, 70%, 60%)', NULL),
  ('Otros Gastos', 'gasto', 'MoreHorizontal', 'hsl(0, 0%, 50%)', NULL)
ON CONFLICT (name, user_id) DO NOTHING;

-- ============================================
-- 8. BASE DE DATOS LISTA PARA PRUEBAS
-- ============================================
-- NO se crean usuarios de prueba
-- Esto te permite probar el flujo completo:
-- 1. Registro de nuevo usuario
-- 2. Login
-- 3. Crear cuentas
-- 4. Crear transacciones
-- 5. Ver análisis financiero
-- ============================================

-- ============================================
-- 9. VERIFICACIÓN
-- ============================================
-- Verificar que todo se creó correctamente
SELECT 'USUARIOS' as tabla, COUNT(*) as registros FROM users
UNION ALL
SELECT 'CATEGORÍAS', COUNT(*) FROM categories
UNION ALL
SELECT 'CUENTAS', COUNT(*) FROM accounts
UNION ALL
SELECT 'TRANSACCIONES', COUNT(*) FROM transactions;

-- ============================================
-- ✅ BASE DE DATOS LISTA PARA TESTING
-- ============================================
-- La base de datos está configurada con:
-- - Tabla de usuarios (vacía - para que registres el primero)
-- - 14 categorías globales (disponibles para todos)
-- - Tablas de cuentas y transacciones (vacías)
--
-- FLUJO DE PRUEBA SUGERIDO:
-- 1. Ve a http://localhost:3000/registro
-- 2. Crea tu usuario (ej: test@test.com / password123)
-- 3. Inicia sesión
-- 4. Crea una cuenta (ej: "Efectivo", "banco", 1000000 COP)
-- 5. Crea transacciones
-- 6. Verifica el análisis financiero en el dashboard
-- 7. Prueba el OCR de recibos y asistente de voz
-- ============================================
