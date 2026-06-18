'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useMappingSettings,
  useUpdateMappingSettings,
} from '@/features/mapping-settings/api/use-mapping-settings';
import type { UpdateMappingSettingsDto } from '@/features/mapping-settings/api/mapping-settings.api';

const STRATEGY_LABELS: Record<string, string> = {
  exact_sku: 'SKU exacto',
  similar_name: 'Nombre similar',
  disabled: 'Deshabilitado',
};

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  exact_sku: 'Vincula automáticamente cuando el SKU del proveedor coincide exactamente con el de un producto unificado existente.',
  similar_name: 'Sugiere coincidencias por nombre similar (requiere score mínimo). Más permisivo pero puede equivocarse.',
  disabled: 'Desactiva el auto-mapeo. Todos los productos quedan sin mapear hasta vincularlos manualmente.',
};

export default function MappingSettingsPage() {
  const { data, isLoading, error } = useMappingSettings();
  const updateMutation = useUpdateMappingSettings();

  const [form, setForm] = useState<UpdateMappingSettingsDto>({
    autoMapOnImport: false,
    autoMapStrategy: 'exact_sku',
    defaultProfitMargin: 30,
    minMatchScore: 70,
    createUnifiedIfNoMatch: false,
  });

  useEffect(() => {
    if (data) {
      setForm({
        autoMapOnImport: data.autoMapOnImport,
        autoMapStrategy: data.autoMapStrategy,
        defaultProfitMargin: data.defaultProfitMargin,
        minMatchScore: data.minMatchScore,
        createUnifiedIfNoMatch: data.createUnifiedIfNoMatch,
      });
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const dirty =
    !!data &&
    (form.autoMapOnImport !== data.autoMapOnImport ||
      form.autoMapStrategy !== data.autoMapStrategy ||
      form.defaultProfitMargin !== data.defaultProfitMargin ||
      form.minMatchScore !== data.minMatchScore ||
      form.createUnifiedIfNoMatch !== data.createUnifiedIfNoMatch);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar la configuración. Verificá que tengas permisos.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          Configuración de Auto-Mapeo
        </h1>
        <p className="text-muted-foreground">
          Reglas para vincular automáticamente los productos de cada proveedor con tus productos unificados al importar listas, y margen de ganancia por defecto al crear productos nuevos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Auto-map toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Activar auto-mapeo en importación</CardTitle>
            <CardDescription>
              Cuando se confirma una importación de proveedor, el sistema intentará vincular automáticamente cada producto con un producto unificado existente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoMapOnImport" className="cursor-pointer">
                Auto-mapeo activo
              </Label>
              <Switch
                id="autoMapOnImport"
                checked={!!form.autoMapOnImport}
                onCheckedChange={(v) => setForm((p) => ({ ...p, autoMapOnImport: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Strategy */}
        <Card>
          <CardHeader>
            <CardTitle>Estrategia</CardTitle>
            <CardDescription>
              Define el criterio que usa el sistema para decidir si dos productos son el mismo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="strategy">Estrategia de coincidencia</Label>
              <Select
                value={form.autoMapStrategy}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    autoMapStrategy: v as UpdateMappingSettingsDto['autoMapStrategy'],
                  }))
                }
              >
                <SelectTrigger id="strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['exact_sku', 'similar_name', 'disabled'] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STRATEGY_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground pt-1">
                {STRATEGY_DESCRIPTIONS[form.autoMapStrategy ?? 'exact_sku']}
              </p>
            </div>

            {form.autoMapStrategy === 'similar_name' && (
              <div className="space-y-1">
                <Label htmlFor="minMatchScore">Score mínimo de coincidencia (0–100)</Label>
                <Input
                  id="minMatchScore"
                  type="number"
                  min={0}
                  max={100}
                  value={form.minMatchScore ?? 0}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, minMatchScore: Number(e.target.value) }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Solo se vinculan automáticamente productos con score igual o superior a este valor.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Default values */}
        <Card>
          <CardHeader>
            <CardTitle>Valores por defecto</CardTitle>
            <CardDescription>
              Aplicados a productos unificados creados automáticamente durante el auto-mapeo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="defaultProfitMargin">Margen de ganancia por defecto (%)</Label>
              <Input
                id="defaultProfitMargin"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.defaultProfitMargin ?? 0}
                onChange={(e) =>
                  setForm((p) => ({ ...p, defaultProfitMargin: Number(e.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Margen aplicado al cálculo de precio de venta:&nbsp;
                <code className="bg-muted px-1 rounded">precio = costo × (1 + margen/100)</code>
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label htmlFor="createUnified" className="cursor-pointer">
                  Crear producto unificado si no hay coincidencia
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Si está activo, los productos sin match generan un nuevo producto unificado automáticamente con el SKU del proveedor.
                </p>
              </div>
              <Switch
                id="createUnified"
                checked={!!form.createUnifiedIfNoMatch}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, createUnifiedIfNoMatch: v }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!dirty || updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar cambios
          </Button>
          {data?.updatedAt && (
            <span className="text-xs text-muted-foreground">
              Última actualización: {new Date(data.updatedAt).toLocaleString('es-AR')}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
