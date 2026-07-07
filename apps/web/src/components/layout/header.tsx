'use client';

import { usePathname } from 'next/navigation';
import { MobileSidebar } from './mobile-sidebar';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/stock': 'Stock',
  '/scan': 'Escanear QR',
  '/kardex': 'Kardex',
  '/ventas': 'Ventas',
  '/products': 'Productos',
  '/unified-products': 'Productos Unificados',
  '/families': 'Familias',
  '/suppliers': 'Proveedores',
  '/supplier-products': 'Lista por Proveedor',
  '/import': 'Importar Excel',
  '/import-history': 'Historial de listas',
  '/mapping-settings': 'Auto-mapeo',
  '/users': 'Usuarios',
};

export function Header() {
  const pathname = usePathname();
  // Longest matching prefix so nested routes still resolve a title
  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles)
      .filter(([path]) => pathname.startsWith(path))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    'Dashboard';

  return (
    <header className="h-16 border-b flex items-center px-4 md:px-6 bg-card gap-3">
      <MobileSidebar />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
