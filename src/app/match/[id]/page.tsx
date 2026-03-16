"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface MatchData {
  fixture: any;
  statistics: any[];
  events: any[];
  lineups: any[];
  players: any[];
  headToHead: any[];
  standings: any[];
  predictions: any;
  odds: any;
}

// Tab Button Component
function TabButton({ 
  active, 
  label, 
  onClick 
}: { 
  active: boolean; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
        active 
          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
          : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );
}

// Stat Bar Component
function StatBar({ 
  label, 
  homeValue, 
  awayValue, 
  homeTotal = 100, 
  awayTotal = 100 
}: { 
  label: string; 
  homeValue: number; 
  awayValue: number;
  homeTotal?: number;
  awayTotal?: number;
}) {
  const homePercent = homeTotal > 0 ? (homeValue / homeTotal) * 100 : 50;
  const awayPercent = awayTotal > 0 ? (awayValue / awayTotal) * 100 : 50;
  const total = homeValue + awayValue;
  const homeWidth = total > 0 ? (homeValue / total) * 100 : 50;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-white font-medium">{homeValue}</span>
        <span className="text-zinc-500">{label}</span>
        <span className="text-white font-medium">{awayValue}</span>
      </div>
      <div className="flex h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="bg-blue-500 transition-all duration-500"
          style={{ width: `${homeWidth}%` }}
        />
        <div 
          className="bg-purple-500 transition-all duration-500"
          style={{ width: `${100 - homeWidth}%` }}
        />
      </div>
    </div>
  );
}

// Event Icon Component
function EventIcon({ type, detail }: { type: string; detail?: string }) {
  if (type === "Goal") {
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
        <span className="text-emerald-400 text-xs font-bold">⚽</span>
      </div>
    );
  }
  if (type === "Card") {
    const isRed = detail?.includes("Red");
    return (
      <div className={cn(
        "w-4 h-5 rounded-sm",
        isRed ? "bg-red-500" : "bg-yellow-500"
      )} />
    );
  }
  if (type === "subst") {
    return (
      <div className="flex flex-col items-center">
        <span className="text-emerald-400 text-xs">▲</span>
        <span className="text-red-400 text-xs">▼</span>
      </div>
    );
  }
  return null;
}

// Formation Display
function FormationDisplay({ formation, team }: { formation: string; team: "home" | "away" }) {
  if (!formation) return null;
  
  const positions = formation.split("-").map(Number);
  
  return (
    <div className={cn(
      "relative w-full max-w-[200px] mx-auto aspect-[3/4] bg-emerald-900/30 rounded-lg border border-emerald-500/20 p-4",
      team === "away" && "bg-purple-900/30 border-purple-500/20"
    )}>
      {/* Field lines */}
      <div className="absolute inset-x-4 top-4 h-px bg-white/20" />
      <div className="absolute inset-x-4 bottom-4 h-px bg-white/20" />
      <div className="absolute inset-y-4 left-4 w-px bg-white/20" />
      <div className="absolute inset-y-4 right-4 w-px bg-white/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />
      
      {/* Players */}
      <div className="relative h-full flex flex-col justify-between items-center py-2">
        {/* GK */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
          team === "home" ? "bg-emerald-500/80" : "bg-purple-500/80"
        )}>
          GK
        </div>
        
        {/* Other positions */}
        {positions.map((count, idx) => (
          <div key={idx} className="flex justify-center gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                  team === "home" ? "bg-emerald-500/80" : "bg-purple-500/80"
                )}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="text-center mt-2 text-sm text-zinc-400">{formation}</div>
    </div>
  );
}

// Player Rating Component
function PlayerRating({ player }: { player: any }) {
  const rating = parseFloat(player.statistics?.[0]?.games?.rating || 0);
  let color = "bg-zinc-600";
  if (rating >= 8) color = "bg-emerald-500";
  else if (rating >= 7) color = "bg-emerald-400";
  else if (rating >= 6) color = "bg-yellow-500";
  else if (rating > 0) color = "bg-red-500";
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm", color)}>
        {rating > 0 ? rating.toFixed(1) : "-"}
      </div>
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{player.player?.name}</p>
        <p className="text-zinc-500 text-xs">{player.statistics?.[0]?.games?.position || "-"}</p>
      </div>
    </div>
  );
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;
  
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "stats" | "lineups" | "h2h">("summary");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/fixtures/${matchId}/complete`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching match data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (matchId) {
      fetchData();
    }
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Match not found</p>
      </div>
    );
  }

  const { fixture, statistics, events, lineups, headToHead, predictions, odds } = data;
  const homeTeam = fixture.teams?.home;
  const awayTeam = fixture.teams?.away;
  const homeStats = statistics.find((s: any) => s.team.id === homeTeam?.id)?.statistics || [];
  const awayStats = statistics.find((s: any) => s.team.id === awayTeam?.id)?.statistics || [];

  const getStatValue = (stats: any[], type: string) => {
    const stat = stats.find((s: any) => s.type === type);
    return stat?.value || 0;
  };

  const isLive = fixture.fixture?.status?.short === "LIVE" || fixture.fixture?.status?.short === "IN_PLAY";

  return (
    <div className="space-y-6">
      {/* Header - Score */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {fixture.league?.logo && (
              <img src={fixture.league.logo} alt="" className="w-5 h-5 object-contain" />
            )}
            <span className="text-zinc-400 text-sm">{fixture.league?.name}</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            isLive ? "text-red-400" : "text-zinc-500"
          )}>
            {fixture.fixture?.status?.long}
            {isLive && <span className="ml-2">{fixture.fixture?.status?.elapsed}'</span>}
          </span>
        </div>

        <div className="flex items-center justify-center gap-8">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-3 flex-1">
            <img 
              src={homeTeam?.logo} 
              alt={homeTeam?.name}
              className="w-16 h-16 lg:w-20 lg:h-20 object-contain"
            />
            <h2 className="text-lg lg:text-xl font-bold text-white text-center">{homeTeam?.name}</h2>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="text-4xl lg:text-6xl font-bold text-white">
              {homeTeam?.goals ?? "-"} : {awayTeam?.goals ?? "-"}
            </div>
            <p className="text-zinc-500 text-sm mt-2">
              {new Date(fixture.fixture?.date).toLocaleDateString()}
            </p>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-3 flex-1">
            <img 
              src={awayTeam?.logo} 
              alt={awayTeam?.name}
              className="w-16 h-16 lg:w-20 lg:h-20 object-contain"
            />
            <h2 className="text-lg lg:text-xl font-bold text-white text-center">{awayTeam?.name}</h2>
          </div>
        </div>

        {/* Odds */}
        {odds?.bookmakers?.[0]?.bets?.[0]?.values && (
          <div className="flex justify-center gap-4 mt-6">
            {odds.bookmakers[0].bets[0].values.map((odd: any) => (
              <div key={odd.value} className="text-center">
                <p className="text-zinc-500 text-xs">{odd.value}</p>
                <p className="text-white font-bold">{odd.odd}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <TabButton active={activeTab === "summary"} label="Summary" onClick={() => setActiveTab("summary")} />
        <TabButton active={activeTab === "stats"} label="Statistics" onClick={() => setActiveTab("stats")} />
        <TabButton active={activeTab === "lineups"} label="Lineups" onClick={() => setActiveTab("lineups")} />
        <TabButton active={activeTab === "h2h"} label="H2H" onClick={() => setActiveTab("h2h")} />
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          {/* Events Timeline */}
          {events.length > 0 && (
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Match Events</h3>
              <div className="space-y-3">
                {events.map((event: any, idx: number) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex items-center gap-4",
                      event.team?.id === homeTeam?.id ? "flex-row" : "flex-row-reverse"
                    )}
                  >
                    <span className="text-zinc-500 text-sm w-8">{event.time?.elapsed}'</span>
                    <EventIcon type={event.type} detail={event.detail} />
                    <div className={cn(
                      "flex-1",
                      event.team?.id === homeTeam?.id ? "text-left" : "text-right"
                    )}>
                      <p className="text-white text-sm font-medium">{event.player?.name}</p>
                      {event.assist?.name && (
                        <p className="text-zinc-500 text-xs">Assist: {event.assist.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Statistics Preview */}
          {statistics.length > 0 && (
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Key Stats</h3>
              <div className="space-y-4">
                <StatBar 
                  label="Possession %"
                  homeValue={parseInt(getStatValue(homeStats, "Ball Possession")?.replace("%", "") || 0)}
                  awayValue={parseInt(getStatValue(awayStats, "Ball Possession")?.replace("%", "") || 0)}
                />
                <StatBar 
                  label="Total Shots"
                  homeValue={getStatValue(homeStats, "Total Shots")}
                  awayValue={getStatValue(awayStats, "Total Shots")}
                />
                <StatBar 
                  label="Shots on Goal"
                  homeValue={getStatValue(homeStats, "Shots on Goal")}
                  awayValue={getStatValue(awayStats, "Shots on Goal")}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && statistics.length > 0 && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Match Statistics</h3>
          <div className="space-y-4">
            {[
              "Ball Possession",
              "Total Shots",
              "Shots on Goal",
              "Shots off Goal",
              "Blocked Shots",
              "Total Passes",
              "Passes Accurate",
              "Fouls",
              "Corner Kicks",
              "Offsides",
              "Yellow Cards",
              "Red Cards",
              "Goalkeeper Saves",
            ].map((statType) => {
              const homeVal = getStatValue(homeStats, statType);
              const awayVal = getStatValue(awayStats, statType);
              if (!homeVal && !awayVal) return null;
              
              return (
                <StatBar 
                  key={statType}
                  label={statType}
                  homeValue={typeof homeVal === "string" ? parseInt(homeVal) || 0 : homeVal}
                  awayValue={typeof awayVal === "string" ? parseInt(awayVal) || 0 : awayVal}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Lineups Tab */}
      {activeTab === "lineups" && lineups.length > 0 && (
        <div className="space-y-4">
          {lineups.map((lineup: any) => (
            <div key={lineup.team?.id} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <img src={lineup.team?.logo} alt="" className="w-8 h-8 object-contain" />
                <h3 className="text-white font-semibold">{lineup.team?.name}</h3>
                <span className="text-zinc-500 text-sm">({lineup.formation})</span>
              </div>
              
              <div className="grid gap-2">
                {lineup.startXI?.map((player: any) => (
                  <div key={player.player?.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <span className="text-zinc-500 w-8">{player.player?.number}</span>
                    <span className="text-white flex-1">{player.player?.name}</span>
                    <span className="text-zinc-500 text-sm">{player.player?.pos}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* H2H Tab */}
      {activeTab === "h2h" && headToHead.length > 0 && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Head to Head (Last 10)</h3>
          <div className="space-y-3">
            {headToHead.map((match: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5">
                <span className="text-zinc-500 text-xs w-20">
                  {new Date(match.fixture?.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div className="flex-1 flex items-center justify-center gap-4">
                  <span className={cn(
                    "text-sm",
                    match.teams?.home?.winner ? "text-white font-medium" : "text-zinc-400"
                  )}>
                    {match.teams?.home?.name}
                  </span>
                  <span className="bg-zinc-800 px-3 py-1 rounded text-white font-bold">
                    {match.goals?.home} - {match.goals?.away}
                  </span>
                  <span className={cn(
                    "text-sm",
                    match.teams?.away?.winner ? "text-white font-medium" : "text-zinc-400"
                  )}>
                    {match.teams?.away?.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
