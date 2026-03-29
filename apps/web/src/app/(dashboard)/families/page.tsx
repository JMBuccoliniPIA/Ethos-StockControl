'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useFamilies, useDeleteFamily } from '@/features/families/api/use-families';
import { FamilyDialog } from '@/features/families/components/family-dialog';
import { FamilyCard } from '@/features/families/components/family-card';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@ethos/shared';
import type { Family } from '@ethos/shared';

export default function FamiliesPage() {
  const { data: families, isLoading } = useFamilies();
  const { hasPermission } = usePermissions();
  const deleteMutation = useDeleteFamily();
  const canManage = hasPermission(Permission.FAMILIES_MANAGE);

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFamily, setDeletingFamily] = useState<Family | null>(null);

  const filtered = families?.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingFamily(undefined);
  };

  const handleDelete = () => {
    if (!deletingFamily) return;
    deleteMutation.mutate(deletingFamily._id, {
      onSuccess: () => setDeleteDialogOpen(false),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Familias</h1>
          <p className="text-muted-foreground">
            Organiza tus productos en familias y subfamilias
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar familia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva familia
          </Button>
        )}
      </div>

      {/* Family list */}
      <div className="space-y-3">
        {filtered && filtered.length > 0 ? (
          filtered.map((family) => (
            <FamilyCard
              key={family._id}
              family={family}
              canManage={canManage}
              onEdit={(f) => {
                setEditingFamily(f);
                setDialogOpen(true);
              }}
              onDelete={(f) => {
                setDeletingFamily(f);
                setDeleteDialogOpen(true);
              }}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {search ? 'No se encontraron familias' : 'No hay familias creadas todavía'}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <FamilyDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        family={editingFamily}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar familia</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que querés eliminar <strong>{deletingFamily?.name}</strong>?
              Se eliminarán también sus subfamilias. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
