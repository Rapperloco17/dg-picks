// Backtest Service
// Simula picks históricos para medir rendimiento

import { historicalData, HistoricalMatch } from './historical-data-store';
import { predictWithTrainedModel, extractFeatures, MatchFeatures } from './ml-trainer';
import { loadAllLocalData } from './local-data-loader';

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  leagues: number[];
  minConfidence: number;     // 0-100
  minOdds: number;
  maxOdds: number;
  stake: number;             // Unidades por pick
  bankroll: number;          // Bankroll inicial
}

export interface SimulatedPick {
  matchId: number;
  date: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  confidence: number;
  predictedProb: number;
  result: 'win' | 'loss' | 'push';
  profit: number;
  balanceAfter: number;
}

export interface BacktestResults {
  totalPicks: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  roi: number;
  totalProfit: number;
  finalBankroll: number;
  maxDrawdown: number;
  avgOdds: number;
  avgConfidence: number;
  profitByMarket: Record<string, { picks: number; profit: number; roi: number }>;
  picks: SimulatedPick[];
  equityCurve: Array<{ date: string; balance: number }>;
}

// Ejecutar backtest
export async function runBacktest(config: BacktestConfig): Promise<BacktestResults> {
  // Cargar datos si no están cargados
  if (!historicalData.isDataLoaded()) {
    await loadAllLocalData();
  }
  
  // Obtener partidos del período
  let matches: HistoricalMatch[] = [];
  
  if (config.leagues.length === 0 || config.leagues.includes(0)) {
    // Todas las ligas
    matches = historicalData.getLeagueMatches(0);
  } else {
    // Ligas específicas
    config.leagues.forEach(leagueId => {
      matches.push(...historicalData.getLeagueMatches(leagueId));
    });
  }
  
  // Filtrar por fecha
  matches = matches.filter(m => {
    const matchDate = new Date(m.fixture.date);
    return matchDate >= config.startDate && 
           matchDate <= config.endDate &&
           m.fixture.status.short === 'FT';
  });
  
  // Ordenar por fecha
  matches.sort((a, b) => 
    new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  );
  
  const picks: SimulatedPick[] = [];
  const equityCurve: Array<{ date: string; balance: number }> = [];
  let currentBankroll = config.bankroll;
  let maxBankroll = config.bankroll;
  let maxDrawdown = 0;
  
  // Simular cada partido
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    
    // Extraer features y predecir
    try {
      const features = extractFeatures(match, matches.slice(0, i));
      if (!features) continue; // Skip if features extraction fails
      const prediction = predictWithTrainedModel(features);
      
      // Determinar si hacer pick basado en confianza
      if (prediction.confidence >= config.minConfidence) {
        const simulatedPick = simulatePick(
          match, 
          prediction, 
          config, 
          currentBankroll
        );
        
        if (simulatedPick) {
          picks.push(simulatedPick);
          currentBankroll = simulatedPick.balanceAfter;
          
          // Track max drawdown
          if (currentBankroll > maxBankroll) {
            maxBankroll = currentBankroll;
          }
          const drawdown = (maxBankroll - currentBankroll) / maxBankroll * 100;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
          
          // Equity curve (una entrada por día)
          const dateStr = match.fixture.date.split('T')[0];
          const lastEntry = equityCurve[equityCurve.length - 1];
          if (!lastEntry || lastEntry.date !== dateStr) {
            equityCurve.push({ date: dateStr, balance: currentBankroll });
          } else {
            lastEntry.balance = currentBankroll;
          }
        }
      }
    } catch (error) {
      // Ignorar partidos con error
    }
  }
  
  // Calcular métricas
  const wins = picks.filter(p => p.result === 'win').length;
  const losses = picks.filter(p => p.result === 'loss').length;
  const pushes = picks.filter(p => p.result === 'push').length;
  const totalPicks = picks.length;
  
  const totalProfit = picks.reduce((sum, p) => sum + p.profit, 0);
  const totalStaked = picks.reduce((sum, p) => sum + p.stake, 0);
  
  // Profit by market
  const profitByMarket: Record<string, { picks: number; profit: number; roi: number }> = {};
  picks.forEach(pick => {
    if (!profitByMarket[pick.market]) {
      profitByMarket[pick.market] = { picks: 0, profit: 0, roi: 0 };
    }
    profitByMarket[pick.market].picks++;
    profitByMarket[pick.market].profit += pick.profit;
  });
  
  Object.keys(profitByMarket).forEach(market => {
    const m = profitByMarket[market];
    const staked = picks.filter(p => p.market === market).reduce((s, p) => s + p.stake, 0);
    m.roi = staked > 0 ? (m.profit / staked) * 100 : 0;
  });
  
  return {
    totalPicks,
    wins,
    losses,
    pushes,
    winRate: totalPicks > 0 ? (wins / (wins + losses)) * 100 : 0,
    roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
    totalProfit,
    finalBankroll: currentBankroll,
    maxDrawdown,
    avgOdds: totalPicks > 0 ? picks.reduce((s, p) => s + p.odds, 0) / totalPicks : 0,
    avgConfidence: totalPicks > 0 ? picks.reduce((s, p) => s + p.confidence, 0) / totalPicks : 0,
    profitByMarket,
    picks,
    equityCurve,
  };
}

// Simular un pick individual
function simulatePick(
  match: HistoricalMatch,
  prediction: { result: { home: number; draw: number; away: number }; over25: number; btts: number; confidence: number },
  config: BacktestConfig,
  currentBankroll: number
): SimulatedPick | null {
  const homeGoals = match.goals.home ?? 0;
  const awayGoals = match.goals.away ?? 0;
  const actualResult = homeGoals > awayGoals ? 'H' : homeGoals < awayGoals ? 'A' : 'D';
  
  // Determinar mejor pick basado en predicción
  let bestPick: { market: string; selection: string; odds: number; prob: number } | null = null;
  
  // Simular odds (en backtest real usaríamos odds históricas)
  const simulatedOdds = {
    home: 2.2,
    draw: 3.4,
    away: 3.2,
    over25: 1.85,
    under25: 1.95,
    bttsYes: 1.75,
    bttsNo: 2.0,
  };
  
  // Evaluar 1X2
  const resultProbs = [
    { key: 'home', prob: prediction.result.home, odds: simulatedOdds.home, label: '1' },
    { key: 'draw', prob: prediction.result.draw, odds: simulatedOdds.draw, label: 'X' },
    { key: 'away', prob: prediction.result.away, odds: simulatedOdds.away, label: '2' },
  ];
  
  for (const r of resultProbs) {
    if (r.odds >= config.minOdds && r.odds <= config.maxOdds) {
      const ev = (r.prob * r.odds) - 1;
      if (ev > 0.05 && (!bestPick || ev > ((bestPick.prob * bestPick.odds) - 1))) {
        bestPick = { market: '1X2', selection: r.label, odds: r.odds, prob: r.prob };
      }
    }
  }
  
  // Evaluar Over 2.5
  const over25Odds = prediction.over25 > 0.5 ? simulatedOdds.over25 : simulatedOdds.under25;
  const over25Prob = prediction.over25 > 0.5 ? prediction.over25 : 1 - prediction.over25;
  const over25Selection = prediction.over25 > 0.5 ? 'Over 2.5' : 'Under 2.5';
  
  if (over25Odds >= config.minOdds && over25Odds <= config.maxOdds) {
    const ev = (over25Prob * over25Odds) - 1;
    if (ev > 0.05 && (!bestPick || ev > ((bestPick.prob * bestPick.odds) - 1))) {
      bestPick = { market: 'Over/Under 2.5', selection: over25Selection, odds: over25Odds, prob: over25Prob };
    }
  }
  
  // Evaluar BTTS
  const bttsOdds = prediction.btts > 0.5 ? simulatedOdds.bttsYes : simulatedOdds.bttsNo;
  const bttsProb = prediction.btts > 0.5 ? prediction.btts : 1 - prediction.btts;
  const bttsSelection = prediction.btts > 0.5 ? 'Sí' : 'No';
  
  if (bttsOdds >= config.minOdds && bttsOdds <= config.maxOdds) {
    const ev = (bttsProb * bttsOdds) - 1;
    if (ev > 0.05 && (!bestPick || ev > ((bestPick.prob * bestPick.odds) - 1))) {
      bestPick = { market: 'BTTS', selection: bttsSelection, odds: bttsOdds, prob: bttsProb };
    }
  }
  
  if (!bestPick) return null;
  
  // Calcular stake (flat o Kelly)
  const stake = config.stake; // Flat stake por simplicidad
  
  // Determinar resultado
  let result: 'win' | 'loss' | 'push';
  if (bestPick.market === '1X2') {
    const predicted = bestPick.selection === '1' ? 'H' : bestPick.selection === '2' ? 'A' : 'D';
    result = predicted === actualResult ? 'win' : 'loss';
  } else if (bestPick.market === 'Over/Under 2.5') {
    const totalGoals = homeGoals + awayGoals;
    const predictedOver = bestPick.selection === 'Over 2.5';
    const actualOver = totalGoals > 2.5;
    result = predictedOver === actualOver ? 'win' : 'loss';
  } else if (bestPick.market === 'BTTS') {
    const predictedBtts = bestPick.selection === 'Sí';
    const actualBtts = homeGoals > 0 && awayGoals > 0;
    result = predictedBtts === actualBtts ? 'win' : 'loss';
  } else {
    result = 'loss';
  }
  
  // Calcular profit
  const profit = result === 'win' ? stake * (bestPick.odds - 1) : -stake;
  
  return {
    matchId: match.fixture.id,
    date: match.fixture.date,
    league: match.league.name,
    homeTeam: match.teams.home.name,
    awayTeam: match.teams.away.name,
    market: bestPick.market,
    selection: bestPick.selection,
    odds: bestPick.odds,
    stake,
    confidence: prediction.confidence,
    predictedProb: bestPick.prob * 100,
    result,
    profit,
    balanceAfter: currentBankroll + profit,
  };
}

// Backtest rápido con configuración default
export async function runQuickBacktest(): Promise<BacktestResults> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // Últimos 6 meses
  
  return runBacktest({
    startDate,
    endDate,
    leagues: [], // Todas
    minConfidence: 60,
    minOdds: 1.5,
    maxOdds: 5.0,
    stake: 10,
    bankroll: 1000,
  });
}
