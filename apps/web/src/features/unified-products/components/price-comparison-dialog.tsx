'use client';

import { useState, useEffect } from 'react';
import { Check, TrendingUp, Calculator } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useLinkedSupplierProducts,
  useSelectSupplier,
  useUpdateMargin,
} from '../api/use-unified-products';
import type { UnifiedProduct } from '../schemas/unified-product.schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: UnifiedProduct;
}

export function PriceComparisonDialog({ open, onOpenChange, product }: Props) {
  const [margin, setMargin] = useState(product.profitMarginPercent);
  const [cost, setCost] = useState(product.selectedCost);

  const { data: supplierProducts, isLoading } = useLinkedSupplierProducts(product._id);
  const selectSupplierMutation = useSelectSupplier();
  const updateMarginMutation = useUpdateMargin();

  // Reset margin when product changes
  useEffect(() => {
    setMargin(product.profitMarginPercent);
    setCost(product.selectedCost);
  }, [product]);

  const calculatedSalePrice = cost * (1 + margin / 100);
  const profit = calculatedSalePrice - cost;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  };

  const handleSelectSupplier = async (supplierProductId: string, netCost: number) => {
    await selectSupplierMutation.mutateAsync({
      id: product._id,
      supplierProductId,
    });
    setCost(netCost);
  };

  const handleSaveMargin = async () => {
    await updateMarginMutation.mutateAsync({
      id: product._id,
      margin,
    });
  };

  const getBestPrice = () => {
    if (!supplierProducts || supplierProducts.length === 0) return null;
    return supplierProducts.reduce((min, sp) =>
      sp.netCost < min.netCost ? sp : min
    );
  };

  const bestPrice = getBestPrice();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{product.name}</span>
            <Badge variant="outline" className="font-mono">
              {product.sku}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Supplier prices */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Comparativa de Precios
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : supplierProducts?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay proveedores vinculados a este producto
              </div>
            ) : (
              <div className="space-y-2">
                {supplierProducts?.map((sp) => {
                  const isSelected =
                    product.selectedSupplierProductId?._id === sp._id;
                  const isBest = bestPrice?._id === sp._id;

                  return (
                    <div
                      key={sp._id}
                      className={`rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {sp.supplierId.name}
                            </span>
                            {isBest && (
                              <Badge variant="secondary" className="text-[10px]">
                                Mejor precio
                              </Badge>
                            )}
                            {isSelected && (
                              <Badge className="text-[10px]">Seleccionado</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            SKU: {sp.supplierSku}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(sp.netCost)}</p>
                          {sp.discountPercent > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Lista: {formatCurrency(sp.basePrice)} (-{sp.discountPercent}%)
                            </p>
                          )}
                        </div>
                      </div>

                      {!isSelected && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => handleSelectSupplier(sp._id, sp.netCost)}
                          disabled={selectSupplierMutation.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Seleccionar este proveedor
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Margin calculator */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculadora de Precio
            </h3>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Costo seleccionado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(cost)}</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Margen de ganancia</Label>
                <span className="text-lg font-bold">{margin}%</span>
              </div>
              <input
                type="range"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                min={0}
                max={100}
                step={1}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex gap-2">
                {[10, 20, 30, 40, 50].map((m) => (
                  <Button
                    key={m}
                    variant={margin === m ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMargin(m)}
                  >
                    {m}%
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Costo:</span>
                <span>{formatCurrency(cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margen ({margin}%):</span>
                <span className="text-emerald-600">+{formatCurrency(profit)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Precio de venta:</span>
                <span>{formatCurrency(calculatedSalePrice)}</span>
              </div>
            </div>

            {margin !== product.profitMarginPercent && (
              <Button
                className="w-full"
                onClick={handleSaveMargin}
                disabled={updateMarginMutation.isPending}
              >
                {updateMarginMutation.isPending
                  ? 'Guardando...'
                  : 'Guardar nuevo margen'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
