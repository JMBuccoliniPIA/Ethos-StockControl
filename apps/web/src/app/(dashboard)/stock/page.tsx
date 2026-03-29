'use client';

import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  PackagePlus,
  PackageMinus,
  ClipboardEdit,
  History,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { useProducts } from '@/features/products/api/use-products';
import { StockMovementDialog } from '@/features/stock/components/stock-movement-dialog';
import { MovementHistory } from '@/features/stock/components/movement-history';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission, MovementType } from '@ethos/shared';
import type { Product } from '@ethos/shared';

export default function StockPage() {
  const { hasPermission } = usePermissions();
  const canAdjust = hasPermission(Permission.STOCK_ADJUST);

  const { data, isLoading } = useProducts({ limit: 100, sortBy: 'stock', sortOrder: 'asc' });

  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>(MovementType.IN);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const openMovement = (product: Product, type: MovementType) => {
    setSelectedProduct(product);
    setMovementType(type);
    setMovementOpen(true);
  };

  const openHistory = (product: Product) => {
    setHistoryProduct(product);
    setHistoryOpen(true);
  };

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.sku}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Producto',
        cell: ({ row }) => {
          const family = row.original.familyId as any;
          return (
            <div>
              <span className="font-medium">{row.original.name}</span>
              {family?.name && (
                <p className="text-xs text-muted-foreground">{family.name}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'stock',
        header: 'Stock',
        cell: ({ row }) => {
          const { stock, stockMin } = row.original;
          const isLow = stock <= stockMin;
          const isEmpty = stock === 0;
          return (
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-bold ${
                  isEmpty
                    ? 'text-destructive'
                    : isLow
                      ? 'text-amber-600'
                      : ''
                }`}
              >
                {stock}
              </span>
              {isEmpty && (
                <Badge variant="destructive" className="text-[10px]">Sin stock</Badge>
              )}
              {!isEmpty && isLow && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-amber-600">Bajo</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'stockMin',
        header: 'Mín.',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.stockMin}</span>
        ),
      },
      {
        accessorKey: 'finalPrice',
        header: 'Precio',
        cell: ({ row }) => (
          <span className="text-sm">
            ${row.original.finalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {canAdjust && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => openMovement(row.original, MovementType.IN)}
                  title="Reponer stock"
                >
                  <PackagePlus className="h-4 w-4 mr-1" />
                  Entrada
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => openMovement(row.original, MovementType.OUT)}
                  title="Descontar stock"
                >
                  <PackageMinus className="h-4 w-4 mr-1" />
                  Salida
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => openMovement(row.original, MovementType.ADJUSTMENT)}
                  title="Ajustar stock"
                >
                  <ClipboardEdit className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openHistory(row.original)}
              title="Ver historial"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [canAdjust],
  );

  // Stats
  const products = data?.data ?? [];
  const lowStockCount = products.filter((p) => p.stock <= p.stockMin && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock</h1>
        <p className="text-muted-foreground">Control de inventario y movimientos de stock</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total productos</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Stock bajo
          </p>
          <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Sin stock</p>
          <p className="text-2xl font-bold text-destructive">{outOfStockCount}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={products}
        searchKeys={['name', 'sku']}
        searchPlaceholder="Buscar por nombre o SKU..."
      />

      <StockMovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        product={selectedProduct}
        defaultType={movementType}
      />

      <MovementHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        product={historyProduct}
      />
    </div>
  );
}
