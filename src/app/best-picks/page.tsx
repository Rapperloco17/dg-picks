'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Percent, 
  Clock,
  Star,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar
} from 'lucide-react';
import { getBestPicks, BestPick, DailyBestPicks } from '@/services/best-picks-service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BestPicksPage() {
  const [picksData, setPicksData] = useState<DailyBestPicks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState(60);

  useEffect(() => {
    loadPicks();
  }, []);

  const loadPicks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBestPicks();
      setPicksData(data);
    } catch (err) {
      setError('Error al cargar los picks. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar picks
  const filteredPicks = picksData?.bestPicks.filter(pick => {
    if (selectedMarket !== 'all' && pick.market !== selectedMarket) return false;
    if (pick.confidence < minConfidence) return false;
    return true;
  }) || [];

  // Tomar top 5
  const topPicks = filteredPicks.slice(0, 5);

  const getMarketIcon = (market: string) => {
    switch (market) {
      case '1X2': return <Target className="w-4 h-4" />;
      case 'OVER_UNDER': return <TrendingUp className="w-4 h-4" />;
      case 'BTTS': return <CheckCircle2 className="w-4 h-4" />;
      case 'CORNERS': return <Percent className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getMarketLabel = (market: string) => {
    switch (market) {
      case '1X2': return '1X2';
      case 'OVER_UNDER': return 'Over/Under';
      case 'BTTS': return 'Ambos Anotan';
      case 'CORNERS': return 'Corners';
      case 'CARDS': return 'Tarjetas';
      default: return market;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Mejores Picks del Día
              </h1>
              <p className="text-muted-foreground mt-1">
                {picksData ? (
                  <>
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {format(new Date(picksData.date), 'EEEE, d MMMM yyyy', { locale: es })}
                    {' • '}
                    {picksData.totalMatches} partidos analizados
                  </>
                ) : (
                  'Cargando picks...'
                )}
              </p>
            </div>
            <Button 
              onClick={loadPicks} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <select 
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="px-3 py-1.5 rounded-md border bg-background text-sm"
              >
                <option value="all">Todos los mercados</option>
                <option value="1X2">1X2 - Ganador</option>
                <option value="OVER_UNDER">Over/Under</option>
                <option value="BTTS">Ambos Anotan</option>
                <option value="CORNERS">Corners</option>
              </select>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confianza mínima:</span>
                <input 
                  type="range" 
                  min="50" 
                  max="80" 
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm font-medium w-8">{minConfidence}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/10">
            <CardContent className="pt-4 flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analizando partidos y generando picks...</p>
          </div>
        )}

        {/* No picks */}
        {!isLoading && topPicks.length === 0 && (
          <div className="text-center py-20">
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay picks disponibles</h3>
            <p className="text-muted-foreground">
              No se encontraron picks que cumplan con los criterios actuales.
              <br />
              Intenta ajustar los filtros o volver más tarde.
            </p>
          </div>
        )}

        {/* Picks Grid */}
        {!isLoading && topPicks.length > 0 && (
          <div className="space-y-4">
            {topPicks.map((pick, index) => (
              <Card 
                key={pick.id} 
                className={`overflow-hidden transition-all hover:shadow-lg ${
                  index === 0 ? 'border-yellow-400 ring-1 ring-yellow-400/50' : ''
                }`}
              >
                {/* Header del pick */}
                <div className={`h-1 ${getConfidenceColor(pick.confidence)}`} />
                
                <CardContent className="pt-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    
                    {/* Info del partido */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {getMarketIcon(pick.market)}
                          <span className="ml-1">{getMarketLabel(pick.market)}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">{pick.league}</span>
                        {pick.isValueBet && (
                          <Badge className="bg-green-500 text-white text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Value Bet
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold">
                        {pick.homeTeam} vs {pick.awayTeam}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {pick.selection}
                      </p>
                      
                      {/* Razones */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pick.reasoning.map((reason, i) => (
                          <span 
                            key={i} 
                            className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-6 lg:justify-end">
                      {/* Score */}
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getScoreColor(pick.score)}`}>
                          {pick.score}
                        </div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                      
                      {/* Probabilidad */}
                      <div className="text-center min-w-[60px]">
                        <div className="text-xl font-semibold">
                          {pick.confidence.toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Confianza</div>
                      </div>
                      
                      {/* Odds */}
                      <div className="text-center min-w-[60px]">
                        <div className="text-xl font-semibold text-blue-600">
                          {pick.odds.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Cuota</div>
                      </div>
                      
                      {/* EV */}
                      <div className="text-center min-w-[60px]">
                        <div className={`text-xl font-semibold ${
                          pick.ev > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(pick.ev * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">EV</div>
                      </div>
                      
                      {/* Kelly Stake */}
                      <div className="text-center min-w-[80px]">
                        <div className="text-xl font-semibold text-purple-600">
                          {pick.kellyStake.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Stake Sugerido</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Leyenda */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Cómo interpretar los picks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>Score:</strong> Valoración compuesta (0-100) basada en EV, confianza y Kelly.</p>
            <p><strong>Confianza:</strong> Probabilidad estimada de que el pick acierte según el modelo ML.</p>
            <p><strong>EV (Expected Value):</strong> Valor esperado. Positivo = apuesta con valor.</p>
            <p><strong>Stake Sugerido:</strong> Porcentaje del bankroll recomendado según el criterio de Kelly.</p>
            <p><strong>Value Bet:</strong> Pick con EV positivo (&gt;5%), indicando valor en las cuotas.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
