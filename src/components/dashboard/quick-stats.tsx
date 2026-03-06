'use client';

import { usePicksStore } from '@/stores/picks-store';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  Target, 
  Percent,
  Activity,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue,
  color = 'blue' 
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    violet: 'bg-violet-500/10 text-violet-400',
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                trend === 'up' ? "text-emerald-400" :
                trend === 'down' ? "text-rose-400" : "text-slate-400"
              )}>
                <TrendingUp className={cn(
                  "w-3 h-3",
                  trend === 'down' && "rotate-180"
                )} />
                {trendValue}
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickStats() {
  const { getStats } = usePicksStore();
  const stats = getStats();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Picks"
        value={stats.totalPicks}
        subtitle={`${stats.pendingPicks} pendientes`}
        icon={Target}
        color="blue"
      />
      
      <StatCard
        title="Win Rate"
        value={`${stats.winRate.toFixed(1)}%`}
        subtitle={`${stats.wonPicks} ganados / ${stats.lostPicks} perdidos`}
        icon={Percent}
        trend={stats.winRate > 55 ? 'up' : stats.winRate < 45 ? 'down' : 'neutral'}
        trendValue={stats.winRate > 55 ? 'Buen rendimiento' : stats.winRate < 45 ? 'Por debajo' : 'Estable'}
        color="emerald"
      />
      
      <StatCard
        title="ROI Total"
        value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(2)}%`}
        subtitle={`Profit: ${stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)} u`}
        icon={Activity}
        trend={stats.roi > 0 ? 'up' : stats.roi < 0 ? 'down' : 'neutral'}
        trendValue={stats.roi > 0 ? 'Rentable' : stats.roi < 0 ? 'Negativo' : 'Break-even'}
        color={stats.roi >= 0 ? 'emerald' : 'rose'}
      />
      
      <StatCard
        title="Racha Actual"
        value={stats.streak > 0 ? `+${stats.streak}` : stats.streak}
        subtitle={stats.streak > 0 ? '¡Sigue así!' : stats.streak < 0 ? 'Momento difícil' : 'Sin racha'}
        icon={Zap}
        color="amber"
      />
    </div>
  );
}
