'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { useUsers } from '@/features/users/api/use-users';
import { getUserColumns } from '@/features/users/components/users-columns';
import { UserDialog } from '@/features/users/components/user-dialog';
import { DeleteUserDialog } from '@/features/users/components/delete-user-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission, Role } from '@ethos/shared';
import type { User } from '@ethos/shared';

export default function UsersPage() {
  const { data, isLoading } = useUsers();
  const { hasPermission, hasRole } = usePermissions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const canCreate = hasRole(Role.SUPER_ADMIN, Role.ADMIN);
  const canEdit = hasPermission(Permission.USERS_UPDATE);
  const canDelete = hasRole(Role.SUPER_ADMIN);

  const columns = useMemo(
    () =>
      getUserColumns({
        onEdit: (user) => {
          setEditingUser(user);
          setDialogOpen(true);
        },
        onDelete: (user) => {
          setDeletingUser(user);
          setDeleteDialogOpen(true);
        },
        canEdit,
        canDelete,
      }),
    [canEdit, canDelete],
  );

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingUser(undefined);
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
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestión de usuarios y roles del sistema</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        searchKey="email"
        searchPlaceholder="Buscar por email..."
        toolbar={
          canCreate ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo usuario
            </Button>
          ) : undefined
        }
      />

      <UserDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        user={editingUser}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={deletingUser}
      />
    </div>
  );
}
