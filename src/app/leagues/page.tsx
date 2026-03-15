"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Trophy, RefreshCw, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface League {
  id: number;
  name: string;
  country: string;
  logo: string | null;
  flag: string | null;
  season: number;
  tier: number;
}

// Top leagues por importancia (IDs de API-Football)
const TOP_LEAGUE_IDS = [39, 140, 135, 78, 61, 128, 262, 88, 94, 2];

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leagues/available');
      const data = await response.json();
      
      if (data.success) {
        setLeagues(data.leagues);
      } else {
        setError(data.error || 'Failed to fetch leagues');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  // Separar ligas por tier
  const tier1Leagues = leagues.filter(l => l.tier === 1).sort((a, b) => {
    // Premier League primero, luego La Liga, Serie A, etc
    const orderA = TOP_LEAGUE_IDS.indexOf(a.id);
    const orderB = TOP_LEAGUE_IDS.indexOf(b.id);
    if (orderA !== -1 && orderB !== -1) return orderA - orderB;
    if (orderA !== -1) return -1;
    if (orderB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
  
  const tier2Leagues = leagues.filter(l => l.tier === 2).sort((a, b) => a.name.localeCompare(b.name));
  const tier3Leagues = leagues.filter(l => l.tier === 3).sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Leagues</h2>
            <p className="text-zinc-500">Loading top leagues...</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-100">Leagues</h2>
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-100">Leagues</h2>
        <Card className="glass border-0">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">No leagues found</h3>
            <p className="text-zinc-500 mb-4">Sync leagues from API-Football first.</p>
            <form action="/api/sync-leagues" method="POST">
              <button 
                type="submit"
                className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
              >
                🚀 Sync Leagues
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Top Leagues</h2>
          <p className="text-zinc-500">
            {tier1Leagues.length} Tier 1 • {tier2Leagues.length} Tier 2 • {tier3Leagues.length} Tier 3
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchLeagues}
            className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <form action="/api/sync-leagues" method="POST">
            <button 
              type="submit"
              className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors text-sm"
            >
              Sync Leagues
            </button>
          </form>
        </div>
      </div>

      {/* TIER 1 - TOP LEAGUES */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-zinc-100">Elite Leagues</h3>
          <Badge className="bg-amber-500/20 text-amber-400 border-0">Tier 1</Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {tier1Leagues.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="card-hover glass border-0 cursor-pointer h-full overflow-hidden group">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-3">
                    {league.logo ? (
                      <img 
                        src={league.logo} 
                        alt={league.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 object-contain group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <h4 className="font-semibold text-zinc-100 text-sm sm:text-base line-clamp-1">{league.name}</h4>
                  <p className="text-xs sm:text-sm text-zinc-500">{league.country}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px] bg-[#262626]">
                      Season {league.season}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* TIER 2 - SECONDARY LEAGUES */}
      {tier2Leagues.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-zinc-100">Secondary Leagues</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-0">Tier 2</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tier2Leagues.map((league) => (
              <Link key={league.id} href={`/leagues/${league.id}`}>
                <Card className="card-hover glass border-0 cursor-pointer h-full group">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {league.logo ? (
                        <img 
                          src={league.logo} 
                          alt=""
                          className="w-8 h-8 object-contain group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-blue-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-zinc-100 text-sm truncate">{league.name}</h4>
                        <p className="text-xs text-zinc-500">{league.country}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TIER 3 - OTHERS (Collapsible) */}
      {tier3Leagues.length > 0 && (
        <section className="pt-4 border-t border-[#262626]">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer list-none">
              <h3 className="text-base font-medium text-zinc-400">Other Leagues ({tier3Leagues.length})</h3>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              {tier3Leagues.map((league) => (
                <Link key={league.id} href={`/leagues/${league.id}`}>
                  <Card className="glass border-0 cursor-pointer h-full hover:bg-[#1a1a1a]">
                    <CardContent className="p-2">
                      <div className="flex items-center gap-2">
                        {league.logo && (
                          <img src={league.logo} alt="" className="w-6 h-6 object-contain" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-zinc-300 text-xs truncate">{league.name}</h4>
                          <p className="text-[10px] text-zinc-600">{league.country}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
