import * as tf from '@tensorflow/tfjs';
import { ProcessedMatchData } from './historical-data';
import { extractFeatures, extractLabels } from './ml-model';
import { MarketType, extractMarketFeatures, extractMarketLabels } from './market-models';

// Ensemble model configuration
interface EnsembleConfig {
  models: ('neural_network' | 'logistic_regression' | 'poisson' | 'elo')[];
  weights: number[];
  useStacking: boolean;
}

// Individual model predictions
interface ModelPrediction {
  model: string;
  probabilities: number[];
  confidence: number;
  weight: number;
}

// ELO-based prediction
interface EloRatings {
  homeElo: number;
  awayElo: number;
  homeAdvantage: number;
}

// Poisson distribution parameters
interface PoissonParams {
  homeLambda: number;
  awayLambda: number;
}

// Stacking meta-learner
let metaLearner: tf.LayersModel | null = null;

// Store individual models
const individualModels: Map<string, tf.LayersModel> = new Map();

// ELO ratings storage
const eloRatings: Map<number, { rating: number; matches: number }> = new Map();

/**
 * Calculate ELO ratings for teams
 */
export function calculateEloRatings(
  matches: ProcessedMatchData[],
  kFactor: number = 32,
  homeAdvantage: number = 100
): Map<number, { rating: number; matches: number }> {
  const ratings = new Map<number, { rating: number; matches: number }>();
  
  // Initialize all teams with 1500
  for (const match of matches) {
    const homeId = match.teams.home.id;
    const awayId = match.teams.away.id;
    
    if (!ratings.has(homeId)) {
      ratings.set(homeId, { rating: 1500, matches: 0 });
    }
    if (!ratings.has(awayId)) {
      ratings.set(awayId, { rating: 1500, matches: 0 });
    }
  }
  
  // Sort matches by date
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  );
  
  // Update ratings
  for (const match of sortedMatches) {
    const homeId = match.teams.home.id;
    const awayId = match.teams.away.id;
    
    const homeRating = ratings.get(homeId)!;
    const awayRating = ratings.get(awayId)!;
    
    // Expected scores
    const homeExpected = 1 / (1 + Math.pow(10, (awayRating.rating - homeRating.rating - homeAdvantage) / 400));
    const awayExpected = 1 - homeExpected;
    
    // Actual scores
    let homeScore: number, awayScore: number;
    if (match.goals.home === null || match.goals.away === null) continue;
    
    if (match.goals.home > match.goals.away) {
      homeScore = 1;
      awayScore = 0;
    } else if (match.goals.home === match.goals.away) {
      homeScore = 0.5;
      awayScore = 0.5;
    } else {
      homeScore = 0;
      awayScore = 1;
    }
    
    // Update ratings
    const homeNewRating = homeRating.rating + kFactor * (homeScore - homeExpected);
    const awayNewRating = awayRating.rating + kFactor * (awayScore - awayExpected);
    
    ratings.set(homeId, { 
      rating: homeNewRating, 
      matches: homeRating.matches + 1 
    });
    ratings.set(awayId, { 
      rating: awayNewRating, 
      matches: awayRating.matches + 1 
    });
  }
  
  return ratings;
}

/**
 * Predict using ELO ratings
 */
export function predictElo(
  match: ProcessedMatchData,
  ratings: Map<number, { rating: number; matches: number }>,
  homeAdvantage: number = 100
): { probabilities: number[]; expectedGoals: { home: number; away: number } } {
  const homeId = match.teams.home.id;
  const awayId = match.teams.away.id;
  
  const homeRating = ratings.get(homeId)?.rating || 1500;
  const awayRating = ratings.get(awayId)?.rating || 1500;
  
  // Expected win probability
  const homeExpected = 1 / (1 + Math.pow(10, (awayRating - homeRating - homeAdvantage) / 400));
  
  // Convert to 1X2 probabilities using historical draw rate
  const drawRate = 0.26; // Historical average
  const homeWinProb = homeExpected * (1 - drawRate);
  const awayWinProb = (1 - homeExpected) * (1 - drawRate);
  
  // Expected goals based on ELO difference
  const eloDiff = homeRating - awayRating + homeAdvantage;
  const homeLambda = Math.exp(0.5 + eloDiff / 400);
  const awayLambda = Math.exp(0.5 - eloDiff / 400);
  
  return {
    probabilities: [homeWinProb, drawRate, awayWinProb],
    expectedGoals: {
      home: homeLambda,
      away: awayLambda,
    },
  };
}

/**
 * Poisson distribution calculation
 */
function poissonProbability(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Predict using Poisson distribution
 */
export function predictPoisson(
  match: ProcessedMatchData
): { 
  probabilities: number[]; 
  scoreProbabilities: Map<string, number>;
  mostLikelyScore: string;
} {
  // Calculate lambda (expected goals) from features
  const homeLambda = match.features.homeGoalsScoredAvg * 0.7 + 
                     match.features.awayGoalsConcededAvg * 0.3;
  const awayLambda = match.features.awayGoalsScoredAvg * 0.7 + 
                     match.features.homeGoalsConcededAvg * 0.3;
  
  // Calculate score probabilities
  const scoreProbabilities = new Map<string, number>();
  let maxProb = 0;
  let mostLikelyScore = '1-1';
  
  for (let homeGoals = 0; homeGoals <= 5; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= 5; awayGoals++) {
      const prob = poissonProbability(homeLambda, homeGoals) * 
                   poissonProbability(awayLambda, awayGoals);
      const scoreKey = `${homeGoals}-${awayGoals}`;
      scoreProbabilities.set(scoreKey, prob);
      
      if (prob > maxProb) {
        maxProb = prob;
        mostLikelyScore = scoreKey;
      }
    }
  }
  
  // Calculate 1X2 probabilities
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  
  for (let homeGoals = 0; homeGoals <= 5; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= 5; awayGoals++) {
      const prob = scoreProbabilities.get(`${homeGoals}-${awayGoals}`) || 0;
      
      if (homeGoals > awayGoals) homeWinProb += prob;
      else if (homeGoals === awayGoals) drawProb += prob;
      else awayWinProb += prob;
    }
  }
  
  // Normalize
  const total = homeWinProb + drawProb + awayWinProb;
  
  return {
    probabilities: [
      homeWinProb / total,
      drawProb / total,
      awayWinProb / total,
    ],
    scoreProbabilities,
    mostLikelyScore,
  };
}

/**
 * Simple logistic regression using TensorFlow
 */
export async function trainLogisticRegression(
  trainingData: ProcessedMatchData[],
  market: MarketType = '1X2'
): Promise<tf.LayersModel> {
  const features = trainingData.map(m => extractMarketFeatures(m, market));
  const labels = trainingData.map(m => extractMarketLabels(m, market));
  
  const model = tf.sequential();
  
  // Single layer with softmax (multinomial logistic regression)
  model.add(tf.layers.dense({
    inputShape: [features[0].length],
    units: labels[0].length,
    activation: 'softmax',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.1 }),
  }));
  
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  
  const xs = tf.tensor2d(features);
  const ys = tf.tensor2d(labels);
  
  await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: 0,
  });
  
  xs.dispose();
  ys.dispose();
  
  return model;
}

/**
 * Train meta-learner for stacking
 */
export async function trainMetaLearner(
  trainingData: ProcessedMatchData[],
  basePredictions: Array<{
    elo: number[];
    poisson: number[];
    nn: number[];
    logistic: number[];
  }>,
  actualLabels: number[][]
): Promise<tf.LayersModel> {
  // Create meta-features from base model predictions
  const metaFeatures = basePredictions.map(p => [
    ...p.elo,
    ...p.poisson,
    ...p.nn,
    ...p.logistic,
  ]);
  
  const model = tf.sequential();
  
  model.add(tf.layers.dense({
    inputShape: [metaFeatures[0].length],
    units: 16,
    activation: 'relu',
  }));
  
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  model.add(tf.layers.dense({
    units: 3,
    activation: 'softmax',
  }));
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  
  const xs = tf.tensor2d(metaFeatures);
  const ys = tf.tensor2d(actualLabels);
  
  await model.fit(xs, ys, {
    epochs: 30,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: 0,
  });
  
  xs.dispose();
  ys.dispose();
  
  metaLearner = model;
  return model;
}

/**
 * Ensemble prediction using all models
 */
export function predictEnsemble(
  match: ProcessedMatchData,
  config: EnsembleConfig = {
    models: ['neural_network', 'elo', 'poisson'],
    weights: [0.5, 0.3, 0.2],
    useStacking: false,
  }
): {
  finalProbabilities: number[];
  predictions: ModelPrediction[];
  consensus: 'strong' | 'moderate' | 'weak';
  recommendedBet: string;
} {
  const predictions: ModelPrediction[] = [];
  
  // ELO prediction
  if (config.models.includes('elo')) {
    const eloPred = predictElo(match, eloRatings);
    predictions.push({
      model: 'ELO',
      probabilities: eloPred.probabilities,
      confidence: Math.max(...eloPred.probabilities),
      weight: config.weights[config.models.indexOf('elo')] || 0.3,
    });
  }
  
  // Poisson prediction
  if (config.models.includes('poisson')) {
    const poissonPred = predictPoisson(match);
    predictions.push({
      model: 'Poisson',
      probabilities: poissonPred.probabilities,
      confidence: Math.max(...poissonPred.probabilities),
      weight: config.weights[config.models.indexOf('poisson')] || 0.2,
    });
  }
  
  // Neural Network (if available)
  if (config.models.includes('neural_network')) {
    const nnModel = individualModels.get('nn');
    if (nnModel) {
      const features = extractFeatures(match);
      const input = tf.tensor2d([features]);
      const pred = nnModel.predict(input) as tf.Tensor;
      const probs = Array.from(pred.dataSync());
      input.dispose();
      pred.dispose();
      
      predictions.push({
        model: 'Neural Network',
        probabilities: probs,
        confidence: Math.max(...probs),
        weight: config.weights[config.models.indexOf('neural_network')] || 0.5,
      });
    }
  }
  
  // Weighted average
  const finalProbabilities = [0, 0, 0];
  let totalWeight = 0;
  
  for (const pred of predictions) {
    for (let i = 0; i < 3; i++) {
      finalProbabilities[i] += pred.probabilities[i] * pred.weight;
    }
    totalWeight += pred.weight;
  }
  
  // Normalize
  for (let i = 0; i < 3; i++) {
    finalProbabilities[i] /= totalWeight;
  }
  
  // Calculate consensus
  const agreements = predictions.map(p => {
    const maxIdx = p.probabilities.indexOf(Math.max(...p.probabilities));
    return maxIdx;
  });
  
  const allAgree = agreements.every(a => a === agreements[0]);
  const majorityAgree = agreements.filter(a => a === agreements[0]).length >= agreements.length * 0.6;
  
  const consensus = allAgree ? 'strong' : majorityAgree ? 'moderate' : 'weak';
  
  // Recommendation
  const maxProbIdx = finalProbabilities.indexOf(Math.max(...finalProbabilities));
  const recommendedBet = ['1', 'X', '2'][maxProbIdx];
  
  return {
    finalProbabilities,
    predictions,
    consensus,
    recommendedBet,
  };
}

/**
 * Calibrate probabilities using isotonic regression
 */
export function calibrateProbabilities(
  predictions: number[],
  historicalAccuracy: number[]
): number[] {
  // Simple calibration: adjust based on historical bin accuracy
  const calibrated = predictions.map((pred, idx) => {
    const bin = Math.floor(pred * 10) / 10; // Bin by 10%
    const calibrationFactor = historicalAccuracy[idx] || pred;
    return pred * 0.7 + calibrationFactor * 0.3; // Blend
  });
  
  // Renormalize
  const sum = calibrated.reduce((a, b) => a + b, 0);
  return calibrated.map(p => p / sum);
}

/**
 * Monte Carlo simulation for match outcome
 */
export function monteCarloSimulation(
  match: ProcessedMatchData,
  iterations: number = 10000
): {
  winProbabilities: number[];
  expectedGoals: { home: number; away: number };
  scoreDistribution: Map<string, number>;
  bttsProbability: number;
  over25Probability: number;
} {
  const homeLambda = match.features.homeGoalsScoredAvg;
  const awayLambda = match.features.awayGoalsScoredAvg;
  
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let bttsCount = 0;
  let over25Count = 0;
  const scoreCounts = new Map<string, number>();
  
  for (let i = 0; i < iterations; i++) {
    // Sample from Poisson
    const homeGoals = samplePoisson(homeLambda);
    const awayGoals = samplePoisson(awayLambda);
    
    totalHomeGoals += homeGoals;
    totalAwayGoals += awayGoals;
    
    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals === awayGoals) draws++;
    else awayWins++;
    
    if (homeGoals > 0 && awayGoals > 0) bttsCount++;
    if (homeGoals + awayGoals > 2.5) over25Count++;
    
    const scoreKey = `${homeGoals}-${awayGoals}`;
    scoreCounts.set(scoreKey, (scoreCounts.get(scoreKey) || 0) + 1);
  }
  
  // Convert to probabilities
  const scoreDistribution = new Map<string, number>();
  for (const [score, count] of scoreCounts) {
    scoreDistribution.set(score, count / iterations);
  }
  
  return {
    winProbabilities: [homeWins / iterations, draws / iterations, awayWins / iterations],
    expectedGoals: {
      home: totalHomeGoals / iterations,
      away: totalAwayGoals / iterations,
    },
    scoreDistribution,
    bttsProbability: bttsCount / iterations,
    over25Probability: over25Count / iterations,
  };
}

/**
 * Sample from Poisson distribution
 */
function samplePoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  
  return k - 1;
}

/**
 * Initialize ensemble with training
 */
export async function initializeEnsemble(
  trainingData: ProcessedMatchData[]
): Promise<void> {
  console.log('[Ensemble] Initializing...');
  
  // Calculate ELO ratings
  const ratings = calculateEloRatings(trainingData);
  eloRatings.clear();
  for (const [teamId, data] of ratings) {
    eloRatings.set(teamId, data);
  }
  
  // Train individual models
  console.log('[Ensemble] Training logistic regression...');
  const logisticModel = await trainLogisticRegression(trainingData);
  individualModels.set('logistic', logisticModel);
  
  // Collect predictions for meta-learner
  const basePredictions = [];
  const actualLabels = [];
  
  for (const match of trainingData.slice(-100)) { // Use last 100 for meta-learner
    const eloPred = predictElo(match, eloRatings);
    const poissonPred = predictPoisson(match);
    
    // Get NN prediction if available
    let nnPred = [0.33, 0.34, 0.33];
    const nnModel = individualModels.get('nn');
    if (nnModel) {
      const features = extractFeatures(match);
      const input = tf.tensor2d([features]);
      const pred = nnModel.predict(input) as tf.Tensor;
      nnPred = Array.from(pred.dataSync());
      input.dispose();
      pred.dispose();
    }
    
    // Get logistic prediction
    const logisticFeatures = extractMarketFeatures(match, '1X2');
    const logisticInput = tf.tensor2d([logisticFeatures]);
    const logisticPredTensor = logisticModel.predict(logisticInput) as tf.Tensor;
    const logisticPred = Array.from(logisticPredTensor.dataSync());
    logisticInput.dispose();
    logisticPredTensor.dispose();
    
    basePredictions.push({
      elo: eloPred.probabilities,
      poisson: poissonPred.probabilities,
      nn: nnPred,
      logistic: logisticPred,
    });
    
    actualLabels.push([
      match.target.homeWin ? 1 : 0,
      match.target.draw ? 1 : 0,
      match.target.awayWin ? 1 : 0,
    ]);
  }
  
  // Train meta-learner
  console.log('[Ensemble] Training meta-learner...');
  await trainMetaLearner(trainingData, basePredictions, actualLabels);
  
  console.log('[Ensemble] Ready!');
}

export type {
  EnsembleConfig,
  ModelPrediction,
  EloRatings,
  PoissonParams,
};
