'use client';

import { useMemo } from 'react';
import { MatchesList } from '@/components/matches/matches-list';
import { MatchFilters } from '@/components/matches/match-filters';
import { 
  useTodayMatches, 
  useTomorrowMatches, 
  useLiveMatches 
} from '@/hooks/use-matches';
import { useAppStore } from '@/stores/app-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Match } from '@/types';

function filterMatches(matches: Match[], searchQuery: string, league: number | 'ALL') {
  return matches.filter(match => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const homeMatch = match.teams.home.name.toLowerCase().includes(query);
      const awayMatch = match.teams.away.name.toLowerCase().includes(query);
      const leagueMatch = match.league.name.toLowerCase().includes(query);
      if (!homeMatch && !awayMatch && !leagueMatch) return false;
    }
    
    if (league !== 'ALL' && match.league.id !== league) return false;
    
    return true;
  });
}

export default function MatchesPage() {
  const { filters } = useAppStore();
  
  const { 
    matches: liveMatches, 
    isLoading: liveLoading, 
    isError: liveError 
  } = useLiveMatches();
  
  const { 
    matches: todayMatches, 
    isLoading: todayLoading, 
    isError: todayError 
  } = useTodayMatches(2); // Include TIER 2
  
  const { 
    matches: tomorrowMatches, 
    isLoading: tomorrowLoading, 
    isError: tomorrowError 
  } = useTomorrowMatches(2);

  const filteredLive = useMemo(() => 
    filterMatches(liveMatches, filters.searchQuery, filters.league),
    [liveMatches, filters]
  );
  
  const filteredToday = useMemo(() => 
    filterMatches(todayMatches, filters.searchQuery, filters.league),
    [todayMatches, filters]
  );
  
  const filteredTomorrow = useMemo(() => 
    filterMatches(tomorrowMatches, filters.searchQuery, filters.league),
    [tomorrowMatches, filters]
  );

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Partidos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Explora todos los partidos disponibles
          </p>
        </div>
      </div>

      {/* Filters */}
      <MatchFilters />

      {/* Content Tabs */}
      <Tabs defaultValue="live" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="live" className="data-[state=active]:bg-slate-800">
            En Vivo
            {filteredLive.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px] h-4 px-1 animate-pulse-live">
                {filteredLive.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="today" className="data-[state=active]:bg-slate-800">
            Hoy ({filteredToday.length})
          </TabsTrigger>
          <TabsTrigger value="tomorrow" className="data-[state=active]:bg-slate-800">
            Mañana ({filteredTomorrow.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <MatchesList 
            matches={filteredLive} 
            isLoading={liveLoading} 
            isError={liveError}
            emptyMessage="No hay partidos en vivo actualmente"
          />
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
          <MatchesList 
            matches={filteredToday} 
            isLoading={todayLoading} 
            isError={todayError}
            emptyMessage="No hay partidos programados para hoy"
          />
        </TabsContent>

        <TabsContent value="tomorrow" className="space-y-4">
          <MatchesList 
            matches={filteredTomorrow} 
            isLoading={tomorrowLoading} 
            isError={tomorrowError}
            emptyMessage="No hay partidos programados para mañana"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
