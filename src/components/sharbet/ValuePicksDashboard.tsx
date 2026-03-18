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
  Zap, 
  Play,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Match {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  leagueName: string;
  date: string;
  predictions: {
    '1': number;
    'X': number;
    '2': number;
    over_25: number;
    btts_yes: number;
  } | null;
  sharpBetAnalysis: {
    homeXg: number;
    awayXg: number;
    expectedTotal: number;
    probHome: number;
    probDraw: number;
    probAway: number;
    probOver25: number;
    probBttsYes: number;
    picks: Array<{
      id: string;
      market: string;
      selection: string;
      odds: number;
      edge: number;
      edgePercentage: string;
      confidence: number;
      isSharp: boolean;
      stakeRecommendation: string;
      trueProbability: number;
      impliedProbability: number;
    }>;
  } | null;
}

interface Pick {
  id: string;
  market: string;
  selection: string;
  odds: number;
  edge: number;
  edgePercentage: string;
  confidence: number;
  isSharp: boolean;
  stakeRecommendation: string;
  trueProbability: number;
  impliedProbability: number;
  match: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    leagueName: string;
    date: string;
  };
  analysis?: {
    homeXg: number;
    awayXg: number;
    expectedTotal: number;
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
  const [matches, setMatches] = useState<Match[]>([]);
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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/predictions/today');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      setMatches(data.matches || []);
      
      // Extraer todos los picks de los matches
      const allPicks: Pick[] = [];
      for (const match of data.matches || []) {
        if (match.sharpBetAnalysis?.picks) {
          for (const pick of match.sharpBetAnalysis.picks) {
            allPicks.push({
              ...pick,
              match: {
                id: match.id,
                homeTeamName: match.homeTeamName,
                awayTeamName: match.awayTeamName,
                leagueName: match.leagueName,
                date: match.date
              },
              analysis: {
                homeXg: match.sharpBetAnalysis.homeXg,
                awayXg: match.sharpBetAnalysis.awayXg,
                expectedTotal: match.sharpBetAnalysis.expectedTotal
              }
            });
          }
        }
      }
      
      setPicks(allPicks);
      
      // Calcular stats
      if (allPicks.length > 0) {
        setStats(prev => ({
          ...prev,
          totalPicks: allPicks.length,
          sharpPicks: allPicks.filter((p: Pick) => p.isSharp).length,
          avgEdge: (allPicks.reduce((a: number, p: Pick) => a + p.edge, 0) / allPicks.length * 100).toFixed(1),
          bestEdge: `+${(Math.max(...allPicks.map((p: Pick) => p.edge)) * 100).toFixed(0)}%`,
          totalAnalyses: data.matches?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const analyzeMatches = async () => {
    try {
      setAnalyzing(true);
      toast.info('Analizando partidos...');
      
      // El análisis ya se hace automáticamente en GET /api/predictions/today
      // Solo recargamos los datos
      await fetchData();
      
      toast.success('Análisis completo');
    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('Error al analizar');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredPicks = picks.filter((p: Pick) => {
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
            Sharp Picks Pro
          </h2>
          <p className="text-muted-foreground">
            Modelo Poisson + Detección de Valor
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
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
            {analyzing ? 'Analizando...' : 'Analizar'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          title="Picks Hoy" 
          value={stats.totalPicks.toString()} 
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard 
          title="Sharp" 
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
          title="Partidos" 
          value={matches.length.toString()} 
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
            <p className="text-sm text-blue-700">Calculando xG y detectando valor</p>
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
            <p className="text-sm">Haz clic en &quot;Analizar&quot; para buscar valor</p>
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
            <p>1. <strong>Modelo Poisson:</strong> Calcula xG y probabilidades reales</p>
            <p>2. <strong>Detección de Edge:</strong> Compara con odds del mercado</p>
            <p>3. <strong>Stake:</strong> Sugiere stake basado en confianza</p>
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
            <p><strong>Edge:</strong> Ventaja sobre el mercado</p>
            <p><strong>Sharp:</strong> Edge mayor al 10%</p>
            <p><strong>Confianza:</strong> Escala 1-10</p>
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
              <Badge variant="outline">{pick.match.leagueName}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(pick.match.date).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-lg font-bold">
              {pick.match.homeTeamName} vs {pick.match.awayTeamName}
            </h3>
            {pick.analysis && (
              <div className="text-xs text-muted-foreground mt-1">
                xG: {pick.analysis.homeXg.toFixed(2)} - {pick.analysis.awayXg.toFixed(2)} | 
                Total: {pick.analysis.expectedTotal.toFixed(2)}
              </div>
            )}
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
