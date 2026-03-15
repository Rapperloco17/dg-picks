"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Trophy, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface League {
  id: number;
  name: string;
  country: string;
  logo: string | null;
  flag: string | null;
  season: number;
}

// Mapeo de países a emojis de banderas
const countryFlags: Record<string, string> = {
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Germany': '🇩🇪',
  'France': '🇫🇷', 'Netherlands': '🇳🇱', 'Portugal': '🇵🇹', 'Europe': '🇪🇺',
  'Turkey': '🇹🇷', 'Belgium': '🇧🇪', 'Sweden': '🇸🇪', 'Norway': '🇳🇴',
  'Denmark': '🇩🇰', 'Poland': '🇵🇱', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Mexico': '🇲🇽', 'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'Colombia': '🇨🇴',
  'Chile': '🇨🇱', 'USA': '🇺🇸', 'Saudi Arabia': '🇸🇦',
};

function getFlag(country: string) {
  return countryFlags[country] || '🏆';
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leagues');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Leagues</h2>
            <p className="text-zinc-500">Loading...</p>
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

  // Separar ligas top (las 10 primeras) del resto
  const topLeaguesList = leagues.slice(0, 10);
  const otherLeagues = leagues.slice(10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Leagues</h2>
          <p className="text-zinc-500">{leagues.length} leagues available</p>
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

      {/* Top Leagues */}
      <section>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Top Leagues
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {topLeaguesList.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="card-hover glass border-0 cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="text-3xl">{getFlag(league.country)}</div>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h4 className="font-semibold text-zinc-100 mt-3 line-clamp-1">{league.name}</h4>
                  <p className="text-sm text-zinc-500">{league.country}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
                    <span>Season {league.season}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Other Leagues */}
      {otherLeagues.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Other Leagues</h3>
          <Card className="glass border-0">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {otherLeagues.map((league, i) => (
                  <Link 
                    key={league.id} 
                    href={`/leagues/${league.id}`}
                    className={`flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors ${
                      i !== otherLeagues.length - 1 ? "border-b border-[#262626]" : ""
                    } ${i % 3 !== 2 ? "lg:border-r border-[#262626]" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFlag(league.country)}</span>
                      <div>
                        <p className="font-medium text-zinc-100">{league.name}</p>
                        <p className="text-sm text-zinc-500">{league.country}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
