'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  BarChart3,
  Users,
  FolderTree,
  Upload,
  LogOut,
  LayoutDashboard,
  Sun,
  Moon,
  Building2,
  Layers,
  ClipboardList,
  Settings2,
  Truck,
  History,
  QrCode,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/providers/theme-provider';
import { Button } from '@/components/ui/button';
import { Permission } from '@ethos/shared';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: Permission.PRODUCTS_READ },
  { name: 'Stock', href: '/stock', icon: BarChart3, permission: Permission.STOCK_READ },
  { name: 'Escanear QR', href: '/scan', icon: QrCode, permission: Permission.STOCK_ADJUST },
  { name: 'Kardex', href: '/kardex', icon: ClipboardList, permission: Permission.KARDEX_READ },
  { name: 'Ventas', href: '/ventas', icon: TrendingUp, permission: Permission.SALES_READ },
  { name: 'Productos', href: '/products', icon: Package, permission: Permission.PRODUCTS_READ },
  // Oculto temporalmente: sección Productos Unificados (la ruta /unified-products sigue existiendo)
  // { name: 'Unificados', href: '/unified-products', icon: Layers, permission: Permission.PRODUCTS_READ },
  { name: 'Familias', href: '/families', icon: FolderTree, permission: Permission.FAMILIES_READ },
  { name: 'Proveedores', href: '/suppliers', icon: Building2, permission: Permission.SUPPLIERS_READ },
  { name: 'Lista por Proveedor', href: '/supplier-products', icon: Truck, permission: Permission.SUPPLIERS_READ },
  { name: 'Importar', href: '/import', icon: Upload, permission: Permission.IMPORT_EXECUTE },
  { name: 'Historial de listas', href: '/import-history', icon: History, permission: Permission.IMPORT_READ },
  { name: 'Auto-mapeo', href: '/mapping-settings', icon: Settings2, permission: Permission.PRODUCTS_READ },
  { name: 'Usuarios', href: '/users', icon: Users, permission: Permission.USERS_READ },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  manager: 'Manager',
  user: 'Usuario',
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const { theme, toggleTheme } = useTheme();

  const visibleNav = navigation.filter((item) => hasPermission(item.permission));

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold tracking-tight">B&amp;B Gestion</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          // Exact match (or nested route) so /import-history doesn't also light up /import
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-card',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t p-4">
        <div className="mb-3">
          <p className="text-sm font-medium truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <span className="inline-block mt-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
            {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-muted-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
