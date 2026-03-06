'use client';

import { useMemo, useEffect } from 'react';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { ApiStatusCard } from '@/components/dashboard/api-status';
import { MatchesList } from '@/components/matches/matches-list';
import { MatchFilters } from '@/components/matches/match-filters';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Match } from '@/types';
import { TIER_1_LEAGUES, TIER_2_LEAGUES, TIER_3_LEAGUES, ALL_LEAGUES } from '@/constants/leagues';
import { Globe } from 'lucide-react';

function filterMatches(matches: Match[], searchQuery: string, continent: string, country: string, league: number | 'ALL') {
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
  const { viewMode, filters, setFilter } = useAppStore();
  const { loadPicks } = usePicksStore();

  // Load picks on mount
  useEffect(() => {
    loadPicks();
  }, [loadPicks]);

  // Get tier from filters
  const tier = filters.continent === 'ALL' && filters.country === 'ALL' ? 'all' : 
    filters.continent === 'EUROPE' ? 2 : 3;
  
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
    filterMatches(todayMatches, filters.searchQuery, filters.continent, filters.country, filters.league),
    [todayMatches, filters]
  );
  
  const filteredTomorrow = useMemo(() => 
    filterMatches(tomorrowMatches, filters.searchQuery, filters.continent, filters.country, filters.league),
    [tomorrowMatches, filters]
  );
  
  const filteredLive = useMemo(() => 
    filterMatches(liveMatches, filters.searchQuery, filters.continent, filters.country, filters.league),
    [liveMatches, filters]
  );
  
  const filteredWeekend = useMemo(() => 
    filterMatches(weekendMatches, filters.searchQuery, filters.continent, filters.country, filters.league),
    [weekendMatches, filters]
  );

  // Stats
  const totalMatches = filteredToday.length + filteredTomorrow.length + filteredLive.length;
  const activeLeagues = new Set([
    ...filteredToday.map(m => m.league.id),
    ...filteredTomorrow.map(m => m.league.id),
  ]).size;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            {totalMatches} partidos disponibles • {activeLeagues} ligas activas
          </p>
        </div>
        
        {/* Tier Selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400" />
          <Select 
            value={tier as string} 
            onValueChange={(v) => {
              // Reset filters when changing tier
              if (v === 'all') {
                setFilter('continent', 'ALL');
                setFilter('country', 'ALL');
                setFilter('league', 'ALL');
              }
            }}
          >
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800">
              <SelectValue placeholder="Cobertura" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all" className="text-slate-100 focus:bg-slate-800">
                🌍 Todas las ligas ({ALL_LEAGUES.length})
              </SelectItem>
              <SelectItem value="1" className="text-slate-100 focus:bg-slate-800">
                ⭐ TIER 1 - Élite ({TIER_1_LEAGUES.length})
              </SelectItem>
              <SelectItem value="2" className="text-slate-100 focus:bg-slate-800">
                🏆 TIER 2 - Competitivo ({TIER_2_LEAGUES.length})
              </SelectItem>
              <SelectItem value="3" className="text-slate-100 focus:bg-slate-800">
                🌐 TIER 3 - Adicional ({TIER_3_LEAGUES.length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* API Status & System Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ApiStatusCard />
      </div>

      {/* Filters */}
      <MatchFilters />

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
      <Tabs defaultValue="today" value={viewMode.toLowerCase()} className="space-y-4">
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
              {tier === 'all' ? 'Todas las ligas' : `TIER ${tier}`}
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
              {tier === 'all' ? 'Todas las ligas' : `TIER ${tier}`}
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
