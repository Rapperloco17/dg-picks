"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, TrendingUp, Target } from "lucide-react";
import { useState, useEffect } from "react";

// Mock live matches - esto vendría de API-Football en vivo
const mockLiveMatches = [
  {
    id: 1,
    league: "Premier League",
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    homeGoals: 2,
    awayGoals: 1,
    elapsed: 67,
    homePossession: 58,
    awayPossession: 42,
    homeShots: 12,
    awayShots: 8,
    homeCorners: 5,
    awayCorners: 3,
    homeYellowCards: 1,
    awayYellowCards: 2,
    prediction: { result: "Home Win", confidence: 68 },
    odds: { home: 1.65, draw: 3.80, away: 5.20 },
  },
  {
    id: 2,
    league: "La Liga",
    homeTeam: "Real Madrid",
    awayTeam: "Valencia",
    homeGoals: 0,
    awayGoals: 0,
    elapsed: 23,
    homePossession: 62,
    awayPossession: 38,
    homeShots: 4,
    awayShots: 1,
    homeCorners: 2,
    awayCorners: 0,
    homeYellowCards: 0,
    awayYellowCards: 1,
    prediction: { result: "Over 2.5", confidence: 75 },
    odds: { home: 1.35, draw: 5.00, away: 8.50 },
  },
  {
    id: 3,
    league: "Serie A",
    homeTeam: "Juventus",
    awayTeam: "Inter",
    homeGoals: 1,
    awayGoals: 1,
    elapsed: 78,
    homePossession: 45,
    awayPossession: 55,
    homeShots: 9,
    awayShots: 14,
    homeCorners: 4,
    awayCorners: 6,
    homeYellowCards: 3,
    awayYellowCards: 2,
    prediction: { result: "Draw", confidence: 45 },
    odds: { home: 2.90, draw: 3.20, away: 2.50 },
  },
];

function formatElapsed(minutes: number) {
  return `${minutes}'`;
}

export default function LivePage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-red-500 live-indicator" />
            Live Matches
          </h2>
          <p className="text-zinc-500">Real-time scores, stats & predictions</p>
        </div>
        <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
          {mockLiveMatches.length} Matches Live
        </Badge>
      </div>

      {/* Live Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockLiveMatches.map((match) => (
          <Card key={match.id} className="glass border-0 overflow-hidden">
            {/* Header */}
            <CardHeader className="pb-3 border-b border-[#262626]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                    {match.league}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-red-500">
                  <div className="w-2 h-2 rounded-full bg-red-500 live-indicator" />
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatElapsed(match.elapsed)}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {/* Score */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-zinc-100">{match.homeTeam}</p>
                  <p className="text-xs text-zinc-500">Home</p>
                </div>
                <div className="px-6 py-2 bg-[#1a1a1a] rounded-lg">
                  <p className="text-3xl font-bold text-gold">
                    {match.homeGoals} - {match.awayGoals}
                  </p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-zinc-100">{match.awayTeam}</p>
                  <p className="text-xs text-zinc-500">Away</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                <div className="bg-[#1a1a1a] rounded p-2 text-center">
                  <p className="text-zinc-500">Possession</p>
                  <div className="flex justify-center gap-2 mt-1">
                    <span className="text-amber-500 font-bold">{match.homePossession}%</span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-zinc-400">{match.awayPossession}%</span>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] rounded p-2 text-center">
                  <p className="text-zinc-500">Shots</p>
                  <div className="flex justify-center gap-2 mt-1">
                    <span className="text-zinc-100 font-bold">{match.homeShots}</span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-zinc-400">{match.awayShots}</span>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] rounded p-2 text-center">
                  <p className="text-zinc-500">Corners</p>
                  <div className="flex justify-center gap-2 mt-1">
                    <span className="text-zinc-100 font-bold">{match.homeCorners}</span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-zinc-400">{match.awayCorners}</span>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="flex justify-center gap-8 mb-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
                  <span className="text-zinc-100">{match.homeYellowCards}</span>
                  <div className="w-3 h-4 bg-red-500 rounded-sm ml-2" />
                  <span className="text-zinc-100">0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
                  <span className="text-zinc-100">{match.awayYellowCards}</span>
                  <div className="w-3 h-4 bg-red-500 rounded-sm ml-2" />
                  <span className="text-zinc-100">0</span>
                </div>
              </div>

              {/* ML Prediction */}
              <div className="border-t border-[#262626] pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-zinc-400">ML Prediction:</span>
                    <span className="text-sm font-medium text-amber-500">
                      {match.prediction.result}
                    </span>
                    <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                      {match.prediction.confidence}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-zinc-500">1: <span className="text-zinc-100">{match.odds.home}</span></span>
                    <span className="text-zinc-500">X: <span className="text-zinc-100">{match.odds.draw}</span></span>
                    <span className="text-zinc-500">2: <span className="text-zinc-100">{match.odds.away}</span></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon Banner */}
      <Card className="glass border-0 border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <TrendingUp className="w-8 h-8 text-amber-500" />
            <div>
              <p className="font-medium text-zinc-100">Live Odds & Predictions Coming Soon</p>
              <p className="text-sm text-zinc-500">
                We're integrating with API-Football to bring you real-time odds and ML predictions during matches.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
