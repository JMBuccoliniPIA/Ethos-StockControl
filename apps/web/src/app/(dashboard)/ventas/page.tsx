'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { useSalesByProduct, useSalesSummary } from '@/features/sales/api/use-sales';
import type { SalesByProductRow } from '@/features/sales/api/sales.api';
import { formatCurrency } from '@/lib/format';

export default function VentasPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const query = {
    from: dateFrom || undefined,
    to: dateTo || undefined,
    search: search.trim() || undefined,
  };

  const { data: rows, isLoading } = useSalesByProduct(query);
  const { data: summary } = useSalesSummary(query);

  const hasRows = (rows?.length ?? 0) > 0;
  const missingPriceCount = useMemo(
    () => (rows ?? []).filter((r) => r.unitSalePrice === null).length,
    [rows],
  );

  const columns = useMemo<ColumnDef<SalesByProductRow, unknown>[]>(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.sku}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Producto',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'quantitySold',
        header: 'Vendidas',
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums">
            {row.original.quantitySold.toLocaleString('es-AR')}
          </span>
        ),
      },
      {
        accessorKey: 'unitCost',
        header: 'Compré a',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatCurrency(row.original.unitCost, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'unitSalePrice',
        header: 'Vendí a',
        cell: ({ row }) => {
          const v = row.original.unitSalePrice;
          if (v === null) {
            return <span className="text-xs text-muted-foreground">Sin precio</span>;
          }
          return (
            <span className="text-sm tabular-nums">
              {formatCurrency(v, row.original.currency)}
            </span>
          );
        },
      },
      {
        accessorKey: 'marginPercent',
        header: 'Margen %',
        cell: ({ row }) => {
          const v = row.original.marginPercent;
          if (v === null) return <span className="text-muted-foreground">-</span>;
          const cls =
            v >= 30 ? 'text-emerald-700' : v >= 10 ? 'text-amber-700' : 'text-red-700';
          return (
            <span className={`text-sm font-semibold tabular-nums ${cls}`}>
              {v.toFixed(2)}%
            </span>
          );
        },
      },
      {
        accessorKey: 'marginAmount',
        header: 'Margen $',
        cell: ({ row }) => {
          const v = row.original.marginAmount;
          if (v === null) return <span className="text-muted-foreground">-</span>;
          return (
            <span className="text-sm font-bold tabular-nums text-emerald-700">
              {formatCurrency(v, row.original.currency)}
            </span>
          );
        },
      },
      {
        accessorKey: 'lastSaleAt',
        header: 'Última venta',
        cell: ({ row }) => {
          const d = row.original.lastSaleAt;
          if (!d) return <span className="text-muted-foreground">-</span>;
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(d).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
              })}
            </span>
          );
        },
      },
    ],
    [],
  );

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Ventas
        </h1>
        <p className="text-muted-foreground">
          Reporte por producto: cantidad vendida, costo, precio de venta y margen de ganancia.
          Las ventas se generan desde las <strong>salidas de stock</strong> y el precio se toma del
          producto unificado correspondiente.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Buscar</Label>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Por nombre o SKU..."
              debounceMs={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from">Desde</Label>
            <Input
              id="from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">Hasta</Label>
            <Input
              id="to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        {(dateFrom || dateTo || search) && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Productos vendidos</p>
          <p className="text-2xl font-bold">{summary?.distinctProducts ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Unidades vendidas</p>
          <p className="text-2xl font-bold">
            {(summary?.totalUnits ?? 0).toLocaleString('es-AR')}
          </p>
        </div>
        <div className="rounded-lg border p-4 min-w-0">
          <p className="text-sm text-muted-foreground">Facturación</p>
          <p className="text-xl sm:text-2xl font-bold leading-tight tabular-nums break-words">
            {formatCurrency(summary?.totalRevenue ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border p-4 bg-emerald-50/40 min-w-0">
          <p className="text-sm text-muted-foreground">Margen total</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 leading-tight tabular-nums break-words">
            {formatCurrency(summary?.totalMargin ?? 0)}
          </p>
        </div>
      </div>

      {missingPriceCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>{missingPriceCount}</strong> producto(s) sin precio de venta configurado en el
            Unificado correspondiente. Su margen no se calcula. Configurá el precio en
            /unified-products para verlos acá.
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !hasRows ? (
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No hay ventas en el rango seleccionado</p>
          <p className="text-sm">
            Las ventas se generan automáticamente al registrar salidas de stock.
          </p>
        </div>
      ) : (
        <DataTable columns={columns} data={rows ?? []} />
      )}
    </div>
  );
}
