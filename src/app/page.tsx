"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, Activity, Target, Calendar, Zap, Filter,
  ChevronLeft, ChevronRight, Trophy, Clock, RefreshCw,
  Search, X, Globe, ChevronDown
} from "lucide-react";

// Date helpers
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const formatDisplayDate = (date: Date) => 
  date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

interface Match {
  id: number;
  league: string;
  leagueId: number;
  leagueLogo?: string;
  date: string;
  status: string;
  homeTeam: string;
  homeTeamId?: number;
  homeLogo?: string;
  awayTeam: string;
  awayTeamId?: number;
  awayLogo?: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

interface League {
  id: number;
  name: string;
  country: string;
  logo: string | null;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeagueFilter, setShowLeagueFilter] = useState(false);
  const [searchLeague, setSearchLeague] = useState('');

  // Fetch matches
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: formatDate(selectedDate),
        ...(selectedLeagues.length === 1 && { league: selectedLeagues[0].toString() }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const res = await fetch(`/api/fixtures/by-date?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setMatches(data.matches);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leagues
  const fetchLeagues = async () => {
    try {
      const res = await fetch('/api/leagues/available');
      const data = await res.json();
      if (data.success) {
        setLeagues(data.leagues);
      }
    } catch (err) {
      console.error('Error fetching leagues:', err);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [selectedDate, selectedLeagues, statusFilter]);

  useEffect(() => {
    fetchLeagues();
  }, []);

  // Date navigation
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => setSelectedDate(new Date());

  // League toggle
  const toggleLeague = (leagueId: number) => {
    setSelectedLeagues(prev => 
      prev.includes(leagueId)
        ? prev.filter(id => id !== leagueId)
        : [...prev, leagueId]
    );
  };

  const clearLeagueFilter = () => setSelectedLeagues([]);

  // Filter matches by selected leagues
  const filteredMatches = useMemo(() => {
    if (selectedLeagues.length === 0) return matches;
    return matches.filter(m => selectedLeagues.includes(m.leagueId));
  }, [matches, selectedLeagues]);

  // Group matches by league
  const matchesByLeague = useMemo(() => {
    const grouped = filteredMatches.reduce((acc: any, match) => {
      if (!acc[match.league]) {
        acc[match.league] = {
          leagueId: match.leagueId,
          leagueLogo: match.leagueLogo,
          matches: [],
        };
      }
      acc[match.league].matches.push(match);
      return acc;
    }, {});
    return grouped;
  }, [filteredMatches]);

  // Filtered leagues for search
  const filteredLeagues = useMemo(() => {
    return leagues.filter(l => 
      l.name.toLowerCase().includes(searchLeague.toLowerCase()) ||
      l.country.toLowerCase().includes(searchLeague.toLowerCase())
    );
  }, [leagues, searchLeague]);

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      'FT': { color: 'bg-zinc-500/20 text-zinc-400', text: 'Finished' },
      'AET': { color: 'bg-zinc-500/20 text-zinc-400', text: 'AET' },
      'PEN': { color: 'bg-zinc-500/20 text-zinc-400', text: 'Penalties' },
      '1H': { color: 'bg-red-500/20 text-red-400', text: '1st Half' },
      '2H': { color: 'bg-red-500/20 text-red-400', text: '2nd Half' },
      'HT': { color: 'bg-yellow-500/20 text-yellow-400', text: 'HT' },
      'ET': { color: 'bg-red-500/20 text-red-400', text: 'ET' },
      'P': { color: 'bg-red-500/20 text-red-400', text: 'Penalties' },
      'LIVE': { color: 'bg-red-500/20 text-red-400', text: 'LIVE' },
      'NS': { color: 'bg-blue-500/20 text-blue-400', text: 'Scheduled' },
      'TBD': { color: 'bg-zinc-500/20 text-zinc-500', text: 'TBD' },
      'SCHEDULED': { color: 'bg-blue-500/20 text-blue-400', text: 'Scheduled' },
      'POST': { color: 'bg-yellow-500/20 text-yellow-400', text: 'Postponed' },
      'CANC': { color: 'bg-red-500/20 text-red-400', text: 'Cancelled' },
    };
    const s = statusMap[status] || { color: 'bg-zinc-500/20 text-zinc-400', text: status };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.text}</span>;
  };

  // Check if date is today
  const isToday = formatDate(selectedDate) === formatDate(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Dashboard</h2>
          <p className="text-zinc-500">Browse matches by date and league</p>
        </div>
        
        {/* Refresh button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchMatches}
          disabled={loading}
          className="w-fit"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Date Navigation */}
      <Card className="glass border-0">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Date picker */}
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToPreviousDay}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="px-4 text-center min-w-[140px]">
                <p className="text-sm font-medium text-zinc-100">
                  {isToday ? 'Today' : formatDisplayDate(selectedDate)}
                </p>
                <p className="text-xs text-zinc-500">{formatDate(selectedDate)}</p>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToNextDay}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {!isToday && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToToday}
                className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Today
              </Button>
            )}

            <div className="flex-1" />

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="all">All Matches</option>
                <option value="live">Live Now</option>
                <option value="finished">Finished</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* League Filter */}
      <Card className="glass border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-zinc-100">Filter by League</span>
              {selectedLeagues.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                  {selectedLeagues.length} selected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedLeagues.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearLeagueFilter}
                  className="text-zinc-500 hover:text-zinc-100"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeagueFilter(!showLeagueFilter)}
              >
                {showLeagueFilter ? <ChevronDown className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {showLeagueFilter && (
            <div className="mt-3 pt-3 border-t border-[#262626]">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search leagues..."
                  value={searchLeague}
                  onChange={(e) => setSearchLeague(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Selected leagues pills */}
              {selectedLeagues.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedLeagues.map(id => {
                    const league = leagues.find(l => l.id === id);
                    return league ? (
                      <Badge 
                        key={id}
                        className="bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-pointer hover:bg-amber-500/30"
                        onClick={() => toggleLeague(id)}
                      >
                        {league.name}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* League grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                {filteredLeagues.map(league => (
                  <button
                    key={league.id}
                    onClick={() => toggleLeague(league.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                      selectedLeagues.includes(league.id)
                        ? 'bg-amber-500/20 border border-amber-500/30'
                        : 'bg-[#1a1a1a] border border-[#262626] hover:border-zinc-600'
                    }`}
                  >
                    {league.logo && (
                      <img src={league.logo} alt="" className="w-5 h-5 object-contain" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${
                        selectedLeagues.includes(league.id) ? 'text-amber-400' : 'text-zinc-300'
                      }`}>
                        {league.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{league.country}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matches List */}
      <div className="space-y-4">
        {/* Stats summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {filteredMatches.length} matches found
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Live
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Scheduled
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              Finished
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
          </div>
        )}

        {/* No matches */}
        {!loading && filteredMatches.length === 0 && (
          <Card className="glass border-0">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-500">No matches found</p>
              <p className="text-sm text-zinc-600 mt-2">
                Try changing the date or filters
              </p>
            </CardContent>
          </Card>
        )}

        {/* Matches by League */}
        {!loading && Object.entries(matchesByLeague).map(([leagueName, data]: [string, any]) => (
          <Card key={leagueName} className="glass border-0 overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#262626] bg-[#1a1a1a]/50">
              <div className="flex items-center gap-3">
                {data.leagueLogo && (
                  <img src={data.leagueLogo} alt="" className="w-6 h-6 object-contain" />
                )}
                <CardTitle className="text-base text-zinc-100">{leagueName}</CardTitle>
                <Badge variant="secondary" className="bg-[#262626] text-zinc-400">
                  {data.matches.length} matches
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#262626]">
                {data.matches.map((match: Match) => (
                  <a
                    key={match.id}
                    href={`/match/${match.id}`}
                    className="flex items-center p-4 hover:bg-[#1a1a1a] transition-colors group"
                  >
                    {/* Status/Time */}
                    <div className="w-24 shrink-0">
                      {['1H', '2H', 'ET', 'P', 'LIVE'].includes(match.status) ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-sm font-medium text-red-400">LIVE</span>
                        </div>
                      ) : ['FT', 'AET', 'PEN'].includes(match.status) ? (
                        <span className="text-xs text-zinc-500">Finished</span>
                      ) : (
                        <span className="text-sm text-zinc-400">
                          {new Date(match.date).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </span>
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {match.homeLogo && (
                          <img src={match.homeLogo} alt="" className="w-5 h-5 object-contain" />
                        )}
                        <span className={`truncate ${
                          match.homeGoals !== null && match.awayGoals !== null && match.homeGoals > match.awayGoals
                            ? 'text-zinc-100 font-medium'
                            : 'text-zinc-400'
                        }`}>
                          {match.homeTeam}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {match.awayLogo && (
                          <img src={match.awayLogo} alt="" className="w-5 h-5 object-contain" />
                        )}
                        <span className={`truncate ${
                          match.homeGoals !== null && match.awayGoals !== null && match.awayGoals > match.homeGoals
                            ? 'text-zinc-100 font-medium'
                            : 'text-zinc-400'
                        }`}>
                          {match.awayTeam}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="w-16 text-center shrink-0">
                      <div className={`text-lg font-bold ${
                        match.homeGoals !== null && match.awayGoals !== null && match.homeGoals > match.awayGoals
                          ? 'text-emerald-400'
                          : 'text-zinc-500'
                      }`}>
                        {match.homeGoals ?? '-'}
                      </div>
                      <div className={`text-lg font-bold ${
                        match.homeGoals !== null && match.awayGoals !== null && match.awayGoals > match.homeGoals
                          ? 'text-emerald-400'
                          : 'text-zinc-500'
                      }`}>
                        {match.awayGoals ?? '-'}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="w-24 shrink-0 text-right">
                      {getStatusBadge(match.status)}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
