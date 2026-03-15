"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, History, TrendingUp, Trophy, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Team {
  id: number;
  name: string;
  logo: string | null;
  country: string;
}

interface Match {
  id: number;
  date: string;
  league: string;
  leagueId: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  elapsed: number | null;
}

export default function TeamPage() {
  const params = useParams();
  const teamId = params.id as string;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch team info y partidos desde el API
      const response = await fetch(`/api/teams?id=${teamId}`);
      const data = await response.json();
      
      if (data.success) {
        setTeam(data.team);
        // Los partidos vendrían del mismo endpoint o de otro
        // Por ahora simulamos la estructura
      }
      
      // Fetch partidos del equipo
      const matchesResponse = await fetch(`/api/fixtures/by-date?team=${teamId}`);
      const matchesData = await matchesResponse.json();
      
      if (matchesData.success) {
        const allMatches = matchesData.matches || [];
        const now = new Date();
        
        // Separar próximos y recientes
        const upcoming = allMatches.filter((m: Match) => 
          new Date(m.date) > now && ['NS', 'TBD', 'SCHEDULED'].includes(m.status)
        ).slice(0, 5);
        
        const recent = allMatches.filter((m: Match) => 
          ['FT', 'AET', 'PEN'].includes(m.status) || new Date(m.date) < now
        ).slice(0, 5);
        
        setUpcomingMatches(upcoming);
        setRecentMatches(recent);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  const getMatchResult = (match: Match, teamId: number) => {
    if (!match.homeGoals || !match.awayGoals) return null;
    
    const isHome = match.homeTeamId === teamId;
    const teamGoals = isHome ? match.homeGoals : match.awayGoals;
    const opponentGoals = isHome ? match.awayGoals : match.homeGoals;
    
    if (teamGoals > opponentGoals) return { result: 'W', color: 'bg-green-500/20 text-green-400' };
    if (teamGoals < opponentGoals) return { result: 'L', color: 'bg-red-500/20 text-red-400' };
    return { result: 'D', color: 'bg-zinc-500/20 text-zinc-400' };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/teams" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/leagues" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="w-4 h-4" />
        Back to Leagues
      </Link>

      {/* Team Header */}
      <div className="flex items-center gap-4">
        {team?.logo ? (
          <img src={team.logo} alt={team?.name} className="w-16 h-16 object-contain" />
        ) : (
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
        )}
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">{team?.name || `Team ${teamId}`}</h2>
          <p className="text-zinc-500">{team?.country}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{recentMatches.filter(m => getMatchResult(m, Number(teamId))?.result === 'W').length}</p>
            <p className="text-xs text-zinc-500">Wins</p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-400">{recentMatches.filter(m => getMatchResult(m, Number(teamId))?.result === 'D').length}</p>
            <p className="text-xs text-zinc-500">Draws</p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{recentMatches.filter(m => getMatchResult(m, Number(teamId))?.result === 'L').length}</p>
            <p className="text-xs text-zinc-500">Losses</p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{recentMatches.length}</p>
            <p className="text-xs text-zinc-500">Played</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="bg-[#141414] border border-[#262626]">
          <TabsTrigger value="recent" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <History className="w-4 h-4 mr-2" />
            Recent Matches
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <Calendar className="w-4 h-4 mr-2" />
            Upcoming
          </TabsTrigger>
        </TabsList>

        {/* Recent Matches */}
        <TabsContent value="recent" className="mt-6">
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                Last 5 Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentMatches.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-500">No recent matches found.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#262626]">
                  {recentMatches.map((match) => {
                    const result = getMatchResult(match, Number(teamId));
                    const isHome = match.homeTeamId === Number(teamId);
                    
                    return (
                      <Link 
                        key={match.id} 
                        href={`/match/${match.id}`}
                        className="flex items-center p-4 hover:bg-[#1a1a1a] transition-colors"
                      >
                        {/* Date */}
                        <div className="w-24 shrink-0">
                          <p className="text-sm text-zinc-400">{formatDate(match.date)}</p>
                        </div>
                        
                        {/* Result Badge */}
                        {result && (
                          <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm mr-4 ${result.color}`}>
                            {result.result}
                          </div>
                        )}
                        
                        {/* Match Info */}
                        <div className="flex-1">
                          <p className="text-xs text-zinc-500 mb-1">{match.league}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${isHome ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                              {match.homeTeam}
                            </span>
                            <span className="text-zinc-600">vs</span>
                            <span className={`text-sm ${!isHome ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                              {match.awayTeam}
                            </span>
                          </div>
                        </div>
                        
                        {/* Score */}
                        <div className="text-right">
                          <p className="text-lg font-bold text-zinc-100">
                            {match.homeGoals} - {match.awayGoals}
                          </p>
                          <p className="text-xs text-zinc-500">FT</p>
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-zinc-600 ml-4" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Matches */}
        <TabsContent value="upcoming" className="mt-6">
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Next Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingMatches.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-500">No upcoming matches scheduled.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#262626]">
                  {upcomingMatches.map((match) => {
                    const isHome = match.homeTeamId === Number(teamId);
                    
                    return (
                      <Link 
                        key={match.id} 
                        href={`/match/${match.id}`}
                        className="flex items-center p-4 hover:bg-[#1a1a1a] transition-colors"
                      >
                        {/* Date */}
                        <div className="w-24 shrink-0">
                          <p className="text-sm text-zinc-100 font-medium">{formatDate(match.date)}</p>
                        </div>
                        
                        {/* Match Info */}
                        <div className="flex-1">
                          <p className="text-xs text-zinc-500 mb-1">{match.league}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${isHome ? 'text-amber-400 font-medium' : 'text-zinc-400'}`}>
                              {match.homeTeam}
                            </span>
                            <span className="text-zinc-600">vs</span>
                            <span className={`text-sm ${!isHome ? 'text-amber-400 font-medium' : 'text-zinc-400'}`}>
                              {match.awayTeam}
                            </span>
                          </div>
                          {isHome ? (
                            <Badge className="mt-2 bg-emerald-500/20 text-emerald-400 text-[10px]">Home</Badge>
                          ) : (
                            <Badge className="mt-2 bg-blue-500/20 text-blue-400 text-[10px]">Away</Badge>
                          )}
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
