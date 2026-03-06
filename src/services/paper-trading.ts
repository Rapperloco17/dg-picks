import { Pick, PickStatus, MarketType } from '@/types';
import { calculateMarketEV } from './market-models';

// Paper trading account
interface PaperTradingAccount {
  initialBalance: number;
  currentBalance: number;
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  totalStake: number;
  totalProfit: number;
  roi: number;
  maxDrawdown: number;
  peakBalance: number;
  currentStreak: number;
  bestStreak: number;
  worstStreak: number;
  avgOdds: number;
  avgStake: number;
  yield: number;
}

// Paper bet
type PaperBet = Pick & {
  simulatedOdds: number;
  evAtPlacement: number;
  modelConfidence: number;
}

// Strategy configuration
interface TradingStrategy {
  name: string;
  description: string;
  minEV: number;
  maxEV: number;
  minOdds: number;
  maxOdds: number;
  minConfidence: number;
  maxConfidence: number;
  stakeType: 'flat' | 'kelly' | 'percentage';
  stakeValue: number;
  kellyFraction: number;
  maxStake: number;
  markets: MarketType[];
  leagues: number[];
  consecutiveLossStop: number;
  dailyLossLimit: number;
  dailyBetLimit: number;
}

// Default strategies
const DEFAULT_STRATEGIES: TradingStrategy[] = [
  {
    name: 'Conservative Value',
    description: 'Apuestas de valor seguro con EV > 10%',
    minEV: 0.10,
    maxEV: 0.50,
    minOdds: 1.50,
    maxOdds: 3.50,
    minConfidence: 60,
    maxConfidence: 100,
    stakeType: 'flat',
    stakeValue: 2,
    kellyFraction: 0.25,
    maxStake: 5,
    markets: ['1X2', 'BTTS', 'OVER_UNDER_25'],
    leagues: [],
    consecutiveLossStop: 3,
    dailyLossLimit: 10,
    dailyBetLimit: 5,
  },
  {
    name: 'Aggressive Kelly',
    description: 'Usa Kelly Criterion para maximizar crecimiento',
    minEV: 0.05,
    maxEV: 1.00,
    minOdds: 1.80,
    maxOdds: 5.00,
    minConfidence: 55,
    maxConfidence: 100,
    stakeType: 'kelly',
    stakeValue: 10,
    kellyFraction: 0.25,
    maxStake: 10,
    markets: ['1X2', 'OVER_UNDER_25'],
    leagues: [],
    consecutiveLossStop: 5,
    dailyLossLimit: 20,
    dailyBetLimit: 10,
  },
  {
    name: 'Underdog Hunter',
    description: 'Busca valor en underdogs con odds altas',
    minEV: 0.08,
    maxEV: 1.00,
    minOdds: 3.00,
    maxOdds: 10.00,
    minConfidence: 40,
    maxConfidence: 70,
    stakeType: 'percentage',
    stakeValue: 1,
    kellyFraction: 0.15,
    maxStake: 3,
    markets: ['1X2'],
    leagues: [],
    consecutiveLossStop: 4,
    dailyLossLimit: 5,
    dailyBetLimit: 3,
  },
];

// Storage keys
const STORAGE_KEYS = {
  account: 'dg-picks-paper-account',
  bets: 'dg-picks-paper-bets',
  strategies: 'dg-picks-paper-strategies',
  activeStrategy: 'dg-picks-paper-active-strategy',
};

// Initialize paper trading account
export function initializePaperTrading(
  initialBalance: number = 100
): PaperTradingAccount {
  if (typeof window === 'undefined') {
    return createDefaultAccount(initialBalance);
  }
  
  const saved = localStorage.getItem(STORAGE_KEYS.account);
  if (saved) {
    return JSON.parse(saved);
  }
  
  const account = createDefaultAccount(initialBalance);
  saveAccount(account);
  return account;
}

function createDefaultAccount(initialBalance: number): PaperTradingAccount {
  return {
    initialBalance,
    currentBalance: initialBalance,
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    pendingBets: 0,
    totalStake: 0,
    totalProfit: 0,
    roi: 0,
    maxDrawdown: 0,
    peakBalance: initialBalance,
    currentStreak: 0,
    bestStreak: 0,
    worstStreak: 0,
    avgOdds: 0,
    avgStake: 0,
    yield: 0,
  };
}

function saveAccount(account: PaperTradingAccount): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.account, JSON.stringify(account));
}

// Get all paper bets
export function getPaperBets(): PaperBet[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEYS.bets);
  return saved ? JSON.parse(saved) : [];
}

function savePaperBets(bets: PaperBet[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.bets, JSON.stringify(bets));
}

// Place a paper bet
export function placePaperBet(
  pickData: Omit<PaperBet, 'id' | 'createdAt' | 'result' | 'profit' | 'settledAt'>,
  strategy: TradingStrategy
): { success: boolean; message: string; bet?: PaperBet } {
  const account = initializePaperTrading();
  const bets = getPaperBets();
  
  // Check daily limits
  const todayBets = bets.filter(b => {
    const betDate = new Date(b.createdAt).toDateString();
    return betDate === new Date().toDateString();
  });
  
  if (todayBets.length >= strategy.dailyBetLimit) {
    return { success: false, message: 'Límite diario de apuestas alcanzado' };
  }
  
  // Check daily loss limit
  const todayLoss = todayBets
    .filter(b => b.result === 'LOST')
    .reduce((sum, b) => sum + b.stake, 0);
  
  if (todayLoss >= strategy.dailyLossLimit) {
    return { success: false, message: 'Límite de pérdida diario alcanzado' };
  }
  
  // Check consecutive losses
  const recentBets = bets.slice(-strategy.consecutiveLossStop);
  const consecutiveLosses = recentBets.every(b => b.result === 'LOST');
  
  if (consecutiveLosses && recentBets.length >= strategy.consecutiveLossStop) {
    return { success: false, message: 'Detención por racha de pérdidas' };
  }
  
  // Validate strategy constraints
  if (pickData.simulatedOdds < strategy.minOdds || pickData.simulatedOdds > strategy.maxOdds) {
    return { success: false, message: 'Cuota fuera de rango de estrategia' };
  }
  
  if (pickData.evAtPlacement < strategy.minEV || pickData.evAtPlacement > strategy.maxEV) {
    return { success: false, message: 'EV fuera de rango de estrategia' };
  }
  
  if (pickData.modelConfidence < strategy.minConfidence || pickData.modelConfidence > strategy.maxConfidence) {
    return { success: false, message: 'Confianza fuera de rango' };
  }
  
  // Calculate stake
  let stake = 0;
  
  switch (strategy.stakeType) {
    case 'flat':
      stake = strategy.stakeValue;
      break;
    case 'percentage':
      stake = account.currentBalance * (strategy.stakeValue / 100);
      break;
    case 'kelly':
      const p = pickData.modelConfidence / 100;
      const b = pickData.simulatedOdds - 1;
      const q = 1 - p;
      const kelly = (b * p - q) / b;
      stake = account.currentBalance * kelly * strategy.kellyFraction;
      break;
  }
  
  stake = Math.min(stake, strategy.maxStake);
  stake = Math.round(stake * 100) / 100;
  
  if (stake > account.currentBalance) {
    return { success: false, message: 'Fondos insuficientes' };
  }
  
  // Create bet
  const bet: PaperBet = {
    ...pickData,
    id: Math.random().toString(36).substring(2, 15),
    stake,
    result: 'PENDING',
    profit: null,
    createdAt: new Date().toISOString(),
    settledAt: null,
  };
  
  // Update account
  account.currentBalance -= stake;
  account.pendingBets++;
  account.totalBets++;
  account.totalStake += stake;
  
  // Save
  bets.push(bet);
  savePaperBets(bets);
  saveAccount(account);
  
  return { success: true, message: 'Apuesta colocada', bet };
}

// Settle a paper bet
export function settlePaperBet(
  betId: string,
  result: PickStatus,
  actualOdds?: number
): boolean {
  const bets = getPaperBets();
  const bet = bets.find(b => b.id === betId);
  
  if (!bet || bet.result !== 'PENDING') return false;
  
  const account = initializePaperTrading();
  
  bet.result = result;
  bet.settledAt = new Date().toISOString();
  
  let profit = 0;
  
  if (result === 'WON') {
    const odds = actualOdds || bet.simulatedOdds;
    profit = bet.stake * (odds - 1);
    account.wonBets++;
    account.currentStreak = account.currentStreak > 0 ? account.currentStreak + 1 : 1;
    account.bestStreak = Math.max(account.bestStreak, account.currentStreak);
  } else if (result === 'LOST') {
    profit = -bet.stake;
    account.lostBets++;
    account.currentStreak = account.currentStreak < 0 ? account.currentStreak - 1 : -1;
    account.worstStreak = Math.min(account.worstStreak, account.currentStreak);
  } else {
    // Void - return stake
    profit = 0;
    account.currentBalance += bet.stake;
  }
  
  bet.profit = profit;
  account.currentBalance += bet.stake + (result === 'WON' ? profit : 0);
  account.totalProfit += profit;
  account.pendingBets--;
  
  // Update stats
  account.peakBalance = Math.max(account.peakBalance, account.currentBalance);
  const drawdown = account.peakBalance - account.currentBalance;
  account.maxDrawdown = Math.max(account.maxDrawdown, drawdown);
  
  account.roi = (account.totalProfit / account.totalStake) * 100;
  account.yield = (account.totalProfit / account.initialBalance) * 100;
  account.avgOdds = bets.reduce((sum, b) => sum + b.simulatedOdds, 0) / bets.length;
  account.avgStake = account.totalStake / account.totalBets;
  
  savePaperBets(bets);
  saveAccount(account);
  
  return true;
}

// Get trading strategies
export function getTradingStrategies(): TradingStrategy[] {
  if (typeof window === 'undefined') return DEFAULT_STRATEGIES;
  
  const saved = localStorage.getItem(STORAGE_KEYS.strategies);
  return saved ? JSON.parse(saved) : DEFAULT_STRATEGIES;
}

export function saveTradingStrategies(strategies: TradingStrategy[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.strategies, JSON.stringify(strategies));
}

// Get/set active strategy
export function getActiveStrategy(): TradingStrategy | null {
  if (typeof window === 'undefined') return DEFAULT_STRATEGIES[0];
  
  const saved = localStorage.getItem(STORAGE_KEYS.activeStrategy);
  if (!saved) return DEFAULT_STRATEGIES[0];
  
  const strategies = getTradingStrategies();
  return strategies.find(s => s.name === saved) || DEFAULT_STRATEGIES[0];
}

export function setActiveStrategy(strategyName: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.activeStrategy, strategyName);
}

// Reset paper trading
export function resetPaperTrading(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(STORAGE_KEYS.account);
  localStorage.removeItem(STORAGE_KEYS.bets);
  localStorage.removeItem(STORAGE_KEYS.activeStrategy);
  
  initializePaperTrading(100);
}

// Get performance report
export function getPerformanceReport(): {
  account: PaperTradingAccount;
  dailyPnL: Array<{ date: string; profit: number; bets: number }>;
  byMarket: Record<MarketType, { bets: number; profit: number; roi: number }>;
  byOddsRange: Array<{ range: string; bets: number; profit: number; roi: number }>;
} {
  const account = initializePaperTrading();
  const bets = getPaperBets();
  
  // Daily P&L
  const dailyMap = new Map<string, { profit: number; bets: number }>();
  
  for (const bet of bets) {
    if (bet.result === 'PENDING') continue;
    
    const date = new Date(bet.createdAt).toISOString().split('T')[0];
    const current = dailyMap.get(date) || { profit: 0, bets: 0 };
    current.profit += bet.profit || 0;
    current.bets++;
    dailyMap.set(date, current);
  }
  
  const dailyPnL = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      profit: data.profit,
      bets: data.bets,
    }));
  
  // By market
  const byMarket: Record<MarketType, { bets: number; profit: number; roi: number }> = {
    '1X2': { bets: 0, profit: 0, roi: 0 },
    'DOUBLE_CHANCE': { bets: 0, profit: 0, roi: 0 },
    'OVER_UNDER': { bets: 0, profit: 0, roi: 0 },
    'OVER_UNDER_25': { bets: 0, profit: 0, roi: 0 },
    'OVER_UNDER_15': { bets: 0, profit: 0, roi: 0 },
    'OVER_UNDER_35': { bets: 0, profit: 0, roi: 0 },
    'BTTS': { bets: 0, profit: 0, roi: 0 },
    'ASIAN_HANDICAP': { bets: 0, profit: 0, roi: 0 },
    'CORNERS': { bets: 0, profit: 0, roi: 0 },
    'CARDS': { bets: 0, profit: 0, roi: 0 },
  };
  
  for (const bet of bets) {
    if (bet.result === 'PENDING') continue;
    
    const market = bet.market;
    byMarket[market].bets++;
    byMarket[market].profit += bet.profit || 0;
  }
  
  for (const market of Object.keys(byMarket) as MarketType[]) {
    const m = byMarket[market];
    m.roi = m.bets > 0 ? (m.profit / (m.bets * account.avgStake || 1)) * 100 : 0;
  }
  
  // By odds range
  const oddsRanges = [
    { min: 1.0, max: 1.5, label: '1.00-1.50' },
    { min: 1.5, max: 2.0, label: '1.51-2.00' },
    { min: 2.0, max: 2.5, label: '2.01-2.50' },
    { min: 2.5, max: 3.0, label: '2.51-3.00' },
    { min: 3.0, max: 5.0, label: '3.01-5.00' },
    { min: 5.0, max: 100, label: '5.00+' },
  ];
  
  const byOddsRange = oddsRanges.map(range => {
    const rangeBets = bets.filter(b => 
      b.simulatedOdds >= range.min && 
      b.simulatedOdds < range.max &&
      b.result !== 'PENDING'
    );
    
    const profit = rangeBets.reduce((sum, b) => sum + (b.profit || 0), 0);
    const stake = rangeBets.reduce((sum, b) => sum + b.stake, 0);
    
    return {
      range: range.label,
      bets: rangeBets.length,
      profit,
      roi: stake > 0 ? (profit / stake) * 100 : 0,
    };
  });
  
  return {
    account,
    dailyPnL,
    byMarket,
    byOddsRange,
  };
}

export type { PaperTradingAccount, PaperBet, TradingStrategy };
export { DEFAULT_STRATEGIES };
