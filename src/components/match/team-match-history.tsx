'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, 
  ChevronRight,
  Trophy,
  Calendar,
  Target,
  Goal,
  Flag,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFixturesByTeam, getFixtureStatistics, FixtureStatistics } from '@/services/api-football';
import { Match } from '@/types';

interface TeamMatchHistoryProps {
  teamId: number;
  teamName: string;
  teamLogo: string;
  currentMatchId: number;
  isHome: boolean;
}

interface MatchWithStats extends Match {
  statistics?: FixtureStatistics[];
}

export function TeamMatchHistory({
  teamId,
  teamName,
  teamLogo,
  currentMatchId,
  isHome
}: TeamMatchHistoryProps) {
  const [matches, setMatches] = useState<MatchWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        // Get last 5 matches
        const fixtures = await getFixturesByTeam(teamId, new Date().getFullYear(), 5);
        if (fixtures) {
          // Filter out current match and get stats for each
          const filtered = fixtures.filter(f => f.fixture.id !== currentMatchId).slice(0, 5);
          
          // Load statistics for each match
          const matchesWithStats = await Promise.all(
            filtered.map(async (match) => {
              try {
                const stats = await getFixtureStatistics(match.fixture.id);
                return { ...match, statistics: stats || undefined };
              } catch {
                return match;
              }
            })
          );
          
          setMatches(matchesWithStats);
        }
      } catch (error) {
        console.error('Error loading team history:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [teamId, currentMatchId]);

  if (loading) {
    return <HistoryLoadingSkeleton />;
  }

  if (matches.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No hay historial disponible</p>
          <p className="text-sm text-slate-500 mt-2">
            No se encontraron partidos recientes para {teamName}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "bg-slate-900 border-slate-800",
      isHome ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-blue-500"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5 text-slate-400" />
          Últimos Partidos - {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match) => (
          <MatchHistoryRow 
            key={match.fixture.id} 
            match={match} 
            teamId={teamId}
            teamName={teamName}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function MatchHistoryRow({ 
  match, 
  teamId,
  teamName 
}: { 
  match: MatchWithStats; 
  teamId: number;
  teamName: string;
}) {
  const isHomeTeam = match.teams.home.id === teamId;
  const opponent = isHomeTeam ? match.teams.away : match.teams.home;
  const teamGoals = isHomeTeam ? match.goals.home : match.goals.away;
  const opponentGoals = isHomeTeam ? match.goals.away : match.goals.home;
  
  let result: 'W' | 'D' | 'L';
  if (teamGoals === null || opponentGoals === null) {
    result = 'D';
  } else if (teamGoals > opponentGoals) {
    result = 'W';
  } else if (teamGoals < opponentGoals) {
    result = 'L';
  } else {
    result = 'D';
  }

  const matchDate = new Date(match.fixture.date);
  const isFinished = match.fixture.status.short === 'FT' || 
                     match.fixture.status.short === 'AET' ||
                     match.fixture.status.short === 'PEN';

  // Get team stats from match
  const teamStats = match.statistics?.find(s => s.team.id === teamId)?.statistics || [];
  const shotsOnGoal = teamStats.find(s => s.type === 'Shots on Goal')?.value || 0;
  const possession = teamStats.find(s => s.type === 'Ball Possession')?.value || '0%';
  const corners = teamStats.find(s => s.type === 'Corner Kicks')?.value || 0;
  const fouls = teamStats.find(s => s.type === 'Fouls')?.value || 0;

  return (
    <Link href={`/match/${match.fixture.id}`}>
      <div className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer group">
        {/* Header: Date & Result */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-3 h-3" />
            {format(matchDate, 'dd MMM yyyy', { locale: es })}
            <span className="text-slate-600">•</span>
            {match.league.name}
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              result === 'W' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
              result === 'L' ? "border-red-500/30 text-red-400 bg-red-500/10" :
              "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
            )}
          >
            {result === 'W' ? 'Victoria' : result === 'L' ? 'Derrota' : 'Empate'}
          </Badge>
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <img src={opponent.logo} alt={opponent.name} className="w-6 h-6 object-contain" />
            <span className="text-sm text-slate-300">
              {isHomeTeam ? 'vs' : '@'} {opponent.name}
            </span>
          </div>
          
          {isFinished && teamGoals !== null && opponentGoals !== null && (
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-lg font-bold",
                result === 'W' ? "text-emerald-400" :
                result === 'L' ? "text-red-400" : "text-yellow-400"
              )}>
                {teamGoals} - {opponentGoals}
              </span>
            </div>
          )}
          
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>

        {/* Match Statistics */}
        {isFinished && match.statistics && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-700/50">
            <StatItem 
              icon={<Target className="w-3 h-3" />} 
              label="Tiros" 
              value={shotsOnGoal} 
            />
            <StatItem 
              icon={<Shield className="w-3 h-3" />} 
              label="Posesión" 
              value={possession} 
            />
            <StatItem 
              icon={<Flag className="w-3 h-3" />} 
              label="Corners" 
              value={corners} 
            />
            <StatItem 
              icon={<Trophy className="w-3 h-3" />} 
              label="Faltas" 
              value={fouls} 
            />
          </div>
        )}
      </div>
    </Link>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-1 text-slate-500 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-300">{value}</span>
    </div>
  );
}

function HistoryLoadingSkeleton() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </CardContent>
    </Card>
  );
}
