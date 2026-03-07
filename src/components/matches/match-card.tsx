'use client';

import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Match } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Activity, 
  Flame, 
  AlertTriangle, 
  BarChart3,
  Clock,
  Plus,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchStatsDialog } from '@/components/match/match-stats-dialog';
import { hasCache, CACHE_TYPES } from '@/services/local-cache';

interface MatchCardProps {
  match: Match;
  showValueIndicator?: boolean;
}

export function MatchCard({ match, showValueIndicator = true }: MatchCardProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen');
  const { fixture, league, teams, goals } = match;
  
  // Check if stats are cached
  const isCached = typeof window !== 'undefined' && hasCache(CACHE_TYPES.MATCH_STATS, fixture.id);
  
  const isLive = fixture.status.short === '1H' || 
                 fixture.status.short === '2H' || 
                 fixture.status.short === 'ET' ||
                 fixture.status.short === 'P';
  
  const isFinished = fixture.status.short === 'FT' || 
                     fixture.status.short === 'AET' || 
                     fixture.status.short === 'PEN';
  
  const matchDate = new Date(fixture.date);
  const formattedTime = format(matchDate, 'HH:mm');
  
  // Mock indicators - in real app, calculate from predictions
  const hasHighValue = Math.random() > 0.7;
  const hasLimitedData = Math.random() > 0.9;
  const confidenceScore = Math.floor(Math.random() * 40) + 60;

  return (
    <>
      <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors group">
        <CardContent className="p-4">
          {/* Header: League & Indicators */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img 
                src={league.logo} 
                alt={league.name}
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-xs text-slate-400 truncate max-w-[120px]">
                {league.name}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {isLive && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 animate-pulse-live">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mr-1" />
                  {fixture.status.elapsed}'
                </Badge>
              )}
              {showValueIndicator && hasHighValue && (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] h-5 px-1.5">
                  <Flame className="w-3 h-3 mr-0.5" />
                  Valor
                </Badge>
              )}
              {hasLimitedData && (
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] h-5 px-1.5">
                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                </Badge>
              )}
            </div>
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between gap-4">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <img 
                src={teams.home.logo} 
                alt={teams.home.name}
                className="w-12 h-12 object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-team.png';
                }}
              />
              <span className="text-sm font-medium text-slate-100 line-clamp-2">
                {teams.home.name}
              </span>
            </div>

            {/* Score / Time */}
            <div className="flex flex-col items-center min-w-[80px]">
              {isLive || isFinished ? (
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <span className={cn(
                    goals.home !== null && goals.home > (goals.away ?? 0) && "text-emerald-400"
                  )}>
                    {goals.home ?? '-'}
                  </span>
                  <span className="text-slate-600">:</span>
                  <span className={cn(
                    goals.away !== null && goals.away > (goals.home ?? 0) && "text-emerald-400"
                  )}>
                    {goals.away ?? '-'}
                  </span>
                </div>
              ) : (
                <div className="text-xl font-bold text-slate-300">
                  {formattedTime}
                </div>
              )}
              
              <div className="flex items-center gap-1 mt-1">
                {!isLive && !isFinished && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(matchDate, 'd MMM', { locale: es })}
                  </span>
                )}
                {isFinished && (
                  <span className="text-xs text-slate-500">Final</span>
                )}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <img 
                src={teams.away.logo} 
                alt={teams.away.name}
                className="w-12 h-12 object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-team.png';
                }}
              />
              <span className="text-sm font-medium text-slate-100 line-clamp-2">
                {teams.away.name}
              </span>
            </div>
          </div>

          {/* Footer: Prediction & Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-3">
              {/* Confidence Bar */}
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full",
                      confidenceScore >= 80 ? "bg-emerald-500" :
                      confidenceScore >= 60 ? "bg-blue-500" : "bg-amber-500"
                    )}
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{confidenceScore}%</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Quick Analysis Button */}
              <Button 
                variant="ghost" 
                size="sm"
                className="text-slate-400 hover:text-slate-100 h-8 px-2"
                onClick={() => {
                  setActiveTab('resumen');
                  setStatsOpen(true);
                }}
              >
                <Activity className="w-4 h-4 mr-1" />
                Análisis
              </Button>
              
              {/* Full Stats Button */}
              <Link href={`/match/${fixture.id}/stats`}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-400 hover:text-slate-100 h-8 px-2"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Stats
                  {isCached && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500" />}
                </Button>
              </Link>
              
              <Link href={`/picks/new?match=${fixture.id}`}>
                <Button 
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Pick
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Stats Dialog */}
      <MatchStatsDialog 
        match={match} 
        open={statsOpen} 
        onOpenChange={setStatsOpen}
        defaultTab={activeTab}
      />
    </>
  );
}
