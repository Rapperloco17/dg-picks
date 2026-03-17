'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Percent, RefreshCw, Filter, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Pick {
  id: string;
  market: string;
  selection: string;
  odds: number;
  edge: number;
  edgePercentage: string;
  confidence: number;
  bookmaker: string;
  isSharp: boolean;
  analysis: {
    match: {
      homeTeamName: string;
      awayTeamName: string;
      leagueName: string;
      date: string;
    };
    expectedTotal: number;
    homeXg: number;
    awayXg: number;
  };
}

export function ValuePicksDashboard() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sharp' | 'high'>('all');

  useEffect(() => {
    fetchPicks();
  }, []);

  const fetchPicks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sharbet/picks?limit=30');
      const data = await res.json();
      setPicks(data.picks || []);
    } catch (error) {
      console.error('Error fetching picks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPicks = picks.filter(p => {
    if (filter === 'sharp') return p.isSharp;
    if (filter === 'high') return p.edge >= 0.08;
    return true;
  });

  const stats = {
    total: picks.length,
    sharp: picks.filter(p => p.isSharp).length,
    avgEdge: picks.length > 0 
      ? (picks.reduce((a, p) => a + p.edge, 0) / picks.length * 100).toFixed(1) 
      : '0',
    bestEdge: picks.length > 0 
      ? `+${(Math.max(...picks.map(p => p.edge)) * 100).toFixed(0)}%` 
      : '0%'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-green-500" />
            Valor Picks
          </h2>
          <p className="text-muted-foreground">
            Modelo Poisson + deteccion de edge en mercados
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchPicks} 
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Picks" 
          value={stats.total.toString()} 
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard 
          title="Sharp Picks" 
          value={stats.sharp.toString()} 
          icon={<Zap className="w-4 h-4 text-yellow-500" />}
          highlight 
        />
        <StatCard 
          title="Edge Promedio" 
          value={`${stats.avgEdge}%`} 
          icon={<Percent className="w-4 h-4" />}
        />
        <StatCard 
          title="Mejor Edge" 
          value={stats.bestEdge} 
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          highlight 
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos
        </Button>
        <Button 
          variant={filter === 'sharp' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('sharp')}
        >
          <Zap className="w-3 h-3 mr-1" />
          Sharp
        </Button>
        <Button 
          variant={filter === 'high' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('high')}
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          Alto Edge
        </Button>
      </div>

      {/* Picks List */}
      <div className="space-y-4">
        {filteredPicks.map((pick) => (
          <PickCard key={pick.id} pick={pick} />
        ))}
        {filteredPicks.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            No hay picks disponibles con los filtros seleccionados
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, highlight = false }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && 'border-green-500/50')}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", highlight && 'text-green-600')}>
              {value}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-full",
            highlight ? 'bg-green-100' : 'bg-muted'
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PickCard({ pick }: { pick: Pick }) {
  const match = pick.analysis.match;
  
  return (
    <Card className={cn(
      "border-l-4 transition-shadow hover:shadow-md",
      pick.isSharp ? 'border-l-green-500' : 'border-l-yellow-500'
    )}>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          {/* Match Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {pick.isSharp && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <Zap className="w-3 h-3 mr-1" />
                  SHARP
                </Badge>
              )}
              <Badge variant="outline">{match.leagueName}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(match.date).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-lg font-bold">
              {match.homeTeamName} vs {match.awayTeamName}
            </h3>
            <div className="text-xs text-muted-foreground mt-1">
              xG: {pick.analysis.homeXg.toFixed(2)} - {pick.analysis.awayXg.toFixed(2)} | 
              Total: {pick.analysis.expectedTotal.toFixed(2)}
            </div>
          </div>

          {/* Pick Details */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 min-w-0">
            <div>
              <p className="text-xs text-muted-foreground">Mercado</p>
              <p className="font-semibold">{pick.market}</p>
              <p className="text-sm font-bold">{pick.selection}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Odds</p>
              <p className="text-2xl font-bold text-blue-600">@{pick.odds}</p>
              <p className="text-xs text-muted-foreground">{pick.bookmaker}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Edge</p>
              <p className="text-2xl font-bold text-green-600">{pick.edgePercentage}</p>
              <p className="text-xs text-muted-foreground">
                True: {(pick.analysis.homeXg * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confianza</p>
              <p className="text-xl font-bold">{pick.confidence}/10</p>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-1.5 h-3 rounded-sm",
                      i < pick.confidence ? 'bg-blue-500' : 'bg-gray-200'
                    )}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stake</p>
              <Badge 
                variant={pick.edge >= 0.08 ? 'default' : 'secondary'}
                className="mt-1"
              >
                {pick.edge >= 0.08 ? '3-4%' : pick.edge >= 0.06 ? '2%' : '1%'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
