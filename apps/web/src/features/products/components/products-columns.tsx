'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown, AlertTriangle } from 'lucide-react';
import type { Product } from '@ethos/shared';

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  active: { label: 'Activo', variant: 'success' },
  inactive: { label: 'Inactivo', variant: 'secondary' },
  discontinued: { label: 'Descontinuado', variant: 'destructive' },
};

interface ColumnsConfig {
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function getProductColumns({
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: ColumnsConfig): ColumnDef<Product>[] {
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.sku}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'familyId',
      header: 'Familia',
      cell: ({ row }) => {
        const family = row.original.familyId as any;
        return <span className="text-sm">{family?.name ?? '-'}</span>;
      },
    },
    {
      accessorKey: 'stock',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isLow = row.original.stock <= row.original.stockMin;
        return (
          <div className="flex items-center gap-1.5">
            <span className={isLow ? 'text-destructive font-semibold' : ''}>
              {row.original.stock}
            </span>
            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          </div>
        );
      },
    },
    {
      accessorKey: 'basePrice',
      header: 'Precio base',
      cell: ({ row }) => (
        <span className="text-sm">
          ${row.original.basePrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: 'finalPrice',
      header: 'Precio final',
      cell: ({ row }) => {
        const hasDiscount = row.original.discountPercent > 0;
        return (
          <div>
            <span className="text-sm font-medium">
              ${row.original.finalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            {hasDiscount && (
              <Badge variant="warning" className="ml-1.5 text-[10px] px-1.5 py-0">
                -{row.original.discountPercent}%
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const cfg = STATUS_CONFIG[row.original.status] ?? STATUS_CONFIG.active;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
  ];

  if (canEdit || canDelete) {
    columns.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            {canEdit && canDelete && <DropdownMenuSeparator />}
            {canDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return columns;
}
