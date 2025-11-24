-- Categorías de ingresos (colores fríos: verdes, azules, morados)
INSERT INTO categories (name, category_type, icon, color) VALUES
  ('Salario', 'ingreso', 'Briefcase', 'hsl(145, 60%, 45%)'),
  ('Freelance', 'ingreso', 'Laptop', 'hsl(200, 70%, 50%)'),
  ('Inversiones', 'ingreso', 'TrendingUp', 'hsl(160, 65%, 45%)'),
  ('Ventas', 'ingreso', 'ShoppingBag', 'hsl(220, 70%, 55%)'),
  ('Otros Ingresos', 'ingreso', 'Plus', 'hsl(280, 60%, 50%)')
ON CONFLICT (name) DO NOTHING;

-- Categorías de gastos (colores cálidos: naranjas, rojos, amarillos)
INSERT INTO categories (name, category_type, icon, color) VALUES
  ('Alimentación', 'gasto', 'UtensilsCrossed', 'hsl(25, 70%, 50%)'),
  ('Transporte', 'gasto', 'Car', 'hsl(15, 80%, 55%)'),
  ('Vivienda', 'gasto', 'Home', 'hsl(35, 75%, 55%)'),
  ('Servicios', 'gasto', 'Zap', 'hsl(5, 70%, 50%)'),
  ('Entretenimiento', 'gasto', 'Film', 'hsl(45, 85%, 55%)'),
  ('Salud', 'gasto', 'Heart', 'hsl(20, 75%, 45%)'),
  ('Educación', 'gasto', 'GraduationCap', 'hsl(10, 65%, 50%)'),
  ('Compras', 'gasto', 'ShoppingCart', 'hsl(30, 70%, 60%)'),
  ('Otros Gastos', 'gasto', 'MoreHorizontal', 'hsl(0, 0%, 50%)')
ON CONFLICT (name) DO NOTHING;
