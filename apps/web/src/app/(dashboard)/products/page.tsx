'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/data-table';
import { useProducts, useDeleteProduct } from '@/features/products/api/use-products';
import { getProductColumns } from '@/features/products/components/products-columns';
import { ProductDialog } from '@/features/products/components/product-dialog';
import { useFamilies } from '@/features/families/api/use-families';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission, ProductStatus } from '@ethos/shared';
import type { Product } from '@ethos/shared';

export default function ProductsPage() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(Permission.PRODUCTS_CREATE);
  const canEdit = hasPermission(Permission.PRODUCTS_UPDATE);
  const canDelete = hasPermission(Permission.PRODUCTS_DELETE);

  // Filters
  const [familyFilter, setFamilyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useProducts({
    familyId: familyFilter && familyFilter !== 'all' ? familyFilter : undefined,
    status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
    limit: 50,
  });
  const { data: families } = useFamilies();
  const deleteMutation = useDeleteProduct();

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const columns = useMemo(
    () =>
      getProductColumns({
        onEdit: (p) => {
          setEditingProduct(p);
          setDialogOpen(true);
        },
        onDelete: (p) => {
          setDeletingProduct(p);
          setDeleteDialogOpen(true);
        },
        canEdit,
        canDelete,
      }),
    [canEdit, canDelete],
  );

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingProduct(undefined);
  };

  const handleDelete = () => {
    if (!deletingProduct) return;
    deleteMutation.mutate(deletingProduct._id, {
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
      <div>
        <h1 className="text-2xl font-bold">Productos</h1>
        <p className="text-muted-foreground">Gestión del catálogo de productos</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={familyFilter} onValueChange={setFamilyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas las familias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las familias</SelectItem>
            {families?.map((f) => (
              <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value={ProductStatus.ACTIVE}>Activo</SelectItem>
            <SelectItem value={ProductStatus.INACTIVE}>Inactivo</SelectItem>
            <SelectItem value={ProductStatus.DISCONTINUED}>Descontinuado</SelectItem>
          </SelectContent>
        </Select>

        {(familyFilter || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFamilyFilter('');
              setStatusFilter('');
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        searchKeys={['name', 'sku']}
        searchPlaceholder="Buscar por nombre o SKU..."
        toolbar={
          canCreate ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo producto
            </Button>
          ) : undefined
        }
      />

      <ProductDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        product={editingProduct}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que querés eliminar{' '}
              <strong>{deletingProduct?.name}</strong> (SKU: {deletingProduct?.sku})?
              Esta acción no se puede deshacer.
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
