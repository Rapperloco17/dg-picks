"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap, Clock, RefreshCw, ChevronDown, ChevronUp, 
  Target, Activity, Square, Triangle, TrendingUp,
  Shield, AlertCircle, Flag, Wifi
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

// Tipos
interface LiveMatch {
  id: number;
  league: string;
  leagueId: number;
  leagueLogo: string;
  homeTeam: string;
  homeTeamId: number;
  homeLogo: string;
  awayTeam: string;
  awayTeamId: number;
  awayLogo: string;
  homeGoals: number;
  awayGoals: number;
  elapsed: number;
  status: string;
  timestamp: number;
  hasDetailedStats: boolean;
}

interface MatchDetail {
  id: number;
  league: any;
  teams: any;
  goals: { home: number; away: number };
  score: any;
  status: { short: string; elapsed: number; extra: number };
  referee: string;
  venue: { name: string; city: string };
  statistics: {
    possession: { home: number; away: number };
    shots: { home: number; away: number };
    shotsOnTarget: { home: number; away: number };
    corners: { home: number; away: number };
    yellowCards: { home: number; away: number };
    redCards: { home: number; away: number };
    fouls: { home: number; away: number };
    offsides: { home: number; away: number };
    saves: { home: number; away: number };
    passes: {
      total: { home: number; away: number };
      accurate: { home: number; away: number };
    };
  };
  odds: { home: number; draw: number; away: number } | null;
  events: Array<{
    time: number;
    extraTime: number;
    team: string;
    player: string;
    assist: string;
    type: string;
    detail: string;
    comments: string;
  }>;
  lineups: any[] | null;
}

export default function LivePage() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Estado para detalles expandidos
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [matchDetails, setMatchDetails] = useState<Record<number, MatchDetail>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});

  // Contador de segundos desde última actualización
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Cargar lista de partidos
  const fetchLiveMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/live-matches', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.matches);
        setLastUpdate(new Date());
        setSecondsSinceUpdate(0);
        setError(null);
        
        // Si hay un partido expandido, refrescar sus detalles
        if (expandedMatch) {
          fetchMatchDetail(expandedMatch, true);
        }
      } else {
        setError(data.error || 'Failed to fetch matches');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [expandedMatch]);

  // Auto-refresh cada 15 segundos para datos más actualizados
  useEffect(() => {
    fetchLiveMatches();
    const interval = setInterval(() => fetchLiveMatches(true), 15000); // 15 segundos
    return () => clearInterval(interval);
  }, [fetchLiveMatches]);

  // Cargar detalles de un partido
  const fetchMatchDetail = async (matchId: number, silent = false) => {
    if (!silent) {
      setLoadingDetails(prev => ({ ...prev, [matchId]: true }));
    }
    
    try {
      const response = await fetch(`/api/live-matches/${matchId}`, {
        cache: 'no-store'
      });
      const data = await response.json();
      
      if (data.success) {
        setMatchDetails(prev => ({ ...prev, [matchId]: data.match }));
      }
    } catch (err) {
      console.error('Error fetching match detail:', err);
    } finally {
      if (!silent) {
        setLoadingDetails(prev => ({ ...prev, [matchId]: false }));
      }
    }
  };

  // Toggle expandir/colapsar
  const toggleMatch = (matchId: number) => {
    if (expandedMatch === matchId) {
      setExpandedMatch(null);
    } else {
      setExpandedMatch(matchId);
      // Cargar detalles si no los tenemos
      if (!matchDetails[matchId]) {
        fetchMatchDetail(matchId);
      }
    }
  };

  function formatElapsed(minutes: number, extra?: number) {
    if (extra && extra > 0) {
      return `${minutes}+${extra}'`;
    }
    return `${minutes}'`;
  }

  // Renderizar eventos (goles, tarjetas, etc.)
  const renderEvents = (events: MatchDetail['events'], homeTeam: string, awayTeam: string) => {
    if (!events || events.length === 0) {
      return <p className="text-zinc-500 text-sm italic text-center py-4">No events yet</p>;
    }

    // Ordenar por tiempo (más reciente primero)
    const sortedEvents = [...events].sort((a, b) => b.time - a.time);

    return (
      <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
        {sortedEvents.map((event, idx) => {
          const isHome = event.team === homeTeam;
          const isGoal = event.type === 'Goal';
          const isCard = event.type === 'Card';
          const isSub = event.type === 'subst';
          
          return (
            <div 
              key={idx} 
              className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border ${isGoal ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#1a1a1a] border-[#262626]'}`}
            >
              {/* Tiempo */}
              <span className="text-xs sm:text-sm font-bold text-zinc-500 min-w-[35px] sm:min-w-[45px] text-center">
                {event.time}'
              </span>
              
              {/* Separador - hidden on mobile */}
              <div className="hidden sm:block w-px h-6 sm:h-8 bg-[#262626]" />
              
              {/* Contenido */}
              <div className="flex-1 min-w-0">
                {isGoal && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    {/* Indicador de equipo */}
                    <div className={`shrink-0 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold ${
                      isHome 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {isHome ? '🏠' : '✈️'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-base sm:text-lg">⚽</span>
                        <p className="text-sm sm:text-base font-bold text-zinc-100 truncate">{event.player}</p>
                      </div>
                      {event.assist && (
                        <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 truncate">
                          👟 {event.assist}
                        </p>
                      )}
                      <p className={`text-[10px] sm:text-xs font-bold mt-0.5 ${isHome ? 'text-emerald-400' : 'text-blue-400'}`}>
                        GOAL {isHome ? homeTeam : awayTeam}
                      </p>
                    </div>
                  </div>
                )}
                
                {isCard && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold ${
                      isHome ? 'text-emerald-500' : 'text-blue-500'
                    }`}>
                      {isHome ? '🏠' : '✈️'}
                    </div>
                    <div className={`w-2.5 sm:w-3 h-4 sm:h-5 rounded-sm ${event.detail.includes('Yellow') ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-zinc-300 truncate">{event.player}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{event.team}</p>
                    </div>
                  </div>
                )}
                
                {isSub && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold ${
                      isHome ? 'text-emerald-500' : 'text-blue-500'
                    }`}>
                      {isHome ? '🏠' : '✈️'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-zinc-300">
                        <span className="text-emerald-400">↑ {event.player}</span>
                        <span className="text-zinc-600 mx-1">/</span>
                        <span className="text-red-400">↓ {event.assist}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{event.team}</p>
                    </div>
                  </div>
                )}
                
                {!isGoal && !isCard && !isSub && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold ${
                      isHome ? 'text-emerald-500' : 'text-blue-500'
                    }`}>
                      {isHome ? '🏠' : '✈️'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm text-zinc-400 truncate">{event.detail}: {event.player}</span>
                      <p className="text-[10px] text-zinc-500 truncate">{event.team}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Status badge helper - mobile optimized
  const getStatusBadge = (status: string, elapsed: number) => {
    const isLive = ['1H', '2H', 'ET', 'P', 'LIVE'].includes(status);
    
    if (isLive) {
      return (
        <div className="flex items-center gap-1">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs sm:text-sm font-bold text-red-400">{elapsed}'</span>
        </div>
      );
    }
    
    if (status === 'HT') {
      return <span className="text-xs sm:text-sm font-bold text-yellow-400">HT</span>;
    }
    
    if (['FT', 'AET', 'PEN'].includes(status)) {
      return <span className="text-[10px] sm:text-xs text-zinc-500">FT</span>;
    }
    
    return <span className="text-[10px] sm:text-xs text-zinc-500">{status}</span>;
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Zap className="w-5 sm:w-6 h-5 sm:h-6 text-red-500 live-indicator" />
            Live Matches
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            {matches.length > 0 ? `${matches.length} matches live` : 'Real-time scores'}
          </p>
        </div>
        
        {/* Refresh controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-[#1a1a1a] rounded-lg">
            <Wifi className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${isRefreshing ? 'text-amber-500 animate-pulse' : secondsSinceUpdate < 30 ? 'text-emerald-500' : 'text-zinc-500'}`} />
            <span className="text-xs text-zinc-500">
              {secondsSinceUpdate < 60 ? `${secondsSinceUpdate}s` : `${Math.floor(secondsSinceUpdate/60)}m`}
            </span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchLiveMatches()}
            disabled={isRefreshing}
            className="h-8 sm:h-9 text-xs"
          >
            <RefreshCw className={`w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          Error: {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && matches.length === 0 && (
        <div className="flex justify-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-amber-500" />
        </div>
      )}

      {/* No matches */}
      {matches.length === 0 && !loading && (
        <Card className="glass border-0">
          <CardContent className="p-6 sm:p-8 text-center">
            <Clock className="w-10 sm:w-12 h-10 sm:h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm sm:text-base">No live matches at the moment</p>
            <p className="text-xs text-zinc-600 mt-2">Check back during match hours</p>
          </CardContent>
        </Card>
      )}

      {/* Matches List */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {matches.map((match) => {
          const isExpanded = expandedMatch === match.id;
          const detail = matchDetails[match.id];
          
          return (
            <Card key={match.id} className="glass border-0 overflow-hidden">
              {/* Match Header - Clickable - Mobile Optimized */}
              <div 
                onClick={() => toggleMatch(match.id)}
                className="cursor-pointer hover:bg-[#1a1a1a] transition-colors p-3 sm:p-4"
              >
                {/* League & Status */}
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    {match.leagueLogo && (
                      <img src={match.leagueLogo} alt="" className="w-4 sm:w-5 h-4 sm:h-5 object-contain shrink-0" />
                    )}
                    <span className="text-[10px] sm:text-xs text-zinc-400 truncate">{match.league}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(match.status, match.elapsed)}
                    {isExpanded ? (
                      <ChevronUp className="w-4 sm:w-5 h-4 sm:h-5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-4 sm:w-5 h-4 sm:h-5 text-zinc-500" />
                    )}
                  </div>
                </div>

                {/* Teams & Score - Mobile Optimized */}
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Home Team */}
                  <div className="flex-1 flex items-center gap-2 sm:gap-3">
                    <img src={match.homeLogo} alt="" className="w-6 sm:w-10 h-6 sm:h-10 object-contain shrink-0" />
                    <span className={`text-sm sm:text-base font-medium truncate ${
                      match.homeGoals > match.awayGoals ? 'text-zinc-100' : 'text-zinc-400'
                    }`}>
                      {match.homeTeam}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#1a1a1a] rounded-lg shrink-0">
                    <span className="text-lg sm:text-2xl font-bold text-zinc-100">
                      {match.homeGoals} - {match.awayGoals}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex items-center gap-2 sm:gap-3 justify-end">
                    <span className={`text-sm sm:text-base font-medium truncate text-right ${
                      match.awayGoals > match.homeGoals ? 'text-zinc-100' : 'text-zinc-400'
                    }`}>
                      {match.awayTeam}
                    </span>
                    <img src={match.awayLogo} alt="" className="w-6 sm:w-10 h-6 sm:h-10 object-contain shrink-0" />
                  </div>
                </div>
              </div>

              {/* Expanded Details - Mobile Optimized */}
              {isExpanded && (
                <div className="border-t border-[#262626] p-3 sm:p-4 bg-[#0f0f0f]">
                  {loadingDetails[match.id] ? (
                    <div className="flex justify-center py-4 sm:py-8">
                      <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-b-2 border-amber-500" />
                    </div>
                  ) : detail ? (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Stats Grid - 2 cols mobile, 4 cols desktop */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {/* Possession */}
                        <div className="bg-[#1a1a1a] rounded-lg p-2 sm:p-3">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2 text-zinc-500 text-[10px] sm:text-xs">
                            <Activity className="w-3 h-3" />
                            Possession
                          </div>
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-emerald-500 font-bold">{detail.statistics.possession.home}%</span>
                            <div className="flex-1 mx-1 sm:mx-2 h-1.5 sm:h-2 bg-zinc-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${detail.statistics.possession.home}%` }}
                              />
                            </div>
                            <span className="text-zinc-400">{detail.statistics.possession.away}%</span>
                          </div>
                        </div>

                        {/* Shots */}
                        <div className="bg-[#1a1a1a] rounded-lg p-2 sm:p-3">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2 text-zinc-500 text-[10px] sm:text-xs">
                            <Target className="w-3 h-3" />
                            Shots (On)
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-zinc-100">{detail.statistics.shots.home} ({detail.statistics.shotsOnTarget.home})</span>
                            <span className="text-zinc-400">{detail.statistics.shots.away} ({detail.statistics.shotsOnTarget.away})</span>
                          </div>
                        </div>

                        {/* Corners */}
                        <div className="bg-[#1a1a1a] rounded-lg p-2 sm:p-3">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2 text-zinc-500 text-[10px] sm:text-xs">
                            <Square className="w-3 h-3 rotate-45" />
                            Corners
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-zinc-100">{detail.statistics.corners.home}</span>
                            <span className="text-zinc-400">{detail.statistics.corners.away}</span>
                          </div>
                        </div>

                        {/* Cards */}
                        <div className="bg-[#1a1a1a] rounded-lg p-2 sm:p-3">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2 text-zinc-500 text-[10px] sm:text-xs">
                            <AlertCircle className="w-3 h-3" />
                            Cards
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-zinc-100">
                              <span className="w-1.5 sm:w-2 h-2.5 sm:h-3 bg-yellow-500 rounded-sm inline-block mr-0.5" />
                              {detail.statistics.yellowCards.home}
                              <span className="w-1.5 sm:w-2 h-2.5 sm:h-3 bg-red-500 rounded-sm inline-block ml-1 mr-0.5" />
                              {detail.statistics.redCards.home}
                            </span>
                            <span className="text-zinc-400">
                              {detail.statistics.yellowCards.away}
                              <span className="w-1.5 sm:w-2 h-2.5 sm:h-3 bg-yellow-500 rounded-sm inline-block mx-0.5" />
                              {detail.statistics.redCards.away}
                              <span className="w-1.5 sm:w-2 h-2.5 sm:h-3 bg-red-500 rounded-sm inline-block ml-0.5" />
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Events Timeline */}
                      <div className="bg-[#1a1a1a] rounded-lg p-3 sm:p-4">
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-300 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                          <TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                          Match Events
                        </h4>
                        {renderEvents(detail.events, match.homeTeam, match.awayTeam)}
                      </div>

                      {/* Live Odds */}
                      {detail.odds && (
                        <div className="bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg p-3 sm:p-4 border border-amber-500/20">
                          <h4 className="text-xs sm:text-sm font-bold text-amber-500 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                            <TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                            Live Odds
                          </h4>
                          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                            <div className="bg-[#262626] rounded-lg p-2 sm:p-3">
                              <p className="text-[10px] sm:text-xs text-zinc-500 mb-0.5">1</p>
                              <p className="text-base sm:text-xl font-bold text-emerald-400">{detail.odds.home?.toFixed(2)}</p>
                            </div>
                            <div className="bg-[#262626] rounded-lg p-2 sm:p-3">
                              <p className="text-[10px] sm:text-xs text-zinc-500 mb-0.5">X</p>
                              <p className="text-base sm:text-xl font-bold text-zinc-300">{detail.odds.draw?.toFixed(2)}</p>
                            </div>
                            <div className="bg-[#262626] rounded-lg p-2 sm:p-3">
                              <p className="text-[10px] sm:text-xs text-zinc-500 mb-0.5">2</p>
                              <p className="text-base sm:text-xl font-bold text-blue-400">{detail.odds.away?.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-center py-4 text-sm">Failed to load match details</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
