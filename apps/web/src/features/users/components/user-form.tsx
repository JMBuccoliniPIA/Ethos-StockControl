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
import { Role } from '@ethos/shared';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormData,
  type UpdateUserFormData,
} from '../schemas/user.schema';
import type { User } from '@ethos/shared';

const ROLE_OPTIONS = [
  { value: Role.USER, label: 'Usuario' },
  { value: Role.MANAGER, label: 'Manager' },
  { value: Role.ADMIN, label: 'Administrador' },
  { value: Role.SUPER_ADMIN, label: 'Super Admin' },
];

interface UserFormProps {
  user?: User;
  onSubmit: (data: CreateUserFormData | UpdateUserFormData) => void;
  isPending: boolean;
  serverError?: string;
}

export function UserForm({ user, onSubmit, isPending, serverError }: UserFormProps) {
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormData | UpdateUserFormData>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
    defaultValues: isEditing
      ? {
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as Role,
          password: '',
        }
      : {
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          role: Role.USER,
        },
  });

  const currentRole = watch('role');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="usuario@email.com"
            {...register('email' as keyof CreateUserFormData)}
          />
          {(errors as any).email && (
            <p className="text-sm text-destructive">{(errors as any).email.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" placeholder="Juan" {...register('firstName')} />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" placeholder="Pérez" {...register('lastName')} />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          {isEditing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
        </Label>
        <Input
          id="password"
          type="password"
          placeholder={isEditing ? '••••••' : 'Mínimo 6 caracteres'}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Rol</Label>
        <Select
          value={currentRole}
          onValueChange={(val) => setValue('role', val as Role)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? isEditing
            ? 'Guardando...'
            : 'Creando...'
          : isEditing
            ? 'Guardar cambios'
            : 'Crear usuario'}
      </Button>
    </form>
  );
}
