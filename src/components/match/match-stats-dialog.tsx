'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  BarChart3,
  Users,
  Brain,
  Target,
  Trophy,
  ChevronRight,
  AlertCircle,
  Activity,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { Match } from '@/types';
import { 
  CompleteMatchStats, 
  getCompleteMatchAnalysisProgressive,
  clearMatchCache,
} from '@/services/match-stats-cached';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface MatchStatsDialogProps {
  match: Match;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
}

// Default empty stats to prevent undefined errors
const defaultForm = {
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  form: '',
  last10: [],
};

const defaultTeamStats = {
  leaguePosition: 0,
  points: 0,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  form: '',
  cleanSheets: 0,
  failedToScore: 0,
  over15: 0,
  over25: 0,
  over35: 0,
  btts: 0,
  avgGoalsScored: 0,
  avgGoalsConceded: 0,
  cards: { yellow: 0, red: 0 },
  corners: { for: 0, against: 0 },
};

const defaultH2H = {
  totalMatches: 0,
  homeWins: 0,
  draws: 0,
  awayWins: 0,
  avgGoals: 0,
  over25: 0,
  btts: 0,
  last5: [],
};

const defaultOdds = {
  matchWinner: null,
  overUnder: { over15: null, under15: null, over25: null, under25: null, over35: null, under35: null },
  btts: { yes: null, no: null },
  asianHandicap: null,
  corners: null,
  cards: null,
};

const defaultMLPrediction = {
  homeWin: 33.33,
  draw: 33.33,
  awayWin: 33.33,
  over15: 70,
  over25: 50,
  over35: 30,
  btts: 50,
  cards: {
    over45: 50,
    over55: 35,
    avgTotal: 4.5,
  },
  corners: {
    over85: 55,
    over95: 45,
    over105: 35,
    avgTotal: 9.5,
  },
  factors: {
    homeAdvantage: 15,
    formWeight: 0,
    h2hWeight: 0,
    statsWeight: 0,
  },
  recommendedPick: null,
};

export function MatchStatsDialog({ match, open, onOpenChange, defaultTab = 'resumen' }: MatchStatsDialogProps) {
  const [stats, setStats] = useState<CompleteMatchStats | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingStage('loading');
    
    try {
      const data = await getCompleteMatchAnalysisProgressive(
        match,
        (partialData, stage) => {
          setLoadingStage(stage);
          if (stage === 'forms' || stage === 'standings') {
            setStats(prev => ({ 
              ...prev, 
              ...partialData,
              homeStats: { ...defaultTeamStats, ...partialData.homeStats },
              awayStats: { ...defaultTeamStats, ...partialData.awayStats },
              homeForm: { ...defaultForm, ...partialData.homeForm },
              awayForm: { ...defaultForm, ...partialData.awayForm },
            } as CompleteMatchStats));
          }
        }
      );
      setStats(data);
    } catch (err) {
      setError('Error cargando estadísticas');
    } finally {
      setLoading(false);
      setLoadingStage('complete');
    }
  }, [match]);

  useEffect(() => {
    if (open && match) {
      loadStats();
    }
  }, [open, match, loadStats]);

  const handleRefresh = () => {
    clearMatchCache(match.fixture.id);
    loadStats();
  };

  // Safely get stats with defaults
  const safeStats = stats || {
    match,
    homeForm: defaultForm,
    awayForm: defaultForm,
    homeStats: defaultTeamStats,
    awayStats: defaultTeamStats,
    h2h: defaultH2H,
    odds: defaultOdds,
    mlPrediction: defaultMLPrediction,
    leagueTable: [],
  };

  const isPartiallyLoaded = safeStats.odds?.matchWinner && safeStats.homeForm?.last10?.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img 
                  src={match.teams.home.logo} 
                  alt={match.teams.home.name}
                  className="w-8 h-8 object-contain"
                />
                <span className="text-lg">{match.teams.home.name}</span>
              </div>
              <span className="text-muted-foreground">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-lg">{match.teams.away.name}</span>
                <img 
                  src={match.teams.away.logo} 
                  alt={match.teams.away.name}
                  className="w-8 h-8 object-contain"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Badge variant="outline" className="text-xs">
                {format(new Date(match.fixture.date), 'PPP p', { locale: es })}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading && !isPartiallyLoaded ? (
          <LoadingProgress stage={loadingStage} />
        ) : error ? (
          <ErrorState error={error} onRetry={loadStats} />
        ) : (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="resumen" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="forma" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Forma
              </TabsTrigger>
              <TabsTrigger value="estadisticas" className="text-xs">
                <BarChart3 className="w-3 h-3 mr-1" />
                Estadísticas
              </TabsTrigger>
              <TabsTrigger value="h2h" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                H2H
              </TabsTrigger>
              <TabsTrigger value="ml" className="text-xs">
                <Brain className="w-3 h-3 mr-1" />
                ML
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="space-y-4">
              <SummaryTab 
                stats={safeStats} 
                loading={loading && !safeStats.homeStats?.leaguePosition} 
              />
            </TabsContent>

            <TabsContent value="forma" className="space-y-4">
              <FormTab 
                homeForm={safeStats.homeForm} 
                awayForm={safeStats.awayForm} 
                match={match}
                loading={loading && (!safeStats.homeForm?.last10?.length)}
              />
            </TabsContent>

            <TabsContent value="estadisticas" className="space-y-4">
              <StatsTab 
                homeStats={safeStats.homeStats} 
                awayStats={safeStats.awayStats} 
                leagueTable={safeStats.leagueTable || []}
                match={match}
                loading={loading && !safeStats.homeStats?.played}
              />
            </TabsContent>

            <TabsContent value="h2h" className="space-y-4">
              <H2HTab 
                h2h={safeStats.h2h} 
                homeName={match.teams.home.name} 
                awayName={match.teams.away.name}
                loading={loading && !safeStats.h2h?.totalMatches}
              />
            </TabsContent>

            <TabsContent value="ml" className="space-y-4">
              <MLTab 
                mlPrediction={safeStats.mlPrediction}
                odds={safeStats.odds}
                match={match}
                loading={loading && !safeStats.mlPrediction?.homeWin}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Loading Progress Component
function LoadingProgress({ stage }: { stage: string }) {
  const getProgress = () => {
    switch (stage) {
      case 'forms': return 40;
      case 'standings': return 70;
      case 'h2h': return 90;
      case 'complete': return 100;
      default: return 20;
    }
  };

  const getMessage = () => {
    switch (stage) {
      case 'forms': return 'Cargando forma reciente...';
      case 'standings': return 'Cargando clasificación...';
      case 'h2h': return 'Cargando historial H2H...';
      case 'complete': return 'Finalizando...';
      default: return 'Iniciando...';
    }
  };

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <Activity className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-500" />
        <p className="text-lg font-medium">{getMessage()}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Esto puede tardar unos segundos debido al rate limiting de la API
        </p>
      </div>
      <Progress value={getProgress()} className="w-full max-w-md mx-auto" />
      
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

// Error State
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
      <p className="text-lg">{error}</p>
      <p className="text-sm mt-1 mb-4">No se pudieron cargar las estadísticas</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Reintentar
      </Button>
    </div>
  );
}

// ===================== SUMMARY TAB =====================
function SummaryTab({ stats, loading }: { stats: any; loading?: boolean }) {
  const { match, homeStats, awayStats, odds, mlPrediction, homeForm, awayForm } = stats;
  
  const getPositionColor = (pos: number) => {
    if (!pos || pos <= 0) return 'text-muted-foreground';
    if (pos <= 3) return 'text-green-500';
    if (pos <= 6) return 'text-blue-500';
    if (pos >= 15) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const homeRecentGoals = (homeForm?.last10 || []).slice(0, 5).reduce((sum: number, m: any) => sum + (m?.goalsFor || 0), 0);
  const awayRecentGoals = (awayForm?.last10 || []).slice(0, 5).reduce((sum: number, m: any) => sum + (m?.goalsFor || 0), 0);

  const homePosition = homeStats?.leaguePosition || 0;
  const awayPosition = awayStats?.leaguePosition || 0;
  const hasStandings = homePosition > 0 || awayPosition > 0;

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex gap-2">
        <Link href={`/picks/new?match=${match?.fixture?.id}`} className="flex-1">
          <Button className="w-full bg-green-500 hover:bg-green-600">
            <Zap className="w-4 h-4 mr-2" />
            Crear Pick
          </Button>
        </Link>
      </div>

      {/* League Position */}
      {hasStandings && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Posición en Liga
              {loading && <Badge variant="secondary" className="text-xs">Cargando...</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-center">
                {loading && !homePosition ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  <div className={`text-2xl font-bold ${getPositionColor(homePosition)}`}>
                    {homePosition > 0 ? `#${homePosition}` : 'N/D'}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">{match?.teams?.home?.name || 'Local'}</div>
              </div>
              <div className="text-center px-4">
                <div className="text-sm text-muted-foreground">VS</div>
              </div>
              <div className="text-center">
                {loading && !awayPosition ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  <div className={`text-2xl font-bold ${getPositionColor(awayPosition)}`}>
                    {awayPosition > 0 ? `#${awayPosition}` : 'N/D'}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">{match?.teams?.away?.name || 'Visitante'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Odds */}
      {odds?.matchWinner && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cuotas Actuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">1</div>
                <div className="text-xl font-bold">{odds.matchWinner.home?.toFixed(2) || '-'}</div>
                <div className="text-xs text-muted-foreground truncate">{match?.teams?.home?.name || 'Local'}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">X</div>
                <div className="text-xl font-bold">{odds.matchWinner.draw?.toFixed(2) || '-'}</div>
                <div className="text-xs text-muted-foreground">Empate</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">2</div>
                <div className="text-xl font-bold">{odds.matchWinner.away?.toFixed(2) || '-'}</div>
                <div className="text-xs text-muted-foreground truncate">{match?.teams?.away?.name || 'Visitante'}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {odds.overUnder?.over25 && (
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">Over 2.5</div>
                  <div className="font-bold">{odds.overUnder.over25.toFixed(2)}</div>
                </div>
              )}
              {odds.btts?.yes && (
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">Ambos Anotan</div>
                  <div className="font-bold">{odds.btts.yes.toFixed(2)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ML Recommended Pick */}
      {mlPrediction?.recommendedPick && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Pick Recomendado por ML
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge className={mlPrediction.recommendedPick.confidence === 'high' ? 'bg-green-500' : mlPrediction.recommendedPick.confidence === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}>
                  {mlPrediction.recommendedPick.confidence === 'high' ? 'Alta' : mlPrediction.recommendedPick.confidence === 'medium' ? 'Media' : 'Baja'} confianza
                </Badge>
                <div className="mt-2">
                  <span className="text-lg font-bold">
                    {mlPrediction.recommendedPick.selection}
                  </span>
                  <div className="text-sm text-muted-foreground">
                    {mlPrediction.recommendedPick.market} | 
                    Cuota: {mlPrediction.recommendedPick.odds?.toFixed(2) || '-'} | 
                    EV: +{(mlPrediction.recommendedPick.ev * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <Link href={`/picks/new?match=${match?.fixture?.id}`}>
                <Button size="sm" className="bg-green-500 hover:bg-green-600">
                  Apostar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">Forma Local</div>
            <div className="flex gap-1 flex-wrap">
              {(homeForm?.form || '').slice(0, 5).split('').map((r: string, i: number) => (
                <FormBadge key={i} result={r as 'W' | 'D' | 'L'} small />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">Forma Visitante</div>
            <div className="flex gap-1 flex-wrap">
              {(awayForm?.form || '').slice(0, 5).split('').map((r: string, i: number) => (
                <FormBadge key={i} result={r as 'W' | 'D' | 'L'} small />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">Goles Últimos 5</div>
            <div className="flex justify-between">
              <span className="font-bold">{homeRecentGoals}</span>
              <span className="text-muted-foreground">-</span>
              <span className="font-bold">{awayRecentGoals}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">Prom. Goles</div>
            {loading && !homeStats?.avgGoalsScored ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <div className="flex justify-between">
                <span className="font-bold">{(homeStats?.avgGoalsScored || 0).toFixed(1)}</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-bold">{(awayStats?.avgGoalsScored || 0).toFixed(1)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===================== FORM TAB =====================
function FormTab({ homeForm, awayForm, match, loading }: { 
  homeForm: any; 
  awayForm: any; 
  match: Match;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const homeFormData = homeForm || defaultForm;
  const awayFormData = awayForm || defaultForm;

  const homeGoalsTotal = (homeFormData.last10 || []).reduce((sum: number, m: any) => sum + (m?.goalsFor || 0), 0);
  const homeConcededTotal = (homeFormData.last10 || []).reduce((sum: number, m: any) => sum + (m?.goalsAgainst || 0), 0);
  const awayGoalsTotal = (awayFormData.last10 || []).reduce((sum: number, m: any) => sum + (m?.goalsFor || 0), 0);
  const awayConcededTotal = (awayFormData.last10 || []).reduce((sum: number, m: any) => sum + (m?.goalsAgainst || 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">{match?.teams?.home?.name || 'Local'} - Últimos 10</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-green-500">{homeFormData.wins || 0}</div>
                <div className="text-xs text-muted-foreground">Victorias</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-500">{homeFormData.draws || 0}</div>
                <div className="text-xs text-muted-foreground">Empates</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-500">{homeFormData.losses || 0}</div>
                <div className="text-xs text-muted-foreground">Derrotas</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-center text-sm">
              <div><span className="text-green-500 font-bold">{homeGoalsTotal}</span> GF</div>
              <div><span className="text-red-500 font-bold">{homeConcededTotal}</span> GC</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">{match?.teams?.away?.name || 'Visitante'} - Últimos 10</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-green-500">{awayFormData.wins || 0}</div>
                <div className="text-xs text-muted-foreground">Victorias</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-500">{awayFormData.draws || 0}</div>
                <div className="text-xs text-muted-foreground">Empates</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-500">{awayFormData.losses || 0}</div>
                <div className="text-xs text-muted-foreground">Derrotas</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-center text-sm">
              <div><span className="text-green-500 font-bold">{awayGoalsTotal}</span> GF</div>
              <div><span className="text-red-500 font-bold">{awayConcededTotal}</span> GC</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last 10 Matches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormCard 
          teamName={match?.teams?.home?.name || 'Local'} 
          logo={match?.teams?.home?.logo || ''}
          form={homeFormData.form || ''}
          matches={homeFormData.last10 || []}
        />
        <FormCard 
          teamName={match?.teams?.away?.name || 'Visitante'}
          logo={match?.teams?.away?.logo || ''}
          form={awayFormData.form || ''}
          matches={awayFormData.last10 || []}
        />
      </div>
    </div>
  );
}

function FormCard({ teamName, logo, form, matches }: { 
  teamName: string; 
  logo: string;
  form: string;
  matches: any[];
}) {
  const renderFormBadge = (result: 'W' | 'D' | 'L', small?: boolean) => {
    const colors = { W: 'bg-green-500', D: 'bg-yellow-500', L: 'bg-red-500' };
    const size = small ? 'w-5 h-5 text-xs' : 'w-6 h-6';
    return <Badge className={`${colors[result]} text-white ${size} flex items-center justify-center p-0`}>{result}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {logo && <img src={logo} className="w-5 h-5 object-contain" />}
          Últimos 10 - {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 mb-4 flex-wrap">
          {(form || '').split('').map((r: string, i: number) => (
            <div key={i}>{renderFormBadge(r as 'W' | 'D' | 'L')}</div>
          ))}
        </div>
        <div className="text-sm space-y-1 max-h-60 overflow-y-auto">
          {(matches || []).map((match: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2 bg-muted/50 rounded">
              <span className="text-xs text-muted-foreground w-12">
                {match?.date ? format(new Date(match.date), 'dd/MM') : '--'}
              </span>
              <span className="text-xs truncate flex-1 mx-2 text-center">
                {match?.home ? 'vs' : '@'} {match?.opponent || '?'}
              </span>
              <Badge variant={match?.result === 'W' ? 'default' : match?.result === 'D' ? 'secondary' : 'destructive'} className="text-xs">
                {match?.goalsFor ?? '-'}-{match?.goalsAgainst ?? '-'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== STATS TAB =====================
function StatsTab({ homeStats, awayStats, leagueTable, match, loading }: { 
  homeStats: any; 
  awayStats: any; 
  leagueTable: any[];
  match: Match;
  loading?: boolean;
}) {
  const StatRow = ({ label, homeValue, awayValue }: { label: string; homeValue: string | number; awayValue: string | number }) => (
    <div className="grid grid-cols-3 gap-2 items-center py-2 border-b last:border-0">
      <div className="text-right font-medium">{homeValue}</div>
      <div className="text-center text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{awayValue}</div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const homeData = homeStats || defaultTeamStats;
  const awayData = awayStats || defaultTeamStats;
  const table = leagueTable || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Estadísticas de Temporada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm font-medium">
            <div className="truncate">{match?.teams?.home?.name || 'Local'}</div>
            <div className="text-muted-foreground">vs</div>
            <div className="truncate">{match?.teams?.away?.name || 'Visitante'}</div>
          </div>
          
          <StatRow label="Partidos" homeValue={homeData.played || '-'} awayValue={awayData.played || '-'} />
          <StatRow label="Victorias" homeValue={homeData.won || '-'} awayValue={awayData.won || '-'} />
          <StatRow label="Empates" homeValue={homeData.drawn || '-'} awayValue={awayData.drawn || '-'} />
          <StatRow label="Derrotas" homeValue={homeData.lost || '-'} awayValue={awayData.lost || '-'} />
          <StatRow label="Puntos" homeValue={homeData.points || '-'} awayValue={awayData.points || '-'} />
          <StatRow label="GF" homeValue={homeData.goalsFor || '-'} awayValue={awayData.goalsFor || '-'} />
          <StatRow label="GC" homeValue={homeData.goalsAgainst || '-'} awayValue={awayData.goalsAgainst || '-'} />
          <StatRow label="DG" homeValue={homeData.goalDifference > 0 ? `+${homeData.goalDifference}` : homeData.goalDifference || '-'} 
                          awayValue={awayData.goalDifference > 0 ? `+${awayData.goalDifference}` : awayData.goalDifference || '-'} />
          <StatRow label="Clean Sheets" homeValue={homeData.cleanSheets || '-'} awayValue={awayData.cleanSheets || '-'} />
          <StatRow label="Sin marcar" homeValue={homeData.failedToScore || '-'} awayValue={awayData.failedToScore || '-'} />
          <StatRow label="Prom. GF" homeValue={homeData.avgGoalsScored > 0 ? homeData.avgGoalsScored.toFixed(2) : '-'} 
                          awayValue={awayData.avgGoalsScored > 0 ? awayData.avgGoalsScored.toFixed(2) : '-'} />
          <StatRow label="Prom. GC" homeValue={homeData.avgGoalsConceded > 0 ? homeData.avgGoalsConceded.toFixed(2) : '-'} 
                          awayValue={awayData.avgGoalsConceded > 0 ? awayData.avgGoalsConceded.toFixed(2) : '-'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tabla de Posiciones</CardTitle>
        </CardHeader>
        <CardContent>
          {table.length > 0 ? (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {table.slice(0, 20).map((team: any) => {
                const isHome = team?.team === match?.teams?.home?.name;
                const isAway = team?.team === match?.teams?.away?.name;
                return (
                  <div 
                    key={team?.rank || Math.random()}
                    className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
                      isHome ? 'bg-green-500/10 border border-green-500/30' : 
                      isAway ? 'bg-blue-500/10 border border-blue-500/30' : 
                      'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 text-center font-bold ${
                        (team?.rank || 0) <= 4 ? 'text-green-500' : 
                        (team?.rank || 0) <= 6 ? 'text-blue-500' : 
                        (team?.rank || 0) >= 15 ? 'text-red-500' : ''
                      }`}>{team?.rank || '-'}</span>
                      <span className={isHome || isAway ? 'font-bold' : ''}>{team?.team || '?'}</span>
                      {isHome && <Badge variant="outline" className="text-xs text-green-500">LOCAL</Badge>}
                      {isAway && <Badge variant="outline" className="text-xs text-blue-500">VISITA</Badge>}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-muted-foreground">{team?.played || 0}PJ</span>
                      <span className="font-bold">{team?.points || 0}pts</span>
                      <span className={(team?.goalsDiff || 0) > 0 ? 'text-green-500' : (team?.goalsDiff || 0) < 0 ? 'text-red-500' : ''}>
                        {(team?.goalsDiff || 0) > 0 ? '+' : ''}{team?.goalsDiff || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Tabla no disponible</p>
              <p className="text-xs mt-1">La clasificación no está disponible para esta liga/temporada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== H2H TAB =====================
function H2HTab({ h2h, homeName, awayName, loading }: { 
  h2h: any; 
  homeName: string; 
  awayName: string;
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-64" />;
  }

  const h2hData = h2h || defaultH2H;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen H2H (Últimos {h2hData.totalMatches || 0} enfrentamientos)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-500">{h2hData.homeWins || 0}</div>
              <div className="text-xs text-muted-foreground truncate">{homeName || 'Local'}</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-500">{h2hData.draws || 0}</div>
              <div className="text-xs text-muted-foreground">Empates</div>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-500">{h2hData.awayWins || 0}</div>
              <div className="text-xs text-muted-foreground truncate">{awayName || 'Visitante'}</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{(h2hData.avgGoals || 0).toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Prom. Goles</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{(h2hData.btts || 0).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Ambos anotan</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-2 bg-muted rounded">
              <div className="text-lg font-bold">{(h2hData.over25 || 0).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Over 2.5</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="text-lg font-bold">{h2hData.totalMatches || 0}</div>
              <div className="text-xs text-muted-foreground">Total partidos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Últimos 5 Encuentros</CardTitle>
        </CardHeader>
        <CardContent>
          {(h2hData.last5 || []).length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay registros previos entre estos equipos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(h2hData.last5 || []).map((match: any, i: number) => {
                const homeWon = (match?.homeGoals || 0) > (match?.awayGoals || 0);
                const awayWon = (match?.awayGoals || 0) > (match?.homeGoals || 0);
                return (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted rounded">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-muted-foreground w-14">
                        {match?.date ? format(new Date(match.date), 'dd/MM/yy') : '--'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[80px]">{match?.league || ''}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-1 justify-center">
                      <span className={`text-sm text-right flex-1 truncate ${homeWon ? 'font-bold text-green-500' : ''}`}>
                        {match?.homeTeam || '?'}
                      </span>
                      <Badge variant="outline" className="font-bold px-2">{match?.homeGoals ?? '-'}-{match?.awayGoals ?? '-'}</Badge>
                      <span className={`text-sm flex-1 truncate ${awayWon ? 'font-bold text-green-500' : ''}`}>
                        {match?.awayTeam || '?'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== ML TAB =====================
function MLTab({ mlPrediction, odds, match, loading }: { 
  mlPrediction: any; 
  odds: any;
  match: Match;
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-64" />;
  }

  const mlData = mlPrediction || defaultMLPrediction;
  const oddsData = odds || defaultOdds;

  return (
    <div className="space-y-4">
      {/* Resultado del Partido */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Predicción 1X2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ProbabilityBar 
              label={match?.teams?.home?.name || 'Local'}
              probability={mlData.homeWin || 33.33}
              color="bg-green-500"
            />
            <ProbabilityBar 
              label="Empate"
              probability={mlData.draw || 33.33}
              color="bg-yellow-500"
            />
            <ProbabilityBar 
              label={match?.teams?.away?.name || 'Visitante'}
              probability={mlData.awayWin || 33.33}
              color="bg-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Goles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Predicción de Goles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{(mlData.over15 || 70).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Over 1.5</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(mlData.over25 || 50).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Over 2.5</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(mlData.over35 || 30).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Over 3.5</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(mlData.btts || 50).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">BTTS</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas y Corners */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Tarjetas y Corners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tarjetas */}
          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-500 text-xs flex items-center justify-center">⚠</span>
              Tarjetas (Promedio esperado: {mlData.cards?.avgTotal || 4.5})
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-xl font-bold">{(mlData.cards?.over45 || 50).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Over 4.5</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-xl font-bold">{(mlData.cards?.over55 || 35).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Over 5.5</div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            {/* Corners */}
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 text-xs flex items-center justify-center">⬡</span>
              Corners (Promedio esperado: {mlData.corners?.avgTotal || 9.5})
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-lg font-bold">{(mlData.corners?.over85 || 55).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Over 8.5</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-lg font-bold">{(mlData.corners?.over95 || 45).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Over 9.5</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-lg font-bold">{(mlData.corners?.over105 || 35).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Over 10.5</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Factores del Modelo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <FactorBar label="Ventaja Local" value={mlData.factors?.homeAdvantage || 15} />
            <FactorBar label="Peso Forma" value={mlData.factors?.formWeight || 0} />
            <FactorBar label="Peso H2H" value={mlData.factors?.h2hWeight || 0} />
            <FactorBar label="Peso Estadísticas" value={mlData.factors?.statsWeight || 0} />
          </div>
        </CardContent>
      </Card>

      {oddsData.matchWinner && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Análisis de Valor (EV)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { sel: '1', prob: mlData.homeWin || 33, odds: oddsData.matchWinner?.home, label: match?.teams?.home?.name || 'Local' },
                { sel: 'X', prob: mlData.draw || 33, odds: oddsData.matchWinner?.draw, label: 'Empate' },
                { sel: '2', prob: mlData.awayWin || 33, odds: oddsData.matchWinner?.away, label: match?.teams?.away?.name || 'Visitante' },
              ].map((item) => {
                if (!item.odds) return null;
                const ev = ((item.prob * item.odds) / 100) - 1;
                const hasValue = ev > 0.05;
                
                return (
                  <div key={item.sel} className={`flex items-center justify-between p-2 rounded ${hasValue ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                    <span className="text-sm">{item.sel} - <span className="text-muted-foreground">{item.label}</span></span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Prob: {item.prob.toFixed(1)}%</span>
                      <span className="text-xs">@{item.odds.toFixed(2)}</span>
                      <Badge variant={hasValue ? 'default' : 'secondary'} className={hasValue ? 'bg-green-500' : ''}>
                        {ev > 0 ? '+' : ''}{(ev * 100).toFixed(1)}% EV
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {mlData.recommendedPick ? (
        <Card className="border-green-500">
          <CardHeader className="pb-2 bg-green-500/10">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Pick con Valor Identificado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{mlData.recommendedPick.selection}</div>
                <div className="text-sm text-muted-foreground">{mlData.recommendedPick.market}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-500">{mlData.recommendedPick.odds?.toFixed(2) || '-'}</div>
                <div className="text-xs text-muted-foreground">EV: +{(mlData.recommendedPick.ev * 100).toFixed(1)}%</div>
              </div>
            </div>
            <Link href={`/picks/new?match=${match?.fixture?.id}`}>
              <Button className="w-full mt-4 bg-green-500 hover:bg-green-600">
                Crear Pick con esta Selección
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay picks con valor positivo identificados</p>
            <p className="text-sm">Las cuotas actuales no ofrecen valor según nuestros modelos</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===================== HELPER COMPONENTS =====================
function FormBadge({ result, small }: { result: 'W' | 'D' | 'L'; small?: boolean }) {
  const colors = { W: 'bg-green-500', D: 'bg-yellow-500', L: 'bg-red-500' };
  const size = small ? 'w-5 h-5 text-xs' : 'w-6 h-6';
  if (!result || !colors[result]) return null;
  return <Badge className={`${colors[result]} text-white ${size} flex items-center justify-center p-0`}>{result}</Badge>;
}

function ProbabilityBar({ label, probability, color }: { label: string; probability: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="truncate flex-1">{label || '?'}</span>
        <span className="font-bold ml-2">{(probability || 0).toFixed(1)}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <div className={`${color} h-3 rounded-full transition-all duration-500`} style={{ width: `${Math.min(probability || 0, 100)}%` }} />
      </div>
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-32">{label || 'Factor'}</span>
      <div className="flex-1 bg-muted rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(value || 0, 100)}%` }} />
      </div>
      <span className="text-sm text-muted-foreground w-10 text-right">{(value || 0).toFixed(0)}%</span>
    </div>
  );
}
