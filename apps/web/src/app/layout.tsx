import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ethos Stock',
  description: 'Sistema de gestión de stock profesional',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className="transition-colors duration-300">
      <body className={`${inter.className} transition-colors duration-300`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
