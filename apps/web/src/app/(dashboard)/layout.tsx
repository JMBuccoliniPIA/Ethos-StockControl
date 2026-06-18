import { AuthGuard } from '@/components/shared/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 px-6 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
