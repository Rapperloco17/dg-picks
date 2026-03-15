"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Calendar, Filter } from "lucide-react";

// Mock predictions
const todayPredictions = [
  {
    id: 1,
    match: "Liverpool vs Chelsea",
    league: "Premier League",
    time: "20:00",
    prediction: "Over 2.5 Goals",
    confidence: 78,
    odds: 1.75,
    reasoning: "Liverpool avg 2.8 goals at home, Chelsea avg 1.9 away",
  },
  {
    id: 2,
    match: "Real Madrid vs Valencia",
    league: "La Liga",
    time: "21:00",
    prediction: "Home Win",
    confidence: 72,
    odds: 1.35,
    reasoning: "Real Madrid unbeaten in last 15 home games",
  },
  {
    id: 3,
    match: "Inter vs AC Milan",
    league: "Serie A",
    time: "19:45",
    prediction: "BTTS Yes",
    confidence: 81,
    odds: 1.65,
    reasoning: "Both teams scored in last 5 derbies",
  },
  {
    id: 4,
    match: "Bayern vs Dortmund",
    league: "Bundesliga",
    time: "18:30",
    prediction: "Over 3.5 Goals",
    confidence: 68,
    odds: 2.10,
    reasoning: "Classic high-scoring fixture, avg 4.2 goals",
  },
];

function getConfidenceColor(confidence: number) {
  if (confidence >= 75) return "bg-green-500/20 text-green-500 border-green-500/30";
  if (confidence >= 60) return "bg-amber-500/20 text-amber-500 border-amber-500/30";
  return "bg-red-500/20 text-red-500 border-red-500/30";
}

export default function PredictionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Target className="w-6 h-6 text-amber-500" />
            ML Predictions
          </h2>
          <p className="text-zinc-500">AI-powered betting predictions with confidence scores</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#262626] rounded-lg text-zinc-300 hover:bg-[#262626] transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-0">
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">Today's Predictions</p>
            <p className="text-2xl font-bold text-zinc-100">24</p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">High Confidence (75%+)</p>
            <p className="text-2xl font-bold text-green-500">8</p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">Yesterday's Accuracy</p>
            <p className="text-2xl font-bold text-amber-500">62%</p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">Avg Odds</p>
            <p className="text-2xl font-bold text-zinc-100">1.85</p>
          </CardContent>
        </Card>
      </div>

      {/* Predictions List */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            Today's Top Picks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayPredictions.map((pred) => (
              <div
                key={pred.id}
                className="p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 mb-2">
                      {pred.league}
                    </Badge>
                    <h3 className="text-lg font-semibold text-zinc-100">{pred.match}</h3>
                    <p className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3" />
                      Today, {pred.time}
                    </p>
                  </div>
                  <Badge className={getConfidenceColor(pred.confidence)}>
                    {pred.confidence}% Confidence
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">Prediction</p>
                      <p className="font-medium text-amber-500">{pred.prediction}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Odds</p>
                      <p className="font-medium text-zinc-100">{pred.odds}</p>
                    </div>
                  </div>
                  <div className="text-right max-w-md">
                    <p className="text-xs text-zinc-500 flex items-center gap-1 justify-end">
                      <TrendingUp className="w-3 h-3" />
                      ML Reasoning
                    </p>
                    <p className="text-sm text-zinc-400">{pred.reasoning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Info */}
      <Card className="glass border-0 border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-zinc-100">Model trained on 27,000+ matches</p>
              <p className="text-sm text-zinc-500">
                Using TensorFlow.js with features: form, possession, shots, corners, cards, and historical H2H data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
