'use client';

import { useState } from 'react';
import { Plus, Link2, Percent, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  useUnifiedProducts,
  useUnifiedProductStats,
} from '@/features/unified-products/api/use-unified-products';
import { useFamilies } from '@/features/families/api/use-families';
import { UnifiedProductDialog } from '@/features/unified-products/components/unified-product-dialog';
import { MappingDialog } from '@/features/unified-products/components/mapping-dialog';
import { PriceComparisonDialog } from '@/features/unified-products/components/price-comparison-dialog';
import type { UnifiedProduct } from '@/features/unified-products/schemas/unified-product.schema';

export default function UnifiedProductsPage() {
  // Filters
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUnifiedProducts({
    search: search || undefined,
    familyId: familyFilter && familyFilter !== 'all' ? familyFilter : undefined,
    hasSupplier: supplierFilter && supplierFilter !== 'all' ? supplierFilter as 'true' | 'false' : undefined,
    page,
    limit: 20,
  });
  const { data: stats } = useUnifiedProductStats();
  const { data: families } = useFamilies();

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UnifiedProduct | null>(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos Unificados</h1>
          <p className="text-muted-foreground">
            Gestión de productos con comparación de precios entre proveedores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMappingDialogOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Mapear productos
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo producto
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Con proveedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{stats.withSupplier}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stock bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{stats.lowStockCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalStockValue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[250px]"
        />

        <Select value={familyFilter} onValueChange={setFamilyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas las familias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las familias</SelectItem>
            {families?.map((f) => (
              <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Con proveedor</SelectItem>
            <SelectItem value="false">Sin proveedor</SelectItem>
          </SelectContent>
        </Select>

        {(search || familyFilter || supplierFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setFamilyFilter('');
              setSupplierFilter('');
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Products list */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">SKU</th>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Familia</th>
              <th className="px-4 py-3 text-right font-medium">Costo</th>
              <th className="px-4 py-3 text-right font-medium">Margen</th>
              <th className="px-4 py-3 text-right font-medium">Precio Venta</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3 text-left font-medium">Proveedor</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((product) => (
              <tr key={product._id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                <td className="px-4 py-3">{product.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {product.familyId?.name || '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  {product.selectedCost > 0 ? formatCurrency(product.selectedCost) : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge variant="outline">{product.profitMarginPercent}%</Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {product.salePrice > 0 ? formatCurrency(product.salePrice) : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      product.stock <= product.stockMin
                        ? 'text-amber-600 font-medium'
                        : ''
                    }
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {product.selectedSupplierProductId ? (
                    <Badge variant="secondary">
                      {product.selectedSupplierProductId.supplierId?.name || 'Proveedor'}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Sin proveedor</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setPriceDialogOpen(true);
                    }}
                  >
                    <Percent className="h-4 w-4 mr-1" />
                    Precios
                  </Button>
                </td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No se encontraron productos unificados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {data.data.length} de {data.total} productos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <UnifiedProductDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <MappingDialog
        open={mappingDialogOpen}
        onOpenChange={setMappingDialogOpen}
      />

      {selectedProduct && (
        <PriceComparisonDialog
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
          product={selectedProduct}
        />
      )}
    </div>
  );
}
