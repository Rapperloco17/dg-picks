"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users, TrendingUp, Trophy } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

// Mock teams data
const topTeams = [
  { id: 1, name: "Liverpool", country: "England", league: "Premier League", form: "WWWDW", played: 28, points: 67 },
  { id: 2, name: "Real Madrid", country: "Spain", league: "La Liga", form: "WDWWW", played: 27, points: 60 },
  { id: 3, name: "Bayern Munich", country: "Germany", league: "Bundesliga", form: "WWWLW", played: 25, points: 62 },
  { id: 4, name: "Inter", country: "Italy", league: "Serie A", form: "WDWWW", played: 27, points: 61 },
  { id: 5, name: "PSG", country: "France", league: "Ligue 1", form: "WWWDW", played: 26, points: 65 },
  { id: 6, name: "Man City", country: "England", league: "Premier League", form: "WDLWW", played: 28, points: 54 },
  { id: 7, name: "Arsenal", country: "England", league: "Premier League", form: "WDWWW", played: 28, points: 64 },
  { id: 8, name: "Barcelona", country: "Spain", league: "La Liga", form: "LWWWD", played: 27, points: 58 },
];

function getFormColor(result: string) {
  switch (result) {
    case "W": return "bg-green-500/20 text-green-500";
    case "D": return "bg-zinc-500/20 text-zinc-400";
    case "L": return "bg-red-500/20 text-red-500";
    default: return "bg-zinc-500/20 text-zinc-400";
  }
}

export default function TeamsPage() {
  const [search, setSearch] = useState("");

  const filteredTeams = topTeams.filter(team =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.league.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Teams
          </h2>
          <p className="text-zinc-500">Browse team profiles and statistics</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#141414] border-[#262626] text-zinc-100"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTeams.map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="card-hover glass border-0 cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-2xl">
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex gap-1">
                    {team.form.split("").map((result, i) => (
                      <span 
                        key={i} 
                        className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${getFormColor(result)}`}
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                </div>
                <h4 className="font-semibold text-zinc-100">{team.name}</h4>
                <p className="text-sm text-zinc-500">{team.league}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#262626]">
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Trophy className="w-3 h-3" />
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

      {/* Stats Overview */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Top Form Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topTeams.slice(0, 5).map((team, i) => (
              <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <span className="font-medium text-zinc-100">{team.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {team.form.split("").map((result, j) => (
                      <span 
                        key={j} 
                        className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${getFormColor(result)}`}
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                  <span className="text-amber-500 font-bold">{team.form.replace(/[^W]/g, "").length * 3 + team.form.replace(/[^D]/g, "").length} pts</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
