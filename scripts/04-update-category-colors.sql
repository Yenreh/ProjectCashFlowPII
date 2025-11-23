-- Actualizar colores de categorías de INGRESOS (colores fríos)
UPDATE categories SET color = 'hsl(145, 60%, 45%)' WHERE name = 'Salario';
UPDATE categories SET color = 'hsl(200, 70%, 50%)' WHERE name = 'Freelance';
UPDATE categories SET color = 'hsl(160, 65%, 45%)' WHERE name = 'Inversiones';
UPDATE categories SET color = 'hsl(220, 70%, 55%)' WHERE name = 'Ventas';
UPDATE categories SET color = 'hsl(280, 60%, 50%)' WHERE name = 'Otros Ingresos';

-- Actualizar colores de categorías de GASTOS (colores cálidos)
UPDATE categories SET color = 'hsl(25, 70%, 50%)' WHERE name = 'Alimentación';
UPDATE categories SET color = 'hsl(15, 80%, 55%)' WHERE name = 'Transporte';
UPDATE categories SET color = 'hsl(35, 75%, 55%)' WHERE name = 'Vivienda';
UPDATE categories SET color = 'hsl(5, 70%, 50%)' WHERE name = 'Servicios';
UPDATE categories SET color = 'hsl(45, 85%, 55%)' WHERE name = 'Entretenimiento';
UPDATE categories SET color = 'hsl(20, 75%, 45%)' WHERE name = 'Salud';
UPDATE categories SET color = 'hsl(10, 65%, 50%)' WHERE name = 'Educación';
UPDATE categories SET color = 'hsl(30, 70%, 60%)' WHERE name = 'Compras';
UPDATE categories SET color = 'hsl(0, 0%, 50%)' WHERE name = 'Otros Gastos';
