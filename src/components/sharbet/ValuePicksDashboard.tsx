'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Target, 
  Percent, 
  RefreshCw, 
  Filter, 
  Zap, 
  Play, 
  Calendar,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  stakeRecommendation: string;
  trueProbability: number;
  impliedProbability: number;
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

interface Stats {
  totalPicks: number;
  sharpPicks: number;
  totalAnalyses: number;
  avgEdge: string;
  bestEdge: string;
}

export function ValuePicksDashboard() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sharp' | 'high'>('all');
  const [stats, setStats] = useState<Stats>({
    totalPicks: 0,
    sharpPicks: 0,
    totalAnalyses: 0,
    avgEdge: '0',
    bestEdge: '0%'
  });

  useEffect(() => {
    fetchPicks();
    fetchStats();
  }, []);

  const fetchPicks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sharbet/picks?limit=30');
      const data = await res.json();
      setPicks(data.picks || []);
      
      // Calcular stats locales
      const picksList = data.picks || [];
      if (picksList.length > 0) {
        setStats(prev => ({
          ...prev,
          totalPicks: picksList.length,
          sharpPicks: picksList.filter((p: Pick) => p.isSharp).length,
          avgEdge: (picksList.reduce((a: number, p: Pick) => a + p.edge, 0) / picksList.length * 100).toFixed(1),
          bestEdge: `+${(Math.max(...picksList.map((p: Pick) => p.edge)) * 100).toFixed(0)}%`
        }));
      }
    } catch (error) {
      console.error('Error fetching picks:', error);
      toast.error('Error al cargar picks');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/sharbet/analyze');
      const data = await res.json();
      setStats(prev => ({
        ...prev,
        totalAnalyses: data.totalAnalyses || 0
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const analyzeMatches = async () => {
    try {
      setAnalyzing(true);
      toast.info('Analizando partidos... esto puede tomar unos minutos');
      
      const res = await fetch('/api/sharbet/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzeAll: false })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Análisis completo: ${data.analyzed} partidos, ${data.picks} picks encontrados`);
        fetchPicks();
        fetchStats();
      } else {
        toast.error('Error en el análisis');
      }
    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('Error al analizar partidos');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredPicks = picks.filter(p => {
    if (filter === 'sharp') return p.isSharp;
    if (filter === 'high') return p.edge >= 0.08;
    return true;
  });

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
            Modelo Poisson + detección de edge en mercados
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPicks} 
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={analyzeMatches}
            disabled={analyzing}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className={cn("w-4 h-4 mr-2", analyzing && "animate-pulse")} />
            {analyzing ? 'Analizando...' : 'Analizar Partidos'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          title="Total Picks" 
          value={stats.totalPicks.toString()} 
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard 
          title="Sharp Picks" 
          value={stats.sharpPicks.toString()} 
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
        <StatCard 
          title="Análisis" 
          value={stats.totalAnalyses.toString()} 
          icon={<BarChart3 className="w-4 h-4" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
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

      {/* Status */}
      {analyzing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
          <div>
            <p className="font-medium text-blue-900">Analizando partidos...</p>
            <p className="text-sm text-blue-700">Calculando xG y detectando valor en mercados</p>
          </div>
        </div>
      )}

      {/* Picks List */}
      <div className="space-y-4">
        {filteredPicks.map((pick) => (
          <PickCard key={pick.id} pick={pick} />
        ))}
        {filteredPicks.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No hay picks disponibles</p>
            <p className="text-sm">Haz clic en "Analizar Partidos" para buscar valor</p>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              ¿Cómo funciona?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. <strong>Modelo Poisson:</strong> Calcula probabilidades reales basadas en xG</p>
            <p>2. <strong>Detección de Edge:</strong> Compara probabilidades vs odds del mercado</p>
            <p>3. <strong>Stake Recommendation:</strong> Sugiere stake basado en confianza</p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              Métricas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>Edge:</strong> Diferencia entre probabilidad real y odds</p>
            <p><strong>Sharp Pick:</strong> Edge mayor al 10%</p>
            <p><strong>Confianza:</strong> Escala 1-10 basada en edge y probabilidad</p>
          </CardContent>
        </Card>
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
                True: {(pick.trueProbability * 100).toFixed(1)}%
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
                {pick.stakeRecommendation}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
