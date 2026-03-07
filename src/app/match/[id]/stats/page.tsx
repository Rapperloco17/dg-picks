'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMatch } from '@/hooks/use-matches';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Users,
  Brain,
  Target,
  Trophy,
  Calendar,
  ChevronRight,
  Activity,
  Zap,
  RefreshCw,
  AlertCircle,
  History,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CompleteMatchStats, 
  getCompleteMatchAnalysisProgressive,
  clearMatchCache,
} from '@/services/match-stats-cached';
import { Match } from '@/types';

interface StatsPageProps {
  params: Promise<{ id: string }>;
}

// Default empty stats
const defaultForm = {
  played: 0, wins: 0, draws: 0, losses: 0,
  goalsFor: 0, goalsAgainst: 0, form: '', last10: [] as any[]
};

const defaultTeamStats = {
  leaguePosition: 0, points: 0, played: 0, won: 0, drawn: 0, lost: 0,
  goalsFor: 0, goalsAgainst: 0, goalDifference: 0, form: '',
  cleanSheets: 0, failedToScore: 0, over15: 0, over25: 0, over35: 0, btts: 0,
  avgGoalsScored: 0, avgGoalsConceded: 0,
  cards: { yellow: 0, red: 0 }, corners: { for: 0, against: 0 }
};

const defaultH2H = {
  totalMatches: 0, homeWins: 0, draws: 0, awayWins: 0,
  avgGoals: 0, over25: 0, btts: 0, last5: [] as any[]
};

export default function MatchStatsPage({ params }: StatsPageProps) {
  const { id } = use(params);
  const fixtureId = parseInt(id);
  
  const { match, isLoading: matchLoading, isError: matchError } = useMatch(fixtureId);
  const [stats, setStats] = useState<CompleteMatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [activeTab, setActiveTab] = useState('resumen');

  // Load stats
  useEffect(() => {
    if (!match) return;
    
    let cancelled = false;
    
    async function loadStats() {
      if (!match) return;
      setLoading(true);
      try {
        const result = await getCompleteMatchAnalysisProgressive(match as Match, (_data, stage) => {
          if (!cancelled) setLoadingStage(stage);
        });
        if (!cancelled) {
          setStats(result);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    loadStats();
    
    return () => { cancelled = true; };
  }, [match]);

  const handleRefresh = () => {
    clearMatchCache(fixtureId);
    window.location.reload();
  };

  if (matchLoading || loading) {
    return <StatsLoading stage={loadingStage} />;
  }

  if (matchError || !match) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-slate-400">Error al cargar el partido</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>
    );
  }

  const safeStats = (stats || {
    match,
    homeForm: defaultForm,
    awayForm: defaultForm,
    homeStats: defaultTeamStats,
    awayStats: defaultTeamStats,
    h2h: defaultH2H,
    odds: { matchWinner: null, overUnder: {}, btts: {}, asianHandicap: null, corners: null, cards: null },
    mlPrediction: null,
    leagueTable: []
  }) as CompleteMatchStats;

  const isLive = match.fixture.status.short === '1H' || match.fixture.status.short === '2H';
  const isFinished = match.fixture.status.short === 'FT' || match.fixture.status.short === 'AET';

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link href={`/match/${fixtureId}`}>
          <Button variant="ghost" className="text-slate-400 hover:text-slate-100 -ml-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Volver al Partido
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Match Summary Card */}
      <MatchSummaryCard match={match} isLive={isLive} isFinished={isFinished} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumen" className="text-xs md:text-sm">
            <Target className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Resumen</span>
            <span className="md:hidden">Resum</span>
          </TabsTrigger>
          <TabsTrigger value="forma" className="text-xs md:text-sm">
            <TrendingUp className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Forma</span>
            <span className="md:hidden">Forma</span>
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="text-xs md:text-sm">
            <BarChart3 className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Estadísticas</span>
            <span className="md:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="h2h" className="text-xs md:text-sm">
            <Users className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">H2H</span>
            <span className="md:hidden">H2H</span>
          </TabsTrigger>
          <TabsTrigger value="tabla" className="text-xs md:text-sm">
            <Trophy className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Tabla</span>
            <span className="md:hidden">Tabla</span>
          </TabsTrigger>
        </TabsList>

        {/* Resumen Tab */}
        <TabsContent value="resumen">
          <ResumenTab stats={safeStats} match={match} />
        </TabsContent>

        {/* Forma Tab */}
        <TabsContent value="forma">
          <FormaTab homeForm={safeStats.homeForm} awayForm={safeStats.awayForm} match={match} />
        </TabsContent>

        {/* Estadísticas Tab */}
        <TabsContent value="estadisticas">
          <EstadisticasTab 
            homeStats={safeStats.homeStats} 
            awayStats={safeStats.awayStats}
            match={match}
          />
        </TabsContent>

        {/* H2H Tab */}
        <TabsContent value="h2h">
          <H2HTab h2h={safeStats.h2h} match={match} />
        </TabsContent>

        {/* Tabla Tab */}
        <TabsContent value="tabla">
          <TablaTab leagueTable={safeStats.leagueTable} match={match} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===================== LOADING COMPONENT =====================
function StatsLoading({ stage }: { stage: string }) {
  const stages: Record<string, { progress: number; label: string }> = {
    'initial': { progress: 10, label: 'Iniciando...' },
    'odds': { progress: 20, label: 'Cargando cuotas...' },
    'forms': { progress: 40, label: 'Analizando forma...' },
    'standings': { progress: 60, label: 'Cargando clasificación...' },
    'h2h': { progress: 80, label: 'Cargando H2H...' },
    'ml': { progress: 90, label: 'Calculando predicción...' },
  };

  const current = stages[stage] || { progress: 30, label: 'Cargando...' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8">
          <div className="max-w-md mx-auto text-center space-y-4">
            <Activity className="w-12 h-12 text-blue-500 mx-auto animate-pulse" />
            <h3 className="text-lg font-semibold text-slate-100">Cargando Análisis Completo</h3>
            <Progress value={current.progress} className="h-2" />
            <p className="text-sm text-slate-400">{current.label}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// ===================== MATCH SUMMARY CARD =====================
function MatchSummaryCard({ match, isLive, isFinished }: { 
  match: Match; 
  isLive: boolean; 
  isFinished: boolean;
}) {
  const { fixture, league, teams, goals } = match;
  const matchDate = new Date(fixture.date);

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
      <CardContent className="p-6">
        {/* League Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src={league.logo} alt={league.name} className="w-8 h-8 object-contain" />
            <div>
              <p className="text-sm font-medium text-slate-100">{league.name}</p>
              <p className="text-xs text-slate-400">{league.round || 'Temporada Regular'}</p>
            </div>
          </div>
          
          {isLive && (
            <Badge variant="destructive" className="animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white mr-2" />
              EN VIVO {fixture.status.elapsed}'
            </Badge>
          )}
          {isFinished && <Badge variant="secondary" className="bg-slate-800">FINAL</Badge>}
          {!isLive && !isFinished && (
            <Badge variant="outline" className="text-slate-400">
              <Calendar className="w-3 h-3 mr-1" />
              {format(matchDate, 'd MMM HH:mm', { locale: es })}
            </Badge>
          )}
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-center gap-8 md:gap-16">
          <div className="flex flex-col items-center text-center flex-1">
            <img src={teams.home.logo} alt={teams.home.name} className="w-16 h-16 md:w-20 md:h-20 object-contain mb-3" />
            <h2 className="text-lg md:text-xl font-bold text-slate-100">{teams.home.name}</h2>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4 text-4xl md:text-5xl font-bold">
              <span className={cn(goals.home !== null && goals.home > (goals.away ?? 0) && "text-emerald-400")}>
                {goals.home ?? '-'}
              </span>
              <span className="text-slate-600">:</span>
              <span className={cn(goals.away !== null && goals.away > (goals.home ?? 0) && "text-emerald-400")}>
                {goals.away ?? '-'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center text-center flex-1">
            <img src={teams.away.logo} alt={teams.away.name} className="w-16 h-16 md:w-20 md:h-20 object-contain mb-3" />
            <h2 className="text-lg md:text-xl font-bold text-slate-100">{teams.away.name}</h2>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== RESUMEN TAB =====================
function ResumenTab({ stats, match }: { stats: CompleteMatchStats; match: Match }) {
  const { homeForm, awayForm, h2h, mlPrediction, odds } = stats;
  
  const homeWinProb = mlPrediction?.homeWin || 0;
  const drawProb = mlPrediction?.draw || 0;
  const awayWinProb = mlPrediction?.awayWin || 0;
  const pick = mlPrediction?.recommendedPick;

  return (
    <div className="space-y-6">
      {/* ML Prediction Card */}
      {mlPrediction && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-purple-500" />
              Predicción ML
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Probabilities */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Local</p>
                <p className="text-2xl font-bold text-emerald-400">{Math.round(homeWinProb)}%</p>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Empate</p>
                <p className="text-2xl font-bold text-yellow-400">{Math.round(drawProb)}%</p>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Visita</p>
                <p className="text-2xl font-bold text-blue-400">{Math.round(awayWinProb)}%</p>
              </div>
            </div>

            {/* Recommended Pick */}
            {pick && (
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Pick Recomendado</p>
                    <p className="text-lg font-bold text-slate-100">{pick.selection}</p>
                    <p className="text-sm text-slate-400">{pick.market} @ {pick.odds}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-purple-500/20 text-purple-400">
                      Confianza: {pick.confidence === 'high' ? 'Alta' : pick.confidence === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">EV: {pick.ev?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStatCard 
          title="Forma Local" 
          value={homeForm.form || '-'} 
          subtext={`${homeForm.wins}V ${homeForm.draws}E ${homeForm.losses}D`}
          color="emerald"
        />
        <QuickStatCard 
          title="Forma Visita" 
          value={awayForm.form || '-'} 
          subtext={`${awayForm.wins}V ${awayForm.draws}E ${awayForm.losses}D`}
          color="blue"
        />
        <QuickStatCard 
          title="H2H Total" 
          value={`${h2h.totalMatches}`} 
          subtext={`${h2h.homeWins}V Loc / ${h2h.draws}E / ${h2h.awayWins}V Vis`}
          color="purple"
        />
        <QuickStatCard 
          title="Avg Goles H2H" 
          value={h2h.avgGoals.toFixed(1)} 
          subtext={`Over 2.5: ${Math.round(h2h.over25)}%`}
          color="orange"
        />
      </div>
    </div>
  );
}

function QuickStatCard({ title, value, subtext, color }: { 
  title: string; 
  value: string; 
  subtext: string;
  color: 'emerald' | 'blue' | 'purple' | 'orange';
}) {
  const colors = {
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    blue: 'from-blue-500/10 to-transparent border-blue-500/20',
    purple: 'from-purple-500/10 to-transparent border-purple-500/20',
    orange: 'from-orange-500/10 to-transparent border-orange-500/20',
  };

  return (
    <Card className={cn("bg-slate-900 border-slate-800 bg-gradient-to-br", colors[color])}>
      <CardContent className="p-4">
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}

// ===================== FORMA TAB =====================
function FormaTab({ homeForm, awayForm, match }: { 
  homeForm: any; 
  awayForm: any;
  match: Match;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Home Form */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img src={match.teams.home.logo} alt="" className="w-6 h-6 object-contain" />
              {match.teams.home.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-2xl font-bold text-emerald-400">{homeForm.wins}</p>
                <p className="text-xs text-slate-400">Victorias</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-2xl font-bold text-yellow-400">{homeForm.draws}</p>
                <p className="text-xs text-slate-400">Empates</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-2xl font-bold text-red-400">{homeForm.losses}</p>
                <p className="text-xs text-slate-400">Derrotas</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-2xl font-bold text-slate-100">{homeForm.played}</p>
                <p className="text-xs text-slate-400">Jugados</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Últimos 5 partidos</p>
              <div className="flex gap-2">
                {(homeForm.last10 || []).slice(0, 5).map((m: any, i: number) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                      m.result === 'W' ? "bg-emerald-500/20 text-emerald-400" :
                      m.result === 'D' ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    )}
                    title={`${m.opponent} (${m.goalsFor}-${m.goalsAgainst})`}
                  >
                    {m.result}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div>
                <p className="text-sm text-slate-400">Goles a favor</p>
                <p className="text-xl font-bold text-emerald-400">{homeForm.goalsFor}</p>
                <p className="text-xs text-slate-500">Avg: {(homeForm.goalsFor / Math.max(homeForm.played, 1)).toFixed(1)} por partido</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Goles en contra</p>
                <p className="text-xl font-bold text-red-400">{homeForm.goalsAgainst}</p>
                <p className="text-xs text-slate-500">Avg: {(homeForm.goalsAgainst / Math.max(homeForm.played, 1)).toFixed(1)} por partido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Away Form */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img src={match.teams.away.logo} alt="" className="w-6 h-6 object-contain" />
              {match.teams.away.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-2xl font-bold text-emerald-400">{awayForm.wins}</p>
                <p className="text-xs text-slate-400">Victorias</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-2xl font-bold text-yellow-400">{awayForm.draws}</p>
                <p className="text-xs text-slate-400">Empates</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-2xl font-bold text-red-400">{awayForm.losses}</p>
                <p className="text-xs text-slate-400">Derrotas</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-2xl font-bold text-slate-100">{awayForm.played}</p>
                <p className="text-xs text-slate-400">Jugados</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Últimos 5 partidos</p>
              <div className="flex gap-2">
                {(awayForm.last10 || []).slice(0, 5).map((m: any, i: number) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                      m.result === 'W' ? "bg-emerald-500/20 text-emerald-400" :
                      m.result === 'D' ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    )}
                    title={`${m.opponent} (${m.goalsFor}-${m.goalsAgainst})`}
                  >
                    {m.result}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div>
                <p className="text-sm text-slate-400">Goles a favor</p>
                <p className="text-xl font-bold text-emerald-400">{awayForm.goalsFor}</p>
                <p className="text-xs text-slate-500">Avg: {(awayForm.goalsFor / Math.max(awayForm.played, 1)).toFixed(1)} por partido</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Goles en contra</p>
                <p className="text-xl font-bold text-red-400">{awayForm.goalsAgainst}</p>
                <p className="text-xs text-slate-500">Avg: {(awayForm.goalsAgainst / Math.max(awayForm.played, 1)).toFixed(1)} por partido</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===================== ESTADISTICAS TAB =====================
function EstadisticasTab({ homeStats, awayStats, match }: { 
  homeStats: any; 
  awayStats: any;
  match: Match;
}) {
  const stats = [
    { label: 'Posición Liga', home: homeStats.leaguePosition || '-', away: awayStats.leaguePosition || '-' },
    { label: 'Puntos', home: homeStats.points, away: awayStats.points },
    { label: 'Partidos Jugados', home: homeStats.played, away: awayStats.played },
    { label: 'Victorias', home: homeStats.won, away: awayStats.won },
    { label: 'Empates', home: homeStats.drawn, away: awayStats.drawn },
    { label: 'Derrotas', home: homeStats.lost, away: awayStats.lost },
    { label: 'Goles a Favor', home: homeStats.goalsFor, away: awayStats.goalsFor },
    { label: 'Goles en Contra', home: homeStats.goalsAgainst, away: awayStats.goalsAgainst },
    { label: 'Diferencia de Gol', home: homeStats.goalDifference, away: awayStats.goalDifference },
    { label: 'Vallas Invictas', home: homeStats.cleanSheets, away: awayStats.cleanSheets },
    { label: 'Over 1.5 (%)', home: `${homeStats.over15}%`, away: `${awayStats.over15}%` },
    { label: 'Over 2.5 (%)', home: `${homeStats.over25}%`, away: `${awayStats.over25}%` },
    { label: 'BTTS (%)', home: `${homeStats.btts}%`, away: `${awayStats.btts}%` },
    { label: 'Avg Goles Marcados', home: homeStats.avgGoalsScored?.toFixed(2), away: awayStats.avgGoalsScored?.toFixed(2) },
    { label: 'Avg Goles Recibidos', home: homeStats.avgGoalsConceded?.toFixed(2), away: awayStats.avgGoalsConceded?.toFixed(2) },
    { label: 'Tarjetas Amarillas', home: homeStats.cards?.yellow, away: awayStats.cards?.yellow },
    { label: 'Tarjetas Rojas', home: homeStats.cards?.red, away: awayStats.cards?.red },
    { label: 'Corners a Favor', home: homeStats.corners?.for, away: awayStats.corners?.for },
    { label: 'Corners en Contra', home: homeStats.corners?.against, away: awayStats.corners?.against },
  ];

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          Estadísticas Comparativas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Estadística</th>
                <th className="text-center py-3 px-4 text-emerald-400 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <img src={match.teams.home.logo} alt="" className="w-5 h-5 object-contain" />
                    Local
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-blue-400 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <img src={match.teams.away.logo} alt="" className="w-5 h-5 object-contain" />
                    Visita
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-slate-300">{stat.label}</td>
                  <td className="text-center py-3 px-4 font-mono text-emerald-400">{stat.home ?? '-'}</td>
                  <td className="text-center py-3 px-4 font-mono text-blue-400">{stat.away ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== H2H TAB =====================
function H2HTab({ h2h, match }: { h2h: any; match: Match }) {
  return (
    <div className="space-y-6">
      {/* H2H Summary */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500" />
            Historial Directo (H2H)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
              <p className="text-3xl font-bold text-emerald-400">{h2h.homeWins}</p>
              <p className="text-sm text-slate-400">Victorias {match.teams.home.name}</p>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
              <p className="text-3xl font-bold text-yellow-400">{h2h.draws}</p>
              <p className="text-sm text-slate-400">Empates</p>
            </div>
            <div className="text-center p-4 bg-blue-500/10 rounded-lg">
              <p className="text-3xl font-bold text-blue-400">{h2h.awayWins}</p>
              <p className="text-sm text-slate-400">Victorias {match.teams.away.name}</p>
            </div>
            <div className="text-center p-4 bg-slate-500/10 rounded-lg">
              <p className="text-3xl font-bold text-slate-200">{h2h.totalMatches}</p>
              <p className="text-sm text-slate-400">Total Enfrentamientos</p>
            </div>
          </div>

          {/* Last 5 Matches */}
          {h2h.last5 && h2h.last5.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-300">Últimos 5 enfrentamientos</h4>
              <div className="space-y-2">
                {h2h.last5.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{format(new Date(m.date), 'dd/MM/yyyy')}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          m.winner === 'home' ? "border-emerald-500/30 text-emerald-400" :
                          m.winner === 'away' ? "border-blue-500/30 text-blue-400" :
                          "border-yellow-500/30 text-yellow-400"
                        )}
                      >
                        {m.winner === 'home' ? 'Local' : m.winner === 'away' ? 'Visita' : 'Empate'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-300">{m.homeTeam}</span>
                      <span className="font-bold text-slate-100">{m.homeGoals} - {m.awayGoals}</span>
                      <span className="text-sm text-slate-300">{m.awayTeam}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== TABLA TAB =====================
function TablaTab({ leagueTable, match }: { leagueTable: any[]; match: Match }) {
  const homeTeam = match.teams.home.name;
  const awayTeam = match.teams.away.name;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Tabla de Posiciones - {match.league.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leagueTable.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-center py-3 px-2 text-slate-400 font-medium w-12">Pos</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Equipo</th>
                  <th className="text-center py-3 px-2 text-slate-400 font-medium">PJ</th>
                  <th className="text-center py-3 px-2 text-slate-400 font-medium">PTS</th>
                  <th className="text-center py-3 px-2 text-slate-400 font-medium">DG</th>
                </tr>
              </thead>
              <tbody>
                {leagueTable.slice(0, 20).map((team: any, i: number) => {
                  const isHome = team?.team === homeTeam;
                  const isAway = team?.team === awayTeam;
                  
                  return (
                    <tr 
                      key={i} 
                      className={cn(
                        "border-b border-slate-800/50",
                        isHome && "bg-emerald-500/10",
                        isAway && "bg-blue-500/10",
                        !isHome && !isAway && "hover:bg-slate-800/30"
                      )}
                    >
                      <td className="text-center py-3 px-2">
                        <span className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                          team?.rank <= 4 ? "bg-emerald-500/20 text-emerald-400" :
                          team?.rank <= 6 ? "bg-blue-500/20 text-blue-400" :
                          team?.rank >= (leagueTable.length - 3) ? "bg-red-500/20 text-red-400" :
                          "text-slate-300"
                        )}>
                          {team?.rank}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium",
                            isHome ? "text-emerald-400" : isAway ? "text-blue-400" : "text-slate-300"
                          )}>
                            {team?.team}
                          </span>
                          {isHome && <Badge variant="outline" className="text-xs text-emerald-500">LOCAL</Badge>}
                          {isAway && <Badge variant="outline" className="text-xs text-blue-500">VISITA</Badge>}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-slate-400">{team?.played}</td>
                      <td className="text-center py-3 px-2 font-bold text-slate-200">{team?.points}</td>
                      <td className={cn(
                        "text-center py-3 px-2 font-medium",
                        (team?.goalsDiff || 0) > 0 ? "text-emerald-400" :
                        (team?.goalsDiff || 0) < 0 ? "text-red-400" : "text-slate-400"
                      )}>
                        {(team?.goalsDiff || 0) > 0 ? '+' : ''}{team?.goalsDiff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Tabla de posiciones no disponible</p>
            <p className="text-sm text-slate-500 mt-2">
              La clasificación no está disponible para esta liga en este momento
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
