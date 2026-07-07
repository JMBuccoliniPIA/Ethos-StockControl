'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Product } from '@ethos/shared';

interface ProductQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductQrDialog({ open, onOpenChange, product }: ProductQrDialogProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!product) return null;

  const handlePrint = () => {
    const node = printableRef.current;
    if (!node) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>QR — ${product.sku}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 24px; }
            h1 { font-size: 16px; margin: 12px 0 4px; }
            p { font-size: 12px; color: #555; margin: 0; }
            svg { margin: 16px 0; }
          </style>
        </head>
        <body>${node.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    // Print once the new window has laid out the SVG, then close it
    const printAndClose = () => {
      w.print();
      w.close();
    };
    if (w.document.readyState === 'complete') {
      setTimeout(printAndClose, 100);
    } else {
      w.onload = () => setTimeout(printAndClose, 100);
    }
  };

  const handleDownloadPng = () => {
    const svg = printableRef.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const dl = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        dl.href = objectUrl;
        dl.download = `qr-${product.sku}.png`;
        dl.click();
        // Defer revoke so the download isn't cancelled mid-flight (Firefox)
        setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR del producto</DialogTitle>
          <DialogDescription>
            Imprimí o descargá el QR para pegarlo en el producto. Al escanearlo desde el celular en la app, se identifica el SKU.
          </DialogDescription>
        </DialogHeader>

        <div ref={printableRef} className="flex flex-col items-center bg-white p-4 rounded-md">
          <h1 className="text-base font-semibold text-center text-black">{product.name}</h1>
          <p className="text-xs text-gray-600 font-mono">SKU: {product.sku}</p>
          <QRCodeSVG value={product.sku} size={220} level="M" includeMargin />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleDownloadPng}>
            <Download className="h-4 w-4 mr-2" />
            PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
