"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Users, Calendar, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Mock standings data - esto vendría de la API
const mockStandings = [
  { rank: 1, team: "Liverpool", played: 28, won: 20, drawn: 7, lost: 1, gf: 67, ga: 26, gd: 41, points: 67, form: "WWWDW" },
  { rank: 2, team: "Arsenal", played: 28, won: 20, drawn: 4, lost: 4, gf: 62, ga: 24, gd: 38, points: 64, form: "WDWWW" },
  { rank: 3, team: "Man City", played: 28, won: 16, drawn: 6, lost: 6, gf: 56, ga: 32, gd: 24, points: 54, form: "WDLWW" },
  { rank: 4, team: "Nottingham Forest", played: 28, won: 15, drawn: 6, lost: 7, gf: 45, ga: 33, gd: 12, points: 51, form: "LWWDL" },
  { rank: 5, team: "Chelsea", played: 28, won: 13, drawn: 7, lost: 8, gf: 49, ga: 36, gd: 13, points: 46, form: "WDWLW" },
  { rank: 6, team: "Newcastle", played: 28, won: 13, drawn: 6, lost: 9, gf: 47, ga: 37, gd: 10, points: 45, form: "WWLWD" },
  { rank: 7, team: "Brighton", played: 28, won: 12, drawn: 9, lost: 7, gf: 44, ga: 38, gd: 6, points: 45, form: "DWWDW" },
  { rank: 8, team: "Fulham", played: 28, won: 11, drawn: 9, lost: 8, gf: 38, ga: 35, gd: 3, points: 42, form: "DLWWD" },
  { rank: 9, team: "Aston Villa", played: 28, won: 11, drawn: 8, lost: 9, gf: 39, ga: 40, gd: -1, points: 41, form: "WDLWD" },
  { rank: 10, team: "Bournemouth", played: 28, won: 11, drawn: 7, lost: 10, gf: 42, ga: 38, gd: 4, points: 40, form: "LWWDL" },
];

const leagueInfo = {
  39: { name: "Premier League", country: "England", season: "2024/25", teams: 20, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  140: { name: "La Liga", country: "Spain", season: "2024/25", teams: 20, flag: "🇪🇸" },
  135: { name: "Serie A", country: "Italy", season: "2024/25", teams: 20, flag: "🇮🇹" },
  78: { name: "Bundesliga", country: "Germany", season: "2024/25", teams: 18, flag: "🇩🇪" },
  61: { name: "Ligue 1", country: "France", season: "2024/25", teams: 18, flag: "🇫🇷" },
};

function getFormColor(result: string) {
  switch (result) {
    case "W": return "bg-green-500/20 text-green-500";
    case "D": return "bg-zinc-500/20 text-zinc-400";
    case "L": return "bg-red-500/20 text-red-500";
    default: return "bg-zinc-500/20 text-zinc-400";
  }
}

function getRankStyle(rank: number) {
  if (rank === 1) return "text-amber-500 font-bold";
  if (rank <= 4) return "text-blue-400";
  if (rank === 5) return "text-orange-400";
  if (rank >= 18) return "text-red-400";
  return "text-zinc-300";
}

export default function LeaguePage() {
  const params = useParams();
  const leagueId = Number(params.id);
  const info = leagueInfo[leagueId as keyof typeof leagueInfo] || { name: "League", country: "", season: "2024/25", teams: 20, flag: "🏆" };

  return (
    <div className="space-y-6">
      {/* Back & Header */}
      <div>
        <Link href="/leagues" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Leagues
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="text-6xl">{info.flag}</div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-100">{info.name}</h2>
              <p className="text-zinc-500">{info.country} • {info.season} • {info.teams} teams</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors">
              View Matches
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="standings" className="w-full">
        <TabsList className="bg-[#141414] border border-[#262626]">
          <TabsTrigger value="standings" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <Trophy className="w-4 h-4 mr-2" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="matches" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <Calendar className="w-4 h-4 mr-2" />
            Matches
          </TabsTrigger>
          <TabsTrigger value="teams" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <Users className="w-4 h-4 mr-2" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <TrendingUp className="w-4 h-4 mr-2" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="mt-6">
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-zinc-100">League Table</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#262626] text-xs text-zinc-500 uppercase">
                      <th className="px-4 py-3 text-left w-12">#</th>
                      <th className="px-4 py-3 text-left">Team</th>
                      <th className="px-4 py-3 text-center">P</th>
                      <th className="px-4 py-3 text-center">W</th>
                      <th className="px-4 py-3 text-center">D</th>
                      <th className="px-4 py-3 text-center">L</th>
                      <th className="px-4 py-3 text-center">GF</th>
                      <th className="px-4 py-3 text-center">GA</th>
                      <th className="px-4 py-3 text-center">GD</th>
                      <th className="px-4 py-3 text-center">Form</th>
                      <th className="px-4 py-3 text-center font-bold text-amber-500">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockStandings.map((team) => (
                      <tr 
                        key={team.rank} 
                        className="border-b border-[#262626] hover:bg-[#1a1a1a] transition-colors"
                      >
                        <td className={`px-4 py-3 ${getRankStyle(team.rank)}`}>{team.rank}</td>
                        <td className="px-4 py-3">
                          <Link href={`/teams/${team.team}`} className="font-medium text-zinc-100 hover:text-amber-500 transition-colors">
                            {team.team}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-400">{team.played}</td>
                        <td className="px-4 py-3 text-center text-green-400">{team.won}</td>
                        <td className="px-4 py-3 text-center text-zinc-400">{team.drawn}</td>
                        <td className="px-4 py-3 text-center text-red-400">{team.lost}</td>
                        <td className="px-4 py-3 text-center text-zinc-400">{team.gf}</td>
                        <td className="px-4 py-3 text-center text-zinc-400">{team.ga}</td>
                        <td className="px-4 py-3 text-center text-zinc-300">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            {team.form.split("").map((result, i) => (
                              <span 
                                key={i} 
                                className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${getFormColor(result)}`}
                              >
                                {result}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-amber-500 text-lg">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Legend */}
              <div className="flex gap-6 p-4 border-t border-[#262626] text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-500/20" />
                  <span className="text-zinc-400">Champions League</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-400/20" />
                  <span className="text-zinc-400">Europa League</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-400/20" />
                  <span className="text-zinc-400">Relegation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <Card className="glass border-0">
            <CardContent className="p-8 text-center">
              <p className="text-zinc-500">Matches will appear here when connected to the database.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <Card className="glass border-0">
            <CardContent className="p-8 text-center">
              <p className="text-zinc-500">Team profiles will appear here when connected to the database.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <Card className="glass border-0">
            <CardContent className="p-8 text-center">
              <p className="text-zinc-500">League statistics will appear here when connected to the database.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
