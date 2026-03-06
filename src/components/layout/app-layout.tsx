'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, initAuthListener } from '@/stores/auth-store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { isFirebaseInitialized } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/auth'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Initialize auth listener
  useEffect(() => {
    initAuthListener();
    setIsInitialized(true);
  }, []);

  // Handle auth redirects
  useEffect(() => {
    if (!isInitialized || isLoading) return;

    // If not authenticated and not on public route, redirect to auth
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/auth');
    }

    // If authenticated and on auth page, redirect to home
    if (isAuthenticated && isPublicRoute) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, isPublicRoute, isInitialized, router]);

  // Show loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show auth page without layout
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show main layout for authenticated users
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Fallback (should redirect to auth)
  return null;
}
