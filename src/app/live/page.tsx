"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Clock, RefreshCw, ChevronDown, ChevronUp, 
  Target, Activity, Square, Triangle, TrendingUp,
  User, Shield, AlertCircle, Flag
} from "lucide-react";
import { useState, useEffect } from "react";

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
  
  // Estado para detalles expandidos
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [matchDetails, setMatchDetails] = useState<Record<number, MatchDetail>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});

  // Cargar lista de partidos
  const fetchLiveMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/live-matches');
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.matches);
        setLastUpdate(new Date());
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
    }
  };

  // Cargar detalles de un partido
  const fetchMatchDetail = async (matchId: number, silent = false) => {
    if (!silent) {
      setLoadingDetails(prev => ({ ...prev, [matchId]: true }));
    }
    
    try {
      const response = await fetch(`/api/live-matches/${matchId}`);
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

  useEffect(() => {
    fetchLiveMatches();
    // Refresh cada 60 segundos
    const interval = setInterval(fetchLiveMatches, 60000);
    return () => clearInterval(interval);
  }, [expandedMatch]);

  function formatElapsed(minutes: number, extra?: number) {
    if (extra && extra > 0) {
      return `${minutes}+${extra}'`;
    }
    return `${minutes}'`;
  }

  // Renderizar eventos (goles, tarjetas, etc.)
  const renderEvents = (events: MatchDetail['events'], homeTeam: string, awayTeam: string) => {
    if (!events || events.length === 0) {
      return <p className="text-zinc-500 text-sm italic">No events yet</p>;
    }

    // Ordenar por tiempo (más reciente primero)
    const sortedEvents = [...events].sort((a, b) => b.time - a.time);

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedEvents.map((event, idx) => {
          const isHome = event.team === homeTeam;
          const isGoal = event.type === 'Goal';
          const isCard = event.type === 'Card';
          const isSub = event.type === 'subst';
          
          return (
            <div 
              key={idx} 
              className={`flex items-center gap-3 p-2 rounded ${isHome ? 'flex-row' : 'flex-row-reverse'} ${isGoal ? 'bg-emerald-500/10' : ''}`}
            >
              <span className="text-sm font-bold text-zinc-400 min-w-[40px]">
                {event.time}'
              </span>
              
              <div className={`flex-1 ${isHome ? 'text-left' : 'text-right'}`}>
                {isGoal && (
                  <div className="flex items-center gap-2 justify-start">
                    {!isHome && <span className="text-lg">⚽</span>}
                    <div className={isHome ? '' : 'text-right'}>
                      <p className="text-sm font-bold text-zinc-100">{event.player}</p>
                      {event.assist && (
                        <p className="text-xs text-zinc-500">Assist: {event.assist}</p>
                      )}
                      <p className="text-xs text-emerald-400">GOAL!</p>
                    </div>
                    {isHome && <span className="text-lg">⚽</span>}
                  </div>
                )}
                
                {isCard && (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-4 rounded-sm ${event.detail.includes('Yellow') ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-zinc-300">{event.player}</span>
                  </div>
                )}
                
                {isSub && (
                  <div className="text-xs text-zinc-400">
                    <span className="text-emerald-400">↑ {event.player}</span>
                    {' '}/{' '}
                    <span className="text-red-400">↓ {event.assist}</span>
                  </div>
                )}
                
                {!isGoal && !isCard && !isSub && (
                  <span className="text-sm text-zinc-400">{event.detail}: {event.player}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && matches.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <Zap className="w-6 h-6 text-red-500" />
              Live Matches
            </h2>
            <p className="text-zinc-500">Loading real-time data...</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-red-500 live-indicator" />
            Live Matches
          </h2>
          <p className="text-zinc-500">
            {matches.length > 0 ? `${matches.length} matches live • Updated ${lastUpdate.toLocaleTimeString()}` : 'Real-time scores & stats'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLiveMatches}
            className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
            {matches.length} Live
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          Error: {error}
        </div>
      )}

      {matches.length === 0 && !loading ? (
        <Card className="glass border-0">
          <CardContent className="p-8 text-center">
            <p className="text-zinc-500">No live matches at the moment.</p>
            <p className="text-sm text-zinc-600 mt-2">Check back during match hours (European afternoons/evenings).</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matches.map((match) => {
            const isExpanded = expandedMatch === match.id;
            const detail = matchDetails[match.id];
            
            return (
              <Card key={match.id} className="glass border-0 overflow-hidden">
                {/* Header - Clickable */}
                <div 
                  onClick={() => toggleMatch(match.id)}
                  className="cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {match.leagueLogo && (
                          <img src={match.leagueLogo} alt={match.league} className="w-5 h-5 object-contain" />
                        )}
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                          {match.league}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-red-500">
                          <div className="w-2 h-2 rounded-full bg-red-500 live-indicator" />
                          <span className="text-sm font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatElapsed(match.elapsed)}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0">
                    {/* Teams & Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-center">
                        <img src={match.homeLogo} alt={match.homeTeam} className="w-16 h-16 mx-auto mb-2 object-contain" />
                        <p className="text-lg font-bold text-zinc-100">{match.homeTeam}</p>
                      </div>
                      <div className="px-8 py-3 bg-[#1a1a1a] rounded-xl">
                        <p className="text-4xl font-bold text-gold">
                          {match.homeGoals} - {match.awayGoals}
                        </p>
                      </div>
                      <div className="flex-1 text-center">
                        <img src={match.awayLogo} alt={match.awayTeam} className="w-16 h-16 mx-auto mb-2 object-contain" />
                        <p className="text-lg font-bold text-zinc-100">{match.awayTeam}</p>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#262626] p-4 bg-[#0f0f0f]">
                    {loadingDetails[match.id] ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                      </div>
                    ) : detail ? (
                      <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Possession */}
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                              <Activity className="w-3 h-3" />
                              Possession
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-amber-500 font-bold">{detail.statistics.possession.home}%</span>
                              <div className="flex-1 mx-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${detail.statistics.possession.home}%` }}
                                />
                              </div>
                              <span className="text-zinc-400">{detail.statistics.possession.away}%</span>
                            </div>
                          </div>

                          {/* Shots */}
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                              <Target className="w-3 h-3" />
                              Shots (On Target)
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-100">{detail.statistics.shots.home} ({detail.statistics.shotsOnTarget.home})</span>
                              <span className="text-zinc-400">{detail.statistics.shots.away} ({detail.statistics.shotsOnTarget.away})</span>
                            </div>
                          </div>

                          {/* Corners */}
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                              <Square className="w-3 h-3 rotate-45" />
                              Corners
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-100">{detail.statistics.corners.home}</span>
                              <span className="text-zinc-400">{detail.statistics.corners.away}</span>
                            </div>
                          </div>

                          {/* Fouls */}
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                              <Triangle className="w-3 h-3" />
                              Fouls
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-100">{detail.statistics.fouls.home}</span>
                              <span className="text-zinc-400">{detail.statistics.fouls.away}</span>
                            </div>
                          </div>
                        </div>

                        {/* Cards & Saves Row */}
                        <div className="grid grid-cols-3 gap-4">
                          {/* Yellow/Red Cards */}
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              Cards
                            </div>
                            <div className="flex justify-between text-sm">
                              <div className="flex gap-2">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-3 bg-yellow-500 rounded-sm" />
                                  {detail.statistics.yellowCards.home}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-3 bg-red-500 rounded-sm" />
                                  {detail.statistics.redCards.home}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-3 bg-yellow-500 rounded-sm" />
                                  {detail.statistics.yellowCards.away}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-3 bg-red-500 rounded-sm" />
                                  {detail.statistics.redCards.away}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Saves */}
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                              <Shield className="w-3 h-3" />
                              Saves
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-100">{detail.statistics.saves.home}</span>
                              <span className="text-zinc-400">{detail.statistics.saves.away}</span>
                            </div>
                          </div>

                          {/* Offsides */}
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                              <Flag className="w-3 h-3" />
                              Offsides
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-100">{detail.statistics.offsides.home}</span>
                              <span className="text-zinc-400">{detail.statistics.offsides.away}</span>
                            </div>
                          </div>
                        </div>

                        {/* Events Timeline */}
                        <div className="bg-[#1a1a1a] rounded-lg p-4">
                          <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Match Events
                          </h4>
                          {renderEvents(detail.events, match.homeTeam, match.awayTeam)}
                        </div>

                        {/* Live Odds */}
                        {detail.odds && (
                          <div className="bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg p-4 border border-amber-500/20">
                            <h4 className="text-sm font-bold text-amber-500 mb-3 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Live Odds
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="bg-[#262626] rounded-lg p-3">
                                <p className="text-xs text-zinc-500 mb-1">1 (Home)</p>
                                <p className="text-xl font-bold text-emerald-400">{detail.odds.home.toFixed(2)}</p>
                              </div>
                              <div className="bg-[#262626] rounded-lg p-3">
                                <p className="text-xs text-zinc-500 mb-1">X (Draw)</p>
                                <p className="text-xl font-bold text-zinc-300">{detail.odds.draw.toFixed(2)}</p>
                              </div>
                              <div className="bg-[#262626] rounded-lg p-3">
                                <p className="text-xs text-zinc-500 mb-1">2 (Away)</p>
                                <p className="text-xl font-bold text-blue-400">{detail.odds.away.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Venue & Referee */}
                        <div className="text-xs text-zinc-600 flex justify-between">
                          <span>{detail.venue?.name}, {detail.venue?.city}</span>
                          <span>Ref: {detail.referee || 'TBD'}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-4">Failed to load match details</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
