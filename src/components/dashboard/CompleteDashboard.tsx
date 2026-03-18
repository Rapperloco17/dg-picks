'use client';

import { useState } from 'react';
import { BettingDashboard } from './BettingDashboard';
import { StatsPanel } from './StatsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings,
  Bell,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function CompleteDashboard() {
  const [activeTab, setActiveTab] = useState('picks');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header Principal */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">DG Picks Pro</h1>
                <p className="text-xs text-slate-400">Análisis Predictivo + Estadísticas</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-[1400px] mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-0 p-0 h-14">
              <TabsTrigger 
                value="picks" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:text-white rounded-none px-4 py-4 text-slate-400 hover:text-white"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Picks del Día
                <Badge className="ml-2 bg-green-600 text-xs">12</Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="stats"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-white rounded-none px-4 py-4 text-slate-400 hover:text-white"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Estadísticas
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-slate-500 data-[state=active]:text-white rounded-none px-4 py-4 text-slate-400 hover:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Config
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="picks" className="mt-0">
            <BettingDashboard />
          </TabsContent>
          <TabsContent value="stats" className="mt-0">
            <StatsPanel />
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">Configuración</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Preferencias de Apuesta</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Stake por defecto</p>
                <p className="text-sm text-slate-400">Unidad base para cálculos</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">$100</span>
                <Button variant="outline" size="sm">Editar</Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Edge mínimo para alertas</p>
                <p className="text-sm text-slate-400">Solo mostrar picks con este edge o mayor</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">5%</span>
                <Button variant="outline" size="sm">Editar</Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Cuota máxima</p>
                <p className="text-sm text-slate-400">No mostrar picks con odds mayores a</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">5.00</span>
                <Button variant="outline" size="sm">Editar</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Mercados Activos</h3>
          
          <div className="space-y-2">
            {['1X2', 'Over/Under 2.5', 'BTTS', 'Corners', 'Tarjetas', 'Doble Oportunidad'].map(market => (
              <div key={market} className="flex items-center justify-between py-2">
                <span className="text-slate-300">{market}</span>
                <div className="w-12 h-6 bg-green-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Notificaciones</h3>
          
          <div className="space-y-2">
            {[
              'Alertas de picks con alto edge',
              'Partidos que empiezan en 1 hora',
              'Resultados de mis apuestas',
              'Nuevos parlays sugeridos'
            ].map((notif, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-slate-300">{notif}</span>
                <div className={cn(
                  "w-12 h-6 rounded-full relative cursor-pointer",
                  i < 2 ? 'bg-green-600' : 'bg-slate-700'
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    i < 2 ? 'right-1' : 'left-1'
                  )} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
