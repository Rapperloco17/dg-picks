import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Users, Calendar, TrendingUp, RefreshCw } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

// Función para obtener liga y standings desde la base de datos
async function getLeagueWithStandings(leagueId: number) {
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) return null;

    const standings = await prisma.standing.findMany({
      where: { 
        leagueId: leagueId,
        season: league.season,
      },
      include: {
        team: true,
      },
      orderBy: {
        rank: 'asc',
      },
    });

    return { league, standings };
  } catch (error) {
    console.error('Error fetching league:', error);
    return null;
  }
}

function getFlag(country: string) {
  const flags: Record<string, string> = {
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Germany': '🇩🇪',
    'France': '🇫🇷', 'Netherlands': '🇳🇱', 'Portugal': '🇵🇹', 'Europe': '🇪🇺',
  };
  return flags[country] || '🏆';
}

function getFormColor(result: string) {
  switch (result) {
    case "W": return "bg-green-500/20 text-green-500";
    case "D": return "bg-zinc-500/20 text-zinc-400";
    case "L": return "bg-red-500/20 text-red-500";
    default: return "bg-zinc-500/20 text-zinc-400";
  }
}

function getRankStyle(rank: number, totalTeams: number) {
  if (rank === 1) return "text-amber-500 font-bold";
  if (rank <= 4) return "text-blue-400";
  if (rank === 5) return "text-orange-400";
  if (rank > totalTeams - 3) return "text-red-400";
  return "text-zinc-300";
}

interface LeaguePageProps {
  params: Promise<{ id: string }>;
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const { id } = await params;
  const leagueId = parseInt(id);
  
  if (isNaN(leagueId)) {
    notFound();
  }

  const data = await getLeagueWithStandings(leagueId);

  if (!data) {
    notFound();
  }

  const { league, standings } = data;

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
            <div className="text-6xl">{getFlag(league.country)}</div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-100">{league.name}</h2>
              <p className="text-zinc-500">{league.country} • Season {league.season}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <form action="/api/sync-standings" method="POST">
              <button 
                type="submit"
                className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Sync Standings
              </button>
            </form>
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
              {standings.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-500 mb-4">No standings data available.</p>
                  <form action="/api/sync-standings" method="POST">
                    <button 
                      type="submit"
                      className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
                    >
                      🚀 Sync Standings Now
                    </button>
                  </form>
                </div>
              ) : (
                <>
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
                        {standings.map((standing) => (
                          <tr 
                            key={standing.id} 
                            className="border-b border-[#262626] hover:bg-[#1a1a1a] transition-colors"
                          >
                            <td className={`px-4 py-3 ${getRankStyle(standing.rank, standings.length)}`}>
                              {standing.rank}
                            </td>
                            <td className="px-4 py-3">
                              <Link href={`/teams/${standing.team.id}`} className="font-medium text-zinc-100 hover:text-amber-500 transition-colors">
                                {standing.team.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-center text-zinc-400">{standing.played}</td>
                            <td className="px-4 py-3 text-center text-green-400">{standing.won}</td>
                            <td className="px-4 py-3 text-center text-zinc-400">{standing.drawn}</td>
                            <td className="px-4 py-3 text-center text-red-400">{standing.lost}</td>
                            <td className="px-4 py-3 text-center text-zinc-400">{standing.goalsFor}</td>
                            <td className="px-4 py-3 text-center text-zinc-400">{standing.goalsAgainst}</td>
                            <td className="px-4 py-3 text-center text-zinc-300">
                              {standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-1">
                                {standing.form?.split("").map((result, i) => (
                                  <span 
                                    key={i} 
                                    className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${getFormColor(result)}`}
                                  >
                                    {result}
                                  </span>
                                )) || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-amber-500 text-lg">
                              {standing.points}
                            </td>
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
                </>
              )}
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
