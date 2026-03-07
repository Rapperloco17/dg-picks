'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Trophy, 
  TrendingUp, 
  Settings,
  Menu,
  X,
  BarChart3,
  Target,
  User,
  Wallet,
  Brain,
  Clock,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { Badge } from '@/components/ui/badge';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Partidos', href: '/matches', icon: Calendar },
  { name: 'Historial', href: '/matches/history', icon: Clock },
  { name: 'Picks', href: '/picks', icon: Target },
  { name: 'Ligas', href: '/leagues', icon: Trophy },
  { name: 'Estadísticas', href: '/stats', icon: BarChart3 },
  { name: 'Paper Trading', href: '/paper-trading', icon: TrendingUp },
  { name: 'ML Model', href: '/ml', icon: Brain },
  { name: 'Admin', href: '/admin', icon: Settings },
];

const bottomNavigation = [
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { profile, bankroll } = useAuthStore();

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800',
          'transform transition-transform duration-200 ease-in-out',
          'flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-100">DG Picks</span>
          </Link>
        </div>

        {/* User Info Card */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt={profile.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">
                {profile?.displayName || 'Usuario'}
              </p>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Wallet className="w-3 h-3" />
                <span className={bankroll.current >= bankroll.initial ? 'text-emerald-400' : 'text-rose-400'}>
                  {bankroll.current.toFixed(0)} {bankroll.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive ? 'text-blue-400' : 'text-slate-400')} />
                {item.name}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom navigation */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Version */}
        <div className="px-6 py-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">v2.0.0 • Fase 2</p>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
              Beta
            </Badge>
          </div>
        </div>
      </aside>
    </>
  );
}
