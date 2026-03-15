"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

interface LiveMatch {
  id: number;
  league: string;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  homeGoals: number;
  awayGoals: number;
  elapsed: number;
  status: string;
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
            <p className="text-zinc-500">Loading real-time data from API-Football...</p>
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
            Real-time scores from API-Football
            {matches.length > 0 && ` • Last update: ${lastUpdate.toLocaleTimeString()}`}
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
            {matches.length} Matches Live
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {matches.map((match) => (
            <Card key={match.id} className="glass border-0 overflow-hidden">
              {/* Header */}
              <CardHeader className="pb-3 border-b border-[#262626]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                {/* Score */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 text-center">
                    <img src={match.homeLogo} alt={match.homeTeam} className="w-12 h-12 mx-auto mb-2 object-contain" />
                    <p className="text-lg font-bold text-zinc-100">{match.homeTeam}</p>
                    <p className="text-xs text-zinc-500">Home</p>
                  </div>
                  <div className="px-6 py-2 bg-[#1a1a1a] rounded-lg">
                    <p className="text-3xl font-bold text-gold">
                      {match.homeGoals} - {match.awayGoals}
                    </p>
                  </div>
                  <div className="flex-1 text-center">
                    <img src={match.awayLogo} alt={match.awayTeam} className="w-12 h-12 mx-auto mb-2 object-contain" />
                    <p className="text-lg font-bold text-zinc-100">{match.awayTeam}</p>
                    <p className="text-xs text-zinc-500">Away</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
