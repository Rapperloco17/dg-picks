import { Match, MarketType, LeagueTier } from '@/types';
import { getFixturesByDate } from './api-football';
import { ProcessedMatchData, getTrainingData } from './historical-data';
import { predictEnsemble, calculateEloRatings } from './ensemble-model';
import { calculateMarketEV } from './market-models';
import { TIER_1_LEAGUES, TIER_2_LEAGUES, TIER_3_LEAGUES } from '@/constants/leagues';
import { Timestamp } from 'firebase/firestore';
import { 
  getRealOdds, 
  matchOddsToMatch, 
  getOddsForMarket, 
  calculateRealEV,
  MatchOdds 
} from './odds-api';
import { savePredictionsToHistory } from './prediction-history';

// All active leagues
const ALL_LEAGUES = [...TIER_1_LEAGUES, ...TIER_2_LEAGUES, ...TIER_3_LEAGUES];

// Extended prediction result
export interface EnsemblePredictionResult {
  match: Match;
  predictions: {
    market: MarketType;
    selection: string;
    probability: number;
    odds?: number;
    ev: number;
    confidence: 'high' | 'medium' | 'low';
    consensus: 'strong' | 'moderate' | 'weak';
    modelContributions: Array<{
      model: string;
      probability: number;
      weight: number;
    }>;
  }[];
  leagueTier: 1 | 2 | 3;
  usingRealOdds: boolean;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Get tomorrow's date
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// Convert Match to ProcessedMatchData format (simplified)
function convertToProcessedMatch(
  match: Match,
  historicalMatches: ProcessedMatchData[]
): ProcessedMatchData {
  // Find team historical data if available
  const homeMatches = historicalMatches.filter(
    m => m.teams.home.id === match.teams.home.id || m.teams.away.id === match.teams.home.id
  );
  const awayMatches = historicalMatches.filter(
    m => m.teams.home.id === match.teams.away.id || m.teams.away.id === match.teams.away.id
  );

  // Calculate simple form (last 5 matches)
  const calculateForm = (matches: ProcessedMatchData[], teamId: number): number[] => {
    return matches
      .slice(-5)
      .map(m => {
        const isHome = m.teams.home.id === teamId;
        const goalsFor = isHome ? m.goals.home : m.goals.away;
        const goalsAgainst = isHome ? m.goals.away : m.goals.home;
        if (goalsFor === null || goalsAgainst === null) return 0;
        if (goalsFor > goalsAgainst) return 3;
        if (goalsFor === goalsAgainst) return 1;
        return 0;
      });
  };

  const homeForm = calculateForm(homeMatches, match.teams.home.id);
  const awayForm = calculateForm(awayMatches, match.teams.away.id);

  // Calculate averages
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const totalGoals = (match.goals.home ?? 0) + (match.goals.away ?? 0);

  return {
    id: match.fixture.id,
    fixture: match.fixture,
    league: match.league,
    teams: match.teams,
    goals: match.goals,
    score: match.score,
    features: {
      homeGoalsScoredAvg: avg(homeMatches.map(m => m.teams.home.id === match.teams.home.id ? m.goals.home || 0 : m.goals.away || 0)),
      homeGoalsConcededAvg: avg(homeMatches.map(m => m.teams.home.id === match.teams.home.id ? m.goals.away || 0 : m.goals.home || 0)),
      awayGoalsScoredAvg: avg(awayMatches.map(m => m.teams.away.id === match.teams.away.id ? m.goals.away || 0 : m.goals.home || 0)),
      awayGoalsConcededAvg: avg(awayMatches.map(m => m.teams.away.id === match.teams.away.id ? m.goals.home || 0 : m.goals.away || 0)),
      homeForm: homeForm.length > 0 ? homeForm : [1, 1, 1, 1, 1],
      awayForm: awayForm.length > 0 ? awayForm : [1, 1, 1, 1, 1],
      homeBttsRate: 0.5,
      awayBttsRate: 0.5,
      homeOver25Rate: 0.5,
      awayOver25Rate: 0.5,
      homeOver15Rate: 0.5,
      awayOver15Rate: 0.5,
      homeCleanSheets: 0,
      awayCleanSheets: 0,
      h2hHomeWins: 0,
      h2hDraws: 0,
      h2hAwayWins: 0,
    },
    target: {
      homeWin: match.goals.home !== null && match.goals.away !== null && match.goals.home > match.goals.away,
      draw: match.goals.home !== null && match.goals.away !== null && match.goals.home === match.goals.away,
      awayWin: match.goals.home !== null && match.goals.away !== null && match.goals.home < match.goals.away,
      btts: match.goals.home !== null && match.goals.away !== null && match.goals.home > 0 && match.goals.away > 0,
      over15: totalGoals > 1.5,
      over25: totalGoals > 2.5,
      over35: totalGoals > 3.5,
      totalGoals,
    },
    metadata: {
      season: match.league.season || new Date().getFullYear(),
      collectedAt: Timestamp.now(),
      hasCompleteData: false,
    },
  };
}

// Simulate odds when real odds are not available
function simulateOddsForMatch(match: ProcessedMatchData): Record<string, number> {
  const homeStrength = match.features.homeGoalsScoredAvg - match.features.homeGoalsConcededAvg;
  const awayStrength = match.features.awayGoalsScoredAvg - match.features.awayGoalsConcededAvg;
  
  const homeProb = Math.max(0.2, Math.min(0.6, 0.33 + (homeStrength - awayStrength) * 0.05));
  const drawProb = 0.28;
  const awayProb = 1 - homeProb - drawProb;
  
  const margin = 0.92; // Bookmaker margin
  
  return {
    home: Math.max(1.2, Math.min(8, (1 / homeProb) * margin)),
    draw: Math.max(2.5, Math.min(5, (1 / drawProb) * margin)),
    away: Math.max(1.2, Math.min(10, (1 / awayProb) * margin)),
    bttsYes: 1.85,
    bttsNo: 1.95,
    over25: 1.9,
    under25: 1.9,
  };
}

// Get predictions for today's matches
export async function getEnsemblePredictions(
  date: string = getTodayDate(),
  minEV: number = 0.05
): Promise<EnsemblePredictionResult[]> {
  try {
    // Get league IDs
    const leagueIds = ALL_LEAGUES.map(l => l.id);
    
    // Get matches for the date
    const matches = await getFixturesByDate(date, leagueIds);
    
    // Filter to only upcoming matches (not started)
    const upcomingMatches = matches.filter(m => 
      m.fixture.status.short === 'NS' || 
      m.fixture.status.short === 'TBD'
    );

    if (upcomingMatches.length === 0) {
      return [];
    }

    // Get historical data for feature extraction
    const historicalData = await getTrainingData();
    
    // Calculate ELO ratings from historical data
    const eloRatings = calculateEloRatings(historicalData);

    // Get real odds for all leagues (grouped by league for efficiency)
    const realOddsMap = new Map<number, any[]>();
    const uniqueLeagueIds = [...new Set(upcomingMatches.map(m => m.league.id))];
    
    for (const leagueId of uniqueLeagueIds) {
      try {
        const odds = await getRealOdds(leagueId, date);
        realOddsMap.set(leagueId, odds);
      } catch (e) {
        console.log(`[Ensemble] No real odds for league ${leagueId}`);
      }
    }

    const results: EnsemblePredictionResult[] = [];

    for (const match of upcomingMatches) {
      // Determine league tier
      let leagueTier: 1 | 2 | 3 = 3;
      if (TIER_1_LEAGUES.some(l => l.id === match.league.id)) leagueTier = 1;
      else if (TIER_2_LEAGUES.some(l => l.id === match.league.id)) leagueTier = 2;

      // Convert match to processed format
      const processedMatch = convertToProcessedMatch(match, historicalData);
      
      // Get ensemble prediction for 1X2
      const ensembleResult = predictEnsemble(processedMatch, {
        models: ['neural_network', 'elo', 'poisson'],
        weights: [0.5, 0.3, 0.2],
        useStacking: false,
      });

      // Try to get real odds, fallback to simulated
      const leagueOdds = realOddsMap.get(match.league.id) || [];
      const matchRealOdds = matchOddsToMatch(leagueOdds, match);
      
      // Use real odds if available, otherwise simulated
      const useRealOdds = !!matchRealOdds;
      const simulatedOdds = simulateOddsForMatch(processedMatch);
      
      // Helper to get odds (real or simulated)
      const getOdds = (market: MarketType, selection: string): number | undefined => {
        if (matchRealOdds) {
          return getOddsForMarket(matchRealOdds, market, selection);
        }
        // Fallback to simulated
        switch (market) {
          case '1X2':
            if (selection === '1') return simulatedOdds.home;
            if (selection === 'X') return simulatedOdds.draw;
            if (selection === '2') return simulatedOdds.away;
            break;
          case 'BTTS':
            if (selection === 'Sí') return simulatedOdds.bttsYes;
            if (selection === 'No') return simulatedOdds.bttsNo;
            break;
          case 'OVER_UNDER_25':
            if (selection.startsWith('Over')) return simulatedOdds.over25;
            if (selection.startsWith('Under')) return simulatedOdds.under25;
            break;
        }
        return undefined;
      };

      const predictions: EnsemblePredictionResult['predictions'] = [];

      // 1X2 Prediction
      const homeProb = ensembleResult.finalProbabilities[0];
      const drawProb = ensembleResult.finalProbabilities[1];
      const awayProb = ensembleResult.finalProbabilities[2];

      // Home win
      const homeOdds = getOdds('1X2', '1');
      const homeEV = calculateRealEV(homeProb, homeOdds);
      if (homeEV >= minEV) {
        predictions.push({
          market: '1X2',
          selection: '1',
          probability: homeProb * 100,
          odds: homeOdds,
          ev: homeEV,
          confidence: homeProb > 0.6 ? 'high' : homeProb > 0.5 ? 'medium' : 'low',
          consensus: ensembleResult.consensus,
          modelContributions: ensembleResult.predictions.map(p => ({
            model: p.model,
            probability: p.probabilities[0] * 100,
            weight: p.weight,
          })),
        });
      }

      // Draw
      const drawOdds = getOdds('1X2', 'X');
      const drawEV = calculateRealEV(drawProb, drawOdds);
      if (drawEV >= minEV) {
        predictions.push({
          market: '1X2',
          selection: 'X',
          probability: drawProb * 100,
          odds: drawOdds,
          ev: drawEV,
          confidence: drawProb > 0.35 ? 'high' : drawProb > 0.25 ? 'medium' : 'low',
          consensus: ensembleResult.consensus,
          modelContributions: ensembleResult.predictions.map(p => ({
            model: p.model,
            probability: p.probabilities[1] * 100,
            weight: p.weight,
          })),
        });
      }

      // Away win
      const awayOdds = getOdds('1X2', '2');
      const awayEV = calculateRealEV(awayProb, awayOdds);
      if (awayEV >= minEV) {
        predictions.push({
          market: '1X2',
          selection: '2',
          probability: awayProb * 100,
          odds: awayOdds,
          ev: awayEV,
          confidence: awayProb > 0.6 ? 'high' : awayProb > 0.5 ? 'medium' : 'low',
          consensus: ensembleResult.consensus,
          modelContributions: ensembleResult.predictions.map(p => ({
            model: p.model,
            probability: p.probabilities[2] * 100,
            weight: p.weight,
          })),
        });
      }

      // BTTS Prediction (simplified)
      const bttsProb = 0.55;
      const bttsOdds = getOdds('BTTS', 'Sí');
      const bttsEV = calculateRealEV(bttsProb, bttsOdds);
      if (bttsEV >= minEV) {
        predictions.push({
          market: 'BTTS',
          selection: 'Sí',
          probability: bttsProb * 100,
          odds: bttsOdds,
          ev: bttsEV,
          confidence: 'medium',
          consensus: 'moderate',
          modelContributions: [{ model: 'Poisson', probability: bttsProb * 100, weight: 1 }],
        });
      }

      // Over/Under 2.5 Prediction (simplified)
      const over25Prob = processedMatch.features.homeOver25Rate > 0.5 ? 0.55 : 0.45;
      const over25Odds = getOdds('OVER_UNDER_25', 'Over 2.5');
      const over25EV = calculateRealEV(over25Prob, over25Odds);
      if (over25EV >= minEV) {
        predictions.push({
          market: 'OVER_UNDER_25',
          selection: 'Over 2.5',
          probability: over25Prob * 100,
          odds: over25Odds,
          ev: over25EV,
          confidence: over25Prob > 0.6 ? 'high' : 'medium',
          consensus: 'moderate',
          modelContributions: [{ model: 'Poisson', probability: over25Prob * 100, weight: 1 }],
        });
      }

      // Only add if there are value predictions
      if (predictions.length > 0) {
        results.push({
          match,
          predictions: predictions.sort((a, b) => b.ev - a.ev),
          leagueTier,
          usingRealOdds: !!matchRealOdds,
        });
      }
    }

    // Sort by best EV first
    const sortedResults = results.sort((a, b) => {
      const maxEVA = Math.max(...a.predictions.map(p => p.ev));
      const maxEVB = Math.max(...b.predictions.map(p => p.ev));
      return maxEVB - maxEVA;
    });

    // Save to history
    savePredictionsToHistory(sortedResults);

    return sortedResults;

  } catch (error) {
    console.error('Error getting ensemble predictions:', error);
    return [];
  }
}

// Get prediction for a specific match
export async function getMatchEnsemblePrediction(
  match: Match
): Promise<EnsemblePredictionResult | null> {
  const predictions = await getEnsemblePredictions(getTodayDate(), 0);
  return predictions.find(p => p.match.fixture.id === match.fixture.id) || null;
}
