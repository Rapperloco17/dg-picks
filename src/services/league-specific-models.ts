import * as tf from '@tensorflow/tfjs';
import { ProcessedMatchData } from './historical-data';
import { MarketType } from './market-models';
import { ALL_LEAGUES } from '@/constants/leagues';

// League-specific model storage
const leagueModels: Map<number, tf.LayersModel> = new Map();

// League characteristics
interface LeagueCharacteristics {
  avgGoals: number;
  homeWinRate: number;
  drawRate: number;
  bttsRate: number;
  over25Rate: number;
  favoriteWinRate: number;
  upsetRate: number;
  competitiveness: number; // 0-1, higher = more even
}

// League stats cache
const leagueStats: Map<number, LeagueCharacteristics> = new Map();

/**
 * Calculate league characteristics from historical data
 */
export function calculateLeagueCharacteristics(
  matches: ProcessedMatchData[],
  leagueId: number
): LeagueCharacteristics {
  const leagueMatches = matches.filter(m => m.league.id === leagueId);
  
  if (leagueMatches.length === 0) {
    return {
      avgGoals: 2.7,
      homeWinRate: 0.45,
      drawRate: 0.26,
      bttsRate: 0.52,
      over25Rate: 0.51,
      favoriteWinRate: 0.60,
      upsetRate: 0.25,
      competitiveness: 0.5,
    };
  }
  
  let totalGoals = 0;
  let homeWins = 0;
  let draws = 0;
  let btts = 0;
  let over25 = 0;
  let favoritesWin = 0;
  let upsets = 0;
  
  // Track team points for competitiveness
  const teamPoints: Map<number, number> = new Map();
  
  for (const match of leagueMatches) {
    if (match.goals.home === null || match.goals.away === null) continue;
    
    totalGoals += match.goals.home + match.goals.away;
    
    if (match.goals.home > match.goals.away) homeWins++;
    else if (match.goals.home === match.goals.away) draws++;
    
    if (match.goals.home > 0 && match.goals.away > 0) btts++;
    if (match.goals.home + match.goals.away > 2.5) over25++;
    
    // Determine favorite by form
    const homeForm = match.features.homeForm.reduce((a, b) => a + b, 0);
    const awayForm = match.features.awayForm.reduce((a, b) => a + b, 0);
    const favorite = homeForm > awayForm ? 'home' : 'away';
    
    const favoriteWon = (favorite === 'home' && match.goals.home > match.goals.away) ||
                       (favorite === 'away' && match.goals.away > match.goals.home);
    const upset = (favorite === 'home' && match.goals.home < match.goals.away) ||
                  (favorite === 'away' && match.goals.away < match.goals.home);
    
    if (favoriteWon) favoritesWin++;
    if (upset) upsets++;
    
    // Track points
    const homeId = match.teams.home.id;
    const awayId = match.teams.away.id;
    
    if (!teamPoints.has(homeId)) teamPoints.set(homeId, 0);
    if (!teamPoints.has(awayId)) teamPoints.set(awayId, 0);
    
    if (match.goals.home > match.goals.away) {
      teamPoints.set(homeId, teamPoints.get(homeId)! + 3);
    } else if (match.goals.home === match.goals.away) {
      teamPoints.set(homeId, teamPoints.get(homeId)! + 1);
      teamPoints.set(awayId, teamPoints.get(awayId)! + 1);
    } else {
      teamPoints.set(awayId, teamPoints.get(awayId)! + 3);
    }
  }
  
  const count = leagueMatches.length;
  
  // Calculate competitiveness (standard deviation of points)
  const points = Array.from(teamPoints.values());
  const avgPoints = points.reduce((a, b) => a + b, 0) / points.length;
  const variance = points.reduce((acc, p) => acc + Math.pow(p - avgPoints, 2), 0) / points.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize competitiveness (lower stdDev = more competitive)
  const competitiveness = Math.max(0, 1 - stdDev / avgPoints);
  
  return {
    avgGoals: totalGoals / count,
    homeWinRate: homeWins / count,
    drawRate: draws / count,
    bttsRate: btts / count,
    over25Rate: over25 / count,
    favoriteWinRate: favoritesWin / count,
    upsetRate: upsets / count,
    competitiveness,
  };
}

/**
 * Adjust predictions based on league characteristics
 */
export function adjustForLeagueCharacteristics(
  probabilities: number[],
  leagueId: number
): number[] {
  const stats = leagueStats.get(leagueId);
  if (!stats) return probabilities;
  
  // Adjust based on league patterns
  const adjusted = [...probabilities];
  
  // If league has high draw rate, boost draw probability
  if (stats.drawRate > 0.30) {
    adjusted[1] *= 1.1;
  }
  
  // If league has high home advantage
  if (stats.homeWinRate > 0.48) {
    adjusted[0] *= 1.05;
    adjusted[2] *= 0.95;
  }
  
  // If league is very competitive (low std dev), bring probabilities closer to even
  if (stats.competitiveness > 0.7) {
    adjusted[0] = adjusted[0] * 0.9 + 0.33 * 0.1;
    adjusted[1] = adjusted[1] * 0.9 + 0.34 * 0.1;
    adjusted[2] = adjusted[2] * 0.9 + 0.33 * 0.1;
  }
  
  // Renormalize
  const sum = adjusted.reduce((a, b) => a + b, 0);
  return adjusted.map(p => p / sum);
}

/**
 * Train league-specific model
 */
export async function trainLeagueSpecificModel(
  leagueId: number,
  trainingData: ProcessedMatchData[],
  market: MarketType = '1X2'
): Promise<tf.LayersModel> {
  console.log(`[League Model] Training for league ${leagueId}...`);
  
  // Filter data for this league
  const leagueData = trainingData.filter(m => m.league.id === leagueId);
  
  if (leagueData.length < 50) {
    console.warn(`[League Model] Insufficient data for league ${leagueId}, using generic model`);
    throw new Error('Insufficient data');
  }
  
  // Calculate and cache league characteristics
  const stats = calculateLeagueCharacteristics(trainingData, leagueId);
  leagueStats.set(leagueId, stats);
  
  // Add league-specific features
  const enhancedFeatures = leagueData.map(m => {
    const baseFeatures = [
      ...m.features.homeForm.map(x => x / 3),
      ...m.features.awayForm.map(x => x / 3),
      m.features.homeGoalsScoredAvg / 5,
      m.features.homeGoalsConcededAvg / 5,
      m.features.awayGoalsScoredAvg / 5,
      m.features.awayGoalsConcededAvg / 5,
      m.features.h2hHomeWins / 10,
      m.features.h2hDraws / 10,
      m.features.h2hAwayWins / 10,
      m.features.homeCleanSheets,
      m.features.awayCleanSheets,
      m.features.homeBttsRate,
      m.features.awayBttsRate,
      m.features.homeOver15Rate,
      m.features.awayOver15Rate,
      m.features.homeOver25Rate,
      m.features.awayOver25Rate,
      // League-specific features
      stats.homeWinRate,
      stats.drawRate,
      stats.avgGoals / 5,
      stats.competitiveness,
    ];
    
    return baseFeatures;
  });
  
  const labels = leagueData.map(m => [
    m.target.homeWin ? 1 : 0,
    m.target.draw ? 1 : 0,
    m.target.awayWin ? 1 : 0,
  ]);
  
  // Create smaller network for league-specific data
  const model = tf.sequential();
  
  model.add(tf.layers.dense({
    inputShape: [enhancedFeatures[0].length],
    units: 32,
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.02 }),
  }));
  
  model.add(tf.layers.dropout({ rate: 0.4 }));
  
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu',
  }));
  
  model.add(tf.layers.dense({
    units: 3,
    activation: 'softmax',
  }));
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  
  const xs = tf.tensor2d(enhancedFeatures);
  const ys = tf.tensor2d(labels);
  
  await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 16,
    validationSplit: 0.2,
    verbose: 0,
  });
  
  xs.dispose();
  ys.dispose();
  
  // Store model
  leagueModels.set(leagueId, model);
  
  console.log(`[League Model] Trained for league ${leagueId} with ${leagueData.length} matches`);
  
  return model;
}

/**
 * Train models for all major leagues
 */
export async function trainAllLeagueModels(
  trainingData: ProcessedMatchData[],
  onProgress?: (current: number, total: number, leagueName: string) => void
): Promise<void> {
  // Get unique leagues from training data
  const leagueIds = [...new Set(trainingData.map(m => m.league.id))];
  
  // Prioritize major leagues
  const priorityLeagues = [39, 140, 135, 78, 61, 94, 88]; // EPL, La Liga, Serie A, etc.
  const sortedLeagues = leagueIds.sort((a, b) => {
    const aPriority = priorityLeagues.indexOf(a);
    const bPriority = priorityLeagues.indexOf(b);
    if (aPriority === -1 && bPriority === -1) return 0;
    if (aPriority === -1) return 1;
    if (bPriority === -1) return -1;
    return aPriority - bPriority;
  });
  
  for (let i = 0; i < sortedLeagues.length; i++) {
    const leagueId = sortedLeagues[i];
    const league = ALL_LEAGUES.find(l => l.id === leagueId);
    const leagueName = league?.name || `League ${leagueId}`;
    
    if (onProgress) {
      onProgress(i + 1, sortedLeagues.length, leagueName);
    }
    
    try {
      await trainLeagueSpecificModel(leagueId, trainingData);
    } catch (e) {
      console.warn(`[League Model] Failed to train for ${leagueName}:`, e);
    }
    
    // Small delay to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Predict using league-specific model
 */
export function predictWithLeagueModel(
  match: ProcessedMatchData,
  useCharacteristics: boolean = true
): {
  probabilities: number[];
  confidence: number;
  modelType: 'league-specific' | 'generic';
} {
  const leagueId = match.league.id;
  const model = leagueModels.get(leagueId);
  
  if (!model) {
    // Fallback to generic approach
    return {
      probabilities: [0.33, 0.34, 0.33],
      confidence: 33,
      modelType: 'generic',
    };
  }
  
  const stats = leagueStats.get(leagueId);
  
  // Build features
  const features = [
    ...match.features.homeForm.map(x => x / 3),
    ...match.features.awayForm.map(x => x / 3),
    match.features.homeGoalsScoredAvg / 5,
    match.features.homeGoalsConcededAvg / 5,
    match.features.awayGoalsScoredAvg / 5,
    match.features.awayGoalsConcededAvg / 5,
    match.features.h2hHomeWins / 10,
    match.features.h2hDraws / 10,
    match.features.h2hAwayWins / 10,
    match.features.homeCleanSheets,
    match.features.awayCleanSheets,
    match.features.homeBttsRate,
    match.features.awayBttsRate,
    match.features.homeOver15Rate,
    match.features.awayOver15Rate,
    match.features.homeOver25Rate,
    match.features.awayOver25Rate,
    // League characteristics
    stats?.homeWinRate || 0.45,
    stats?.drawRate || 0.26,
    stats?.avgGoals || 2.7 / 5,
    stats?.competitiveness || 0.5,
  ];
  
  const input = tf.tensor2d([features]);
  const prediction = model.predict(input) as tf.Tensor;
  const probs = Array.from(prediction.dataSync());
  
  input.dispose();
  prediction.dispose();
  
  // Adjust for league characteristics
  let finalProbs = probs;
  if (useCharacteristics && stats) {
    finalProbs = adjustForLeagueCharacteristics(probs, leagueId);
  }
  
  return {
    probabilities: finalProbs,
    confidence: Math.round(Math.max(...finalProbs) * 100),
    modelType: 'league-specific',
  };
}

/**
 * Get league insights
 */
export function getLeagueInsights(leagueId: number): {
  characteristics: LeagueCharacteristics | null;
  bestBets: string[];
  trends: string[];
} {
  const stats = leagueStats.get(leagueId);
  
  if (!stats) {
    return {
      characteristics: null,
      bestBets: [],
      trends: [],
    };
  }
  
  const bestBets: string[] = [];
  const trends: string[] = [];
  
  if (stats.bttsRate > 0.55) {
    bestBets.push('BTTS Sí');
    trends.push('Alta tasa de ambos equipos marcando');
  }
  
  if (stats.over25Rate > 0.55) {
    bestBets.push('Over 2.5');
    trends.push('Liga con muchos goles');
  }
  
  if (stats.drawRate > 0.30) {
    bestBets.push('Empates (doble oportunidad)');
    trends.push('Liga muy pareja, muchos empates');
  }
  
  if (stats.homeWinRate > 0.50) {
    trends.push('Fuerte ventaja de localía');
  }
  
  if (stats.upsetRate > 0.30) {
    trends.push('Liga impredecible, muchas sorpresas');
  }
  
  if (stats.competitiveness > 0.7) {
    trends.push('Liga muy competitiva, cualquiera puede ganar');
  }
  
  return {
    characteristics: stats,
    bestBets,
    trends,
  };
}

/**
 * Compare team within league context
 */
export function compareTeamsInLeague(
  team1Id: number,
  team2Id: number,
  leagueId: number,
  trainingData: ProcessedMatchData[]
): {
  team1Stats: {
    avgPoints: number;
    goalsFor: number;
    goalsAgainst: number;
    form: string;
  };
  team2Stats: {
    avgPoints: number;
    goalsFor: number;
    goalsAgainst: number;
    form: string;
  };
  headToHead: {
    played: number;
    team1Wins: number;
    draws: number;
    team2Wins: number;
  };
} {
  const leagueMatches = trainingData.filter(m => 
    m.league.id === leagueId &&
    (m.teams.home.id === team1Id || m.teams.away.id === team1Id ||
     m.teams.home.id === team2Id || m.teams.away.id === team2Id)
  );
  
  const team1Matches = leagueMatches.filter(m => 
    m.teams.home.id === team1Id || m.teams.away.id === team1Id
  );
  
  const team2Matches = leagueMatches.filter(m => 
    m.teams.home.id === team2Id || m.teams.away.id === team2Id
  );
  
  const h2hMatches = leagueMatches.filter(m =>
    (m.teams.home.id === team1Id && m.teams.away.id === team2Id) ||
    (m.teams.home.id === team2Id && m.teams.away.id === team1Id)
  );
  
  // Calculate stats for team 1
  let t1Points = 0;
  let t1GF = 0;
  let t1GA = 0;
  let t1Form = '';
  
  for (const m of team1Matches.slice(0, 5)) {
    if (m.goals.home === null || m.goals.away === null) continue;
    const isHome = m.teams.home.id === team1Id;
    const gf = isHome ? m.goals.home : m.goals.away;
    const ga = isHome ? m.goals.away : m.goals.home;
    
    t1GF += gf!;
    t1GA += ga!;
    
    if (gf! > ga!) {
      t1Points += 3;
      t1Form += 'W';
    } else if (gf === ga) {
      t1Points += 1;
      t1Form += 'D';
    } else {
      t1Form += 'L';
    }
  }
  
  // Calculate stats for team 2
  let t2Points = 0;
  let t2GF = 0;
  let t2GA = 0;
  let t2Form = '';
  
  for (const m of team2Matches.slice(0, 5)) {
    if (m.goals.home === null || m.goals.away === null) continue;
    const isHome = m.teams.home.id === team2Id;
    const gf = isHome ? m.goals.home : m.goals.away;
    const ga = isHome ? m.goals.away : m.goals.home;
    
    t2GF += gf!;
    t2GA += ga!;
    
    if (gf! > ga!) {
      t2Points += 3;
      t2Form += 'W';
    } else if (gf === ga) {
      t2Points += 1;
      t2Form += 'D';
    } else {
      t2Form += 'L';
    }
  }
  
  // Calculate H2H
  let t1Wins = 0;
  let draws = 0;
  let t2Wins = 0;
  
  for (const m of h2hMatches) {
    if (m.goals.home === null || m.goals.away === null) continue;
    const t1IsHome = m.teams.home.id === team1Id;
    const t1Goals = t1IsHome ? m.goals.home : m.goals.away;
    const t2Goals = t1IsHome ? m.goals.away : m.goals.home;
    
    if (t1Goals! > t2Goals!) t1Wins++;
    else if (t1Goals === t2Goals) draws++;
    else t2Wins++;
  }
  
  return {
    team1Stats: {
      avgPoints: t1Points / Math.min(5, team1Matches.length),
      goalsFor: t1GF,
      goalsAgainst: t1GA,
      form: t1Form,
    },
    team2Stats: {
      avgPoints: t2Points / Math.min(5, team2Matches.length),
      goalsFor: t2GF,
      goalsAgainst: t2GA,
      form: t2Form,
    },
    headToHead: {
      played: h2hMatches.length,
      team1Wins: t1Wins,
      draws,
      team2Wins: t2Wins,
    },
  };
}

export type { LeagueCharacteristics };
