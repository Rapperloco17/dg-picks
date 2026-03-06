// Best Picks Service
// Analiza partidos del día y selecciona los mejores picks basados en valor y confianza

import { getFixturesByDate, getCurrentSeason } from './api-football';

// Función de Kelly Criterion para sizing
function calculateKellyStake(probability: number, odds: number): number {
  const edge = (probability * odds) - 1;
  const kelly = edge / (odds - 1);
  return Math.max(0, Math.min(kelly, 0.25)); // Max 25% del bankroll
}

// Interfaz simple de predicción
interface SimplePrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  over25: number;
  under25: number;
  btts: number;
  confidence: number;
  corners?: { over85: number; avgTotal: number };
}

export interface BestPick {
  id: string;
  matchId: number;
  league: string;
  leagueId: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  market: '1X2' | 'OVER_UNDER' | 'BTTS' | 'CORNERS' | 'CARDS';
  selection: string;
  odds: number;
  probability: number;
  confidence: number; // 0-100
  ev: number; // Expected value
  kellyStake: number; // % recomendado del bankroll
  score: number; // Score compuesto (0-100)
  reasoning: string[];
  isValueBet: boolean;
}

export interface DailyBestPicks {
  date: string;
  totalMatches: number;
  analyzedMatches: number;
  bestPicks: BestPick[];
  generatedAt: string;
}

// Umbral mínimo para considerar un pick como "bueno"
const MIN_CONFIDENCE = 55;
const MIN_EV = 0.05; // 5% de valor esperado
const MIN_ODDS = 1.3;
const MAX_ODDS = 5.0;

/**
 * Genera los mejores picks del día
 */
export async function generateDailyBestPicks(date?: string): Promise<DailyBestPicks> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  console.log(`[BestPicks] Generando picks para ${targetDate}...`);
  
  try {
    // Obtener partidos del día
    const matches = await getFixturesByDate(targetDate);
    console.log(`[BestPicks] ${matches.length} partidos encontrados`);
    
    if (matches.length === 0) {
      return {
        date: targetDate,
        totalMatches: 0,
        analyzedMatches: 0,
        bestPicks: [],
        generatedAt: new Date().toISOString(),
      };
    }
    
    const allPicks: BestPick[] = [];
    
    // Analizar cada partido
    for (const match of matches) {
      // Solo partidos no iniciados
      if (match.fixture.status.short !== 'NS') continue;
      
      try {
        const picks = await analyzeMatchForBestPicks(match);
        allPicks.push(...picks);
      } catch (error) {
        console.warn(`[BestPicks] Error analizando partido ${match.fixture.id}:`, error);
      }
    }
    
    // Ordenar por score y tomar los mejores
    const sortedPicks = allPicks
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
    
    console.log(`[BestPicks] ${sortedPicks.length} mejores picks generados`);
    
    return {
      date: targetDate,
      totalMatches: matches.length,
      analyzedMatches: allPicks.length,
      bestPicks: sortedPicks,
      generatedAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('[BestPicks] Error generando picks:', error);
    throw error;
  }
}

/**
 * Analiza un partido y genera picks potenciales
 */
async function analyzeMatchForBestPicks(match: any): Promise<BestPick[]> {
  const picks: BestPick[] = [];
  
  // Generar predicción simplificada
  // Usamos probabilidades basadas en reglas simples para el demo
  // En producción, esto usaría el modelo ML entrenado
  const homeWinProb = 0.45; // Default
  const drawProb = 0.25;
  const awayWinProb = 0.30;
  const over25Prob = 0.55;
  const bttsProb = 0.50;
  
  const prediction = {
    homeWin: homeWinProb,
    draw: drawProb,
    awayWin: awayWinProb,
    over25: over25Prob,
    under25: 1 - over25Prob,
    btts: bttsProb,
    confidence: 60,
    corners: { over85: 0.6, avgTotal: 9.5 }
  };
  
  const homeTeam = match.teams.home.name;
  const awayTeam = match.teams.away.name;
  const league = match.league.name;
  const leagueId = match.league.id;
  const matchId = match.fixture.id;
  const date = match.fixture.date;
  
  // 1X2 - Moneyline
  if (prediction.homeWin > MIN_CONFIDENCE / 100) {
    const odds = 1 / prediction.homeWin; // Odds implícitas
    if (odds >= MIN_ODDS && odds <= MAX_ODDS) {
      const ev = calculateEV(prediction.homeWin, odds);
      const pick = createPick({
        matchId, league, leagueId, date, homeTeam, awayTeam,
        market: '1X2',
        selection: `1 - ${homeTeam}`,
        probability: prediction.homeWin * 100,
        odds,
        ev,
        reasoning: [`${(prediction.homeWin * 100).toFixed(1)}% probabilidad de victoria local`],
      });
      if (pick.score > 50) picks.push(pick);
    }
  }
  
  if (prediction.awayWin > MIN_CONFIDENCE / 100) {
    const odds = 1 / prediction.awayWin;
    if (odds >= MIN_ODDS && odds <= MAX_ODDS) {
      const ev = calculateEV(prediction.awayWin, odds);
      const pick = createPick({
        matchId, league, leagueId, date, homeTeam, awayTeam,
        market: '1X2',
        selection: `2 - ${awayTeam}`,
        probability: prediction.awayWin * 100,
        odds,
        ev,
        reasoning: [`${(prediction.awayWin * 100).toFixed(1)}% probabilidad de victoria visitante`],
      });
      if (pick.score > 50) picks.push(pick);
    }
  }
  
  // Over/Under 2.5
  if (prediction.over25 > MIN_CONFIDENCE / 100) {
    const odds = 1 / prediction.over25;
    if (odds >= MIN_ODDS && odds <= MAX_ODDS) {
      const ev = calculateEV(prediction.over25, odds);
      const pick = createPick({
        matchId, league, leagueId, date, homeTeam, awayTeam,
        market: 'OVER_UNDER',
        selection: 'Over 2.5',
        probability: prediction.over25 * 100,
        odds,
        ev,
        reasoning: [`${(prediction.over25 * 100).toFixed(1)}% probabilidad de over 2.5`],
      });
      if (pick.score > 50) picks.push(pick);
    }
  }
  
  if ((1 - prediction.over25) > MIN_CONFIDENCE / 100) {
    const probUnder = 1 - prediction.over25;
    const odds = 1 / probUnder;
    if (odds >= MIN_ODDS && odds <= MAX_ODDS) {
      const ev = calculateEV(probUnder, odds);
      const pick = createPick({
        matchId, league, leagueId, date, homeTeam, awayTeam,
        market: 'OVER_UNDER',
        selection: 'Under 2.5',
        probability: probUnder * 100,
        odds,
        ev,
        reasoning: [`${(probUnder * 100).toFixed(1)}% probabilidad de under 2.5`],
      });
      if (pick.score > 50) picks.push(pick);
    }
  }
  
  // BTTS - Ambos anotan
  if (prediction.btts > MIN_CONFIDENCE / 100) {
    const odds = 1 / prediction.btts;
    if (odds >= MIN_ODDS && odds <= MAX_ODDS) {
      const ev = calculateEV(prediction.btts, odds);
      const pick = createPick({
        matchId, league, leagueId, date, homeTeam, awayTeam,
        market: 'BTTS',
        selection: 'Sí - Ambos anotan',
        probability: prediction.btts * 100,
        odds,
        ev,
        reasoning: [`${(prediction.btts * 100).toFixed(1)}% probabilidad BTTS`],
      });
      if (pick.score > 50) picks.push(pick);
    }
  }
  
  // Corners (si hay datos)
  if (prediction.corners && prediction.corners.over85 > MIN_CONFIDENCE / 100) {
    const odds = 1.8; // Asumido, en realidad vendría de bookmaker
    const ev = calculateEV(prediction.corners.over85, odds);
    const pick = createPick({
      matchId, league, leagueId, date, homeTeam, awayTeam,
      market: 'CORNERS',
      selection: 'Over 8.5 Corners',
      probability: prediction.corners.over85 * 100,
      odds,
      ev,
      reasoning: [`Promedio ${prediction.corners.avgTotal.toFixed(1)} corners por partido`],
    });
    if (pick.score > 50) picks.push(pick);
  }
  
  return picks;
}

/**
 * Crea un objeto BestPick con todos los cálculos
 */
function createPick(params: {
  matchId: number;
  league: string;
  leagueId: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  market: BestPick['market'];
  selection: string;
  probability: number;
  odds: number;
  ev: number;
  reasoning: string[];
}): BestPick {
  // Calcular Kelly stake
  const kelly = calculateKellyStake(params.probability / 100, params.odds);
  const kellyStake = Math.min(kelly * 100, 5); // Max 5% del bankroll
  
  // Calcular confianza basada en probabilidad
  const confidence = params.probability;
  
  // Calcular score compuesto (0-100)
  // Ponderación: EV (40%), Confianza (40%), Kelly (20%)
  const evScore = Math.min((params.ev * 100) * 2, 100); // EV 50% = 100 puntos
  const confScore = confidence;
  const kellyScore = (kellyStake / 5) * 100; // Normalizar a 0-100
  
  const score = (evScore * 0.4) + (confScore * 0.4) + (kellyScore * 0.2);
  
  return {
    id: `${params.matchId}-${params.market}-${Date.now()}`,
    matchId: params.matchId,
    league: params.league,
    leagueId: params.leagueId,
    date: params.date,
    homeTeam: params.homeTeam,
    awayTeam: params.awayTeam,
    market: params.market,
    selection: params.selection,
    odds: params.odds,
    probability: params.probability,
    confidence,
    ev: params.ev,
    kellyStake,
    score: Math.round(score),
    reasoning: params.reasoning,
    isValueBet: params.ev > MIN_EV,
  };
}

/**
 * Calcula el Expected Value (EV)
 */
function calculateEV(probability: number, odds: number): number {
  return (probability * odds) - 1;
}

/**
 * Obtiene picks guardados en caché o genera nuevos
 */
let cachedPicks: DailyBestPicks | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export async function getBestPicks(date?: string): Promise<DailyBestPicks> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const now = Date.now();
  
  // Usar caché si es válida
  if (cachedPicks && 
      cachedPicks.date === targetDate && 
      (now - cacheTimestamp) < CACHE_TTL) {
    console.log('[BestPicks] Usando caché');
    return cachedPicks;
  }
  
  // Generar nuevos picks
  const picks = await generateDailyBestPicks(targetDate);
  cachedPicks = picks;
  cacheTimestamp = now;
  
  return picks;
}

/**
 * Filtra picks por nivel de confianza
 */
export function filterPicksByConfidence(picks: BestPick[], minConfidence: number): BestPick[] {
  return picks.filter(p => p.confidence >= minConfidence);
}

/**
 * Filtra picks por mercado
 */
export function filterPicksByMarket(picks: BestPick[], market: BestPick['market']): BestPick[] {
  return picks.filter(p => p.market === market);
}

/**
 * Obtiene solo los value bets (EV positivo)
 */
export function getValueBets(picks: BestPick[]): BestPick[] {
  return picks.filter(p => p.isValueBet);
}
