'use client';

import { useState } from 'react';
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
import { useCreateFamily, useUpdateFamily } from '../api/use-families';
import { familySchema, type FamilyFormData } from '../schemas/family.schema';
import type { Family } from '@ethos/shared';

interface FamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  family?: Family;
}

export function FamilyDialog({ open, onOpenChange, family }: FamilyDialogProps) {
  const isEditing = !!family;
  const createMutation = useCreateFamily();
  const updateMutation = useUpdateFamily();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: family?.name ?? '',
      description: family?.description ?? '',
    },
  });

  const onSubmit = (data: FamilyFormData) => {
    setServerError('');
    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: family._id, data })
      : createMutation.mutateAsync(data);

    mutation
      .then(() => {
        reset();
        onOpenChange(false);
      })
      .catch((err: any) => {
        setServerError(err.response?.data?.message || 'Error al guardar');
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar familia' : 'Nueva familia'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos de la familia' : 'Crea una nueva familia de productos'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej: Electrónica" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" placeholder="Descripción breve" {...register('description')} />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending)
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear familia'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
