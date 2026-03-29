'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useProductMovements } from '../api/use-stock';
import { MovementType } from '@ethos/shared';
import type { Product } from '@ethos/shared';

const TYPE_BADGE: Record<string, { label: string; variant: 'success' | 'destructive' | 'default' }> = {
  [MovementType.IN]: { label: 'Entrada', variant: 'success' },
  [MovementType.OUT]: { label: 'Salida', variant: 'destructive' },
  [MovementType.ADJUSTMENT]: { label: 'Ajuste', variant: 'default' },
};

interface MovementHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function MovementHistory({ open, onOpenChange, product }: MovementHistoryProps) {
  const { data: movements, isLoading } = useProductMovements(
    open && product ? product._id : undefined,
  );

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de movimientos</DialogTitle>
          <DialogDescription>
            {product.name} (SKU: {product.sku}) — Stock actual:{' '}
            <span className="font-semibold">{product.stock}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : movements && movements.length > 0 ? (
          <div className="space-y-2">
            {movements.map((m) => {
              const badge = TYPE_BADGE[m.type] ?? TYPE_BADGE[MovementType.IN];
              const performer = m.performedBy as any;
              return (
                <div
                  key={m._id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <div>
                      <p className="text-sm font-medium">{m.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {performer?.firstName} {performer?.lastName} —{' '}
                        {new Date(m.createdAt).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      <span className="text-muted-foreground">{m.previousStock}</span>
                      {' → '}
                      <span className="font-semibold">{m.newStock}</span>
                    </p>
                    <p className={`text-xs font-medium ${
                      m.type === MovementType.IN
                        ? 'text-emerald-600'
                        : m.type === MovementType.OUT
                          ? 'text-red-600'
                          : 'text-blue-600'
                    }`}>
                      {m.type === MovementType.IN && '+'}
                      {m.type === MovementType.OUT && '-'}
                      {m.type === MovementType.ADJUSTMENT && '='}
                      {m.quantity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            No hay movimientos registrados
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
