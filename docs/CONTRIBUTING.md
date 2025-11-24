# Guía de Contribución - CashFlow

Gracias por tu interés en contribuir a CashFlow.

## Reportar Bugs

1. Busca primero en [Issues](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/issues) si ya fue reportado
2. Crea un nuevo issue con:
   - Título descriptivo
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica
   - Entorno (OS, navegador, versión de Node)

## Sugerir Mejoras

1. Verifica que no existe en [Issues](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/issues)
2. Crea un issue describiendo la funcionalidad y el problema que resuelve

## Contribuir Código

### Setup Rápido

```bash
# Fork el repo y clónalo
git clone https://github.com/TU-USUARIO/FinanzasPersonales-PyI-II.git
cd FinanzasPersonales-PyI-II

# Instala dependencias
npm install

# Crea tu rama
git checkout -b feature/mi-funcionalidad

# Desarrolla y prueba
npm run dev
npm run build
npm run lint
```

### Proceso

1. **Crea una rama** con nombre descriptivo:
   - `feature/nueva-funcionalidad`
   - `fix/corregir-bug`
   - `docs/actualizar-readme`

2. **Haz commits claros** siguiendo [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: agregar filtro de fecha"
   git commit -m "fix: corregir cálculo de balance"
   git commit -m "docs: actualizar guía de instalación"
   ```

3. **Push y crea un Pull Request**:
   ```bash
   git push origin feature/mi-funcionalidad
   ```
   - Describe claramente los cambios
   - Vincula el issue relacionado: "Closes #123"
   - Asegúrate de que pase lint y build

## Estándares de Código

### TypeScript
- Usa tipos explícitos, evita `any`
- Nombres descriptivos de variables y funciones
- Funciones pequeñas con responsabilidad única

### React
```tsx
// Bien
interface Props {
  account: Account
  onUpdate: (account: Account) => void
}

export function AccountCard({ account, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  
  const handleSave = () => {
    onUpdate(account)
  }
  
  return <div>{account.name}</div>
}
```

### Commits
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Documentación
- `refactor:` Refactorización
- `style:` Formateo
- `test:` Tests
- `chore:` Mantenimiento

## Criterios de Aprobación

Un PR se puede mergear cuando:
- Pasa lint y build
- Tiene al menos una aprobación
- El código sigue los estándares
- No rompe funcionalidad existente

## Recursos

- [README Principal](../README.md)
- [Guía de Desarrollo](DEVELOPER_GUIDE.md)
- [Arquitectura](ARCHITECTURE.md)
- [Issues](https://github.com/ManuhCardoso1501/FinanzasPersonales-PyI-II/issues)

## Código de Conducta

- Sé respetuoso y constructivo
- Acepta críticas constructivas
- Enfócate en lo mejor para el proyecto
- Si tienes dudas, pregunta
