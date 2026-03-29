'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ProductStatus } from '@ethos/shared';
import { useFamilies, useSubfamilies } from '@/features/families/api/use-families';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductFormData,
  type UpdateProductFormData,
} from '../schemas/product.schema';
import { QuickCreateFamily } from './quick-create-family';
import { QuickCreateSubfamily } from './quick-create-subfamily';
import type { Product } from '@ethos/shared';

const STATUS_OPTIONS = [
  { value: ProductStatus.ACTIVE, label: 'Activo' },
  { value: ProductStatus.INACTIVE, label: 'Inactivo' },
  { value: ProductStatus.DISCONTINUED, label: 'Descontinuado' },
];

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: CreateProductFormData | UpdateProductFormData) => void;
  isPending: boolean;
  serverError?: string;
}

export function ProductForm({
  product,
  onSubmit,
  isPending,
  serverError,
}: ProductFormProps) {
  const isEditing = !!product;
  const { data: families } = useFamilies();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(isEditing ? updateProductSchema : createProductSchema) as any,
    defaultValues: isEditing
      ? {
          name: product.name,
          description: product.description ?? '',
          familyId: typeof product.familyId === 'object' ? (product.familyId as any)._id : product.familyId,
          subfamilyId: product.subfamilyId
            ? typeof product.subfamilyId === 'object'
              ? (product.subfamilyId as any)._id
              : product.subfamilyId
            : undefined,
          stockMin: product.stockMin,
          basePrice: product.basePrice,
          discountPercent: product.discountPercent,
          status: product.status as ProductStatus,
        }
      : {
          sku: '',
          name: '',
          description: '',
          familyId: '',
          stock: 0,
          stockMin: 0,
          basePrice: 0,
          discountPercent: 0,
          status: ProductStatus.ACTIVE,
        },
  });

  const selectedFamilyId = watch('familyId');
  const { data: subfamilies } = useSubfamilies(selectedFamilyId || undefined);

  const basePrice = watch('basePrice') || 0;
  const discount = watch('discountPercent') || 0;
  const finalPrice = Math.round(basePrice * (1 - discount / 100) * 100) / 100;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* SKU + Name */}
      <div className="grid grid-cols-2 gap-4">
        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" placeholder="PROD-001" {...register('sku')} />
            {(errors as any).sku && (
              <p className="text-sm text-destructive">{(errors as any).sku.message}</p>
            )}
          </div>
        )}
        <div className={`space-y-2 ${isEditing ? 'col-span-2' : ''}`}>
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" placeholder="Nombre del producto" {...register('name')} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input id="description" placeholder="Descripción breve" {...register('description')} />
      </div>

      {/* Family + Subfamily */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Familia</Label>
          <div className="flex gap-2">
            <Select
              value={selectedFamilyId}
              onValueChange={(val) => {
                setValue('familyId', val);
                setValue('subfamilyId', undefined);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {families?.map((f) => (
                  <SelectItem key={f._id} value={f._id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <QuickCreateFamily
              onCreated={(id) => {
                setValue('familyId', id);
                setValue('subfamilyId', undefined);
              }}
            />
          </div>
          {errors.familyId && (
            <p className="text-sm text-destructive">{errors.familyId.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Subfamilia (opcional)</Label>
          <div className="flex gap-2">
            <Select
              value={watch('subfamilyId') ?? ''}
              onValueChange={(val) => setValue('subfamilyId', val || undefined)}
              disabled={!selectedFamilyId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={selectedFamilyId ? 'Seleccionar' : 'Elegí familia primero'} />
              </SelectTrigger>
              <SelectContent>
                {subfamilies?.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFamilyId && (
              <QuickCreateSubfamily
                familyId={selectedFamilyId}
                onCreated={(id) => setValue('subfamilyId', id)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Stock */}
      {!isEditing && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stock">Stock inicial</Label>
            <Input id="stock" type="number" min={0} {...register('stock')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stockMin">Stock mínimo</Label>
            <Input id="stockMin" type="number" min={0} {...register('stockMin')} />
          </div>
        </div>
      )}

      {isEditing && (
        <div className="space-y-2">
          <Label htmlFor="stockMin">Stock mínimo</Label>
          <Input id="stockMin" type="number" min={0} {...register('stockMin')} />
        </div>
      )}

      {/* Pricing */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="basePrice">Precio base ($)</Label>
          <Input id="basePrice" type="number" min={0} step={0.01} {...register('basePrice')} />
          {errors.basePrice && (
            <p className="text-sm text-destructive">{errors.basePrice.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="discountPercent">Descuento (%)</Label>
          <Input id="discountPercent" type="number" min={0} max={100} {...register('discountPercent')} />
        </div>
        <div className="space-y-2">
          <Label>Precio final</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-semibold">
            ${finalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select
          value={watch('status')}
          onValueChange={(val) => setValue('status', val as ProductStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? 'Guardando...'
          : isEditing
            ? 'Guardar cambios'
            : 'Crear producto'}
      </Button>
    </form>
  );
}
