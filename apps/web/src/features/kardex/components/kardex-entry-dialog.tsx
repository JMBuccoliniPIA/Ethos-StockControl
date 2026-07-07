'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { useCreateKardexEntry } from '../api/use-kardex';
import { useActiveSuppliers } from '@/features/suppliers/api/use-suppliers';
import {
  createKardexEntrySchema,
  type CreateKardexEntryFormData,
} from '../schemas/kardex.schema';
import { MovementType, ProductEntityType } from '@ethos/shared';

const TYPE_CONFIG = {
  [MovementType.IN]: {
    label: 'Entrada',
    description: 'Ingreso de mercadería al stock',
    color: 'text-emerald-600',
    reasons: ['Compra a proveedor', 'Devolución de cliente', 'Transferencia', 'Otro'],
  },
  [MovementType.OUT]: {
    label: 'Salida',
    description: 'Egreso de mercadería del stock',
    color: 'text-red-600',
    reasons: ['Venta', 'Rotura / Pérdida', 'Muestra / Regalo', 'Otro'],
  },
  [MovementType.ADJUSTMENT]: {
    label: 'Ajuste',
    description: 'Ajuste de inventario al valor indicado',
    color: 'text-blue-600',
    reasons: ['Conteo físico', 'Corrección de error', 'Inventario inicial', 'Otro'],
  },
};

interface KardexEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productType: ProductEntityType;
  productName: string;
  currentStock: number;
}

export function KardexEntryDialog({
  open,
  onOpenChange,
  productId,
  productType,
  productName,
  currentStock,
}: KardexEntryDialogProps) {
  const createMutation = useCreateKardexEntry();
  const { data: suppliers } = useActiveSuppliers();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateKardexEntryFormData>({
    resolver: zodResolver(createKardexEntrySchema),
    defaultValues: {
      productId,
      productType,
      type: MovementType.IN,
      quantity: 1,
      unitCost: 0,
      documentNumber: '',
      supplierId: '',
      location: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        productId,
        productType,
        type: MovementType.IN,
        quantity: 1,
        unitCost: 0,
        documentNumber: '',
        supplierId: '',
        location: '',
        reason: '',
      });
      setServerError('');
    }
  }, [open, productId, productType, reset]);

  const currentType = watch('type');
  // register() keeps these as strings — coerce so the preview math is numeric
  const quantity = Number(watch('quantity')) || 0;
  const unitCost = Number(watch('unitCost')) || 0;
  const config = TYPE_CONFIG[currentType];

  // Preview
  let previewStock = currentStock;
  if (currentType === MovementType.IN) previewStock += quantity;
  else if (currentType === MovementType.OUT) previewStock = Math.max(0, previewStock - quantity);
  else if (currentType === MovementType.ADJUSTMENT) previewStock = quantity;

  const isEntry = currentType === MovementType.IN;
  const entryAmount = isEntry ? quantity * unitCost : 0;

  const onSubmit = (data: CreateKardexEntryFormData) => {
    setServerError('');
    const cleanedData = {
      ...data,
      supplierId: data.supplierId || undefined,
      documentNumber: data.documentNumber || undefined,
      location: data.location || undefined,
      unitCost: isEntry ? data.unitCost : undefined,
    };

    createMutation.mutate(cleanedData, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
      onError: (err: any) => {
        setServerError(err.response?.data?.message || 'Error al registrar movimiento');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo movimiento Kardex</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{productName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Stock actual</p>
            <p className="text-2xl font-bold">{currentStock}</p>
          </div>
          <div className="text-muted-foreground text-xl">&rarr;</div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Nuevo stock</p>
            <p className={`text-2xl font-bold ${config.color}`}>{previewStock}</p>
          </div>
          {isEntry && unitCost > 0 && (
            <>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Importe entrada</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {entryAmount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                </p>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de movimiento</Label>
            <Select
              value={currentType}
              onValueChange={(val) => setValue('type', val as MovementType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_CONFIG).map(([value, cfg]) => (
                  <SelectItem key={value} value={value}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {currentType === MovementType.ADJUSTMENT ? 'Nuevo stock' : 'Cantidad'}
              </Label>
              <Input id="quantity" type="number" min={1} {...register('quantity')} />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            {isEntry && (
              <div className="space-y-2">
                <Label htmlFor="unitCost">Costo unitario</Label>
                <Input id="unitCost" type="number" min={0} step="0.01" {...register('unitCost')} />
                {errors.unitCost && (
                  <p className="text-sm text-destructive">{errors.unitCost.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentNumber">Factura / Documento</Label>
              <Input
                id="documentNumber"
                placeholder="Ej: FC-001-00012345"
                {...register('documentNumber')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicacion</Label>
              <Input
                id="location"
                placeholder="Ej: Deposito A - Estante 3"
                {...register('location')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Select
              value={watch('supplierId') || ''}
              onValueChange={(val) => setValue('supplierId', val === '_none' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin proveedor</SelectItem>
                {suppliers?.map((s: any) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {config.reasons.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setValue('reason', r)}
                >
                  {r}
                </Badge>
              ))}
            </div>
            <Input id="reason" placeholder="Motivo del movimiento" {...register('reason')} />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Registrando...' : 'Confirmar movimiento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
