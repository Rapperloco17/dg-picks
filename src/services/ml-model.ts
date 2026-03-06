import * as tf from '@tensorflow/tfjs';
import { ProcessedMatchData } from './historical-data';

// Model configuration
const MODEL_CONFIG = {
  inputFeatures: 28,
  hiddenLayers: [64, 32, 16],
  outputClasses: 3, // Home Win, Draw, Away Win
  learningRate: 0.001,
  epochs: 100,
  batchSize: 32,
  validationSplit: 0.2,
};

let currentModel: tf.LayersModel | null = null;

/**
 * Extract feature vector from match data
 */
export function extractFeatures(match: ProcessedMatchData): number[] {
  const f = match.features;
  return [
    // Form (normalize 0-3 to 0-1)
    ...f.homeForm.map(x => x / 3),
    ...f.awayForm.map(x => x / 3),
    // Goals averages
    f.homeGoalsScoredAvg / 5,
    f.homeGoalsConcededAvg / 5,
    f.awayGoalsScoredAvg / 5,
    f.awayGoalsConcededAvg / 5,
    // H2H (normalize by total matches)
    f.h2hHomeWins / 10,
    f.h2hDraws / 10,
    f.h2hAwayWins / 10,
    // Rates (already 0-1)
    f.homeCleanSheets,
    f.awayCleanSheets,
    f.homeBttsRate,
    f.awayBttsRate,
    f.homeOver15Rate,
    f.awayOver15Rate,
    f.homeOver25Rate,
    f.awayOver25Rate,
  ];
}

/**
 * Extract target labels
 */
export function extractLabels(match: ProcessedMatchData): number[] {
  return [
    match.target.homeWin ? 1 : 0,
    match.target.draw ? 1 : 0,
    match.target.awayWin ? 1 : 0,
  ];
}

/**
 * Create the neural network model
 */
export function createModel(): tf.LayersModel {
  const model = tf.sequential();
  
  // Input layer
  model.add(tf.layers.dense({
    inputShape: [MODEL_CONFIG.inputFeatures],
    units: MODEL_CONFIG.hiddenLayers[0],
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
  }));
  
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  // Hidden layers
  for (let i = 1; i < MODEL_CONFIG.hiddenLayers.length; i++) {
    model.add(tf.layers.dense({
      units: MODEL_CONFIG.hiddenLayers[i],
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
  }
  
  // Output layer
  model.add(tf.layers.dense({
    units: MODEL_CONFIG.outputClasses,
    activation: 'softmax',
  }));
  
  // Compile
  model.compile({
    optimizer: tf.train.adam(MODEL_CONFIG.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  
  return model;
}

/**
 * Train the model
 */
export async function trainModel(
  trainingData: ProcessedMatchData[],
  onEpochEnd?: (epoch: number, logs: any) => void
): Promise<tf.History> {
  if (trainingData.length < 100) {
    throw new Error('Se necesitan al menos 100 partidos para entrenar');
  }
  
  // Prepare data
  const xs = tf.tensor2d(trainingData.map(extractFeatures));
  const ys = tf.tensor2d(trainingData.map(extractLabels));
  
  // Create or reset model
  currentModel = createModel();
  
  // Train
  const history = await currentModel.fit(xs, ys, {
    epochs: MODEL_CONFIG.epochs,
    batchSize: MODEL_CONFIG.batchSize,
    validationSplit: MODEL_CONFIG.validationSplit,
    callbacks: onEpochEnd ? {
      onEpochEnd: (epoch, logs) => onEpochEnd(epoch, logs),
    } : undefined,
    shuffle: true,
  });
  
  // Cleanup tensors
  xs.dispose();
  ys.dispose();
  
  return history;
}

/**
 * Make prediction for a match
 */
export function predict(match: ProcessedMatchData): {
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: number;
  recommendation: string;
} {
  if (!currentModel) {
    throw new Error('Modelo no entrenado');
  }
  
  const features = extractFeatures(match);
  const input = tf.tensor2d([features]);
  
  const prediction = currentModel.predict(input) as tf.Tensor;
  const probabilities = prediction.dataSync();
  
  input.dispose();
  prediction.dispose();
  
  const [homeProb, drawProb, awayProb] = probabilities;
  
  // Find highest probability
  const maxProb = Math.max(homeProb, drawProb, awayProb);
  let recommendation = '';
  
  if (maxProb === homeProb) recommendation = '1';
  else if (maxProb === drawProb) recommendation = 'X';
  else recommendation = '2';
  
  return {
    homeWin: Math.round(homeProb * 100),
    draw: Math.round(drawProb * 100),
    awayWin: Math.round(awayProb * 100),
    confidence: Math.round(maxProb * 100),
    recommendation,
  };
}

/**
 * Calculate Expected Value (EV)
 */
export function calculateEV(
  predictedProb: number,
  odds: number
): number {
  return (predictedProb / 100 * odds) - 1;
}

/**
 * Find value bets
 */
export function findValueBets(
  matches: ProcessedMatchData[],
  oddsData: { matchId: number; homeOdds: number; drawOdds: number; awayOdds: number }[],
  minEdge: number = 0.05
): Array<{
  match: ProcessedMatchData;
  selection: string;
  predictedProb: number;
  odds: number;
  ev: number;
  confidence: number;
}> {
  const valueBets = [];
  
  for (const match of matches) {
    const odds = oddsData.find(o => o.matchId === match.id);
    if (!odds) continue;
    
    const prediction = predict(match);
    
    // Check home win value
    const homeEV = calculateEV(prediction.homeWin, odds.homeOdds);
    if (homeEV > minEdge) {
      valueBets.push({
        match,
        selection: '1',
        predictedProb: prediction.homeWin,
        odds: odds.homeOdds,
        ev: homeEV,
        confidence: prediction.confidence,
      });
    }
    
    // Check draw value
    const drawEV = calculateEV(prediction.draw, odds.drawOdds);
    if (drawEV > minEdge) {
      valueBets.push({
        match,
        selection: 'X',
        predictedProb: prediction.draw,
        odds: odds.drawOdds,
        ev: drawEV,
        confidence: prediction.confidence,
      });
    }
    
    // Check away win value
    const awayEV = calculateEV(prediction.awayWin, odds.awayOdds);
    if (awayEV > minEdge) {
      valueBets.push({
        match,
        selection: '2',
        predictedProb: prediction.awayWin,
        odds: odds.awayOdds,
        ev: awayEV,
        confidence: prediction.confidence,
      });
    }
  }
  
  return valueBets.sort((a, b) => b.ev - a.ev);
}

/**
 * Evaluate model performance
 */
export function evaluateModel(
  predictions: Array<{ actual: number[]; predicted: number[] }>
): {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
} {
  let correct = 0;
  let total = predictions.length;
  
  const truePositives = [0, 0, 0];
  const falsePositives = [0, 0, 0];
  const falseNegatives = [0, 0, 0];
  
  for (const { actual, predicted } of predictions) {
    const actualClass = actual.indexOf(1);
    const predictedClass = predicted.indexOf(Math.max(...predicted));
    
    if (actualClass === predictedClass) {
      correct++;
      truePositives[actualClass]++;
    } else {
      falsePositives[predictedClass]++;
      falseNegatives[actualClass]++;
    }
  }
  
  const accuracy = correct / total;
  
  // Macro-averaged metrics
  let precision = 0;
  let recall = 0;
  
  for (let i = 0; i < 3; i++) {
    const tp = truePositives[i];
    const fp = falsePositives[i];
    const fn = falseNegatives[i];
    
    precision += tp / (tp + fp) || 0;
    recall += tp / (tp + fn) || 0;
  }
  
  precision /= 3;
  recall /= 3;
  
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
  
  return {
    accuracy,
    precision,
    recall,
    f1Score,
  };
}

/**
 * Save model to local storage
 */
export async function saveModel(): Promise<void> {
  if (!currentModel) {
    throw new Error('No hay modelo para guardar');
  }
  
  await currentModel.save('localstorage://dg-picks-model');
}

/**
 * Load model from local storage
 */
export async function loadModel(): Promise<boolean> {
  try {
    currentModel = await tf.loadLayersModel('localstorage://dg-picks-model');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get model summary
 */
export function getModelSummary(): string {
  if (!currentModel) {
    return 'Modelo no inicializado';
  }
  
  return `Modelo cargado con ${currentModel.layers.length} capas`;
}

export { MODEL_CONFIG };
