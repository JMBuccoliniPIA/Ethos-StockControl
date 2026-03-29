'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useCreateMovement } from '../api/use-stock';
import { MovementType } from '@ethos/shared';
import type { Product } from '@ethos/shared';

const movementSchema = z.object({
  type: z.nativeEnum(MovementType),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
  reason: z.string().min(1, 'El motivo es requerido'),
});

type MovementFormData = z.infer<typeof movementSchema>;

const TYPE_CONFIG = {
  [MovementType.IN]: {
    label: 'Reposición (entrada)',
    description: 'Agrega stock al producto',
    color: 'text-emerald-600',
    reasons: ['Compra a proveedor', 'Devolución de cliente', 'Transferencia entre depósitos', 'Otro'],
  },
  [MovementType.OUT]: {
    label: 'Venta (salida)',
    description: 'Descuenta stock del producto',
    color: 'text-red-600',
    reasons: ['Venta', 'Rotura / Pérdida', 'Muestra / Regalo', 'Otro'],
  },
  [MovementType.ADJUSTMENT]: {
    label: 'Ajuste de inventario',
    description: 'Corrige el stock al valor indicado',
    color: 'text-blue-600',
    reasons: ['Conteo físico', 'Corrección de error', 'Inventario inicial', 'Otro'],
  },
};

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  defaultType?: MovementType;
}

export function StockMovementDialog({
  open,
  onOpenChange,
  product,
  defaultType = MovementType.IN,
}: StockMovementDialogProps) {
  const createMutation = useCreateMovement();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: defaultType,
      quantity: 1,
      reason: '',
    },
  });

  // Sync form when dialog opens with a different type/product
  useEffect(() => {
    if (open) {
      reset({ type: defaultType, quantity: 1, reason: '' });
      setServerError('');
    }
  }, [open, defaultType, reset]);

  const currentType = watch('type');
  const quantity = watch('quantity') || 0;
  const config = TYPE_CONFIG[currentType];

  // Preview new stock
  let previewStock = product?.stock ?? 0;
  if (currentType === MovementType.IN) previewStock += quantity;
  else if (currentType === MovementType.OUT) previewStock = Math.max(0, previewStock - quantity);
  else if (currentType === MovementType.ADJUSTMENT) previewStock = quantity;

  const onSubmit = (data: MovementFormData) => {
    if (!product) return;
    setServerError('');

    createMutation.mutate(
      { productId: product._id, ...data },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
        onError: (err: any) => {
          setServerError(err.response?.data?.message || 'Error al registrar movimiento');
        },
      },
    );
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimiento de stock</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{product.name}</span>{' '}
            <span className="text-muted-foreground">(SKU: {product.sku})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Stock actual</p>
            <p className="text-2xl font-bold">{product.stock}</p>
          </div>
          <div className="text-muted-foreground text-xl">→</div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Nuevo stock</p>
            <p className={`text-2xl font-bold ${config.color}`}>{previewStock}</p>
          </div>
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

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {currentType === MovementType.ADJUSTMENT ? 'Nuevo stock' : 'Cantidad'}
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              {...register('quantity')}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
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
            <Input
              id="reason"
              placeholder="Motivo del movimiento"
              {...register('reason')}
            />
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
