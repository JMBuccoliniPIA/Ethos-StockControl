'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ProductForm } from './product-form';
import { useCreateProduct, useUpdateProduct } from '../api/use-products';
import type { Product } from '@ethos/shared';
import type { CreateProductFormData, UpdateProductFormData } from '../schemas/product.schema';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const isEditing = !!product;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const [serverError, setServerError] = useState('');

  const handleSubmit = (data: CreateProductFormData | UpdateProductFormData) => {
    setServerError('');

    if (isEditing) {
      updateMutation.mutate(
        { id: product._id, data: data as UpdateProductFormData },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err: any) => {
            setServerError(err.response?.data?.message || 'Error al actualizar');
          },
        },
      );
    } else {
      createMutation.mutate(data as CreateProductFormData, {
        onSuccess: () => onOpenChange(false),
        onError: (err: any) => {
          setServerError(err.response?.data?.message || 'Error al crear');
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos del producto' : 'Completa los datos del nuevo producto'}
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          serverError={serverError}
        />
      </DialogContent>
    </Dialog>
  );
}
