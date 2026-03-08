/**
 * Expected Value (EV) Calculator
 * 
 * Fórmula: EV = (Probabilidad × Cuota) - 1
 * 
 * Ejemplo:
 * - Probabilidad real: 60% (0.60)
 * - Cuota del mercado: 2.0
 * - EV = (0.60 × 2.0) - 1 = 0.20 = +20%
 * 
 * Interpretación:
 * - EV > 0: Apuesta con valor (+EV)
 * - EV = 0: Apuesta justa
 * - EV < 0: Apuesta sin valor (-EV)
 */

export interface EVCalculation {
  ev: number;                    // Expected Value (decimal)
  evPercentage: number;          // EV como porcentaje
  probability: number;           // Probabilidad estimada (0-1)
  odds: number;                  // Cuota decimal
  impliedProbability: number;    // Probabilidad implícita en la cuota
  edge: number;                  // Ventaja sobre el mercado
  grade: 'A' | 'B' | 'C' | 'D' | 'F';  // Calificación
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID';
  kellyStake: number;            // Porcentaje de bankroll según Kelly
}

/**
 * Calcular el Expected Value de una apuesta
 */
export function calculateEV(
  probability: number,  // Probabilidad estimada (0-1 o 0-100)
  odds: number,          // Cuota decimal (ej: 2.0)
  kellyFraction: number = 0.25  // Fracción de Kelly conservadora
): EVCalculation {
  // Normalizar probabilidad a 0-1
  const prob = probability > 1 ? probability / 100 : probability;
  
  // Calcular probabilidad implícita en la cuota
  const impliedProbability = 1 / odds;
  
  // Calcular EV
  const ev = (prob * odds) - 1;
  const evPercentage = ev * 100;
  
  // Calcular edge (ventaja)
  const edge = prob - impliedProbability;
  
  // Calificar el pick
  const grade = calculateGrade(ev, edge);
  
  // Recomendación
  const recommendation = getRecommendation(ev, edge);
  
  // Calcular stake óptimo (Kelly Criterion)
  const kellyStake = calculateKellyStake(prob, odds, kellyFraction);
  
  return {
    ev,
    evPercentage,
    probability: prob,
    odds,
    impliedProbability,
    edge,
    grade,
    recommendation,
    kellyStake,
  };
}

/**
 * Calcular calificación basada en EV y Edge
 */
function calculateGrade(ev: number, edge: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (ev >= 0.15 && edge >= 0.10) return 'A';
  if (ev >= 0.08 && edge >= 0.05) return 'B';
  if (ev >= 0.03 && edge >= 0.02) return 'C';
  if (ev >= 0 && edge >= 0) return 'D';
  return 'F';
}

/**
 * Obtener recomendación basada en EV
 */
function getRecommendation(ev: number, edge: number): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' {
  if (ev >= 0.10 && edge >= 0.08) return 'STRONG_BUY';
  if (ev >= 0.05 && edge >= 0.04) return 'BUY';
  if (ev >= 0) return 'HOLD';
  return 'AVOID';
}

/**
 * Kelly Criterion: Calcular el stake óptimo
 * 
 * Fórmula: f* = (bp - q) / b
 * donde:
 * - f* = fracción del bankroll a apostar
 * - b = odds - 1 (ganancia neta por unidad apostada)
 * - p = probabilidad de ganar
 * - q = probabilidad de perder = 1 - p
 */
export function calculateKellyStake(
  probability: number,
  odds: number,
  fraction: number = 0.25
): number {
  const prob = probability > 1 ? probability / 100 : probability;
  const b = odds - 1;  // Ganancia neta
  const p = prob;
  const q = 1 - p;
  
  const kelly = (b * p - q) / b;
  
  // Aplicar fracción de Kelly para reducir riesgo
  return Math.max(0, kelly * fraction);
}

/**
 * Obtener color según el EV
 */
export function getEVColor(ev: number): string {
  if (ev >= 0.15) return 'text-emerald-400';
  if (ev >= 0.08) return 'text-green-400';
  if (ev >= 0.03) return 'text-blue-400';
  if (ev >= 0) return 'text-slate-400';
  return 'text-red-400';
}

/**
 * Obtener color de fondo según el EV
 */
export function getEVBgColor(ev: number): string {
  if (ev >= 0.15) return 'bg-emerald-500/10 border-emerald-500/20';
  if (ev >= 0.08) return 'bg-green-500/10 border-green-500/20';
  if (ev >= 0.03) return 'bg-blue-500/10 border-blue-500/20';
  if (ev >= 0) return 'bg-slate-500/10 border-slate-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

/**
 * Obtener color según la calificación
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'B': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'C': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'D': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'F': return 'text-red-400 bg-red-500/10 border-red-500/20';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
}

/**
 * Obtener etiqueta de recomendación en español
 */
export function getRecommendationLabel(rec: string): string {
  switch (rec) {
    case 'STRONG_BUY': return 'Compra Fuerte';
    case 'BUY': return 'Compra';
    case 'HOLD': return 'Neutral';
    case 'AVOID': return 'Evitar';
    default: return 'Sin datos';
  }
}

/**
 * Formatear EV para mostrar
 */
export function formatEV(ev: number): string {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${(ev * 100).toFixed(1)}%`;
}

/**
 * Formatear stake recomendado
 */
export function formatStake(stake: number): string {
  return `${(stake * 100).toFixed(1)}%`;
}
