'use client';

import { useMemo, useEffect, useState } from 'react';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { ApiStatusCard } from '@/components/dashboard/api-status';
import { MatchesList } from '@/components/matches/matches-list';
import { LeagueSelector } from '@/components/matches/league-selector';
import { AdvancedFilters, MarketFilter, EVFilter, GradeFilter } from '@/components/matches/advanced-filters';
import { 
  useTodayMatches, 
  useTomorrowMatches, 
  useLiveMatches,
  useWeekendMatches 
} from '@/hooks/use-matches';
import { useAppStore } from '@/stores/app-store';
import { usePicksStore } from '@/stores/picks-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Match, Pick } from '@/types';
import { TIER_1_LEAGUES, TIER_2_LEAGUES, TIER_3_LEAGUES, ALL_LEAGUES } from '@/constants/leagues';
import { Globe, Filter, TrendingUp, Zap } from 'lucide-react';
import { calculateEV } from '@/lib/ev-calculator';
import { cn } from '@/lib/utils';

// Generate mock picks with EV for demonstration
function generateMockPick(match: Match): Pick | null {
  // Simulate different scenarios based on match ID
  const seed = match.fixture.id % 10;
  
  if (seed < 3) return null; // No pick for some matches
  
  const odds = [1.8, 2.1, 2.5, 1.95, 3.2][seed % 5];
  const probability = [0.65, 0.55, 0.45, 0.60, 0.35][seed % 5];
  
  const ev = calculateEV(probability, odds);
  
  return {
    id: `pick-${match.fixture.id}`,
    userId: 'user-1',
    matchId: match.fixture.id,
    leagueId: match.league.id,
    leagueName: match.league.name,
    homeTeam: match.teams.home.name,
    awayTeam: match.teams.away.name,
    matchDate: match.fixture.date,
    market: seed % 3 === 0 ? '1X2' : seed % 3 === 1 ? 'OVER_UNDER' : 'BTTS',
    selection: seed % 2 === 0 ? 'Home' : 'Over 2.5',
    odds,
    stake: 10,
    confidence: (seed + 5) as any,
    result: 'PENDING',
    profit: null,
    createdAt: new Date().toISOString(),
    settledAt: null,
    ev: ev.ev,
    evPercentage: ev.evPercentage,
    probability: ev.probability,
    impliedProbability: ev.impliedProbability,
    edge: ev.edge,
    grade: ev.grade,
    recommendation: ev.recommendation,
    kellyStake: ev.kellyStake,
  };
}

function filterMatches(
  matches: Match[], 
  searchQuery: string, 
  league: number | 'ALL',
  marketFilter: MarketFilter,
  evFilter: EVFilter,
  gradeFilter: GradeFilter
) {
  return matches.filter(match => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const homeMatch = match.teams.home.name.toLowerCase().includes(query);
      const awayMatch = match.teams.away.name.toLowerCase().includes(query);
      const leagueMatch = match.league.name.toLowerCase().includes(query);
      if (!homeMatch && !awayMatch && !leagueMatch) return false;
    }
    
    // League filter
    if (league !== 'ALL' && match.league.id !== league) return false;
    
    return true;
  });
}

export default function Dashboard() {
  const { loadPicks } = usePicksStore();
  
  // Local state for filters
  const [selectedLeague, setSelectedLeague] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('ALL');
  const [evFilter, setEVFilter] = useState<EVFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('ALL');
  const [activeTab, setActiveTab] = useState('today');
  const [showFilters, setShowFilters] = useState(false);

  // Load picks on mount
  useEffect(() => {
    loadPicks();
  }, [loadPicks]);

  // Get tier from selected league
  const tier = useMemo(() => {
    if (selectedLeague === 'ALL') return 'all';
    if (TIER_1_LEAGUES.some(l => l.id === selectedLeague)) return 1;
    if (TIER_2_LEAGUES.some(l => l.id === selectedLeague)) return 2;
    if (TIER_3_LEAGUES.some(l => l.id === selectedLeague)) return 3;
    return 'all';
  }, [selectedLeague]);
  
  const { 
    matches: todayMatches, 
    isLoading: todayLoading, 
    isError: todayError 
  } = useTodayMatches(tier as any);
  
  const { 
    matches: tomorrowMatches, 
    isLoading: tomorrowLoading, 
    isError: tomorrowError 
  } = useTomorrowMatches(tier as any);
  
  const { 
    matches: liveMatches, 
    isLoading: liveLoading, 
    isError: liveError 
  } = useLiveMatches(tier as any);
  
  const { 
    matches: weekendMatches, 
    isLoading: weekendLoading, 
    isError: weekendError 
  } = useWeekendMatches(tier as any);

  // Filter matches
  const filteredToday = useMemo(() => 
    filterMatches(todayMatches, searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter),
    [todayMatches, searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter]
  );
  
  const filteredTomorrow = useMemo(() => 
    filterMatches(tomorrowMatches, searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter),
    [tomorrowMatches, searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter]
  );
  
  const filteredLive = useMemo(() => 
    filterMatches(liveMatches, searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter),
    [liveMatches, searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter]
  );
  
  const filteredWeekend = useMemo(() => 
    filterMatches(weekendMatches, searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter),
    [weekendMatches, searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter]
  );

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedLeague !== 'ALL') count++;
    if (marketFilter !== 'ALL') count++;
    if (evFilter !== 'ALL') count++;
    if (gradeFilter !== 'ALL') count++;
    return count;
  }, [searchQuery, selectedLeague, marketFilter, evFilter, gradeFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedLeague('ALL');
    setMarketFilter('ALL');
    setEVFilter('ALL');
    setGradeFilter('ALL');
  };

  // Stats
  const totalMatches = filteredToday.length + filteredTomorrow.length + filteredLive.length;
  const activeLeagues = new Set([
    ...filteredToday.map(m => m.league.id),
    ...filteredTomorrow.map(m => m.league.id),
  ]).size;

  // Count value picks
  const valuePicksCount = filteredToday.filter(m => {
    const pick = generateMockPick(m);
    return pick && pick.ev && pick.ev > 0;
  }).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            {totalMatches} partidos disponibles • {activeLeagues} ligas activas
          </p>
        </div>
        
        {/* Value Picks Indicator */}
        {valuePicksCount > 0 && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1.5">
            <Zap className="w-4 h-4 mr-1.5" />
            {valuePicksCount} picks con valor hoy
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* League Selector */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Seleccionar Liga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeagueSelector
            selectedLeague={selectedLeague}
            onSelectLeague={setSelectedLeague}
            tier={tier === 'all' ? 'all' : tier as 1 | 2 | 3}
          />
        </CardContent>
      </Card>

      {/* Filters Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle 
              className="text-sm font-medium text-slate-400 flex items-center gap-2 cursor-pointer"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filtros Avanzados
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </CardTitle>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <AdvancedFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              marketFilter={marketFilter}
              onMarketChange={setMarketFilter}
              evFilter={evFilter}
              onEVChange={setEVFilter}
              gradeFilter={gradeFilter}
              onGradeChange={setGradeFilter}
              activeFiltersCount={activeFiltersCount}
              onResetFilters={resetFilters}
            />
          </CardContent>
        )}
      </Card>

      {/* Live Matches Section */}
      {filteredLive.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">En Vivo</h2>
            <Badge variant="destructive" className="animate-pulse-live">
              LIVE
            </Badge>
            <span className="text-sm text-slate-500">
              ({filteredLive.length} partidos)
            </span>
          </div>
          <MatchesList 
            matches={filteredLive} 
            isLoading={liveLoading} 
            isError={liveError}
            emptyMessage="No hay partidos en vivo"
          />
        </div>
      )}

      {/* Matches Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="today" className="data-[state=active]:bg-slate-800">
            Hoy ({filteredToday.length})
          </TabsTrigger>
          <TabsTrigger value="tomorrow" className="data-[state=active]:bg-slate-800">
            Mañana ({filteredTomorrow.length})
          </TabsTrigger>
          <TabsTrigger value="weekend" className="data-[state=active]:bg-slate-800">
            Fin de Semana ({filteredWeekend.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Partidos de Hoy</h2>
            <p className="text-sm text-slate-400">
              {selectedLeague === 'ALL' ? 'Todas las ligas' : 'Liga seleccionada'}
            </p>
          </div>
          <MatchesList 
            matches={filteredToday} 
            isLoading={todayLoading} 
            isError={todayError}
            emptyMessage="No hay partidos programados para hoy"
          />
        </TabsContent>

        <TabsContent value="tomorrow" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Partidos de Mañana</h2>
            <p className="text-sm text-slate-400">
              {selectedLeague === 'ALL' ? 'Todas las ligas' : 'Liga seleccionada'}
            </p>
          </div>
          <MatchesList 
            matches={filteredTomorrow} 
            isLoading={tomorrowLoading} 
            isError={tomorrowError}
            emptyMessage="No hay partidos programados para mañana"
          />
        </TabsContent>

        <TabsContent value="weekend" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Fin de Semana</h2>
            <p className="text-sm text-slate-400">
              Sábado y Domingo
            </p>
          </div>
          <MatchesList 
            matches={filteredWeekend} 
            isLoading={weekendLoading} 
            isError={weekendError}
            emptyMessage="No hay partidos programados para el fin de semana"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
