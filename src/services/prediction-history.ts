import { EnsemblePredictionResult } from './ensemble-predictions';
import { PickStatus } from '@/types';

// Storage keys
const STORAGE_KEYS = {
  predictions: 'dg-picks-prediction-history',
  stats: 'dg-picks-prediction-stats',
};

// Stored prediction with result
export interface StoredPrediction {
  id: string;
  date: string;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  leagueTier: 1 | 2 | 3;
  market: string;
  selection: string;
  probability: number;
  odds?: number;
  ev: number;
  confidence: 'high' | 'medium' | 'low';
  consensus: 'strong' | 'moderate' | 'weak';
  usingRealOdds: boolean;
  modelContributions: Array<{
    model: string;
    probability: number;
    weight: number;
  }>;
  // Result tracking
  result?: PickStatus;
  actualOutcome?: string;
  profit?: number;
  settledAt?: string;
  // Metadata
  createdAt: string;
}

// Performance statistics
export interface PredictionStats {
  totalPredictions: number;
  pendingPredictions: number;
  settledPredictions: number;
  wonPredictions: number;
  lostPredictions: number;
  winRate: number;
  avgEV: number;
  avgOdds: number;
  totalProfit: number;
  roi: number;
  byMarket: Record<string, {
    predictions: number;
    wins: number;
    losses: number;
    winRate: number;
    profit: number;
  }>;
  byConsensus: Record<string, {
    predictions: number;
    wins: number;
    winRate: number;
  }>;
  byModel: Record<string, {
    predictions: number;
    wins: number;
    winRate: number;
  }>;
  dailyPerformance: Array<{
    date: string;
    predictions: number;
    wins: number;
    profit: number;
  }>;
}

// Save predictions to history
export function savePredictionsToHistory(
  results: EnsemblePredictionResult[]
): void {
  if (typeof window === 'undefined') return;

  const existing = getPredictionHistory();
  const newPredictions: StoredPrediction[] = [];

  for (const result of results) {
    for (const pred of result.predictions) {
      // Check if already exists
      const exists = existing.some(
        p => p.matchId === result.match.fixture.id && 
             p.market === pred.market && 
             p.selection === pred.selection
      );
      
      if (!exists) {
        newPredictions.push({
          id: `${result.match.fixture.id}-${pred.market}-${pred.selection}-${Date.now()}`,
          date: result.match.fixture.date.split('T')[0],
          matchId: result.match.fixture.id,
          homeTeam: result.match.teams.home.name,
          awayTeam: result.match.teams.away.name,
          leagueName: result.match.league.name,
          leagueTier: result.leagueTier,
          market: pred.market,
          selection: pred.selection,
          probability: pred.probability,
          odds: pred.odds,
          ev: pred.ev,
          confidence: pred.confidence,
          consensus: pred.consensus,
          usingRealOdds: result.usingRealOdds,
          modelContributions: pred.modelContributions,
          result: 'PENDING',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  if (newPredictions.length > 0) {
    const updated = [...newPredictions, ...existing];
    localStorage.setItem(STORAGE_KEYS.predictions, JSON.stringify(updated));
    console.log(`[Prediction History] Saved ${newPredictions.length} new predictions`);
  }
}

// Get prediction history
export function getPredictionHistory(
  filters?: {
    fromDate?: string;
    toDate?: string;
    market?: string;
    result?: PickStatus;
    minEV?: number;
  }
): StoredPrediction[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEYS.predictions);
  if (!stored) return [];

  try {
    let predictions: StoredPrediction[] = JSON.parse(stored);

    // Apply filters
    if (filters) {
      if (filters.fromDate) {
        predictions = predictions.filter(p => p.date >= filters.fromDate!);
      }
      if (filters.toDate) {
        predictions = predictions.filter(p => p.date <= filters.toDate!);
      }
      if (filters.market) {
        predictions = predictions.filter(p => p.market === filters.market);
      }
      if (filters.result) {
        predictions = predictions.filter(p => p.result === filters.result);
      }
      if (filters.minEV !== undefined) {
        predictions = predictions.filter(p => p.ev >= filters.minEV!);
      }
    }

    return predictions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('[Prediction History] Error parsing history:', error);
    return [];
  }
}

// Update prediction result
export function updatePredictionResult(
  predictionId: string,
  result: PickStatus,
  actualOutcome: string,
  profit?: number
): void {
  if (typeof window === 'undefined') return;

  const predictions = getPredictionHistory();
  const index = predictions.findIndex(p => p.id === predictionId);
  
  if (index !== -1) {
    predictions[index].result = result;
    predictions[index].actualOutcome = actualOutcome;
    predictions[index].profit = profit;
    predictions[index].settledAt = new Date().toISOString();
    
    localStorage.setItem(STORAGE_KEYS.predictions, JSON.stringify(predictions));
    console.log(`[Prediction History] Updated prediction ${predictionId} with result ${result}`);
  }
}

// Calculate statistics
export function calculatePredictionStats(): PredictionStats {
  const predictions = getPredictionHistory();
  
  const settled = predictions.filter(p => p.result !== 'PENDING');
  const won = settled.filter(p => p.result === 'WON');
  const lost = settled.filter(p => p.result === 'LOST');
  
  // By market
  const byMarket: PredictionStats['byMarket'] = {};
  for (const pred of settled) {
    if (!byMarket[pred.market]) {
      byMarket[pred.market] = { predictions: 0, wins: 0, losses: 0, winRate: 0, profit: 0 };
    }
    byMarket[pred.market].predictions++;
    if (pred.result === 'WON') {
      byMarket[pred.market].wins++;
      byMarket[pred.market].profit += pred.profit || 0;
    } else if (pred.result === 'LOST') {
      byMarket[pred.market].losses++;
      byMarket[pred.market].profit -= 1; // Assuming 1u stake
    }
  }
  
  // Calculate win rates by market
  for (const market of Object.keys(byMarket)) {
    const m = byMarket[market];
    m.winRate = m.predictions > 0 ? (m.wins / m.predictions) * 100 : 0;
  }
  
  // By consensus
  const byConsensus: PredictionStats['byConsensus'] = {
    strong: { predictions: 0, wins: 0, winRate: 0 },
    moderate: { predictions: 0, wins: 0, winRate: 0 },
    weak: { predictions: 0, wins: 0, winRate: 0 },
  };
  
  for (const pred of settled) {
    byConsensus[pred.consensus].predictions++;
    if (pred.result === 'WON') {
      byConsensus[pred.consensus].wins++;
    }
  }
  
  for (const consensus of Object.keys(byConsensus)) {
    const c = byConsensus[consensus];
    c.winRate = c.predictions > 0 ? (c.wins / c.predictions) * 100 : 0;
  }
  
  // By model (track which models contributed to winning predictions)
  const byModel: PredictionStats['byModel'] = {};
  for (const pred of settled) {
    for (const contrib of pred.modelContributions) {
      if (!byModel[contrib.model]) {
        byModel[contrib.model] = { predictions: 0, wins: 0, winRate: 0 };
      }
      byModel[contrib.model].predictions++;
      if (pred.result === 'WON') {
        byModel[contrib.model].wins++;
      }
    }
  }
  
  for (const model of Object.keys(byModel)) {
    const m = byModel[model];
    m.winRate = m.predictions > 0 ? (m.wins / m.predictions) * 100 : 0;
  }
  
  // Daily performance
  const dailyMap = new Map<string, { predictions: number; wins: number; profit: number }>();
  for (const pred of settled) {
    const date = pred.date;
    const day = dailyMap.get(date) || { predictions: 0, wins: 0, profit: 0 };
    day.predictions++;
    if (pred.result === 'WON') {
      day.wins++;
      day.profit += pred.profit || 0;
    } else if (pred.result === 'LOST') {
      day.profit -= 1;
    }
    dailyMap.set(date, day);
  }
  
  const dailyPerformance = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      predictions: data.predictions,
      wins: data.wins,
      profit: data.profit,
    }));
  
  const totalProfit = won.reduce((sum, p) => sum + (p.profit || 0), 0) - 
                      lost.length; // Assuming 1u stake
  
  return {
    totalPredictions: predictions.length,
    pendingPredictions: predictions.filter(p => p.result === 'PENDING').length,
    settledPredictions: settled.length,
    wonPredictions: won.length,
    lostPredictions: lost.length,
    winRate: settled.length > 0 ? (won.length / settled.length) * 100 : 0,
    avgEV: predictions.length > 0 
      ? predictions.reduce((sum, p) => sum + p.ev, 0) / predictions.length 
      : 0,
    avgOdds: predictions.filter(p => p.odds).length > 0
      ? predictions.filter(p => p.odds).reduce((sum, p) => sum + (p.odds || 0), 0) / 
        predictions.filter(p => p.odds).length
      : 0,
    totalProfit,
    roi: settled.length > 0 ? (totalProfit / settled.length) * 100 : 0,
    byMarket,
    byConsensus,
    byModel,
    dailyPerformance,
  };
}

// Clear history (for testing)
export function clearPredictionHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.predictions);
  console.log('[Prediction History] Cleared all predictions');
}

// Export to CSV
export function exportPredictionsToCSV(): string {
  const predictions = getPredictionHistory();
  
  const headers = [
    'Date', 'League', 'Home Team', 'Away Team', 'Market', 'Selection',
    'Probability', 'Odds', 'EV', 'Confidence', 'Consensus', 'Real Odds',
    'Result', 'Profit', 'Models'
  ].join(',');
  
  const rows = predictions.map(p => [
    p.date,
    `"${p.leagueName}"`,
    `"${p.homeTeam}"`,
    `"${p.awayTeam}"`,
    p.market,
    p.selection,
    p.probability.toFixed(2),
    p.odds?.toFixed(2) || '',
    p.ev.toFixed(4),
    p.confidence,
    p.consensus,
    p.usingRealOdds ? 'Yes' : 'No',
    p.result,
    p.profit?.toFixed(2) || '',
    `"${p.modelContributions.map(m => m.model).join(', ')}"`
  ].join(','));
  
  return [headers, ...rows].join('\n');
}

// Get pending predictions for a specific date
export function getPendingPredictionsForDate(date: string): StoredPrediction[] {
  return getPredictionHistory({ 
    fromDate: date, 
    toDate: date,
    result: 'PENDING' 
  });
}

// Auto-settle predictions based on match results
export function settlePredictions(
  matchId: number,
  matchResult: {
    homeGoals: number;
    awayGoals: number;
  }
): void {
  const predictions = getPredictionHistory();
  const pendingForMatch = predictions.filter(
    p => p.matchId === matchId && p.result === 'PENDING'
  );
  
  const { homeGoals, awayGoals } = matchResult;
  const homeWin = homeGoals > awayGoals;
  const draw = homeGoals === awayGoals;
  const awayWin = homeGoals < awayGoals;
  const btts = homeGoals > 0 && awayGoals > 0;
  const over25 = homeGoals + awayGoals > 2.5;
  
  for (const pred of pendingForMatch) {
    let isWin = false;
    
    switch (pred.market) {
      case '1X2':
        if (pred.selection === '1' && homeWin) isWin = true;
        else if (pred.selection === 'X' && draw) isWin = true;
        else if (pred.selection === '2' && awayWin) isWin = true;
        break;
      case 'BTTS':
        if (pred.selection === 'Sí' && btts) isWin = true;
        if (pred.selection === 'No' && !btts) isWin = true;
        break;
      case 'OVER_UNDER_25':
        if (pred.selection.startsWith('Over') && over25) isWin = true;
        if (pred.selection.startsWith('Under') && !over25) isWin = true;
        break;
    }
    
    const result = isWin ? 'WON' : 'LOST';
    const profit = isWin && pred.odds ? (pred.odds - 1) : -1;
    
    updatePredictionResult(
      pred.id,
      result,
      `${homeGoals}-${awayGoals}`,
      profit
    );
  }
}
