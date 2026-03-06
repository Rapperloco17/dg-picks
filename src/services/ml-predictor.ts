// ML Predictor
// Usa el modelo entrenado para hacer predicciones en partidos nuevos

import { Match } from '@/types';
import { hasTrainedModel, predictWithTrainedModel, extractFeatures as extractTrainFeatures, MatchFeatures } from './ml-trainer';
import { predictHybrid } from './ml-hybrid-model';
import { historicalData } from './historical-data-store';

export interface PredictionInput {
  match: Match;
  homeForm: any;
  awayForm: any;
  homeStats: any;
  awayStats: any;
  h2h: any;
  odds: any;
}

export interface PredictionOutput {
  // 1X2
  homeWin: number;
  draw: number;
  awayWin: number;
  
  // Goles
  over15: number;
  over25: number;
  over35: number;
  btts: number;
  
  // Tarjetas
  cards: {
    over45: number;
    over55: number;
    avgTotal: number;
  };
  
  // Corners
  corners: {
    over85: number;
    over95: number;
    over105: number;
    avgTotal: number;
  };
  
  // Metadata
  confidence: number;
  method: 'trained_model' | 'hybrid' | 'heuristic';
  recommendedPick: any;
}

// Función principal de predicción
export function predictMatch(input: PredictionInput): PredictionOutput {
  // Si hay modelo entrenado, usarlo
  if (hasTrainedModel() && historicalData.isDataLoaded()) {
    try {
      // Convertir a formato de features del modelo
      const features = convertToFeatures(input);
      const prediction = predictWithTrainedModel(features);
      
      // Combinar con predicciones de otros mercados (que el modelo entrenado no cubre)
      const hybrid = predictHybrid(
        input.match,
        input.homeForm,
        input.awayForm,
        input.homeStats,
        input.awayStats,
        input.h2h,
        input.odds
      );
      
      return {
        homeWin: prediction.result.home * 100,
        draw: prediction.result.draw * 100,
        awayWin: prediction.result.away * 100,
        over15: hybrid.over15,
        over25: prediction.over25 * 100,
        over35: hybrid.over35,
        btts: prediction.btts * 100,
        cards: hybrid.cards,
        corners: hybrid.corners,
        confidence: prediction.confidence,
        method: 'trained_model',
        recommendedPick: hybrid.recommendedPick,
      };
    } catch (error) {
      console.warn('[ML Predictor] Error using trained model, falling back to hybrid:', error);
    }
  }
  
  // Fallback a modelo híbrido
  const hybrid = predictHybrid(
    input.match,
    input.homeForm,
    input.awayForm,
    input.homeStats,
    input.awayStats,
    input.h2h,
    input.odds
  );
  
  return {
    homeWin: hybrid.homeWin,
    draw: hybrid.draw,
    awayWin: hybrid.awayWin,
    over15: hybrid.over15,
    over25: hybrid.over25,
    over35: hybrid.over35,
    btts: hybrid.btts,
    cards: hybrid.cards,
    corners: hybrid.corners,
    confidence: hybrid.confidence,
    method: 'hybrid',
    recommendedPick: hybrid.recommendedPick,
  };
}

// Convertir datos del partido a features para el modelo
function convertToFeatures(input: PredictionInput): MatchFeatures {
  const { homeForm, awayForm, homeStats, awayStats, h2h, match } = input;
  
  return {
    homeGoalsScoredAvg: homeForm.played > 0 ? homeForm.goalsFor / homeForm.played : 1.5,
    homeGoalsConcededAvg: homeForm.played > 0 ? homeForm.goalsAgainst / homeForm.played : 1.2,
    awayGoalsScoredAvg: awayForm.played > 0 ? awayForm.goalsFor / awayForm.played : 1.1,
    awayGoalsConcededAvg: awayForm.played > 0 ? awayForm.goalsAgainst / awayForm.played : 1.4,
    homeFormPoints: calculateFormPoints(homeForm.form),
    awayFormPoints: calculateFormPoints(awayForm.form),
    homePosition: homeStats.leaguePosition || 10,
    awayPosition: awayStats.leaguePosition || 10,
    homePoints: homeStats.points || 0,
    awayPoints: awayStats.points || 0,
    h2hHomeWins: h2h.homeWins || 0,
    h2hAwayWins: h2h.awayWins || 0,
    h2hDraws: h2h.draws || 0,
    h2hAvgGoals: h2h.avgGoals || 2.5,
    homeOver25Rate: (homeStats.over25 || 50) / 100,
    awayOver25Rate: (awayStats.over25 || 50) / 100,
    homeBttsRate: (homeStats.btts || 50) / 100,
    awayBttsRate: (awayStats.btts || 50) / 100,
    leagueId: match.league.id,
    isTopHalf: (homeStats.leaguePosition || 20) <= 10 && (awayStats.leaguePosition || 20) <= 10 ? 1 : 0,
    homeAvgCards: (homeStats as any).avgCards || 2.5,
    awayAvgCards: (awayStats as any).avgCards || 2.5,
    homeAvgCorners: (homeStats as any).avgCorners || 5.0,
    awayAvgCorners: (awayStats as any).avgCorners || 5.0,
  };
}

// Calcular puntos de forma (0-15)
function calculateFormPoints(form: string): number {
  if (!form) return 7;
  
  const last5 = form.slice(-5);
  let points = 0;
  
  for (const result of last5) {
    if (result === 'W') points += 3;
    else if (result === 'D') points += 1;
  }
  
  return points;
}

// Verificar si el modelo entrenado está disponible
export function isModelAvailable(): boolean {
  return hasTrainedModel();
}
