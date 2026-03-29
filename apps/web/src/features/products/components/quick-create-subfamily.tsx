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
import { useCreateSubfamily } from '@/features/families/api/use-families';

interface QuickCreateSubfamilyProps {
  familyId: string;
  onCreated: (id: string) => void;
}

export function QuickCreateSubfamily({ familyId, onCreated }: QuickCreateSubfamilyProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const createMutation = useCreateSubfamily();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setError('');
    createMutation.mutate(
      { name: name.trim(), familyId, parentId: null },
      {
        onSuccess: (subfamily) => {
          onCreated(subfamily._id);
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
        title="Crear nueva subfamilia"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva subfamilia</DialogTitle>
            <DialogDescription>Creá una subfamilia rápidamente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="qs-name">Nombre</Label>
              <Input
                id="qs-name"
                placeholder="Ej: Auriculares"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear subfamilia'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
