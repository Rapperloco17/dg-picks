// Hybrid ML Model - FIXED VERSION with historical data
// Combines heuristic rules + real-time stats + historical data

import { Match } from '@/types';
import { MatchForm, TeamDetailedStats, H2HStats, OddsData } from './match-stats-cached';
import { historicalData } from './historical-data-store';

export interface HybridPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  over15: number;
  over25: number;
  over35: number;
  btts: number;
  cards: {
    over45: number;
    over55: number;
    avgTotal: number;
  };
  corners: {
    over85: number;
    over95: number;
    over105: number;
    avgTotal: number;
  };
  confidence: number;
  method: 'heuristic' | 'ml' | 'hybrid';
  factors: {
    formWeight: number;
    statsWeight: number;
    h2hWeight: number;
    homeAdvantage: number;
  };
  recommendedPick: {
    market: string;
    selection: string;
    odds: number;
    probability: number;
    ev: number;
    confidence: 'high' | 'medium' | 'low';
  } | null;
}

// Extraer corners del historial
function getTeamCornersFromHistory(teamId: number): number {
  if (!historicalData.isDataLoaded()) return 0;
  
  const matches = historicalData.getTeamMatches(teamId, 20);
  let totalCorners = 0;
  let count = 0;
  
  matches.forEach(match => {
    if (!match.estadisticas) return;
    
    const teamStats = match.estadisticas.find((s: any) => s.team?.id === teamId);
    if (teamStats?.statistics) {
      const cornerStat = teamStats.statistics.find((s: any) => 
        s.type === 'Corner Kicks' || s.type === 'Corners'
      );
      if (cornerStat?.value) {
        totalCorners += cornerStat.value;
        count++;
      }
    }
  });
  
  return count > 0 ? totalCorners / count : 0;
}

// Extraer tarjetas del historial
function getTeamCardsFromHistory(teamId: number): number {
  if (!historicalData.isDataLoaded()) return 0;
  
  const matches = historicalData.getTeamMatches(teamId, 20);
  let totalCards = 0;
  let count = 0;
  
  matches.forEach(match => {
    if (!match.estadisticas) return;
    
    const teamStats = match.estadisticas.find((s: any) => s.team?.id === teamId);
    if (teamStats?.statistics) {
      const yellowStat = teamStats.statistics.find((s: any) => 
        s.type === 'Yellow Cards' || s.type === 'Yellow Card'
      );
      const redStat = teamStats.statistics.find((s: any) => 
        s.type === 'Red Cards' || s.type === 'Red Card'
      );
      
      const yellow = yellowStat?.value || 0;
      const red = redStat?.value || 0;
      totalCards += yellow + red;
      count++;
    }
  });
  
  return count > 0 ? totalCards / count : 0;
}

export function predictHybrid(
  match: Match,
  homeForm: MatchForm,
  awayForm: MatchForm,
  homeStats: TeamDetailedStats,
  awayStats: TeamDetailedStats,
  h2h: H2HStats,
  odds: OddsData
): HybridPrediction {
  const formScore = calculateFormScore(homeForm, awayForm);
  const statsScore = calculateStatsScore(homeStats, awayStats);
  const h2hScore = calculateH2HScore(h2h);
  const homeAdvantage = 0.15;
  
  const weights = {
    form: homeForm.played > 0 && awayForm.played > 0 ? 0.35 : 0,
    stats: homeStats.played > 0 && awayStats.played > 0 ? 0.30 : 0,
    h2h: h2h.totalMatches > 0 ? 0.20 : 0,
    home: 0.15,
  };
  
  const totalWeight = weights.form + weights.stats + weights.h2h + weights.home;
  const normWeights = {
    form: weights.form / totalWeight,
    stats: weights.stats / totalWeight,
    h2h: weights.h2h / totalWeight,
    home: weights.home / totalWeight,
  };
  
  const homeScore = 
    (formScore.home * normWeights.form) +
    (statsScore.home * normWeights.stats) +
    (h2hScore.home * normWeights.h2h) +
    (homeAdvantage * normWeights.home);
    
  const awayScore = 
    (formScore.away * normWeights.form) +
    (statsScore.away * normWeights.stats) +
    (h2hScore.away * normWeights.h2h);
    
  const drawScore = 0.25;
  
  const total = homeScore + drawScore + awayScore;
  const homeProb = (homeScore / total) * 100;
  const drawProb = (drawScore / total) * 100;
  const awayProb = (awayScore / total) * 100;
  
  const over15Prob = calculateOverUnderProb(homeForm, awayForm, h2h, 1.5);
  const over25Prob = calculateOverUnderProb(homeForm, awayForm, h2h, 2.5);
  const over35Prob = calculateOverUnderProb(homeForm, awayForm, h2h, 3.5);
  const bttsProb = calculateBttsProb(homeForm, awayForm, h2h);
  
  // USAR DATOS HISTÓRICOS PARA CORNERS Y TARJETAS
  const cardsPred = calculateCardsPredictionWithHistory(homeStats, awayStats, h2h, match);
  const cornersPred = calculateCornersPredictionWithHistory(homeStats, awayStats, h2h, match);
  
  const confidence = calculateConfidence(homeForm, awayForm, homeStats, awayStats, h2h);
  
  const recommendedPick = findBestValuePick(
    { 
      homeWin: homeProb, 
      draw: drawProb, 
      awayWin: awayProb, 
      over15: over15Prob,
      over25: over25Prob, 
      over35: over35Prob,
      btts: bttsProb,
      cards: cardsPred,
      corners: cornersPred
    },
    odds
  );
  
  return {
    homeWin: Math.min(Math.max(homeProb, 5), 90),
    draw: Math.min(Math.max(drawProb, 5), 60),
    awayWin: Math.min(Math.max(awayProb, 5), 90),
    over15: over15Prob,
    over25: over25Prob,
    over35: over35Prob,
    btts: bttsProb,
    cards: cardsPred,
    corners: cornersPred,
    confidence,
    method: 'hybrid',
    factors: {
      formWeight: normWeights.form * 100,
      statsWeight: normWeights.stats * 100,
      h2hWeight: normWeights.h2h * 100,
      homeAdvantage: homeAdvantage * 100,
    },
    recommendedPick,
  };
}

function calculateFormScore(homeForm: MatchForm, awayForm: MatchForm) {
  if (!homeForm.played && !awayForm.played) {
    return { home: 0.5, away: 0.5 };
  }
  
  const homeWinRate = homeForm.played > 0 ? homeForm.wins / homeForm.played : 0.4;
  const awayWinRate = awayForm.played > 0 ? awayForm.wins / awayForm.played : 0.3;
  
  const homeGoalsFactor = homeForm.played > 0 
    ? Math.min(homeForm.goalsFor / (homeForm.played * 2), 1.5) 
    : 1;
  const awayGoalsFactor = awayForm.played > 0 
    ? Math.min(awayForm.goalsFor / (awayForm.played * 2), 1.5) 
    : 0.8;
  
  return {
    home: homeWinRate * homeGoalsFactor,
    away: awayWinRate * awayGoalsFactor,
  };
}

function calculateStatsScore(homeStats: TeamDetailedStats, awayStats: TeamDetailedStats) {
  if (!homeStats.played && !awayStats.played) {
    return { home: 0.5, away: 0.5 };
  }
  
  const homePositionScore = homeStats.leaguePosition > 0 
    ? 1 / (homeStats.leaguePosition * 0.5 + 1) 
    : 0.5;
  const awayPositionScore = awayStats.leaguePosition > 0 
    ? 1 / (awayStats.leaguePosition * 0.5 + 1) 
    : 0.4;
  
  const homePpg = homeStats.played > 0 ? homeStats.points / homeStats.played / 3 : 1.5;
  const awayPpg = awayStats.played > 0 ? awayStats.points / awayStats.played / 3 : 1.0;
  
  const homeGdFactor = homeStats.played > 0 
    ? Math.min(Math.max(homeStats.goalDifference / homeStats.played / 2 + 1, 0.5), 1.5)
    : 1;
  const awayGdFactor = awayStats.played > 0 
    ? Math.min(Math.max(awayStats.goalDifference / awayStats.played / 2 + 1, 0.5), 1.5)
    : 1;
  
  return {
    home: homePositionScore * homePpg * homeGdFactor,
    away: awayPositionScore * awayPpg * awayGdFactor,
  };
}

function calculateH2HScore(h2h: H2HStats) {
  if (!h2h.totalMatches) {
    return { home: 0.5, away: 0.5 };
  }
  
  const homeWinRate = h2h.homeWins / h2h.totalMatches;
  const awayWinRate = h2h.awayWins / h2h.totalMatches;
  
  return {
    home: homeWinRate + 0.3,
    away: awayWinRate + 0.2,
  };
}

function calculateOverUnderProb(
  homeForm: MatchForm, 
  awayForm: MatchForm, 
  h2h: H2HStats,
  line: number
): number {
  let score = 50;
  
  let expectedGoals = 0;
  
  if (homeForm.played > 0) {
    const homeGoalsFor = homeForm.goalsFor / homeForm.played;
    const homeGoalsAgainst = homeForm.goalsAgainst / homeForm.played;
    expectedGoals += (homeGoalsFor + homeGoalsAgainst) / 2;
  }
  
  if (awayForm.played > 0) {
    const awayGoalsFor = awayForm.goalsFor / awayForm.played;
    const awayGoalsAgainst = awayForm.goalsAgainst / awayForm.played;
    expectedGoals += (awayGoalsFor + awayGoalsAgainst) / 2;
  }
  
  if (expectedGoals > 0) {
    score += (expectedGoals - line) * 15;
  }
  
  if (h2h.totalMatches > 0) {
    score = (score + (h2h.avgGoals > line ? 60 : 40)) / 2;
  }
  
  const minProb = line <= 1.5 ? 40 : line >= 3.5 ? 15 : 20;
  const maxProb = line <= 1.5 ? 90 : line >= 3.5 ? 70 : 85;
  
  return Math.min(Math.max(score, minProb), maxProb);
}

function calculateBttsProb(homeForm: MatchForm, awayForm: MatchForm, h2h: H2HStats): number {
  let score = 50;
  
  if (homeForm.played > 0) {
    const homeScoringRate = homeForm.goalsFor / homeForm.played;
    const homeConcedingRate = homeForm.goalsAgainst / homeForm.played;
    score += (homeScoringRate - 1) * 10;
    score += (homeConcedingRate - 1) * 10;
  }
  
  if (awayForm.played > 0) {
    const awayScoringRate = awayForm.goalsFor / awayForm.played;
    const awayConcedingRate = awayForm.goalsAgainst / awayForm.played;
    score += (awayScoringRate - 1) * 10;
    score += (awayConcedingRate - 1) * 10;
  }
  
  if (h2h.totalMatches > 0) {
    score = (score + h2h.btts) / 2;
  }
  
  return Math.min(Math.max(score, 25), 80);
}

// Tarjetas CON datos históricos
function calculateCardsPredictionWithHistory(
  homeStats: TeamDetailedStats,
  awayStats: TeamDetailedStats,
  h2h: H2HStats,
  match: Match
): { over45: number; over55: number; avgTotal: number } {
  // 1. Intentar obtener de datos históricos
  const homeCardsHistory = getTeamCardsFromHistory(match.teams.home.id);
  const awayCardsHistory = getTeamCardsFromHistory(match.teams.away.id);
  
  // 2. Usar datos de la API si existen
  let homeCards = homeCardsHistory;
  let awayCards = awayCardsHistory;
  
  if (homeStats.cards && homeStats.played > 0) {
    const apiCards = (homeStats.cards.yellow + homeStats.cards.red) / homeStats.played;
    homeCards = homeCardsHistory > 0 ? (homeCardsHistory + apiCards) / 2 : apiCards;
  }
  
  if (awayStats.cards && awayStats.played > 0) {
    const apiCards = (awayStats.cards.yellow + awayStats.cards.red) / awayStats.played;
    awayCards = awayCardsHistory > 0 ? (awayCardsHistory + apiCards) / 2 : apiCards;
  }
  
  // 3. Fallback a promedios de liga si no hay datos
  if (homeCards === 0) homeCards = 2.0;
  if (awayCards === 0) awayCards = 2.0;
  
  const avgCards = homeCards + awayCards;
  
  const over45 = Math.min(Math.max(50 + (avgCards - 4.5) * 15, 25), 75);
  const over55 = Math.min(Math.max(35 + (avgCards - 5.5) * 15, 15), 65);
  
  return {
    over45: Math.round(over45),
    over55: Math.round(over55),
    avgTotal: Math.round(avgCards * 10) / 10,
  };
}

// Corners CON datos históricos
function calculateCornersPredictionWithHistory(
  homeStats: TeamDetailedStats,
  awayStats: TeamDetailedStats,
  h2h: H2HStats,
  match: Match
): { over85: number; over95: number; over105: number; avgTotal: number } {
  // 1. Intentar obtener de datos históricos
  const homeCornersHistory = getTeamCornersFromHistory(match.teams.home.id);
  const awayCornersHistory = getTeamCornersFromHistory(match.teams.away.id);
  
  // 2. Combinar con datos de API si existen
  let avgCorners = 9.5; // Base
  
  if (homeCornersHistory > 0 && awayCornersHistory > 0) {
    avgCorners = homeCornersHistory + awayCornersHistory;
  } else if (homeCornersHistory > 0) {
    avgCorners = homeCornersHistory * 2;
  } else if (awayCornersHistory > 0) {
    avgCorners = awayCornersHistory * 2;
  }
  
  // 3. Ajustar por estilo de juego (goles)
  if (homeStats.avgGoalsScored) {
    avgCorners += (homeStats.avgGoalsScored - 1.3) * 1.5;
  }
  if (awayStats.avgGoalsScored) {
    avgCorners += (awayStats.avgGoalsScored - 1.1) * 1.5;
  }
  
  const over85 = Math.min(Math.max(55 + (avgCorners - 8.5) * 8, 30), 80);
  const over95 = Math.min(Math.max(45 + (avgCorners - 9.5) * 8, 20), 70);
  const over105 = Math.min(Math.max(35 + (avgCorners - 10.5) * 8, 10), 60);
  
  return {
    over85: Math.round(over85),
    over95: Math.round(over95),
    over105: Math.round(over105),
    avgTotal: Math.round(avgCorners * 10) / 10,
  };
}

function calculateConfidence(
  homeForm: MatchForm,
  awayForm: MatchForm,
  homeStats: TeamDetailedStats,
  awayStats: TeamDetailedStats,
  h2h: H2HStats
): number {
  let score = 50;
  
  if (homeForm.played >= 5 && awayForm.played >= 5) score += 15;
  if (homeStats.played >= 10 && awayStats.played >= 10) score += 15;
  if (h2h.totalMatches >= 3) score += 10;
  
  if (homeForm.played > 0) {
    const homeConsistency = 1 - Math.abs((homeForm.wins / homeForm.played) - 0.5);
    score += homeConsistency * 10;
  }
  
  return Math.min(score, 95);
}

function findBestValuePick(
  probs: any,
  odds: OddsData
): any {
  const picks: any[] = [];
  
  if (odds.matchWinner) {
    picks.push({ market: '1X2', selection: '1', prob: probs.homeWin, odds: odds.matchWinner.home });
    picks.push({ market: '1X2', selection: 'X', prob: probs.draw, odds: odds.matchWinner.draw });
    picks.push({ market: '1X2', selection: '2', prob: probs.awayWin, odds: odds.matchWinner.away });
  }
  
  if (odds.overUnder) {
    if (odds.overUnder.over15) {
      picks.push({ market: 'Over 1.5', selection: 'Over', prob: probs.over15, odds: odds.overUnder.over15 });
    }
    if (odds.overUnder.over25) {
      picks.push({ market: 'Over 2.5', selection: 'Over', prob: probs.over25, odds: odds.overUnder.over25 });
    }
    if (odds.overUnder.under25) {
      picks.push({ market: 'Under 2.5', selection: 'Under', prob: 100 - probs.over25, odds: odds.overUnder.under25 });
    }
    if (odds.overUnder.over35) {
      picks.push({ market: 'Over 3.5', selection: 'Over', prob: probs.over35, odds: odds.overUnder.over35 });
    }
  }
  
  if (odds.btts.yes && odds.btts.no) {
    picks.push({ market: 'BTTS', selection: 'Sí', prob: probs.btts, odds: odds.btts.yes });
    picks.push({ market: 'BTTS', selection: 'No', prob: 100 - probs.btts, odds: odds.btts.no });
  }
  
  if (odds.cards?.over) {
    picks.push({ market: 'Cards', selection: 'Over', prob: probs.cards.over45, odds: odds.cards.over });
  }
  
  if (odds.corners?.over) {
    picks.push({ market: 'Corners', selection: 'Over', prob: probs.corners.over95, odds: odds.corners.over });
  }
  
  let bestPick = null;
  let bestEV = 0;
  
  picks.forEach(pick => {
    const ev = ((pick.prob * pick.odds) / 100) - 1;
    const confidence = pick.prob > 58 ? 'high' : pick.prob > 45 ? 'medium' : 'low';
    
    if (ev > bestEV && ev > 0.03) {
      bestEV = ev;
      bestPick = {
        market: pick.market,
        selection: pick.selection,
        odds: pick.odds,
        probability: pick.prob,
        ev,
        confidence,
      };
    }
  });
  
  return bestPick;
}

export function predictMinimal(): HybridPrediction {
  return {
    homeWin: 45,
    draw: 28,
    awayWin: 27,
    over15: 70,
    over25: 50,
    over35: 30,
    btts: 50,
    cards: {
      over45: 50,
      over55: 35,
      avgTotal: 4.5,
    },
    corners: {
      over85: 55,
      over95: 45,
      over105: 35,
      avgTotal: 9.5,
    },
    confidence: 30,
    method: 'heuristic',
    factors: {
      formWeight: 0,
      statsWeight: 0,
      h2hWeight: 0,
      homeAdvantage: 15,
    },
    recommendedPick: null,
  };
}
