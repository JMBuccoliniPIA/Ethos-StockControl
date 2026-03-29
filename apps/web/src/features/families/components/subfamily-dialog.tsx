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
import { useCreateSubfamily, useUpdateSubfamily } from '../api/use-families';
import { subfamilySchema, type SubfamilyFormData } from '../schemas/family.schema';
import type { Subfamily } from '@ethos/shared';

interface SubfamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  parentId?: string | null;
  parentName?: string;
  subfamily?: Subfamily;
}

export function SubfamilyDialog({
  open,
  onOpenChange,
  familyId,
  parentId = null,
  parentName,
  subfamily,
}: SubfamilyDialogProps) {
  const isEditing = !!subfamily;
  const createMutation = useCreateSubfamily();
  const updateMutation = useUpdateSubfamily();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubfamilyFormData>({
    resolver: zodResolver(subfamilySchema),
    defaultValues: {
      name: subfamily?.name ?? '',
      familyId,
      parentId,
      description: subfamily?.description ?? '',
    },
  });

  const onSubmit = (data: SubfamilyFormData) => {
    setServerError('');
    const mutation = isEditing
      ? updateMutation.mutateAsync({
          id: subfamily._id,
          data: { name: data.name, description: data.description },
        })
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

  const levelLabel = parentName ? `dentro de "${parentName}"` : 'de nivel raíz';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar subfamilia' : 'Nueva subfamilia'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos de la subfamilia'
              : `Crear subfamilia ${levelLabel}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <input type="hidden" {...register('familyId')} />
          <input type="hidden" {...register('parentId')} />
          <div className="space-y-2">
            <Label htmlFor="sub-name">Nombre</Label>
            <Input id="sub-name" placeholder="Ej: Luz Cálida" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-desc">Descripción (opcional)</Label>
            <Input id="sub-desc" placeholder="Descripción breve" {...register('description')} />
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
                : 'Crear subfamilia'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
