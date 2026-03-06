'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Bell, Zap, Activity, User, LogOut, ChevronDown, TestTube, Trophy } from 'lucide-react';
import { LocalDataStatus } from '@/components/local-data-status';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { getApiCallsCount } from '@/services/api-football';
import Link from 'next/link';
import { isDemoMode } from '@/lib/demo-mode';

export function Header() {
  const { apiCallsToday, filters, setFilter, viewMode, setViewMode } = useAppStore();
  const { user, profile, logout, bankroll, isDemo } = useAuthStore();
  const [demoMode, setDemoMode] = useState(false);
  
  useEffect(() => {
    setDemoMode(isDemoMode());
  }, [isDemo]);

  const today = new Date();
  const formattedDate = format(today, "EEEE, d 'de' MMMM", { locale: es });

  const formatNumber = (num: number) => num.toLocaleString('es-ES');

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 gap-4">
      {/* Left: Date and View Mode */}
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <p className="text-sm text-slate-400 capitalize">{formattedDate}</p>
        </div>
        
        {/* Best Picks Link */}
        <Link href="/best-picks">
          <Button
            variant="ghost"
            size="sm"
            className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
          >
            <Trophy className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Mejores Picks</span>
          </Button>
        </Link>

        {/* View Mode Toggles */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
          {(['TODAY', 'TOMORROW', 'WEEKEND', 'LIVE'] as const).map((mode) => (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewMode(mode);
                setFilter('view', mode);
              }}
              className={`
                text-xs h-7 px-2.5
                ${viewMode === mode 
                  ? 'bg-slate-800 text-slate-100' 
                  : 'text-slate-400 hover:text-slate-100'
                }
              `}
            >
              {mode === 'TODAY' && 'Hoy'}
              {mode === 'TOMORROW' && 'Mañana'}
              {mode === 'WEEKEND' && 'Finde'}
              {mode === 'LIVE' && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
                  En Vivo
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Buscar partidos, equipos o ligas..."
            value={filters.searchQuery}
            onChange={(e) => setFilter('searchQuery', e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Right: Stats & User */}
      <div className="flex items-center gap-3">
        {/* Bankroll */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg">
          <span className="text-xs text-slate-400">Bankroll:</span>
          <span className={`text-sm font-medium ${bankroll.current >= bankroll.initial ? 'text-emerald-400' : 'text-rose-400'}`}>
            {bankroll.current.toFixed(0)} {bankroll.currency}
          </span>
        </div>

        {/* API Calls Indicator */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400">
          <Activity className="w-3.5 h-3.5" />
          <span>{formatNumber(apiCallsToday)} / 75k</span>
          {apiCallsToday > 70000 && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1">
              ⚠️
            </Badge>
          )}
        </div>

        {/* Local Data Status */}
        <LocalDataStatus />

        {/* Demo Mode Indicator */}
        {demoMode && (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <TestTube className="w-3 h-3 mr-1" />
            DEMO
          </Badge>
        )}

        {/* Quick Stats */}
        <div className="hidden md:flex items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <Zap className="w-3 h-3 mr-1" />
            ROI: +12.5%
          </Badge>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt={profile.displayName}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-slate-900 border-slate-800" align="end" forceMount>
            <div className="flex items-center gap-2 p-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-slate-100">
                  {profile?.displayName || 'Usuario'}
                </p>
                <p className="text-xs text-slate-400 truncate max-w-[180px]">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem asChild className="text-slate-300 focus:bg-slate-800 focus:text-slate-100 cursor-pointer">
              <Link href="/settings">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-rose-400 focus:bg-slate-800 focus:text-rose-300 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
