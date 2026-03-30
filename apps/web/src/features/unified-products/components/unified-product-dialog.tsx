'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useCreateUnifiedProduct } from '../api/use-unified-products';
import { useFamilies } from '@/features/families/api/use-families';
import { unifiedProductSchema, type UnifiedProductFormData } from '../schemas/unified-product.schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnifiedProductDialog({ open, onOpenChange }: Props) {
  const createMutation = useCreateUnifiedProduct();
  const { data: families } = useFamilies();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UnifiedProductFormData>({
    resolver: zodResolver(unifiedProductSchema),
    defaultValues: {
      profitMarginPercent: 30,
      stock: 0,
      stockMin: 0,
    },
  });

  const selectedFamilyId = watch('familyId');

  const onSubmit = async (data: UnifiedProductFormData) => {
    try {
      await createMutation.mutateAsync(data);
      reset();
      onOpenChange(false);
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Producto Unificado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input {...register('sku')} placeholder="ABC-001" />
              {errors.sku && (
                <p className="text-xs text-destructive">{errors.sku.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Margen %</Label>
              <Input
                type="number"
                {...register('profitMarginPercent', { valueAsNumber: true })}
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input {...register('name')} placeholder="Nombre del producto" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input {...register('description')} placeholder="Descripción opcional" />
          </div>

          <div className="space-y-2">
            <Label>Familia</Label>
            <Select
              value={selectedFamilyId || ''}
              onValueChange={(val) => setValue('familyId', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar familia" />
              </SelectTrigger>
              <SelectContent>
                {families?.map((f) => (
                  <SelectItem key={f._id} value={f._id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stock inicial</Label>
              <Input
                type="number"
                {...register('stock', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Stock mínimo</Label>
              <Input
                type="number"
                {...register('stockMin', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
