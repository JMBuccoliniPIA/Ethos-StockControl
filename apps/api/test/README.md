# Tests E2E de integración

`e2e.mjs` es una suite de integración que corre contra la **API viva** (no usa base de
datos en memoria: pega contra el backend real levantado). No requiere dependencias
extra — usa `fetch` global de Node ≥ 18.

## Cómo correrla

```bash
# 1. Levantar el entorno (API + Web + Mongo)
npm run dev            # desde la raíz

# 2. En otra terminal
npm run test:e2e       # desde la raíz (o desde apps/api)
```

Sale con código `0` si todo pasa, `1` si algún assert falla (apto para CI).

## Variables de entorno (opcionales)

| Variable       | Default                          |
|----------------|----------------------------------|
| `E2E_API_URL`  | `http://localhost:3001/api/v1`   |
| `E2E_EMAIL`    | `admin@ethos.com`                |
| `E2E_PASSWORD` | `admin123`                       |

## Qué cubre

Auth (login OK / rechazo / endpoint protegido) · movimientos de stock atómicos
(OUT que excede stock rechazado, sin sobreventa) · **salida grande → asiento Kardex
con `previousStock`/`newStock` correctos** · concurrencia (2 salidas simultáneas no
sobrevenden) · ajuste de stock a 0 · cantidad negativa rechazada · IN exige proveedor
+ remito · OUT derivado a Venta · guards de borrado (proveedor / familia con
referencias) · validación de `currency` (`@IsIn`) · fórmulas `netCost` y `salePrice` ·
selección de proveedor persistida · limpieza de selección al borrar un SupplierProduct ·
lookup por SKU del scanner (OK / 404).

> Nota: la suite crea y limpia sus propios datos de prueba (`E2E-*`) y usa el producto
> `LED-TIRA-5M` como banco de pruebas de stock, restaurándolo al final.
