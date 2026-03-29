'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { UserForm } from './user-form';
import { useCreateUser, useUpdateUser } from '../api/use-users';
import type { User } from '@ethos/shared';
import type { CreateUserFormData, UpdateUserFormData } from '../schemas/user.schema';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const isEditing = !!user;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const [serverError, setServerError] = useState('');

  const handleSubmit = (data: CreateUserFormData | UpdateUserFormData) => {
    setServerError('');

    if (isEditing) {
      updateMutation.mutate(
        { id: user._id, data: data as UpdateUserFormData },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err: any) => {
            setServerError(err.response?.data?.message || 'Error al actualizar');
          },
        },
      );
    } else {
      createMutation.mutate(data as CreateUserFormData, {
        onSuccess: () => onOpenChange(false),
        onError: (err: any) => {
          setServerError(err.response?.data?.message || 'Error al crear usuario');
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del usuario'
              : 'Completa los datos para crear un nuevo usuario'}
          </DialogDescription>
        </DialogHeader>
        <UserForm
          user={user}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          serverError={serverError}
        />
      </DialogContent>
    </Dialog>
  );
}
