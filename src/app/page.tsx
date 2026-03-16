"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

// Date helpers
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const formatDisplayDate = (date: Date) => 
  date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

interface Match {
  id: number;
  league: string;
  leagueId: number;
  leagueLogo?: string;
  country?: string;
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
  tier: number;
}

// Stat Card Component
function StatCard({ title, value, trend, trendUp, icon }: { 
  title: string; 
  value: string; 
  trend?: string; 
  trendUp?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:bg-zinc-900/60 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-zinc-500 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// Tier Badge Component
function TierBadge({ tier }: { tier: number }) {
  const colors = {
    1: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    2: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    3: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={cn(
      "text-xs font-medium px-2 py-0.5 rounded-full border",
      colors[tier as keyof typeof colors]
    )}>
      Tier {tier}
    </span>
  );
}

// Match Card Component
function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === 'LIVE' || match.status === 'IN_PLAY';
  const isFinished = match.status === 'FINISHED';
  
  return (
    <a 
      href={`/match/${match.id}`}
      className="block bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:bg-zinc-900/50 hover:border-white/10 transition-all duration-300 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {match.leagueLogo && (
            <img src={match.leagueLogo} alt="" className="w-5 h-5 object-contain" />
          )}
          <span className="text-xs text-zinc-500">{match.league}</span>
        </div>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-medium">LIVE</span>
          </span>
        )}
        {isFinished && <span className="text-xs text-zinc-600">FT</span>}
      </div>
      
      <div className="flex items-center justify-between">
        {/* Home Team */}
        <div className="flex items-center gap-3 flex-1">
          {match.homeLogo && (
            <img src={match.homeLogo} alt="" className="w-8 h-8 object-contain" />
          )}
          <span className={cn(
            "text-sm font-medium",
            isFinished && (match.homeGoals || 0) > (match.awayGoals || 0) ? "text-white" : "text-zinc-400"
          )}>
            {match.homeTeam}
          </span>
        </div>
        
        {/* Score */}
        <div className="px-4">
          <span className="text-xl font-bold text-white">
            {match.homeGoals ?? '-'} : {match.awayGoals ?? '-'}
          </span>
        </div>
        
        {/* Away Team */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className={cn(
            "text-sm font-medium text-right",
            isFinished && (match.awayGoals || 0) > (match.homeGoals || 0) ? "text-white" : "text-zinc-400"
          )}>
            {match.awayTeam}
          </span>
          {match.awayLogo && (
            <img src={match.awayLogo} alt="" className="w-8 h-8 object-contain" />
          )}
        </div>
      </div>
    </a>
  );
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTiers, setSelectedTiers] = useState<number[]>([1, 2]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch matches
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fixtures/by-date?date=${formatDate(selectedDate)}`);
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
  }, [selectedDate]);

  useEffect(() => {
    fetchLeagues();
  }, []);

  // Stats
  const stats = useMemo(() => {
    const live = matches.filter(m => m.status === 'LIVE' || m.status === 'IN_PLAY').length;
    const finished = matches.filter(m => m.status === 'FINISHED').length;
    const scheduled = matches.filter(m => m.status === 'SCHEDULED').length;
    return { live, finished, scheduled, total: matches.length };
  }, [matches]);

  // Filter matches by tier
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const league = leagues.find(l => l.id === m.leagueId);
      return league && selectedTiers.includes(league.tier);
    });
  }, [matches, leagues, selectedTiers]);

  // Group by league
  const matchesByLeague = useMemo(() => {
    const grouped: { [key: string]: { league: League; matches: Match[] } } = {};
    filteredMatches.forEach(match => {
      const league = leagues.find(l => l.id === match.leagueId);
      if (league) {
        const key = `${league.name}|${league.country}`;
        if (!grouped[key]) {
          grouped[key] = { league, matches: [] };
        }
        grouped[key].matches.push(match);
      }
    });
    return grouped;
  }, [filteredMatches, leagues]);

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

  const toggleTier = (tier: number) => {
    setSelectedTiers(prev => 
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Track matches and predictions</p>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center gap-2 bg-zinc-900/40 border border-white/5 rounded-xl p-1">
          <button onClick={goToPreviousDay} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            {formatDisplayDate(selectedDate)}
          </button>
          <button onClick={goToNextDay} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Matches" 
          value={stats.total.toString()} 
          trend="+12%"
          trendUp={true}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard 
          title="Live Now" 
          value={stats.live.toString()} 
          trend={stats.live > 0 ? "Active" : "None"}
          trendUp={stats.live > 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <StatCard 
          title="Finished" 
          value={stats.finished.toString()} 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        />
        <StatCard 
          title="Scheduled" 
          value={stats.scheduled.toString()} 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Tier Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500 mr-2">Filter by tier:</span>
        {[1, 2, 3].map(tier => (
          <button
            key={tier}
            onClick={() => toggleTier(tier)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border",
              selectedTiers.includes(tier)
                ? tier === 1 ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                  : tier === 2 ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                : "bg-transparent text-zinc-600 border-transparent hover:text-zinc-400"
            )}
          >
            Tier {tier}
          </button>
        ))}
      </div>

      {/* Matches Section */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : Object.keys(matchesByLeague).length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/20 border border-white/5 rounded-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-zinc-500">No matches found for this date</p>
          <button onClick={goToToday} className="mt-3 text-blue-400 hover:text-blue-300 text-sm font-medium">
            Go to today
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(matchesByLeague).map(([key, { league, matches }]) => (
            <div key={key} className="space-y-3">
              {/* League Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {league.logo && (
                    <img src={league.logo} alt="" className="w-6 h-6 object-contain" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-white">{league.name}</h3>
                    <p className="text-xs text-zinc-500">{league.country}</p>
                  </div>
                </div>
                <TierBadge tier={league.tier} />
              </div>
              
              {/* Matches */}
              <div className="space-y-2">
                {matches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
