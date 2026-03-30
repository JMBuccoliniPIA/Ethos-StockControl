'use client';

import { useState } from 'react';
import { Link2, Plus, Wand2, Check, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useMappingSuggestions,
  useAutoMapByExactSku,
  useCreateFromUnmapped,
  useLinkSupplierProduct,
} from '../api/use-unified-products';
import { useActiveSuppliers } from '@/features/suppliers/api/use-suppliers';
import {
  useMappingSettings,
  useUpdateMappingSettings,
} from '@/features/mapping-settings/api/use-mapping-settings';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MappingDialog({ open, onOpenChange }: Props) {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: suppliers } = useActiveSuppliers();
  const { data: suggestions, isLoading, refetch } = useMappingSuggestions(
    selectedSupplier || undefined,
    100
  );
  const { data: settings } = useMappingSettings();
  const updateSettingsMutation = useUpdateMappingSettings();

  const autoMapMutation = useAutoMapByExactSku();
  const createFromUnmappedMutation = useCreateFromUnmapped();
  const linkMutation = useLinkSupplierProduct();

  const handleAutoMap = async () => {
    await autoMapMutation.mutateAsync(selectedSupplier || undefined);
    refetch();
  };

  const handleCreateFromSelected = async () => {
    if (selectedProducts.length === 0) return;
    await createFromUnmappedMutation.mutateAsync({
      supplierProductIds: selectedProducts,
      defaultMargin: settings?.defaultProfitMargin || 30,
    });
    setSelectedProducts([]);
    refetch();
  };

  const handleLink = async (supplierProductId: string, unifiedProductId: string) => {
    await linkMutation.mutateAsync({
      id: unifiedProductId,
      supplierProductId,
    });
    refetch();
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Mapear Productos de Proveedor</DialogTitle>
          <DialogDescription>
            Vincula productos de proveedores con productos unificados o crea nuevos
          </DialogDescription>
        </DialogHeader>

        {/* Settings Panel */}
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Configuración de Auto-Mapeo</span>
              {settings?.autoMapOnImport && (
                <Badge variant="secondary" className="text-[10px]">Activo</Badge>
              )}
            </div>
            {showSettings ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showSettings && settings && (
            <div className="p-4 border-t space-y-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Auto-mapear al importar</Label>
                  <Select
                    value={settings.autoMapOnImport ? 'true' : 'false'}
                    onValueChange={(val) =>
                      updateSettingsMutation.mutate({ autoMapOnImport: val === 'true' })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activado</SelectItem>
                      <SelectItem value="false">Desactivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Estrategia</Label>
                  <Select
                    value={settings.autoMapStrategy}
                    onValueChange={(val) =>
                      updateSettingsMutation.mutate({
                        autoMapStrategy: val as 'exact_sku' | 'similar_name' | 'disabled',
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact_sku">Solo SKU exacto</SelectItem>
                      <SelectItem value="similar_name">SKU o nombre similar</SelectItem>
                      <SelectItem value="disabled">Deshabilitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Margen por defecto: {settings.defaultProfitMargin}%</Label>
                  <input
                    type="range"
                    value={settings.defaultProfitMargin}
                    onChange={(e) =>
                      updateSettingsMutation.mutate({
                        defaultProfitMargin: Number(e.target.value),
                      })
                    }
                    min={0}
                    max={100}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Crear producto si no hay coincidencia</Label>
                  <Select
                    value={settings.createUnifiedIfNoMatch ? 'true' : 'false'}
                    onValueChange={(val) =>
                      updateSettingsMutation.mutate({ createUnifiedIfNoMatch: val === 'true' })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí, crear automáticamente</SelectItem>
                      <SelectItem value="false">No, solo mapear existentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-3 py-3 border-b">
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los proveedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los proveedores</SelectItem>
              {suppliers?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoMap}
            disabled={autoMapMutation.isPending}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {autoMapMutation.isPending ? 'Mapeando...' : 'Auto-mapear por SKU'}
          </Button>

          {selectedProducts.length > 0 && (
            <Button
              size="sm"
              onClick={handleCreateFromSelected}
              disabled={createFromUnmappedMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear {selectedProducts.length} producto(s) unificado(s)
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : suggestions?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay productos sin mapear
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {suggestions?.map((item) => (
                <div
                  key={item.supplierProduct._id}
                  className="rounded-lg border p-3 hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(item.supplierProduct._id)}
                      onChange={() => toggleProduct(item.supplierProduct._id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.supplierProduct.supplierSku}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.supplierProduct.supplierId.name}
                        </Badge>
                      </div>
                      <p className="font-medium truncate">
                        {item.supplierProduct.supplierName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.supplierProduct.netCost)} (neto)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.suggestions.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedProduct(
                              expandedProduct === item.supplierProduct._id
                                ? null
                                : item.supplierProduct._id
                            )
                          }
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          {item.suggestions.length} sugerencia(s)
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Suggestions */}
                  {expandedProduct === item.supplierProduct._id &&
                    item.suggestions.length > 0 && (
                      <div className="mt-3 pl-8 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Productos unificados similares:
                        </p>
                        {item.suggestions.map((sug) => (
                          <div
                            key={sug.unifiedProduct._id}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`font-bold ${getScoreColor(sug.score)}`}>
                                {sug.score}%
                              </span>
                              <div>
                                <p className="font-medium text-sm">
                                  {sug.unifiedProduct.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  SKU: {sug.unifiedProduct.sku} •{' '}
                                  {sug.matchType === 'exact_sku'
                                    ? 'SKU exacto'
                                    : sug.matchType === 'similar_name'
                                      ? 'Nombre similar'
                                      : 'Coincidencia parcial'}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleLink(
                                  item.supplierProduct._id,
                                  sug.unifiedProduct._id
                                )
                              }
                              disabled={linkMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Vincular
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {suggestions?.length || 0} productos sin mapear
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
