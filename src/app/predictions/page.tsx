"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Brain, RefreshCw } from "lucide-react";

interface Prediction {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  suggestedBet: string;
  confidence: number;
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelInfo, setModelInfo] = useState<any>(null);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      // Get upcoming matches from leagues
      const leaguesRes = await fetch('/api/leagues');
      const leaguesData = await leaguesRes.json();
      
      if (!leaguesData.success || leaguesData.leagues.length === 0) {
        setLoading(false);
        return;
      }

      // Get model info
      const modelRes = await fetch('/api/ml-train-full');
      const modelData = await modelRes.json();
      setModelInfo(modelData.currentModel);

      // Generate predictions for top leagues
      const topLeagues = leaguesData.leagues.slice(0, 5);
      const newPredictions: Prediction[] = [];

      for (let i = 0; i < 5; i++) {
        // Mock predictions for now - in production would call /api/ml-predict-full
        const homeTeams = ['Liverpool', 'Real Madrid', 'Man City', 'Bayern', 'Inter'];
        const awayTeams = ['Arsenal', 'Barcelona', 'Chelsea', 'Dortmund', 'Juventus'];
        
        newPredictions.push({
          id: i + 1,
          homeTeam: homeTeams[i],
          awayTeam: awayTeams[i],
          homeWin: Math.floor(Math.random() * 40) + 30,
          draw: Math.floor(Math.random() * 30) + 20,
          awayWin: Math.floor(Math.random() * 30) + 20,
          suggestedBet: ['Home Win', 'Over 2.5', 'BTTS Yes', 'Draw', 'Away Win'][i],
          confidence: Math.floor(Math.random() * 20) + 60,
        });
      }

      setPredictions(newPredictions);
    } catch (e) {
      console.error('Error fetching predictions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Brain className="w-6 h-6 text-amber-500" />
            ML Predictions
          </h2>
          <p className="text-zinc-500">
            {modelInfo ? `Model: ${modelInfo.accuracy} accuracy • ${modelInfo.matches.toLocaleString()} matches trained` : 'AI-powered betting predictions'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchPredictions}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => window.location.href = '/admin/ml'}
            className="bg-amber-500 text-black hover:bg-amber-400"
          >
            <Brain className="w-4 h-4 mr-2" />
            Train Model
          </Button>
        </div>
      </div>

      {!modelInfo && (
        <Card className="glass border-0 border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Brain className="w-10 h-10 text-amber-500" />
              <div>
                <p className="font-medium text-zinc-100">No ML Model Trained Yet</p>
                <p className="text-sm text-zinc-500">
                  Go to Admin → ML to download data and train the prediction model.
                </p>
              </div>
              <Button 
                onClick={() => window.location.href = '/admin/ml'}
                className="ml-auto bg-amber-500 text-black hover:bg-amber-400"
              >
                Train Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      <div className="space-y-4">
        {predictions.map((pred) => (
          <Card key={pred.id} className="glass border-0 hover:border-amber-500/30 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Teams */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center flex-1">
                      <p className="text-xl font-bold text-zinc-100">{pred.homeTeam}</p>
                      <p className="text-sm text-zinc-500">Home</p>
                    </div>
                    <div className="text-zinc-600 font-bold">VS</div>
                    <div className="text-center flex-1">
                      <p className="text-xl font-bold text-zinc-100">{pred.awayTeam}</p>
                      <p className="text-sm text-zinc-500">Away</p>
                    </div>
                  </div>

                  {/* Probabilities */}
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">Home Win</p>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${pred.homeWin}%` }}
                        />
                      </div>
                      <p className="text-sm font-bold text-zinc-100 mt-1">{pred.homeWin}%</p>
                    </div>
                    <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">Draw</p>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-zinc-500 rounded-full"
                          style={{ width: `${pred.draw}%` }}
                        />
                      </div>
                      <p className="text-sm font-bold text-zinc-100 mt-1">{pred.draw}%</p>
                    </div>
                    <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">Away Win</p>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${pred.awayWin}%` }}
                        />
                      </div>
                      <p className="text-sm font-bold text-zinc-100 mt-1">{pred.awayWin}%</p>
                    </div>
                  </div>
                </div>

                {/* Suggested Bet */}
                <div className="ml-8 text-right">
                  <p className="text-sm text-zinc-500 mb-2">ML Suggestion</p>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-lg px-4 py-2">
                    <Target className="w-4 h-4 mr-2 inline" />
                    {pred.suggestedBet}
                  </Badge>
                  <p className="text-sm text-zinc-400 mt-2">
                    Confidence: <span className="text-amber-500 font-bold">{pred.confidence}%</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-zinc-100">{modelInfo?.accuracy || 'N/A'}</p>
                <p className="text-sm text-zinc-500">Model Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-zinc-100">{modelInfo ? 'Active' : 'Not Trained'}</p>
                <p className="text-sm text-zinc-500">Model Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-zinc-100">{predictions.length}</p>
                <p className="text-sm text-zinc-500">Today's Predictions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
