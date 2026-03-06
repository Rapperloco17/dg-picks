import { ProcessedMatchData } from './historical-data';
import { predictMarket, MarketType, calculateMarketEV } from './market-models';

// Backtest configuration
interface BacktestConfig {
  minOdds: number;
  maxOdds: number;
  minProbability: number;
  maxProbability: number;
  minEV: number;
  stake: number;
  kellyFraction: number;
  markets: MarketType[];
}

// Backtest result
interface BacktestResult {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  voidBets: number;
  winRate: number;
  totalStake: number;
  totalReturn: number;
  profit: number;
  roi: number;
  yield: number;
  avgOdds: number;
  avgEV: number;
  maxDrawdown: number;
  sharpeRatio: number;
  byMarket: Record<MarketType, {
    bets: number;
    wins: number;
    profit: number;
    roi: number;
  }>;
  monthlyResults: Array<{
    month: string;
    bets: number;
    profit: number;
    roi: number;
  }>;
  bets: Array<{
    date: string;
    match: string;
    market: MarketType;
    selection: string;
    odds: number;
    probability: number;
    ev: number;
    stake: number;
    result: 'win' | 'loss' | 'void';
    profit: number;
  }>;
}

const DEFAULT_CONFIG: BacktestConfig = {
  minOdds: 1.5,
  maxOdds: 5.0,
  minProbability: 50,
  maxProbability: 85,
  minEV: 0.05,
  stake: 10,
  kellyFraction: 0.25,
  markets: ['1X2', 'BTTS', 'OVER_UNDER_25'],
};

/**
 * Run backtest on historical data
 */
export function runBacktest(
  data: ProcessedMatchData[],
  config: Partial<BacktestConfig> = {}
): BacktestResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const bets: BacktestResult['bets'] = [];
  let totalStake = 0;
  let totalReturn = 0;
  let maxDrawdown = 0;
  let peak = 0;
  let runningProfit = 0;
  
  const byMarket: BacktestResult['byMarket'] = {
    '1X2': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'DOUBLE_CHANCE': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'OVER_UNDER': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'OVER_UNDER_25': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'OVER_UNDER_15': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'OVER_UNDER_35': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'BTTS': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'ASIAN_HANDICAP': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'CORNERS': { bets: 0, wins: 0, profit: 0, roi: 0 },
    'CARDS': { bets: 0, wins: 0, profit: 0, roi: 0 },
  };
  
  const monthlyMap = new Map<string, { bets: number; profit: number; stake: number }>();
  
  for (const match of data) {
    // Simulate odds (in real scenario, would use historical odds)
    const simulatedOdds = simulateOdds(match);
    
    for (const market of fullConfig.markets) {
      try {
        // Skip if model not available
        const prediction = simulatePrediction(match, market);
        
        // Check filters
        if (prediction.probability < fullConfig.minProbability ||
            prediction.probability > fullConfig.maxProbability) {
          continue;
        }
        
        const odds = getOddsForSelection(simulatedOdds, market, prediction.selection);
        
        if (!odds || odds < fullConfig.minOdds || odds > fullConfig.maxOdds) {
          continue;
        }
        
        const ev = calculateMarketEV(prediction.probability, odds);
        
        if (ev < fullConfig.minEV) {
          continue;
        }
        
        // Calculate stake using Kelly Criterion
        const kellyStake = calculateKellyStake(prediction.probability / 100, odds, fullConfig.stake, fullConfig.kellyFraction);
        
        // Determine result
        const result = determineResult(match, market, prediction.selection);
        const profit = result === 'win' ? kellyStake * (odds - 1) :
                      result === 'loss' ? -kellyStake : 0;
        
        // Track bet
        const bet = {
          date: match.fixture.date,
          match: `${match.teams.home.name} vs ${match.teams.away.name}`,
          market,
          selection: prediction.selection,
          odds,
          probability: prediction.probability,
          ev,
          stake: kellyStake,
          result,
          profit,
        };
        
        bets.push(bet);
        
        // Update totals
        totalStake += kellyStake;
        totalReturn += result === 'win' ? kellyStake * odds : result === 'void' ? kellyStake : 0;
        runningProfit += profit;
        
        // Update peak and drawdown
        if (runningProfit > peak) {
          peak = runningProfit;
        }
        const drawdown = peak - runningProfit;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
        
        // Update by market
        byMarket[market].bets++;
        if (result === 'win') byMarket[market].wins++;
        byMarket[market].profit += profit;
        
        // Update monthly
        const month = match.fixture.date.substring(0, 7); // YYYY-MM
        const monthly = monthlyMap.get(month) || { bets: 0, profit: 0, stake: 0 };
        monthly.bets++;
        monthly.profit += profit;
        monthly.stake += kellyStake;
        monthlyMap.set(month, monthly);
        
      } catch (e) {
        // Skip if error
      }
    }
  }
  
  // Calculate final stats
  const wonBets = bets.filter(b => b.result === 'win').length;
  const lostBets = bets.filter(b => b.result === 'loss').length;
  const voidBets = bets.filter(b => b.result === 'void').length;
  
  const profit = totalReturn - totalStake;
  const roi = totalStake > 0 ? (profit / totalStake) * 100 : 0;
  const winRate = bets.length > 0 ? (wonBets / bets.length) * 100 : 0;
  
  // Calculate by market ROI
  for (const market of Object.keys(byMarket) as MarketType[]) {
    const m = byMarket[market];
    m.roi = m.bets > 0 ? (m.profit / (m.bets * fullConfig.stake)) * 100 : 0;
  }
  
  // Calculate monthly results
  const monthlyResults = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      bets: data.bets,
      profit: data.profit,
      roi: data.stake > 0 ? (data.profit / data.stake) * 100 : 0,
    }));
  
  // Calculate Sharpe ratio (simplified)
  const monthlyReturns = monthlyResults.map(m => m.roi);
  const avgReturn = monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length || 0;
  const variance = monthlyReturns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / monthlyReturns.length || 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  // Calculate average odds and EV
  const avgOdds = bets.length > 0 ? bets.reduce((sum, b) => sum + b.odds, 0) / bets.length : 0;
  const avgEV = bets.length > 0 ? bets.reduce((sum, b) => sum + b.ev, 0) / bets.length : 0;
  
  return {
    totalBets: bets.length,
    wonBets,
    lostBets,
    voidBets,
    winRate,
    totalStake,
    totalReturn,
    profit,
    roi,
    yield: roi, // Same as ROI in this context
    avgOdds,
    avgEV,
    maxDrawdown,
    sharpeRatio,
    byMarket,
    monthlyResults,
    bets,
  };
}

/**
 * Simulate odds for a match (would use real historical odds in production)
 */
function simulateOdds(match: ProcessedMatchData): {
  home: number;
  draw: number;
  away: number;
  bttsYes: number;
  bttsNo: number;
  over25: number;
  under25: number;
  doubleChance1X: number;
  doubleChance12: number;
  doubleChanceX2: number;
  over15: number;
  under15: number;
  over35: number;
  under35: number;
  asianHandicapHome: number;
  asianHandicapAway: number;
  cornersOver: number;
  cornersUnder: number;
  cardsOver: number;
  cardsUnder: number;
} {
  // Calculate implied odds from features
  const homeStrength = match.features.homeGoalsScoredAvg - match.features.homeGoalsConcededAvg;
  const awayStrength = match.features.awayGoalsScoredAvg - match.features.awayGoalsConcededAvg;
  
  const homeProb = 0.33 + (homeStrength - awayStrength) * 0.05;
  const drawProb = 0.28;
  const awayProb = 1 - homeProb - drawProb;
  
  return {
    home: Math.max(1.2, Math.min(10, 1 / homeProb * (0.9 + Math.random() * 0.2))),
    draw: Math.max(2.5, Math.min(5, 1 / drawProb * (0.9 + Math.random() * 0.2))),
    away: Math.max(1.2, Math.min(10, 1 / awayProb * (0.9 + Math.random() * 0.2))),
    bttsYes: match.features.homeBttsRate > 0.5 ? 1.8 : 2.0,
    bttsNo: match.features.homeBttsRate > 0.5 ? 2.0 : 1.8,
    over25: match.features.homeOver25Rate > 0.5 ? 1.85 : 2.05,
    under25: match.features.homeOver25Rate > 0.5 ? 2.05 : 1.85,
    doubleChance1X: 1.25,
    doubleChance12: 1.3,
    doubleChanceX2: 1.35,
    over15: match.features.homeOver25Rate > 0.5 ? 1.3 : 1.5,
    under15: match.features.homeOver25Rate > 0.5 ? 1.5 : 1.3,
    over35: match.features.homeOver25Rate > 0.5 ? 2.5 : 3.0,
    under35: match.features.homeOver25Rate > 0.5 ? 3.0 : 2.5,
    asianHandicapHome: homeProb > 0.5 ? 1.9 : 1.95,
    asianHandicapAway: awayProb > 0.3 ? 1.95 : 1.9,
    cornersOver: 1.9,
    cornersUnder: 1.9,
    cardsOver: 1.85,
    cardsUnder: 2.1,
  };
}

/**
 * Get odds for specific selection
 */
function getOddsForSelection(
  odds: ReturnType<typeof simulateOdds>,
  market: MarketType,
  selection: string
): number | null {
  switch (market) {
    case '1X2':
      if (selection === '1') return odds.home;
      if (selection === 'X') return odds.draw;
      if (selection === '2') return odds.away;
      break;
    case 'BTTS':
      if (selection === 'Sí') return odds.bttsYes;
      if (selection === 'No') return odds.bttsNo;
      break;
    case 'OVER_UNDER':
    case 'OVER_UNDER_25':
      if (selection.startsWith('Over')) return odds.over25;
      if (selection.startsWith('Under')) return odds.under25;
      break;
    case 'OVER_UNDER_15':
      if (selection.startsWith('Over')) return odds.over15;
      if (selection.startsWith('Under')) return odds.under15;
      break;
    case 'OVER_UNDER_35':
      if (selection.startsWith('Over')) return odds.over35;
      if (selection.startsWith('Under')) return odds.under35;
      break;
    case 'DOUBLE_CHANCE':
      if (selection === '1X') return odds.doubleChance1X;
      if (selection === '12') return odds.doubleChance12;
      if (selection === 'X2') return odds.doubleChanceX2;
      break;
    case 'ASIAN_HANDICAP':
      if (selection.startsWith('H1') || selection === 'Home' || selection === '1') return odds.asianHandicapHome;
      if (selection.startsWith('A1') || selection === 'Away' || selection === '2') return odds.asianHandicapAway;
      break;
    case 'CORNERS':
      if (selection.startsWith('Over')) return odds.cornersOver;
      if (selection.startsWith('Under')) return odds.cornersUnder;
      break;
    case 'CARDS':
      if (selection.startsWith('Over')) return odds.cardsOver;
      if (selection.startsWith('Under')) return odds.cardsUnder;
      break;
  }
  return null;
}

/**
 * Simulate prediction (would use actual model in production)
 */
function simulatePrediction(match: ProcessedMatchData, market: MarketType): {
  selection: string;
  probability: number;
} {
  switch (market) {
    case '1X2': {
      const homeStrength = match.features.homeGoalsScoredAvg + match.features.homeForm.reduce((a, b) => a + b, 0) / 5;
      const awayStrength = match.features.awayGoalsScoredAvg + match.features.awayForm.reduce((a, b) => a + b, 0) / 5;
      
      if (homeStrength > awayStrength + 0.5) {
        return { selection: '1', probability: 55 + Math.random() * 20 };
      } else if (awayStrength > homeStrength + 0.5) {
        return { selection: '2', probability: 50 + Math.random() * 20 };
      } else {
        return { selection: 'X', probability: 35 + Math.random() * 15 };
      }
    }
    case 'BTTS':
      return {
        selection: match.features.homeBttsRate > 0.5 ? 'Sí' : 'No',
        probability: 55 + Math.random() * 15,
      };
    case 'OVER_UNDER':
    case 'OVER_UNDER_25':
      return {
        selection: match.features.homeOver25Rate > 0.5 ? 'Over 2.5' : 'Under 2.5',
        probability: 55 + Math.random() * 15,
      };
    case 'OVER_UNDER_15':
      return {
        selection: match.features.homeGoalsScoredAvg + match.features.awayGoalsScoredAvg > 1.5 ? 'Over 1.5' : 'Under 1.5',
        probability: 55 + Math.random() * 15,
      };
    case 'OVER_UNDER_35':
      return {
        selection: match.features.homeGoalsScoredAvg + match.features.awayGoalsScoredAvg > 2.5 ? 'Over 3.5' : 'Under 3.5',
        probability: 55 + Math.random() * 15,
      };
    case 'DOUBLE_CHANCE': {
      const homeStrength = match.features.homeGoalsScoredAvg + match.features.homeForm.reduce((a, b) => a + b, 0) / 5;
      const awayStrength = match.features.awayGoalsScoredAvg + match.features.awayForm.reduce((a, b) => a + b, 0) / 5;
      if (homeStrength > awayStrength + 0.5) {
        return { selection: '1X', probability: 70 + Math.random() * 15 };
      } else if (awayStrength > homeStrength + 0.5) {
        return { selection: 'X2', probability: 65 + Math.random() * 15 };
      } else {
        return { selection: '12', probability: 60 + Math.random() * 15 };
      }
    }
    case 'ASIAN_HANDICAP': {
      const homeStr = match.features.homeGoalsScoredAvg - match.features.homeGoalsConcededAvg;
      if (homeStr > 0.5) {
        return { selection: 'H1 -0.5', probability: 55 + Math.random() * 15 };
      } else {
        return { selection: 'A1 +0.5', probability: 55 + Math.random() * 15 };
      }
    }
    case 'CORNERS':
      return {
        selection: Math.random() > 0.5 ? 'Over 9.5' : 'Under 9.5',
        probability: 55 + Math.random() * 15,
      };
    case 'CARDS':
      return {
        selection: Math.random() > 0.5 ? 'Over 3.5' : 'Under 3.5',
        probability: 55 + Math.random() * 15,
      };
    default:
      return { selection: '1', probability: 50 };
  }
}

/**
 * Determine result of a bet
 */
function determineResult(
  match: ProcessedMatchData,
  market: MarketType,
  selection: string
): 'win' | 'loss' | 'void' {
  switch (market) {
    case '1X2':
      if (match.target.homeWin && selection === '1') return 'win';
      if (match.target.draw && selection === 'X') return 'win';
      if (match.target.awayWin && selection === '2') return 'win';
      return 'loss';
    case 'BTTS':
      if (match.target.btts && selection === 'Sí') return 'win';
      if (!match.target.btts && selection === 'No') return 'win';
      return 'loss';
    case 'OVER_UNDER':
    case 'OVER_UNDER_25':
      if (match.target.over25 && (selection === 'Over 2.5' || selection.startsWith('Over'))) return 'win';
      if (!match.target.over25 && (selection === 'Under 2.5' || selection.startsWith('Under'))) return 'win';
      return 'loss';
    case 'OVER_UNDER_15':
      // Assume over15 target based on total goals
      const totalGoals15 = (match.target.over25 ? 3 : 1); // Approximation
      if (totalGoals15 > 1.5 && selection.startsWith('Over')) return 'win';
      if (totalGoals15 <= 1.5 && selection.startsWith('Under')) return 'win';
      return 'loss';
    case 'OVER_UNDER_35':
      const totalGoals35 = (match.target.over25 ? 3 : 1);
      if (totalGoals35 > 3.5 && selection.startsWith('Over')) return 'win';
      if (totalGoals35 <= 3.5 && selection.startsWith('Under')) return 'win';
      return 'loss';
    case 'DOUBLE_CHANCE':
      if ((match.target.homeWin || match.target.draw) && selection === '1X') return 'win';
      if ((match.target.homeWin || match.target.awayWin) && selection === '12') return 'win';
      if ((match.target.draw || match.target.awayWin) && selection === 'X2') return 'win';
      return 'loss';
    case 'ASIAN_HANDICAP':
      // Simplified AH logic (assuming -0.5/+0.5 lines)
      if (selection.startsWith('H') && match.target.homeWin) return 'win';
      if (selection.startsWith('A') && match.target.awayWin) return 'win';
      return 'loss';
    case 'CORNERS':
      // Simplified corner logic
      if (selection.startsWith('Over')) return Math.random() > 0.5 ? 'win' : 'loss';
      if (selection.startsWith('Under')) return Math.random() > 0.5 ? 'win' : 'loss';
      return 'loss';
    case 'CARDS':
      // Simplified cards logic
      if (selection.startsWith('Over')) return Math.random() > 0.5 ? 'win' : 'loss';
      if (selection.startsWith('Under')) return Math.random() > 0.5 ? 'win' : 'loss';
      return 'loss';
    default:
      return 'loss';
  }
}

/**
 * Calculate Kelly stake
 */
export function calculateKellyStake(
  probability: number,
  odds: number,
  maxStake: number,
  fraction: number
): number {
  const b = odds - 1;
  const p = probability;
  const q = 1 - p;
  
  const kelly = (b * p - q) / b;
  const stake = kelly * maxStake * fraction;
  
  return Math.max(0, Math.min(maxStake, stake));
}

/**
 * Optimize backtest parameters
 */
export function optimizeParameters(
  data: ProcessedMatchData[],
  parameterRanges: {
    minEV: number[];
    minProbability: number[];
    kellyFraction: number[];
  }
): Array<{
  config: Partial<BacktestConfig>;
  roi: number;
  sharpe: number;
  totalBets: number;
}> {
  const results: Array<{
    config: Partial<BacktestConfig>;
    roi: number;
    sharpe: number;
    totalBets: number;
  }> = [];
  
  for (const minEV of parameterRanges.minEV) {
    for (const minProb of parameterRanges.minProbability) {
      for (const kelly of parameterRanges.kellyFraction) {
        const config: Partial<BacktestConfig> = {
          minEV,
          minProbability: minProb,
          kellyFraction: kelly,
        };
        
        const result = runBacktest(data, config);
        
        results.push({
          config,
          roi: result.roi,
          sharpe: result.sharpeRatio,
          totalBets: result.totalBets,
        });
      }
    }
  }
  
  // Sort by ROI descending
  return results.sort((a, b) => b.roi - a.roi);
}

export type { BacktestConfig, BacktestResult };
