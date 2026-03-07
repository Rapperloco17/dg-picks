'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar,
  Search,
  ChevronRight,
  Trophy,
  ArrowLeft,
  Filter,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFixturesByDate } from '@/services/api-football';
import { getAllLeagueIds } from '@/constants/leagues';
import { Match } from '@/types';

export default function MatchHistoryPage() {
  const [selectedDate, setSelectedDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLeague, setFilterLeague] = useState<string>('all');

  useEffect(() => {
    loadMatches();
  }, [selectedDate]);

  async function loadMatches() {
    setLoading(true);
    try {
      const leagueIds = getAllLeagueIds();
      const allMatches: Match[] = [];
      
      // Load matches for all leagues on that date
      for (const leagueId of leagueIds.slice(0, 10)) { // Limit to avoid rate limits
        try {
          const fixtures = await getFixturesByDate(selectedDate, [leagueId]);
          if (fixtures && fixtures.length > 0) {
            allMatches.push(...fixtures);
          }
        } catch (e) {
          // Continue with next league
        }
      }
      
      // Sort by league and time
      allMatches.sort((a, b) => {
        if (a.league.id !== b.league.id) {
          return a.league.name.localeCompare(b.league.name);
        }
        return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
      });
      
      setMatches(allMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  }

  const finishedMatches = matches.filter(m => 
    m.fixture.status.short === 'FT' || 
    m.fixture.status.short === 'AET' ||
    m.fixture.status.short === 'PEN'
  );

  const leagues = Array.from(new Set(matches.map(m => m.league.id)))
    .map(id => matches.find(m => m.league.id === id)?.league)
    .filter(Boolean);

  const filteredMatches = filterLeague === 'all' 
    ? finishedMatches 
    : finishedMatches.filter(m => m.league.id.toString() === filterLeague);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Historial de Partidos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Busca partidos por fecha y revisa sus estadísticas
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>

      {/* Date Selector */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-sm text-slate-400 mb-2 block">
                Selecciona una fecha
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
                <Button 
                  onClick={loadMatches}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </div>
            
            {leagues.length > 0 && (
              <div className="w-full sm:w-auto">
                <label className="text-sm text-slate-400 mb-2 block">
                  Filtrar por liga
                </label>
                <select
                  value={filterLeague}
                  onChange={(e) => setFilterLeague(e.target.value)}
                  className="w-full sm:w-48 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
                >
                  <option value="all">Todas las ligas</option>
                  {leagues.map(league => (
                    <option key={league?.id} value={league?.id}>
                      {league?.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Quick date buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <QuickDateButton 
              label="Ayer" 
              date={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
              onClick={setSelectedDate}
            />
            <QuickDateButton 
              label="Hace 7 días" 
              date={format(subDays(new Date(), 7), 'yyyy-MM-dd')}
              onClick={setSelectedDate}
            />
            <QuickDateButton 
              label="Hace 14 días" 
              date={format(subDays(new Date(), 14), 'yyyy-MM-dd')}
              onClick={setSelectedDate}
            />
            <QuickDateButton 
              label="Hace 30 días" 
              date={format(subDays(new Date(), 30), 'yyyy-MM-dd')}
              onClick={setSelectedDate}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Partidos Finalizados ({filteredMatches.length})
          </h2>
          <span className="text-sm text-slate-500">
            {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: es })}
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : filteredMatches.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredMatches.map((match) => (
              <MatchHistoryCard key={match.fixture.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickDateButton({ 
  label, 
  date, 
  onClick 
}: { 
  label: string; 
  date: string; 
  onClick: (date: string) => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onClick(date)}
      className="border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-600"
    >
      <Clock className="w-3 h-3 mr-1" />
      {label}
    </Button>
  );
}

function MatchHistoryCard({ match }: { match: Match }) {
  const matchDate = new Date(match.fixture.date);
  
  return (
    <Link href={`/match/${match.fixture.id}`}>
      <Card className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-all cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* League & Date */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <img 
                  src={match.league.logo} 
                  alt={match.league.name} 
                  className="w-4 h-4 object-contain"
                />
                <span>{match.league.name}</span>
              </div>
              <span>{format(matchDate, 'HH:mm')}</span>
            </div>

            {/* Teams & Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <img 
                  src={match.teams.home.logo} 
                  alt={match.teams.home.name} 
                  className="w-8 h-8 object-contain"
                />
                <span className="font-medium text-slate-100">
                  {match.teams.home.name}
                </span>
              </div>

              <div className="px-4 py-2 bg-slate-800 rounded-lg">
                <span className="text-xl font-bold text-slate-100">
                  {match.goals.home} - {match.goals.away}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-1 justify-end">
                <span className="font-medium text-slate-100 text-right">
                  {match.teams.away.name}
                </span>
                <img 
                  src={match.teams.away.logo} 
                  alt={match.teams.away.name} 
                  className="w-8 h-8 object-contain"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Badge variant="outline" className="text-xs">
                <Trophy className="w-3 h-3 mr-1" />
                Ver estadísticas completas
              </Badge>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-12 text-center">
        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No se encontraron partidos</p>
        <p className="text-sm text-slate-500 mt-2">
          Intenta seleccionar otra fecha o verificar las fechas disponibles
        </p>
      </CardContent>
    </Card>
  );
}
