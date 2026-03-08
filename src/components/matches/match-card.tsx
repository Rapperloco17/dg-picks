'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Match } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Activity, 
  Flame, 
  AlertTriangle, 
  BarChart3,
  Clock,
  Plus,
  TrendingUp,
  Target,
  Zap,
  X,
  ArrowUp,
  ArrowDown,
  Users,
  Goal,
  Shield,
  CornerRightDown,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchStatsDialog } from '@/components/match/match-stats-dialog';
import { hasCache, CACHE_TYPES } from '@/services/local-cache';
import { calculateEV, formatEV, getGradeColor } from '@/lib/ev-calculator';
import { generateMLPredictions } from '@/lib/ml-predictions';
import { EVBadge, GradeBadge } from './ev-badge';
import { MarketType } from '@/types';

interface MatchCardProps {
  match: Match;
  showValueIndicator?: boolean;
}

// Generate consistent analysis based on match ID
interface PickAnalysis {
  market: MarketType;
  selection: string;
  selectionDetails: string;
  odds: number;
  probability: number;
  ev: number;
  evPercentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID';
  confidence: number;
  reasoning: string;
  // ML probabilities that justify the pick
  mlProbabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
    btts: number;
  };
}

function generatePickAnalysis(match: Match): PickAnalysis | null {
  // Use shared ML predictions for consistency
  const mlData = generateMLPredictions(match.fixture.id);
  
  // Map ML data to pick analysis
  if (!mlData.recommendedPick) return null;
  
  const pick = mlData.recommendedPick;
  
  // Determine market type from recommendation
  let market: MarketType = '1X2';
  if (pick.market.includes('Over') || pick.market.includes('Under')) market = 'OVER_UNDER';
  else if (pick.market.includes('BTTS')) market = 'BTTS';
  else if (pick.market.includes('Doble')) market = 'DOUBLE_CHANCE';
  
  // Determine selection details
  let selectionDetails = pick.selection;
  if (market === '1X2') {
    if (pick.selection === 'Local') selectionDetails = match.teams.home.name;
    else if (pick.selection === 'Visitante') selectionDetails = match.teams.away.name;
  }
  
  // Calculate grade based on EV
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
  if (pick.ev >= 0.15) grade = 'A';
  else if (pick.ev >= 0.08) grade = 'B';
  else if (pick.ev >= 0.03) grade = 'C';
  else if (pick.ev >= 0) grade = 'D';
  else grade = 'F';
  
  // Determine recommendation
  let recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' = 'HOLD';
  if (pick.ev >= 0.10) recommendation = 'STRONG_BUY';
  else if (pick.ev >= 0.05) recommendation = 'BUY';
  else if (pick.ev >= 0) recommendation = 'HOLD';
  else recommendation = 'AVOID';
  
  // Generate reasoning based on market and probabilities
  let reasoning = '';
  if (market === '1X2') {
    if (pick.selection === 'Local') reasoning = `Local con ${mlData.homeWin.toFixed(0)}% probabilidad según ML, juega en casa con ventaja`;
    else if (pick.selection === 'Visitante') reasoning = `Visitante en buena forma (${mlData.awayWin.toFixed(0)}%), local con debilidades defensivas`;
    else reasoning = `Empate con ${mlData.draw.toFixed(0)}% probabilidad, partido muy parejo`;
  } else if (market === 'OVER_UNDER') {
    if (pick.selection.includes('Over')) reasoning = `Alta probabilidad de goles (${mlData.over25.toFixed(0)}% para Over 2.5), ataques potentes`;
    else reasoning = `Partido defensivo esperado, baja probabilidad de goles (${mlData.over25.toFixed(0)}% Over 2.5)`;
  } else if (market === 'BTTS') {
    reasoning = `Ambos equipos tienen capacidad de anotar (${mlData.btts.toFixed(0)}% probabilidad BTTS)`;
  }
  
  return {
    market,
    selection: pick.selection.toLowerCase().replace('local', 'home').replace('visitante', 'away').replace('sí', 'yes'),
    selectionDetails,
    odds: pick.odds,
    probability: pick.probability / 100,
    ev: pick.ev,
    evPercentage: pick.ev * 100,
    grade,
    recommendation,
    confidence: pick.confidence === 'high' ? 78 : pick.confidence === 'medium' ? 65 : 52,
    reasoning,
    mlProbabilities: {
      homeWin: Math.round(mlData.homeWin),
      draw: Math.round(mlData.draw),
      awayWin: Math.round(mlData.awayWin),
      over25: Math.round(mlData.over25),
      btts: Math.round(mlData.btts),
    },
  };
}

function getMarketIcon(market: MarketType) {
  switch (market) {
    case '1X2': return Target;
    case 'DOUBLE_CHANCE': return Shield;
    case 'OVER_UNDER': case 'OVER_UNDER_15': case 'OVER_UNDER_25': case 'OVER_UNDER_35': return ArrowUp;
    case 'BTTS': return Users;
    case 'CORNERS': return CornerRightDown;
    case 'CARDS': return CreditCard;
    default: return Target;
  }
}

function getMarketLabel(market: MarketType): string {
  switch (market) {
    case '1X2': return '1X2';
    case 'DOUBLE_CHANCE': return 'Doble Oport.';
    case 'OVER_UNDER': case 'OVER_UNDER_25': return 'O/U 2.5';
    case 'OVER_UNDER_15': return 'O/U 1.5';
    case 'OVER_UNDER_35': return 'O/U 3.5';
    case 'BTTS': return 'BTTS';
    case 'CORNERS': return 'Córners';
    case 'CARDS': return 'Tarjetas';
    case 'ASIAN_HANDICAP': return 'Hándicap';
    default: return market;
  }
}

// Helper to get the relevant probability for display
function getRelevantProbability(pick: PickAnalysis): string {
  switch (pick.market) {
    case '1X2':
      if (pick.selection === 'home') return `${pick.mlProbabilities.homeWin}%`;
      if (pick.selection === 'away') return `${pick.mlProbabilities.awayWin}%`;
      return `${pick.mlProbabilities.draw}%`;
    case 'OVER_UNDER':
      return `${pick.mlProbabilities.over25}%`;
    case 'BTTS':
      return `${pick.mlProbabilities.btts}%`;
    case 'DOUBLE_CHANCE':
      return `${pick.mlProbabilities.homeWin + pick.mlProbabilities.draw}%`;
    default:
      return `${(pick.probability * 100).toFixed(0)}%`;
  }
}

export function MatchCard({ match, showValueIndicator = true }: MatchCardProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const [showPickDetails, setShowPickDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen');
  const { fixture, league, teams, goals } = match;
  
  // Check if stats are cached
  const isCached = typeof window !== 'undefined' && hasCache(CACHE_TYPES.MATCH_STATS, fixture.id);
  
  const isLive = fixture.status.short === '1H' || 
                 fixture.status.short === '2H' || 
                 fixture.status.short === 'ET' ||
                 fixture.status.short === 'P';
  
  const isFinished = fixture.status.short === 'FT' || 
                     fixture.status.short === 'AET' || 
                     fixture.status.short === 'PEN';
  
  const matchDate = new Date(fixture.date);
  const formattedTime = format(matchDate, 'HH:mm');
  
  // Generate pick analysis
  const pick = useMemo(() => generatePickAnalysis(match), [match]);
  const hasPick = pick !== null;
  const isPositiveEV = hasPick && pick.ev > 0;
  const isStrongValue = hasPick && pick.ev >= 0.10;
  const isAvoid = hasPick && pick.grade === 'F';
  
  const MarketIcon = hasPick ? getMarketIcon(pick.market) : Target;
  const relevantProb = hasPick ? getRelevantProbability(pick) : '';

  return (
    <>
      <Card className={cn(
        "bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group",
        isStrongValue && "border-emerald-500/30 hover:border-emerald-500/50",
        isAvoid && "border-red-500/20 hover:border-red-500/30"
      )}>
        <CardContent className="p-4">
          {/* Header: League & EV Badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img 
                src={league.logo} 
                alt={league.name}
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-xs text-slate-400 truncate max-w-[120px]">
                {league.name}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {isLive && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 animate-pulse-live">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mr-1" />
                  {fixture.status.elapsed}'
                </Badge>
              )}
              
              {/* EV Badge */}
              {hasPick && showValueIndicator && (
                <EVBadge 
                  ev={pick.ev} 
                  grade={pick.grade}
                  size="sm"
                />
              )}
            </div>
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between gap-4">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <img 
                src={teams.home.logo} 
                alt={teams.home.name}
                className="w-12 h-12 object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-team.png';
                }}
              />
              <span className="text-sm font-medium text-slate-100 line-clamp-2">
                {teams.home.name}
              </span>
            </div>

            {/* Score / Time */}
            <div className="flex flex-col items-center min-w-[80px]">
              {isLive || isFinished ? (
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <span className={cn(
                    goals.home !== null && goals.home > (goals.away ?? 0) && "text-emerald-400"
                  )}>
                    {goals.home ?? '-'}
                  </span>
                  <span className="text-slate-600">:</span>
                  <span className={cn(
                    goals.away !== null && goals.away > (goals.home ?? 0) && "text-emerald-400"
                  )}>
                    {goals.away ?? '-'}
                  </span>
                </div>
              ) : (
                <div className="text-xl font-bold text-slate-300">
                  {formattedTime}
                </div>
              )}
              
              <div className="flex items-center gap-1 mt-1">
                {!isLive && !isFinished && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(matchDate, 'd MMM', { locale: es })}
                  </span>
                )}
                {isFinished && (
                  <span className="text-xs text-slate-500">Final</span>
                )}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <img 
                src={teams.away.logo} 
                alt={teams.away.name}
                className="w-12 h-12 object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-team.png';
                }}
              />
              <span className="text-sm font-medium text-slate-100 line-clamp-2">
                {teams.away.name}
              </span>
            </div>
          </div>

          {/* PICK RECOMMENDATION BOX */}
          {hasPick && (
            <div className={cn(
              "mt-4 p-3 rounded-lg border cursor-pointer transition-all",
              isStrongValue 
                ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15" 
                : isPositiveEV
                ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15"
                : "bg-red-500/10 border-red-500/30 hover:bg-red-500/15",
              showPickDetails && "ring-1 ring-offset-1 ring-offset-slate-900"
            )} onClick={() => setShowPickDetails(!showPickDetails)}>
              {/* Pick Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isStrongValue ? "bg-emerald-500/20" : isPositiveEV ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    <MarketIcon className={cn(
                      "w-4 h-4",
                      isStrongValue ? "text-emerald-400" : isPositiveEV ? "text-green-400" : "text-red-400"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-100">
                        {pick.selectionDetails}
                      </span>
                      <GradeBadge grade={pick.grade} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{getMarketLabel(pick.market)}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-300">@{pick.odds}</span>
                      <span>•</span>
                      <span className="text-emerald-400">ML: {relevantProb}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={cn(
                    "text-lg font-bold",
                    isStrongValue ? "text-emerald-400" : isPositiveEV ? "text-green-400" : "text-red-400"
                  )}>
                    {formatEV(pick.ev)}
                  </div>
                  <div className="text-xs text-slate-500">
                    EV
                  </div>
                </div>
              </div>
              
              {/* Expanded Details */}
              {showPickDetails && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                  {/* ML Probabilities Summary */}
                  <div className="grid grid-cols-5 gap-2 text-xs text-center">
                    <div className="bg-slate-800/50 rounded p-1">
                      <div className="text-slate-500">1</div>
                      <div className="font-medium text-slate-200">{pick.mlProbabilities.homeWin}%</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-1">
                      <div className="text-slate-500">X</div>
                      <div className="font-medium text-slate-200">{pick.mlProbabilities.draw}%</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-1">
                      <div className="text-slate-500">2</div>
                      <div className="font-medium text-slate-200">{pick.mlProbabilities.awayWin}%</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-1">
                      <div className="text-slate-500">O2.5</div>
                      <div className="font-medium text-slate-200">{pick.mlProbabilities.over25}%</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-1">
                      <div className="text-slate-500">BTTS</div>
                      <div className="font-medium text-slate-200">{pick.mlProbabilities.btts}%</div>
                    </div>
                  </div>
                  
                  {/* Reasoning */}
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-500">Análisis:</span> {pick.reasoning}
                  </div>
                  
                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          pick.confidence >= 75 ? "bg-emerald-500" :
                          pick.confidence >= 60 ? "bg-blue-500" : "bg-amber-500"
                        )}
                        style={{ width: `${pick.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{pick.confidence}% conf.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer: Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              {/* Quick Analysis Button */}
              <Button 
                variant="ghost" 
                size="sm"
                className="text-slate-400 hover:text-slate-100 h-8 px-2"
                onClick={() => {
                  setActiveTab('resumen');
                  setStatsOpen(true);
                }}
              >
                <Activity className="w-4 h-4 mr-1" />
                Análisis
              </Button>
              
              {/* Full Stats Button */}
              <Link href={`/match/${fixture.id}/stats`}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-400 hover:text-slate-100 h-8 px-2"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Stats
                  {isCached && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500" />}
                </Button>
              </Link>
            </div>
            
            {/* Add Pick Button */}
            <Link href={`/picks/new?match=${fixture.id}`}>
              <Button 
                size="sm"
                className={cn(
                  "h-8",
                  isStrongValue 
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                    : isPositiveEV
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-blue-500 hover:bg-blue-600"
                )}
              >
                {isStrongValue ? (
                  <Zap className="w-4 h-4 mr-1" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {hasPick ? `Pick ${formatEV(pick.ev)}` : 'Crear Pick'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Match Stats Dialog */}
      <MatchStatsDialog 
        match={match} 
        open={statsOpen} 
        onOpenChange={setStatsOpen}
        defaultTab={activeTab}
      />
    </>
  );
}
