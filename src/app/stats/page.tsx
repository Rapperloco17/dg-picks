'use client';

import { usePicksStore } from '@/stores/picks-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AdvancedStats } from '@/components/stats/advanced-stats';
import { 
  TrendingUp, 
  Target, 
  Percent, 
  BarChart3,
  Calendar,
  Trophy
} from 'lucide-react';

export default function StatsPage() {
  const { getStats, picks } = usePicksStore();
  const stats = getStats();

  // Calculate additional stats
  const totalStake = picks
    .filter(p => p.result !== 'PENDING' && p.result !== 'CANCELLED')
    .reduce((sum, p) => sum + p.stake, 0);

  const avgOdds = picks.length > 0
    ? picks.reduce((sum, p) => sum + p.odds, 0) / picks.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Estadísticas</h1>
        <p className="text-sm text-slate-400 mt-1">
          Análisis de rendimiento de tus picks
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Picks" 
          value={stats.totalPicks}
          subtitle={`${stats.pendingPicks} pendientes`}
          icon={Target}
        />
        <StatCard 
          title="Win Rate" 
          value={`${stats.winRate.toFixed(1)}%`}
          subtitle={`${stats.wonPicks}W / ${stats.lostPicks}L`}
          icon={Percent}
          color={stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}
        />
        <StatCard 
          title="ROI" 
          value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
          subtitle={stats.roi >= 0 ? 'Rentable' : 'Negativo'}
          icon={TrendingUp}
          color={stats.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
        <StatCard 
          title="Profit" 
          value={`${stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(1)}u`}
          subtitle={`Stake total: ${totalStake.toFixed(0)}u`}
          icon={BarChart3}
          color={stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Breakdown */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 text-base">Desglose de Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Ganados</span>
                <span className="text-emerald-400 font-medium">{stats.wonPicks}</span>
              </div>
              <Progress 
                value={stats.totalPicks > 0 ? (stats.wonPicks / stats.totalPicks) * 100 : 0} 
                className="h-2 bg-slate-800"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Perdidos</span>
                <span className="text-rose-400 font-medium">{stats.lostPicks}</span>
              </div>
              <Progress 
                value={stats.totalPicks > 0 ? (stats.lostPicks / stats.totalPicks) * 100 : 0} 
                className="h-2 bg-slate-800"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Pendientes</span>
                <span className="text-amber-400 font-medium">{stats.pendingPicks}</span>
              </div>
              <Progress 
                value={stats.totalPicks > 0 ? (stats.pendingPicks / stats.totalPicks) * 100 : 0} 
                className="h-2 bg-slate-800"
              />
            </div>
          </CardContent>
        </Card>

        {/* Betting Stats */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 text-base">Estadísticas de Apuestas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Cuota promedio</span>
              <span className="text-slate-100 font-medium">{avgOdds.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Stake promedio</span>
              <span className="text-slate-100 font-medium">
                {picks.length > 0 ? (totalStake / (picks.length - stats.pendingPicks || 1)).toFixed(1) : '0'}u
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Yield</span>
              <span className={`font-medium ${stats.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.roi.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400">Racha actual</span>
              <span className={`font-medium ${stats.streak > 0 ? 'text-emerald-400' : stats.streak < 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                {stats.streak > 0 ? `+${stats.streak}` : stats.streak}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Stats */}
      <AdvancedStats />
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  color = 'text-slate-100'
}: { 
  title: string; 
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: string;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-slate-800">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
