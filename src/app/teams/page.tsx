"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Team {
  id: number;
  name: string;
  country: string | null;
  logo: string | null;
  form: string | null;
  played: number;
  points: number;
}

function getFormColor(result: string) {
  switch (result) {
    case "W": return "bg-green-500/20 text-green-500";
    case "D": return "bg-zinc-500/20 text-zinc-400";
    case "L": return "bg-red-500/20 text-red-500";
    default: return "bg-zinc-500/20 text-zinc-400";
  }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      const data = await response.json();
      
      if (data.success) {
        setTeams(data.teams);
      } else {
        setError(data.error || 'Failed to fetch teams');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const topFormTeams = teams
    .filter(t => t.form && t.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Teams</h2>
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
        <h2 className="text-2xl font-bold text-zinc-100">Teams</h2>
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-100">Teams</h2>
        <Card className="glass border-0">
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">No teams found</h3>
            <p className="text-zinc-500 mb-4">Sync standings first to populate teams data.</p>
            <form action="/api/sync-standings" method="POST">
              <button 
                type="submit"
                className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
              >
                🚀 Sync Standings
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
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Teams
          </h2>
          <p className="text-zinc-500">{teams.length} teams in database</p>
        </div>
        <button 
          onClick={fetchTeams}
          className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {teams.slice(0, 20).map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="card-hover glass border-0 cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-2xl">
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="w-8 h-8 object-contain" />
                    ) : (
                      team.name.charAt(0)
                    )}
                  </div>
                  <div className="flex gap-1">
                    {team.form?.split("").slice(0, 5).map((result, i) => (
                      <span 
                        key={i} 
                        className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${getFormColor(result)}`}
                      >
                        {result}
                      </span>
                    )) || <span className="text-xs text-zinc-500">No form</span>}
                  </div>
                </div>
                <h4 className="font-semibold text-zinc-100">{team.name}</h4>
                <p className="text-sm text-zinc-500">{team.country || 'Unknown'}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#262626]">
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <TrendingUp className="w-3 h-3" />
                    {team.points} pts
                  </div>
                  <div className="text-xs text-zinc-400">
                    {team.played} matches
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Top Form Teams */}
      {topFormTeams.length > 0 && (
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Top Form Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topFormTeams.map((team, i) => (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="font-medium text-zinc-100">{team.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {team.form?.split("").map((result, j) => (
                        <span 
                          key={j} 
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${getFormColor(result)}`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                    <span className="text-amber-500 font-bold">{team.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
