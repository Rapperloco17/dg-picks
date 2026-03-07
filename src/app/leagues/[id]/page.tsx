'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  TIER_1_LEAGUES, 
  TIER_2_LEAGUES, 
  TIER_3_LEAGUES 
} from '@/constants/leagues';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Trophy,
  Calendar,
  TrendingUp,
  Target,
  MapPin,
  Activity,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStandings, getFixturesByLeague } from '@/services/api-football';
import { getCorrectSeason } from '@/services/season-detector';
import { Match } from '@/types';

interface LeaguePageProps {
  params: Promise<{ id: string }>;
}

interface Standing {
  rank: number;
  team: { id?: number; name?: string; logo?: string };
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form?: string;
}

export default function LeaguePage({ params }: LeaguePageProps) {
  const { id } = use(params);
  const leagueId = parseInt(id);
  
  // Find league info from constants
  const allLeagues = [...TIER_1_LEAGUES, ...TIER_2_LEAGUES, ...TIER_3_LEAGUES];
  const leagueInfo = allLeagues.find(l => l.id === leagueId);
  
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tabla');

  useEffect(() => {
    async function loadLeagueData() {
      setLoading(true);
      try {
        const season = getCorrectSeason(leagueId);
        
        // Load standings and fixtures in parallel
        const [standingsData, fixturesData] = await Promise.all([
          getStandings(leagueId, season),
          getFixturesByLeague(leagueId, season)
        ]);
        
        if (standingsData) {
          setStandings(standingsData.map(s => ({
            rank: s.rank,
            team: s.team,
            points: s.points,
            played: s.all?.played || 0,
            won: (s.all as any)?.win || 0,
            drawn: (s.all as any)?.draw || 0,
            lost: (s.all as any)?.lose || 0,
            goalsFor: s.all?.goals?.for || 0,
            goalsAgainst: s.all?.goals?.against || 0,
            goalsDiff: (s.all?.goals?.for || 0) - (s.all?.goals?.against || 0),
            form: (s as any).form
          })));
        }
        
        if (fixturesData) {
          setMatches(fixturesData);
        }
      } catch (error) {
        console.error('Error loading league data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (leagueId) {
      loadLeagueData();
    }
  }, [leagueId]);

  if (!leagueInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-slate-400">Liga no encontrada</p>
        <Link href="/leagues">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Ligas
          </Button>
        </Link>
      </div>
    );
  }

  const season = getCorrectSeason(leagueId);
  
  // Separate matches by status
  const upcomingMatches = matches.filter(m => 
    m.fixture.status.short === 'NS' || 
    m.fixture.status.short === 'TBD'
  ).sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
  
  const liveMatches = matches.filter(m => 
    m.fixture.status.short === '1H' || 
    m.fixture.status.short === '2H' || 
    m.fixture.status.short === 'HT' ||
    m.fixture.status.short === 'ET'
  );
  
  const finishedMatches = matches.filter(m => 
    m.fixture.status.short === 'FT' || 
    m.fixture.status.short === 'AET' ||
    m.fixture.status.short === 'PEN'
  ).sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime());

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/leagues">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-100 -ml-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Ligas
          </Button>
        </Link>
      </div>

      {/* League Header Card */}
      <LeagueHeaderCard league={leagueInfo} season={season} standings={standings} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tabla" className="text-sm">
            <Trophy className="w-4 h-4 mr-2" />
            Tabla de Posiciones
          </TabsTrigger>
          <TabsTrigger value="calendario" className="text-sm">
            <Calendar className="w-4 h-4 mr-2" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="text-sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* Tabla Tab */}
        <TabsContent value="tabla">
          <TablaTab standings={standings} loading={loading} leagueId={leagueId} />
        </TabsContent>

        {/* Calendario Tab */}
        <TabsContent value="calendario">
          <CalendarioTab 
            upcoming={upcomingMatches} 
            live={liveMatches} 
            finished={finishedMatches}
            loading={loading}
          />
        </TabsContent>

        {/* Estadísticas Tab */}
        <TabsContent value="estadisticas">
          <EstadisticasTab standings={standings} matches={finishedMatches} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===================== LEAGUE HEADER CARD =====================
function LeagueHeaderCard({ 
  league, 
  season, 
  standings 
}: { 
  league: { id: number; name: string; country: string; tier: number; continent: string };
  season: number;
  standings: Standing[];
}) {
  const tierColors = {
    1: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    2: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    3: 'from-slate-500/20 to-slate-500/5 border-slate-500/30',
  };

  const leader = standings[0];
  const totalMatches = standings.reduce((sum, s) => sum + s.played, 0) / (standings.length || 1);

  return (
    <Card className={cn(
      "bg-slate-900 border-slate-800 overflow-hidden bg-gradient-to-br",
      tierColors[league.tier as keyof typeof tierColors]
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* League Logo Placeholder */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
            </div>
            
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-100">{league.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">{league.country}</span>
                <Badge variant="outline" className="text-xs ml-2">
                  Temporada {season}-{season + (league.tier === 1 && league.continent === 'EUROPE' ? 1 : 0)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mt-3">
                <Badge className={cn(
                  league.tier === 1 ? "bg-emerald-500/20 text-emerald-400" :
                  league.tier === 2 ? "bg-blue-500/20 text-blue-400" :
                  "bg-slate-500/20 text-slate-400"
                )}>
                  TIER {league.tier}
                </Badge>
                
                {leader && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Líder:</span>
                    <span className="font-medium text-slate-100">{leader.team.name}</span>
                    <span className="text-emerald-400">({leader.points} pts)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {standings.length > 0 && (
            <div className="hidden md:grid grid-cols-2 gap-3 text-right">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Equipos</p>
                <p className="text-xl font-bold text-slate-100">{standings.length}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">PJ Promedio</p>
                <p className="text-xl font-bold text-slate-100">{Math.round(totalMatches)}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== TABLA TAB =====================
function TablaTab({ 
  standings, 
  loading,
  leagueId 
}: { 
  standings: Standing[]; 
  loading: boolean;
  leagueId: number;
}) {
  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (standings.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-12 text-center">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Tabla de posiciones no disponible</p>
          <p className="text-sm text-slate-500 mt-2">
            La clasificación no está disponible para esta liga en este momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Tabla de Posiciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="py-3 px-2 text-slate-400 font-medium w-12 text-center">Pos</th>
                <th className="py-3 px-2 text-slate-400 font-medium">Equipo</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">PJ</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">G</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">E</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">P</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">GF</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">GC</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">DG</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">Pts</th>
                <th className="py-3 px-2 text-slate-400 font-medium text-center">Forma</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team) => (
                <tr 
                  key={team.team.id || team.rank}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-2 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                      team.rank <= 4 ? "bg-emerald-500/20 text-emerald-400" :
                      team.rank <= 6 ? "bg-blue-500/20 text-blue-400" :
                      team.rank >= standings.length - 2 ? "bg-red-500/20 text-red-400" :
                      "text-slate-300"
                    )}>
                      {team.rank}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {team.team.id ? (
                      <Link href={`/team/${team.team.id}`}>
                        <div className="flex items-center gap-3 cursor-pointer hover:text-emerald-400 transition-colors">
                          {team.team.logo && (
                            <img src={team.team.logo} alt="" className="w-6 h-6 object-contain" />
                          )}
                          <span className="font-medium text-slate-100">{team.team.name}</span>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">
                        {team.team.logo && (
                          <img src={team.team.logo} alt="" className="w-6 h-6 object-contain" />
                        )}
                        <span className="font-medium text-slate-100">{team.team.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center text-slate-400">{team.played}</td>
                  <td className="py-3 px-2 text-center text-emerald-400">{team.won}</td>
                  <td className="py-3 px-2 text-center text-yellow-400">{team.drawn}</td>
                  <td className="py-3 px-2 text-center text-red-400">{team.lost}</td>
                  <td className="py-3 px-2 text-center text-slate-300">{team.goalsFor}</td>
                  <td className="py-3 px-2 text-center text-slate-300">{team.goalsAgainst}</td>
                  <td className={cn(
                    "py-3 px-2 text-center font-medium",
                    team.goalsDiff > 0 ? "text-emerald-400" :
                    team.goalsDiff < 0 ? "text-red-400" : "text-slate-400"
                  )}>
                    {team.goalsDiff > 0 ? '+' : ''}{team.goalsDiff}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-bold text-slate-100">{team.points}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1 justify-center">
                      {(team.form || '').split('').slice(0, 5).map((result, i) => (
                        <span 
                          key={i}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center text-xs font-bold",
                            result === 'W' ? "bg-emerald-500/20 text-emerald-400" :
                            result === 'D' ? "bg-yellow-500/20 text-yellow-400" :
                            result === 'L' ? "bg-red-500/20 text-red-400" :
                            "bg-slate-700 text-slate-400"
                          )}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== CALENDARIO TAB =====================
function CalendarioTab({ 
  upcoming, 
  live, 
  finished,
  loading 
}: { 
  upcoming: Match[]; 
  live: Match[]; 
  finished: Match[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Matches */}
      {live.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500 animate-pulse" />
            En Vivo ({live.length})
          </h3>
          <div className="space-y-2">
            {live.map(match => (
              <MatchRow key={match.fixture.id} match={match} isLive />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Matches */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-3">
          Próximos Partidos ({upcoming.length})
        </h3>
        {upcoming.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {upcoming.slice(0, 20).map(match => (
              <MatchRow key={match.fixture.id} match={match} />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No hay partidos programados</p>
        )}
      </div>

      {/* Finished Matches */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-3">
          Últimos Resultados ({finished.length})
        </h3>
        {finished.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {finished.slice(0, 20).map(match => (
              <MatchRow key={match.fixture.id} match={match} isFinished />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No hay resultados disponibles</p>
        )}
      </div>
    </div>
  );
}

function MatchRow({ 
  match, 
  isLive, 
  isFinished 
}: { 
  match: Match; 
  isLive?: boolean;
  isFinished?: boolean;
}) {
  const matchDate = new Date(match.fixture.date);
  
  return (
    <Link href={`/match/${match.fixture.id}`}>
      <Card className={cn(
        "bg-slate-900 border-slate-800 hover:border-slate-600 transition-colors cursor-pointer",
        isLive && "border-red-500/30 bg-red-500/5"
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            {/* Date/Time */}
            <div className="w-20 text-center">
              {isLive ? (
                <Badge variant="destructive" className="animate-pulse">
                  {match.fixture.status.elapsed}'
                </Badge>
              ) : isFinished ? (
                <span className="text-xs text-slate-500">
                  {format(matchDate, 'dd/MM')}
                </span>
              ) : (
                <span className="text-sm font-medium text-slate-300">
                  {format(matchDate, 'HH:mm')}
                </span>
              )}
            </div>

            {/* Teams */}
            <div className="flex-1 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-right flex-1 justify-end">
                <span className="font-medium text-slate-100">{match.teams.home.name}</span>
                <img src={match.teams.home.logo} alt="" className="w-6 h-6 object-contain" />
              </div>

              {/* Score */}
              <div className="px-4">
                {isLive || isFinished ? (
                  <span className="text-lg font-bold text-slate-100">
                    {match.goals.home} - {match.goals.away}
                  </span>
                ) : (
                  <span className="text-slate-500">vs</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-left flex-1 justify-start">
                <img src={match.teams.away.logo} alt="" className="w-6 h-6 object-contain" />
                <span className="font-medium text-slate-100">{match.teams.away.name}</span>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ===================== ESTADISTICAS TAB =====================
function EstadisticasTab({ 
  standings, 
  matches,
  loading 
}: { 
  standings: Standing[]; 
  matches: Match[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-12 text-center">
          <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Estadísticas no disponibles</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const totalGoals = standings.reduce((sum, s) => sum + s.goalsFor, 0);
  const avgGoalsPerMatch = matches.length > 0 ? (totalGoals / matches.length).toFixed(2) : '0';
  
  const bestAttack = standings.reduce((best, s) => s.goalsFor > best.goalsFor ? s : best, standings[0]);
  const bestDefense = standings.reduce((best, s) => s.goalsAgainst < best.goalsAgainst ? s : best, standings[0]);
  
  const homeWins = matches.filter(m => m.teams.home.winner).length;
  const awayWins = matches.filter(m => m.teams.away.winner).length;
  const draws = matches.filter(m => !m.teams.home.winner && !m.teams.away.winner && m.fixture.status.short === 'FT').length;
  const totalResults = homeWins + awayWins + draws || 1;

  const stats = [
    {
      title: 'Goles Totales',
      value: totalGoals,
      subtext: `${avgGoalsPerMatch} por partido`,
      icon: Target,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Mejor Ataque',
      value: bestAttack?.team.name,
      subtext: `${bestAttack?.goalsFor} goles`,
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Mejor Defensa',
      value: bestDefense?.team.name,
      subtext: `${bestDefense?.goalsAgainst} goles recibidos`,
      icon: Activity,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Victorias Local',
      value: `${Math.round((homeWins / totalResults) * 100)}%`,
      subtext: `${homeWins} de ${totalResults} partidos`,
      icon: MapPin,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Victorias Visita',
      value: `${Math.round((awayWins / totalResults) * 100)}%`,
      subtext: `${awayWins} de ${totalResults} partidos`,
      icon: Trophy,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Empates',
      value: `${Math.round((draws / totalResults) * 100)}%`,
      subtext: `${draws} de ${totalResults} partidos`,
      icon: Calendar,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.title}</p>
                <p className={cn("text-lg font-bold mt-1", stat.color)}>
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 mt-1">{stat.subtext}</p>
              </div>
              <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
