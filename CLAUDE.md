# Ethos Stock Control - Guía de Desarrollo

## Descripción del Sistema

Sistema de gestión de inventario con soporte multi-proveedor para comparar precios y calcular márgenes de ganancia.

## Arquitectura

- **Backend**: NestJS + MongoDB (Mongoose) en `apps/api/`
- **Frontend**: Next.js 14 + React en `apps/web/`
- **Shared**: Tipos y enums compartidos en `packages/shared/`

## Estructura de Módulos

```
apps/api/src/modules/
├── auth/               # Autenticación JWT
├── users/              # Gestión de usuarios
├── families/           # Categorías de productos
├── subfamilies/        # Subcategorías
├── products/           # Productos (sistema original)
├── stock/              # Movimientos de inventario
├── import/             # Importación bulk desde Excel
├── suppliers/          # Proveedores
├── supplier-products/  # Productos por proveedor
├── unified-products/   # Productos unificados + mapeo
└── mapping-settings/   # Configuración de auto-mapeo
```

---

## Sistema Multi-Proveedor (En Desarrollo)

### Concepto

El cliente recibe listas de precios de múltiples proveedores (ej: 3 proveedores diferentes). Cada proveedor tiene:
- Códigos de producto propios
- Nombres diferentes para los mismos productos
- Precios y descuentos diferentes

El sistema permite:
1. Importar listas de cada proveedor
2. Unificar productos equivalentes entre proveedores
3. Comparar precios
4. Elegir el mejor proveedor por producto
5. Calcular precio de venta con margen de ganancia

### Schemas

```
Supplier (Proveedor)
├── name (único)
├── code, contactName, email, phone
├── isActive
└── createdBy

SupplierProduct (Producto del Proveedor)
├── supplierId → Supplier
├── supplierSku (único por proveedor)
├── supplierName
├── basePrice, discountPercent
├── netCost (calculado: basePrice * (1 - discount/100))
├── unifiedProductId → UnifiedProduct (opcional)
└── importJobId → ImportJob

UnifiedProduct (Producto Unificado)
├── sku (interno, único)
├── name, description
├── familyId, subfamilyId
├── stock, stockMin
├── selectedSupplierProductId → SupplierProduct
├── selectedCost (costo del proveedor elegido)
├── profitMarginPercent (margen deseado)
├── salePrice (calculado: cost * (1 + margin/100))
└── status

MappingSettings (Configuración de Auto-Mapeo)
├── key: 'default' (singleton)
├── autoMapOnImport: boolean
├── autoMapStrategy: 'exact_sku' | 'similar_name' | 'disabled'
├── defaultProfitMargin: number (0-100)
├── minMatchScore: number (0-100)
└── createUnifiedIfNoMatch: boolean
```

### Fórmulas de Precio

```
Costo Neto = Precio Base × (1 - Descuento% / 100)
Precio Venta = Costo Seleccionado × (1 + Margen% / 100)
```

---

## Fases de Implementación

### Fase 1: Proveedores (CRUD)
- [x] Backend: SuppliersModule con CRUD completo
- [x] Frontend: Página /suppliers con lista y formulario
- [x] Permisos: SUPPLIERS_READ, SUPPLIERS_MANAGE

### Fase 2: Importación de Listas de Proveedor
- [x] Schema SupplierProduct
- [x] SupplierProductsModule
- [x] Modificar ImportJob para soportar supplierId
- [x] SupplierImportService
- [x] Frontend: Selector de proveedor en importación

### Fase 3: Productos Unificados + Mapeo
- [x] Schema UnifiedProduct
- [x] UnifiedProductsModule (service + controller + DTOs)
- [x] MappingSuggesterService (sugerencias por similitud)
- [x] Frontend: Interfaz de mapeo
- [x] Frontend: Comparativa de precios
- [x] Frontend: Calculadora de margen

### Fase 4: Auto-mapeo Configurable
- [x] MappingSettingsModule (backend + frontend)
- [x] Settings: autoMapOnImport, autoMapStrategy, defaultProfitMargin, createUnifiedIfNoMatch
- [x] Estrategias: exact_sku, similar_name, disabled
- [x] Auto-mapeo integrado en flujo de importación

---

## Módulos Implementados

### Backend (apps/api/src/modules/)

| Módulo | Descripción | Endpoints |
|--------|-------------|-----------|
| `mapping-settings` | Configuración de auto-mapeo | GET/PATCH `/mapping-settings` |
| `unified-products` | Productos unificados + mapeo | CRUD + `/suggestions`, `/auto-map`, `/create-from-unmapped`, `/link` |
| `supplier-products` | Productos de proveedores | CRUD + `createOrUpdate` |
| `suppliers` | Gestión de proveedores | CRUD completo |

### Frontend (apps/web/src/features/)

| Feature | Componentes |
|---------|-------------|
| `unified-products` | `mapping-dialog`, `price-comparison-dialog`, `unified-product-dialog` |
| `mapping-settings` | API hooks para configuración |
| `import` | Selector de tipo (standard/supplier) + selector de proveedor |

---

## Flujo de Usuario

```
1. Crear proveedores ("Proveedor A", "Proveedor B", "Proveedor C")

2. Importar lista de Proveedor A
   → Se crean SupplierProducts asociados a Proveedor A

3. Importar lista de Proveedor B y C
   → Cada uno tiene sus propios SupplierProducts

4. Unificar productos
   → Usuario ve productos sin mapear
   → Sistema sugiere coincidencias por nombre/código similar
   → Usuario confirma mapeo
   → Se crea UnifiedProduct con referencias a SupplierProducts

5. Comparar y elegir
   → Usuario ve comparativa de precios entre proveedores
   → Elige proveedor preferido
   → Define margen de ganancia (ej: 30%)
   → Sistema calcula precio de venta automáticamente

6. Actualizar precios
   → Proveedor envía nueva lista
   → Usuario importa
   → Sistema actualiza SupplierProducts existentes
   → Costos en UnifiedProducts se actualizan automáticamente
```

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia API y Web en paralelo

# Solo API
cd apps/api && npm run dev

# Solo Web
cd apps/web && npm run dev

# Build
npm run build:shared     # Compilar tipos compartidos
npm run build            # Build completo
```

---

## Variables de Entorno

### Backend (apps/api)
```
MONGODB_URI=mongodb://localhost:27017/ethos-stock
JWT_ACCESS_SECRET=your-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=7d
API_PORT=3001
API_CORS_ORIGIN=http://localhost:3000
```

### Frontend (apps/web)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Deployment

- **Backend**: Render (usa variable PORT automática)
- **Frontend**: Vercel
- **Database**: MongoDB Atlas

---

## Notas de Desarrollo

- El sistema Product original se mantiene separado de UnifiedProduct
- Ambos sistemas pueden coexistir
- Los productos importados via el nuevo sistema van a SupplierProduct → UnifiedProduct
- El mapeo entre productos de diferentes proveedores es manual con sugerencias automáticas
