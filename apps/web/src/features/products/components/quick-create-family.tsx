'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCreateFamily } from '@/features/families/api/use-families';

interface QuickCreateFamilyProps {
  onCreated: (id: string) => void;
}

export function QuickCreateFamily({ onCreated }: QuickCreateFamilyProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const createMutation = useCreateFamily();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setError('');
    createMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: (family) => {
          onCreated(family._id);
          setName('');
          setOpen(false);
        },
        onError: (err: any) => {
          setError(err.response?.data?.message || 'Error al crear');
        },
      },
    );
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 flex-shrink-0"
        title="Crear nueva familia"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva familia</DialogTitle>
            <DialogDescription>Creá una familia rápidamente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="qf-name">Nombre</Label>
              <Input
                id="qf-name"
                placeholder="Ej: Electrónica"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear familia'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
