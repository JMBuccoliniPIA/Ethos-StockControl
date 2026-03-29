'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Package,
  AlertTriangle,
  PackageX,
  DollarSign,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { useLowStockProducts } from '@/features/products/api/use-products';
import { useAuth } from '@/providers/auth-provider';
import type { Product } from '@ethos/shared';

interface Stats {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
}

function useStats() {
  return useQuery<Stats>({
    queryKey: ['products', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get('/products/stats');
      return res.data;
    },
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useStats();
  const { data: lowStockProducts } = useLowStockProducts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting}, {user?.firstName}
        </h1>
        <p className="text-muted-foreground">
          Resumen general de tu inventario
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Productos</p>
              <p className="text-2xl font-bold">{stats?.totalProducts ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stock bajo</p>
              <p className="text-2xl font-bold text-amber-600">{stats?.lowStockCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-lg bg-red-100 p-2.5">
              <PackageX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sin stock</p>
              <p className="text-2xl font-bold text-destructive">{stats?.outOfStockCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-2xl font-bold">
                ${(stats?.totalStockValue ?? 0).toLocaleString('es-AR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alerts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Alertas de stock bajo
            </CardTitle>
            <Link href="/stock">
              <Button variant="ghost" size="sm">
                Ver todo <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {lowStockProducts && lowStockProducts.length > 0 ? (
            <div className="space-y-2">
              {lowStockProducts.slice(0, 8).map((product: Product) => {
                const family = product.familyId as any;
                const isEmpty = product.stock === 0;
                return (
                  <div
                    key={product._id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.sku} {family?.name ? `· ${family.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={isEmpty ? 'destructive' : 'warning'}>
                        {isEmpty ? 'Sin stock' : `${product.stock} uds`}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        mín: {product.stockMin}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay productos con stock bajo. Todo en orden.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/products">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Productos</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stock">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Stock</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/families">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Familias</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/import">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Importar</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}
