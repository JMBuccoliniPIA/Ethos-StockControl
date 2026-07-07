'use client';

import { useState, useEffect, useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, PackageMinus, X, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { productsApi } from '@/features/products/api/products.api';
import { stockApi } from '@/features/stock/api/stock.api';
import { MovementType } from '@ethos/shared';
import type { Product } from '@ethos/shared';
import { notify } from '@/lib/toast';

type Stage = 'idle' | 'scanning' | 'found' | 'confirming';

/** Traduce los errores de getUserMedia a un mensaje claro y accionable. */
function describeCameraError(err: unknown): string {
  const name = (err as any)?.name ?? '';
  const message = String((err as any)?.message ?? err ?? '');
  if (name === 'NotAllowedError' || /permission|denied|dismiss/i.test(message)) {
    return 'Permiso de cámara denegado. Habilitá la cámara para este sitio en los ajustes del navegador y reintentá.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No se encontró una cámara disponible en el dispositivo.';
  }
  if (name === 'NotReadableError') {
    return 'La cámara está siendo usada por otra app. Cerrala e intentá de nuevo.';
  }
  if (/secure|https/i.test(message)) {
    return 'La cámara requiere una conexión segura (HTTPS). Abrí la página por HTTPS.';
  }
  return message || 'No se pudo acceder a la cámara.';
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent || '';
      const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const narrow = window.innerWidth <= 820;
      setIsMobile(uaMobile || narrow);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function ScanPage() {
  const isMobile = useIsMobile();
  const [stage, setStage] = useState<Stage>('idle');
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Venta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSku, setLastSku] = useState('');

  const handleScan = useCallback(
    async (codes: { rawValue: string }[]) => {
      const rawValue = codes[0]?.rawValue?.trim();
      if (!rawValue || stage !== 'scanning' || rawValue === lastSku || loading) return;

      setLastSku(rawValue);
      setLoading(true);
      setError('');
      try {
        const p = await productsApi.getBySku(rawValue);
        setProduct(p);
        setQuantity(1);
        setReason('Venta');
        setStage('found');
      } catch (err: any) {
        // Reset lastSku so the same QR can be re-scanned after a failed lookup
        setLastSku('');
        setError(err.response?.data?.message || `No se encontró producto con SKU "${rawValue}"`);
      } finally {
        setLoading(false);
      }
    },
    [stage, lastSku, loading],
  );

  const handleConfirm = async () => {
    if (!product) return;
    setLoading(true);
    setError('');
    try {
      const res = await stockApi.createMovement({
        productId: product._id,
        type: MovementType.OUT,
        quantity,
        reason: reason || 'Salida por escaneo',
      });
      notify.success(`Stock actualizado: ${res.previousStock} → ${res.newStock}`);
      // Reset for next scan
      setProduct(null);
      setLastSku('');
      setStage('scanning');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al descontar stock');
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    setStage('scanning');
    setError('');
    setProduct(null);
    setLastSku('');
  };

  const cancel = () => {
    setStage('idle');
    setProduct(null);
    setError('');
    setLastSku('');
  };

  if (isMobile === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Escaneo de QR
          </h1>
          <p className="text-muted-foreground">
            Modo único habilitado en mobile.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-12 flex flex-col items-center text-center max-w-md mx-auto">
          <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="font-medium mb-1">Esta sección solo funciona en mobile</p>
          <p className="text-sm text-muted-foreground">
            Abrí esta página desde el celular para usar la cámara y escanear los QR de los productos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Escaneo de QR
        </h1>
        <p className="text-sm text-muted-foreground">
          Apuntá al QR del producto para descontar stock.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {stage === 'idle' && (
        <div className="space-y-2">
          <Button onClick={startScanning} className="w-full" size="lg">
            <QrCode className="h-5 w-5 mr-2" />
            Iniciar escaneo
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Se pedirá permiso para usar la cámara. Tocá &quot;Permitir&quot; para escanear.
          </p>
        </div>
      )}

      {stage === 'scanning' && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border-2 border-primary aspect-square">
            <Scanner
              onScan={handleScan}
              onError={(err) => setError(describeCameraError(err))}
              constraints={{ facingMode: 'environment' }}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <Button onClick={cancel} variant="outline" className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      )}

      {stage === 'found' && product && (
        <div className="space-y-4 rounded-lg border p-4 bg-card">
          <div>
            <p className="font-semibold text-lg">{product.name}</p>
            <p className="text-xs font-mono text-muted-foreground">SKU: {product.sku}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Stock actual</p>
              <p className="text-2xl font-bold">{product.stock}</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Después</p>
              <p className="text-2xl font-bold text-red-600">
                {Math.max(0, product.stock - quantity)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">Cantidad a descontar</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={cancel} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || quantity < 1 || quantity > product.stock}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PackageMinus className="h-4 w-4 mr-2" />
              )}
              Descontar
            </Button>
          </div>

          {product.stock === 0 && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Este producto está sin stock.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
