'use client';

import { usePathname } from 'next/navigation';
import { MobileSidebar } from './mobile-sidebar';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/stock': 'Stock',
  '/products': 'Productos',
  '/families': 'Familias',
  '/import': 'Importar Excel',
  '/users': 'Usuarios',
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <header className="h-16 border-b flex items-center px-4 md:px-6 bg-card gap-3">
      <MobileSidebar />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
