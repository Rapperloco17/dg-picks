'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  Goal, 
  Flag, 
  Shield, 
  Activity,
  Timer,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFixtureStatistics, FixtureStatistics } from '@/services/api-football';

interface LiveMatchStatsProps {
  fixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  isLive?: boolean;
  isFinished?: boolean;
}

interface StatItem {
  label: string;
  home: number | string;
  away: number | string;
  icon?: React.ReactNode;
}

export function LiveMatchStats({
  fixtureId,
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
  isLive,
  isFinished
}: LiveMatchStatsProps) {
  const [stats, setStats] = useState<FixtureStatistics[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const data = await getFixtureStatistics(fixtureId);
        if (data && data.length >= 2) {
          setStats(data);
        }
      } catch (error) {
        console.error('Error loading match statistics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    
    // Refresh stats every 30 seconds if live
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(loadStats, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fixtureId, isLive]);

  if (loading) {
    return <StatsLoadingSkeleton />;
  }

  if (!stats || stats.length < 2) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Estadísticas no disponibles</p>
          <p className="text-sm text-slate-500 mt-2">
            Las estadísticas del partido no están disponibles en este momento
          </p>
        </CardContent>
      </Card>
    );
  }

  const homeStats = stats[0];
  const awayStats = stats[1];

  const getStatValue = (teamStats: FixtureStatistics, type: string): number => {
    const stat = teamStats.statistics.find(s => s.type === type);
    const val = stat?.value;
    if (val === null || val === undefined) return 0;
    if (typeof val === 'string') {
      const num = parseInt(val.replace('%', ''), 10);
      return isNaN(num) ? 0 : num;
    }
    return val;
  };

  const statistics: StatItem[] = [
    {
      label: 'Posesión del balón',
      home: `${getStatValue(homeStats, 'Ball Possession')}%`,
      away: `${getStatValue(awayStats, 'Ball Possession')}%`,
      icon: <Activity className="w-4 h-4" />
    },
    {
      label: 'Tiros totales',
      home: getStatValue(homeStats, 'Total Shots'),
      away: getStatValue(awayStats, 'Total Shots'),
      icon: <Target className="w-4 h-4" />
    },
    {
      label: 'Tiros a puerta',
      home: getStatValue(homeStats, 'Shots on Goal'),
      away: getStatValue(awayStats, 'Shots on Goal'),
      icon: <Goal className="w-4 h-4" />
    },
    {
      label: 'Tiros fuera',
      home: getStatValue(homeStats, 'Shots off Goal'),
      away: getStatValue(awayStats, 'Shots off Goal'),
      icon: <Flag className="w-4 h-4" />
    },
    {
      label: 'Tiros bloqueados',
      home: getStatValue(homeStats, 'Blocked Shots'),
      away: getStatValue(awayStats, 'Blocked Shots'),
      icon: <Shield className="w-4 h-4" />
    },
    {
      label: 'Corners',
      home: getStatValue(homeStats, 'Corner Kicks'),
      away: getStatValue(awayStats, 'Corner Kicks'),
      icon: <Flag className="w-4 h-4" />
    },
    {
      label: 'Faltas',
      home: getStatValue(homeStats, 'Fouls'),
      away: getStatValue(awayStats, 'Fouls'),
      icon: <AlertCircle className="w-4 h-4" />
    },
    {
      label: 'Tarjetas amarillas',
      home: getStatValue(homeStats, 'Yellow Cards'),
      away: getStatValue(awayStats, 'Yellow Cards'),
      icon: <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
    },
    {
      label: 'Tarjetas rojas',
      home: getStatValue(homeStats, 'Red Cards'),
      away: getStatValue(awayStats, 'Red Cards'),
      icon: <div className="w-3 h-4 bg-red-500 rounded-sm" />
    },
    {
      label: 'Paradas del portero',
      home: getStatValue(homeStats, 'Goalkeeper Saves'),
      away: getStatValue(awayStats, 'Goalkeeper Saves'),
      icon: <Shield className="w-4 h-4" />
    },
    {
      label: 'Pases totales',
      home: getStatValue(homeStats, 'Total Passes'),
      away: getStatValue(awayStats, 'Total Passes'),
      icon: <Activity className="w-4 h-4" />
    },
    {
      label: 'Pases precisos',
      home: `${getStatValue(homeStats, 'Passes %')}%`,
      away: `${getStatValue(awayStats, 'Passes %')}%`,
      icon: <Target className="w-4 h-4" />
    },
    {
      label: 'Fueras de juego',
      home: getStatValue(homeStats, 'Offsides'),
      away: getStatValue(awayStats, 'Offsides'),
      icon: <Flag className="w-4 h-4" />
    },
    {
      label: 'Saques de esquina',
      home: getStatValue(homeStats, 'Corner Kicks'),
      away: getStatValue(awayStats, 'Corner Kicks'),
      icon: <Target className="w-4 h-4" />
    }
  ];

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5 text-emerald-500" />
          {isLive ? 'Estadísticas en Vivo' : 'Estadísticas del Partido'}
          {isLive && (
            <Badge variant="destructive" className="animate-pulse ml-2">
              <Timer className="w-3 h-3 mr-1" />
              Actualizando
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Team Headers */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 flex-1">
            <img src={homeTeamLogo} alt={homeTeamName} className="w-10 h-10 object-contain" />
            <span className="font-semibold text-slate-100">{homeTeamName}</span>
          </div>
          <div className="text-sm text-slate-500 px-4">vs</div>
          <div className="flex items-center gap-3 flex-1 justify-end">
            <span className="font-semibold text-slate-100">{awayTeamName}</span>
            <img src={awayTeamLogo} alt={awayTeamName} className="w-10 h-10 object-contain" />
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          {statistics.map((stat, index) => (
            <StatRow key={index} stat={stat} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({ stat }: { stat: StatItem }) {
  const homeVal = typeof stat.home === 'number' ? stat.home : parseInt(String(stat.home).replace('%', ''), 10) || 0;
  const awayVal = typeof stat.away === 'number' ? stat.away : parseInt(String(stat.away).replace('%', ''), 10) || 0;
  const total = homeVal + awayVal || 1;
  const homePercent = (homeVal / total) * 100;
  const awayPercent = (awayVal / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex-1 text-right pr-4">
          <span className={cn(
            "font-bold",
            homeVal > awayVal ? "text-emerald-400" : "text-slate-300"
          )}>
            {stat.home}
          </span>
        </div>
        
        <div className="flex items-center gap-2 px-4 min-w-[160px] justify-center">
          {stat.icon}
          <span className="text-slate-400">{stat.label}</span>
        </div>
        
        <div className="flex-1 text-left pl-4">
          <span className={cn(
            "font-bold",
            awayVal > homeVal ? "text-blue-400" : "text-slate-300"
          )}>
            {stat.away}
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="flex h-2 rounded-full overflow-hidden">
        <div 
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${homePercent}%` }}
        />
        <div 
          className="bg-blue-500 transition-all duration-500"
          style={{ width: `${awayPercent}%` }}
        />
      </div>
    </div>
  );
}

function StatsLoadingSkeleton() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
