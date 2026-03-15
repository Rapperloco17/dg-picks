"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, RefreshCw, Target, Activity, Square, Flag, Triangle } from "lucide-react";
import { useState, useEffect } from "react";

interface LiveMatch {
  id: number;
  league: string;
  leagueLogo: string;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  homeGoals: number;
  awayGoals: number;
  elapsed: number;
  status: string;
  // Stats
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeCorners: number;
  awayCorners: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homeFouls: number;
  awayFouls: number;
  // Odds
  odds: { home: number; draw: number; away: number } | null;
}

export default function LivePage() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchLiveMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/live-matches');
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.matches);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch matches');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLiveMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  function formatElapsed(minutes: number) {
    return `${minutes}'`;
  }

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
          {matches.map((match) => (
            <Card key={match.id} className="glass border-0 overflow-hidden">
              {/* Header */}
              <CardHeader className="pb-3 border-b border-[#262626]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {match.leagueLogo && (
                      <img src={match.leagueLogo} alt={match.league} className="w-5 h-5 object-contain" />
                    )}
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                      {match.league}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-red-500">
                    <div className="w-2 h-2 rounded-full bg-red-500 live-indicator" />
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatElapsed(match.elapsed)}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {/* Teams & Score */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1 text-center">
                    <img src={match.homeLogo} alt={match.homeTeam} className="w-16 h-16 mx-auto mb-2 object-contain" />
                    <p className="text-lg font-bold text-zinc-100">{match.homeTeam}</p>
                    <p className="text-xs text-zinc-500">Home</p>
                  </div>
                  <div className="px-8 py-3 bg-[#1a1a1a] rounded-xl">
                    <p className="text-4xl font-bold text-gold">
                      {match.homeGoals} - {match.awayGoals}
                    </p>
                  </div>
                  <div className="flex-1 text-center">
                    <img src={match.awayLogo} alt={match.awayTeam} className="w-16 h-16 mx-auto mb-2 object-contain" />
                    <p className="text-lg font-bold text-zinc-100">{match.awayTeam}</p>
                    <p className="text-xs text-zinc-500">Away</p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {/* Possession */}
                  <div className="bg-[#1a1a1a] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                      <Activity className="w-3 h-3" />
                      Possession
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-500 font-bold">{match.homePossession}%</span>
                      <div className="flex-1 mx-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${match.homePossession}%` }}
                        />
                      </div>
                      <span className="text-zinc-400">{match.awayPossession}%</span>
                    </div>
                  </div>

                  {/* Shots */}
                  <div className="bg-[#1a1a1a] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                      <Target className="w-3 h-3" />
                      Shots (On Target)
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-100">{match.homeShots} ({match.homeShotsOnTarget})</span>
                      <span className="text-zinc-400">{match.awayShots} ({match.awayShotsOnTarget})</span>
                    </div>
                  </div>

                  {/* Corners */}
                  <div className="bg-[#1a1a1a] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                      <Square className="w-3 h-3 rotate-45" />
                      Corners
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-100">{match.homeCorners}</span>
                      <span className="text-zinc-400">{match.awayCorners}</span>
                    </div>
                  </div>

                  {/* Fouls */}
                  <div className="bg-[#1a1a1a] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs">
                      <Triangle className="w-3 h-3" />
                      Fouls
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-100">{match.homeFouls}</span>
                      <span className="text-zinc-400">{match.awayFouls}</span>
                    </div>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex justify-center gap-8 py-3 border-t border-[#262626]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
                      <span className="text-zinc-100 text-sm">{match.homeYellowCards}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-4 bg-red-500 rounded-sm" />
                      <span className="text-zinc-100 text-sm">{match.homeRedCards}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
                      <span className="text-zinc-100 text-sm">{match.awayYellowCards}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-4 bg-red-500 rounded-sm" />
                      <span className="text-zinc-100 text-sm">{match.awayRedCards}</span>
                    </div>
                  </div>
                </div>

                {/* Odds */}
                {match.odds && match.odds.home > 0 && (
                  <div className="border-t border-[#262626] pt-3 mt-3">
                    <div className="flex justify-center gap-6 text-sm">
                      <div className="text-center">
                        <span className="text-zinc-500 text-xs">1</span>
                        <p className="text-amber-500 font-bold">{match.odds.home.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-zinc-500 text-xs">X</span>
                        <p className="text-zinc-300 font-bold">{match.odds.draw.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-zinc-500 text-xs">2</span>
                        <p className="text-zinc-300 font-bold">{match.odds.away.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
