'use client';

import { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Plus, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { useProducts } from '@/features/products/api/use-products';
import { useKardexEntries, useKardexSummary, useKardexLots } from '@/features/kardex/api/use-kardex';
import { KardexSummary } from '@/features/kardex/components/kardex-summary';
import { KardexTable } from '@/features/kardex/components/kardex-table';
import { KardexEntryDialog } from '@/features/kardex/components/kardex-entry-dialog';
import { LotViewer } from '@/features/kardex/components/lot-viewer';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission, ProductEntityType, MovementType } from '@ethos/shared';
import type { Product } from '@ethos/shared';

export default function KardexPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(Permission.KARDEX_MANAGE);

  // Product selection
  const [productType, setProductType] = useState<ProductEntityType>(ProductEntityType.PRODUCT);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCache, setSelectedProductCache] = useState<Product | null>(null);

  // Filters
  const [movementType, setMovementType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // UI state
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'kardex' | 'lots'>('kardex');

  // Fetch products for selector — server-side search
  const { data: productsData } = useProducts({
    limit: 50,
    search: productSearch || undefined,
  });
  // Memoize so the array identity is stable across renders (used in effect/memo deps below)
  const products = useMemo(() => productsData?.data ?? [], [productsData]);

  // Cache the selected product so it doesn't disappear when the search filter changes
  useEffect(() => {
    if (!selectedProductId) {
      setSelectedProductCache(null);
      return;
    }
    const found = products.find((p) => p._id === selectedProductId);
    if (found) setSelectedProductCache(found);
  }, [products, selectedProductId]);

  // Selected product info
  const selectedProduct =
    products.find((p) => p._id === selectedProductId) ?? selectedProductCache;

  // Show the selected product first if it's not in the current results
  const productsToShow = useMemo(() => {
    if (!selectedProduct) return products;
    const inList = products.some((p) => p._id === selectedProduct._id);
    return inList ? products : [selectedProduct, ...products];
  }, [products, selectedProduct]);

  // Kardex data
  const kardexQuery = selectedProductId
    ? {
        productId: selectedProductId,
        productType,
        type: movementType as MovementType | undefined || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 100,
      }
    : null;

  const { data: kardexData, isLoading: kardexLoading } = useKardexEntries(kardexQuery);
  const { data: summary, isLoading: summaryLoading } = useKardexSummary(
    selectedProductId || null,
    selectedProductId ? productType : null,
  );
  const { data: lots, isLoading: lotsLoading } = useKardexLots(
    selectedProductId || null,
    selectedProductId ? productType : null,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Kardex de Inventario
          </h1>
          <p className="text-muted-foreground">
            Historial detallado de entradas y salidas por producto, con costeo FIFO para conocer el costo real de cada unidad vendida y el margen efectivo.
          </p>
        </div>
      </div>

      {/* Product selector */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tipo de producto</Label>
            <Select
              value={productType}
              onValueChange={(val) => {
                setProductType(val as ProductEntityType);
                setSelectedProductId('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProductEntityType.PRODUCT}>
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" /> Productos
                  </span>
                </SelectItem>
                <SelectItem value={ProductEntityType.UNIFIED_PRODUCT}>
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Productos Unificados
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Producto</Label>
            <Select
              value={selectedProductId}
              onValueChange={setSelectedProductId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar un producto..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 sticky top-0 bg-popover z-10">
                  <SearchInput
                    value={productSearch}
                    onChange={setProductSearch}
                    placeholder="Buscar por nombre o SKU..."
                    debounceMs={250}
                  />
                </div>
                {productsToShow.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    <span className="font-mono text-xs mr-2">{p.sku}</span>
                    {p.name}
                  </SelectItem>
                ))}
                {productsToShow.length === 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    No se encontraron productos
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content when product selected */}
      {selectedProductId && selectedProduct && (
        <>
          {/* Summary */}
          <KardexSummary summary={summary} isLoading={summaryLoading} />

          {/* Tabs + Filters */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'kardex' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('kardex')}
              >
                Kardex
              </Button>
              <Button
                variant={activeTab === 'lots' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('lots')}
              >
                Lotes FIFO ({lots?.length ?? 0})
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'kardex' && (
                <>
                  <Select
                    value={movementType || '_all'}
                    onValueChange={(val) => setMovementType(val === '_all' ? '' : val)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todos</SelectItem>
                      <SelectItem value={MovementType.IN}>Entradas</SelectItem>
                      <SelectItem value={MovementType.OUT}>Salidas</SelectItem>
                      <SelectItem value={MovementType.ADJUSTMENT}>Ajustes</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[140px]"
                    placeholder="Desde"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[140px]"
                    placeholder="Hasta"
                  />
                </>
              )}

              {canManage && (
                <Button onClick={() => setEntryDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo movimiento
                </Button>
              )}
            </div>
          </div>

          {/* Table / Lots */}
          {activeTab === 'kardex' ? (
            <KardexTable
              data={kardexData?.data ?? []}
              isLoading={kardexLoading}
            />
          ) : (
            <LotViewer lots={lots ?? []} isLoading={lotsLoading} />
          )}
        </>
      )}

      {!selectedProductId && (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Selecciona un producto para ver su Kardex</p>
          <p className="text-sm">
            Elige el tipo de producto y seleccionalo del listado para ver sus movimientos.
          </p>
        </div>
      )}

      {/* Entry dialog */}
      {selectedProduct && (
        <KardexEntryDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          productId={selectedProductId}
          productType={productType}
          productName={`${selectedProduct.sku} - ${selectedProduct.name}`}
          currentStock={selectedProduct.stock}
        />
      )}
    </div>
  );
}
