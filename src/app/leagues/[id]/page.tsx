"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Standing {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
  winRate: string;
  goalsPerGame: string;
  concededPerGame: string;
}

interface LeagueInfo {
  id: number;
  name: string;
  country: string;
  logo: string;
  season: number;
}

// Form indicator component
function FormIndicator({ form }: { form: string }) {
  const results = form?.slice(-5).split('') || [];
  
  return (
    <div className="flex gap-1">
      {results.map((result, idx) => (
        <div
          key={idx}
          className={cn(
            "w-5 h-5 rounded text-xs font-bold flex items-center justify-center",
            result === 'W' && "bg-emerald-500/20 text-emerald-400",
            result === 'D' && "bg-zinc-500/20 text-zinc-400",
            result === 'L' && "bg-red-500/20 text-red-400"
          )}
        >
          {result}
        </div>
      ))}
    </div>
  );
}

// Position indicator
function PositionIndicator({ rank }: { rank: number }) {
  let color = "bg-zinc-800 text-zinc-400";
  if (rank === 1) color = "bg-yellow-500/20 text-yellow-400";
  else if (rank <= 4) color = "bg-emerald-500/20 text-emerald-400";
  else if (rank >= 18) color = "bg-red-500/20 text-red-400";
  
  return (
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm", color)}>
      {rank}
    </div>
  );
}

export default function LeagueDetailPage() {
  const params = useParams();
  const leagueId = params.id as string;
  
  const [standings, setStandings] = useState<Standing[]>([]);
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"standings" | "fixtures" | "stats">("standings");

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const res = await fetch(`/api/standings?league=${leagueId}`);
        const data = await res.json();
        if (data.success) {
          setStandings(data.standings);
          setLeague(data.league);
        }
      } catch (error) {
        console.error("Error fetching standings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (leagueId) {
      fetchStandings();
    }
  }, [leagueId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* League Header */}
      {league && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <img src={league.logo} alt={league.name} className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-white">{league.name}</h1>
              <p className="text-zinc-500">{league.country} • Season {league.season}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {["standings", "fixtures", "stats"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 capitalize",
              activeTab === tab 
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Standings Table */}
      {activeTab === "standings" && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs text-zinc-500 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Team</div>
            <div className="col-span-1 text-center">P</div>
            <div className="col-span-1 text-center">W</div>
            <div className="col-span-1 text-center">D</div>
            <div className="col-span-1 text-center">L</div>
            <div className="col-span-1 text-center">GD</div>
            <div className="col-span-1 text-center">PTS</div>
            <div className="col-span-1 hidden lg:block">Form</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {standings.map((team) => (
              <a
                key={team.team.id}
                href={`/teams/${team.team.id}`}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
              >
                <div className="col-span-1">
                  <PositionIndicator rank={team.rank} />
                </div>
                <div className="col-span-4 flex items-center gap-3">
                  <img src={team.team.logo} alt="" className="w-8 h-8 object-contain" />
                  <span className="text-white font-medium truncate">{team.team.name}</span>
                </div>
                <div className="col-span-1 text-center text-zinc-400">{team.played}</div>
                <div className="col-span-1 text-center text-emerald-400">{team.won}</div>
                <div className="col-span-1 text-center text-zinc-400">{team.draw}</div>
                <div className="col-span-1 text-center text-red-400">{team.lost}</div>
                <div className="col-span-1 text-center text-white font-medium">
                  {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                </div>
                <div className="col-span-1 text-center text-white font-bold">{team.points}</div>
                <div className="col-span-1 hidden lg:block">
                  <FormIndicator form={team.form} />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {activeTab === "stats" && standings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Scorers */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Top Attacking Teams</h3>
            <div className="space-y-3">
              {[...standings]
                .sort((a, b) => b.goalsFor - a.goalsFor)
                .slice(0, 5)
                .map((team) => (
                  <div key={team.team.id} className="flex items-center gap-3">
                    <img src={team.team.logo} alt="" className="w-6 h-6 object-contain" />
                    <span className="text-white flex-1">{team.team.name}</span>
                    <span className="text-emerald-400 font-bold">{team.goalsFor} goals</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Best Defense */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Best Defense</h3>
            <div className="space-y-3">
              {[...standings]
                .sort((a, b) => a.goalsAgainst - b.goalsAgainst)
                .slice(0, 5)
                .map((team) => (
                  <div key={team.team.id} className="flex items-center gap-3">
                    <img src={team.team.logo} alt="" className="w-6 h-6 object-contain" />
                    <span className="text-white flex-1">{team.team.name}</span>
                    <span className="text-blue-400 font-bold">{team.goalsAgainst} conceded</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Best Win Rate */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Best Win Rate</h3>
            <div className="space-y-3">
              {[...standings]
                .filter(t => t.played >= 5)
                .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
                .slice(0, 5)
                .map((team) => (
                  <div key={team.team.id} className="flex items-center gap-3">
                    <img src={team.team.logo} alt="" className="w-6 h-6 object-contain" />
                    <span className="text-white flex-1">{team.team.name}</span>
                    <span className="text-yellow-400 font-bold">{team.winRate}%</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Form Table */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Current Form</h3>
            <div className="space-y-3">
              {standings.slice(0, 5).map((team) => (
                <div key={team.team.id} className="flex items-center gap-3">
                  <img src={team.team.logo} alt="" className="w-6 h-6 object-contain" />
                  <span className="text-white flex-1">{team.team.name}</span>
                  <FormIndicator form={team.form} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
