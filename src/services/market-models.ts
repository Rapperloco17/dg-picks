import * as tf from '@tensorflow/tfjs';
import { ProcessedMatchData } from './historical-data';
import { MarketType } from '@/types';

export type { MarketType };

interface MarketModelConfig {
  inputFeatures: number;
  hiddenLayers: number[];
  outputUnits: number;
  outputActivation: string;
  lossFunction: string;
}

// Configuration for each market model
const MARKET_CONFIGS: Record<MarketType, MarketModelConfig> = {
  '1X2': {
    inputFeatures: 28,
    hiddenLayers: [64, 32, 16],
    outputUnits: 3,
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'DOUBLE_CHANCE': {
    inputFeatures: 28,
    hiddenLayers: [64, 32, 16],
    outputUnits: 3, // 1X, 12, X2
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'BTTS': {
    inputFeatures: 20,
    hiddenLayers: [32, 16],
    outputUnits: 2, // Yes/No
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'OVER_UNDER': {
    inputFeatures: 24,
    hiddenLayers: [48, 24],
    outputUnits: 2, // Over/Under (generic)
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'OVER_UNDER_25': {
    inputFeatures: 24,
    hiddenLayers: [48, 24],
    outputUnits: 2, // Over/Under 2.5
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'OVER_UNDER_15': {
    inputFeatures: 24,
    hiddenLayers: [48, 24],
    outputUnits: 2,
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'OVER_UNDER_35': {
    inputFeatures: 24,
    hiddenLayers: [48, 24],
    outputUnits: 2,
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'ASIAN_HANDICAP': {
    inputFeatures: 28,
    hiddenLayers: [64, 32, 16],
    outputUnits: 3, // Home win, Push, Away win
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'CORNERS': {
    inputFeatures: 16,
    hiddenLayers: [32, 16],
    outputUnits: 3, // Over/Under/Exact (simplified)
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
  'CARDS': {
    inputFeatures: 16,
    hiddenLayers: [32, 16],
    outputUnits: 3,
    outputActivation: 'softmax',
    lossFunction: 'categoricalCrossentropy',
  },
};

// Store models for each market
const marketModels: Record<MarketType, tf.LayersModel | null> = {
  '1X2': null,
  'DOUBLE_CHANCE': null,
  'BTTS': null,
  'OVER_UNDER': null,
  'OVER_UNDER_25': null,
  'OVER_UNDER_15': null,
  'OVER_UNDER_35': null,
  'ASIAN_HANDICAP': null,
  'CORNERS': null,
  'CARDS': null,
};

/**
 * Create model for specific market
 */
export function createMarketModel(market: MarketType): tf.LayersModel {
  const config = MARKET_CONFIGS[market];
  
  const model = tf.sequential();
  
  // Input layer
  model.add(tf.layers.dense({
    inputShape: [config.inputFeatures],
    units: config.hiddenLayers[0],
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
  }));
  
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  // Hidden layers
  for (let i = 1; i < config.hiddenLayers.length; i++) {
    model.add(tf.layers.dense({
      units: config.hiddenLayers[i],
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
  }
  
  // Output layer
  model.add(tf.layers.dense({
    units: config.outputUnits,
    activation: config.outputActivation as any,
  }));
  
  // Compile
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: config.lossFunction as any,
    metrics: ['accuracy'],
  });
  
  return model;
}

/**
 * Extract features specific to market
 */
export function extractMarketFeatures(
  match: ProcessedMatchData, 
  market: MarketType
): number[] {
  const f = match.features;
  
  switch (market) {
    case '1X2':
      return [
        ...f.homeForm.map(x => x / 3),
        ...f.awayForm.map(x => x / 3),
        f.homeGoalsScoredAvg / 5,
        f.homeGoalsConcededAvg / 5,
        f.awayGoalsScoredAvg / 5,
        f.awayGoalsConcededAvg / 5,
        f.h2hHomeWins / 10,
        f.h2hDraws / 10,
        f.h2hAwayWins / 10,
        f.homeCleanSheets,
        f.awayCleanSheets,
        f.homeBttsRate,
        f.awayBttsRate,
        f.homeOver15Rate,
        f.awayOver15Rate,
        f.homeOver25Rate,
        f.awayOver25Rate,
      ];
      
    case 'BTTS':
      return [
        f.homeGoalsScoredAvg / 5,
        f.homeGoalsConcededAvg / 5,
        f.awayGoalsScoredAvg / 5,
        f.awayGoalsConcededAvg / 5,
        f.homeBttsRate,
        f.awayBttsRate,
        f.homeCleanSheets,
        f.awayCleanSheets,
        ...f.homeForm.map(x => x / 3),
        ...f.awayForm.map(x => x / 3),
      ];
      
    case 'OVER_UNDER_25':
    case 'OVER_UNDER_15':
      return [
        f.homeGoalsScoredAvg / 5,
        f.homeGoalsConcededAvg / 5,
        f.awayGoalsScoredAvg / 5,
        f.awayGoalsConcededAvg / 5,
        f.homeOver25Rate,
        f.awayOver25Rate,
        f.homeOver15Rate,
        f.awayOver15Rate,
        f.homeBttsRate,
        f.awayBttsRate,
        ...f.homeForm.map(x => x / 3),
        ...f.awayForm.map(x => x / 3),
        f.h2hHomeWins / 10,
        f.h2hDraws / 10,
      ];
      
    case 'CORNERS':
    case 'CARDS':
      // Simplified - would need actual corners/cards data
      return [
        f.homeOver25Rate,
        f.awayOver25Rate,
        f.homeBttsRate,
        f.awayBttsRate,
        ...f.homeForm.map(x => x / 3).slice(0, 3),
        ...f.awayForm.map(x => x / 3).slice(0, 3),
      ];
      
    default:
      return extractMarketFeatures(match, '1X2');
  }
}

/**
 * Extract labels for specific market
 */
export function extractMarketLabels(match: ProcessedMatchData, market: MarketType): number[] {
  switch (market) {
    case '1X2':
      return [
        match.target.homeWin ? 1 : 0,
        match.target.draw ? 1 : 0,
        match.target.awayWin ? 1 : 0,
      ];
      
    case 'BTTS':
      return [
        match.target.btts ? 1 : 0,
        match.target.btts ? 0 : 1,
      ];
      
    case 'OVER_UNDER_25':
      return [
        match.target.over25 ? 1 : 0,
        match.target.over25 ? 0 : 1,
      ];
      
    case 'OVER_UNDER_15':
      return [
        match.target.over15 ? 1 : 0,
        match.target.over15 ? 0 : 1,
      ];
      
    case 'CORNERS':
      // Simplified - would need actual corners data
      return [1, 0, 0];
      
    case 'CARDS':
      // Simplified
      return [1, 0, 0];
      
    default:
      return [0, 0, 0];
  }
}

/**
 * Train model for specific market
 */
export async function trainMarketModel(
  market: MarketType,
  trainingData: ProcessedMatchData[],
  onEpochEnd?: (epoch: number, logs: any) => void
): Promise<tf.History> {
  const config = MARKET_CONFIGS[market];
  
  // Prepare data
  const xs = tf.tensor2d(trainingData.map(m => extractMarketFeatures(m, market)));
  const ys = tf.tensor2d(trainingData.map(m => extractMarketLabels(m, market)));
  
  // Create model
  const model = createMarketModel(market);
  marketModels[market] = model;
  
  // Train
  const history = await model.fit(xs, ys, {
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: onEpochEnd ? {
      onEpochEnd: (epoch, logs) => onEpochEnd(epoch, logs),
    } : undefined,
    shuffle: true,
  });
  
  // Cleanup
  xs.dispose();
  ys.dispose();
  
  return history;
}

/**
 * Predict for specific market
 */
export function predictMarket(
  match: ProcessedMatchData,
  market: MarketType
): {
  probabilities: number[];
  prediction: string;
  confidence: number;
} {
  const model = marketModels[market];
  if (!model) {
    throw new Error(`Modelo para ${market} no entrenado`);
  }
  
  const features = extractMarketFeatures(match, market);
  const input = tf.tensor2d([features]);
  
  const prediction = model.predict(input) as tf.Tensor;
  const probabilities = Array.from(prediction.dataSync());
  
  input.dispose();
  prediction.dispose();
  
  // Get highest probability
  const maxProb = Math.max(...probabilities);
  const predictionIndex = probabilities.indexOf(maxProb);
  
  let predictionLabel = '';
  switch (market) {
    case '1X2':
      predictionLabel = ['1', 'X', '2'][predictionIndex];
      break;
    case 'BTTS':
      predictionLabel = ['Sí', 'No'][predictionIndex];
      break;
    case 'OVER_UNDER_25':
    case 'OVER_UNDER_15':
      predictionLabel = ['Over', 'Under'][predictionIndex];
      break;
    case 'CORNERS':
    case 'CARDS':
      predictionLabel = ['Over', 'Under', 'Exacto'][predictionIndex];
      break;
  }
  
  return {
    probabilities: probabilities.map(p => Math.round(p * 100)),
    prediction: predictionLabel,
    confidence: Math.round(maxProb * 100),
  };
}

/**
 * Calculate EV for specific market
 */
export function calculateMarketEV(
  predictedProb: number,
  odds: number
): number {
  return (predictedProb / 100 * odds) - 1;
}

/**
 * Find value bets across all markets
 */
export function findAllValueBets(
  match: ProcessedMatchData,
  odds: {
    home?: number;
    draw?: number;
    away?: number;
    bttsYes?: number;
    bttsNo?: number;
    over25?: number;
    under25?: number;
  },
  minEdge: number = 0.05
): Array<{
  market: MarketType;
  selection: string;
  probability: number;
  odds: number;
  ev: number;
  confidence: number;
}> {
  const valueBets: Array<{
    market: MarketType;
    selection: string;
    probability: number;
    odds: number;
    ev: number;
    confidence: number;
  }> = [];
  
  const markets: MarketType[] = ['1X2', 'BTTS', 'OVER_UNDER_25'];
  
  for (const market of markets) {
    try {
      const prediction = predictMarket(match, market);
      
      // Check each outcome
      prediction.probabilities.forEach((prob, idx) => {
        let selection = '';
        let marketOdds = 0;
        
        switch (market) {
          case '1X2':
            selection = ['1', 'X', '2'][idx];
            marketOdds = selection === '1' ? (odds.home || 0) :
                        selection === 'X' ? (odds.draw || 0) :
                        (odds.away || 0);
            break;
          case 'BTTS':
            selection = ['Sí', 'No'][idx];
            marketOdds = selection === 'Sí' ? (odds.bttsYes || 0) :
                        (odds.bttsNo || 0);
            break;
          case 'OVER_UNDER_25':
            selection = ['Over', 'Under'][idx];
            marketOdds = selection === 'Over' ? (odds.over25 || 0) :
                        (odds.under25 || 0);
            break;
        }
        
        if (marketOdds > 0) {
          const ev = calculateMarketEV(prob, marketOdds);
          
          if (ev > minEdge) {
            valueBets.push({
              market,
              selection,
              probability: prob,
              odds: marketOdds,
              ev,
              confidence: prediction.confidence,
            });
          }
        }
      });
    } catch (e) {
      // Model not trained for this market
    }
  }
  
  return valueBets.sort((a, b) => b.ev - a.ev);
}

/**
 * Save market model
 */
export async function saveMarketModel(market: MarketType): Promise<void> {
  const model = marketModels[market];
  if (!model) {
    throw new Error(`No hay modelo para ${market}`);
  }
  
  await model.save(`localstorage://dg-picks-model-${market}`);
}

/**
 * Load market model
 */
export async function loadMarketModel(market: MarketType): Promise<boolean> {
  try {
    marketModels[market] = await tf.loadLayersModel(
      `localstorage://dg-picks-model-${market}`
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Load all market models
 */
export async function loadAllMarketModels(): Promise<Record<MarketType, boolean>> {
  const results: Partial<Record<MarketType, boolean>> = {};
  
  for (const market of Object.keys(marketModels) as MarketType[]) {
    results[market] = await loadMarketModel(market);
  }
  
  return results as Record<MarketType, boolean>;
}

export { MARKET_CONFIGS };
