// Kelly Criterion implementation for optimal stake sizing

export interface KellyCalculation {
  // Full Kelly percentage (what the formula says)
  fullKellyStake: number;
  // Recommended stake (fractional Kelly)
  recommendedStake: number;
  // Percentage of bankroll
  percentageOfBankroll: number;
  // Expected value
  expectedValue: number;
  // Probability of winning
  probability: number;
  // Odds
  odds: number;
  // Confidence level (1-10)
  confidence: number;
}

export interface KellyOptions {
  // Current bankroll
  bankroll: number;
  // Decimal odds
  odds: number;
  // Estimated probability of winning (0-1)
  probability: number;
  // Kelly fraction (conservative: 0.25-0.5, aggressive: 0.5-1)
  fraction?: number;
  // Max stake as percentage of bankroll (0.05 = 5%)
  maxStakePercent?: number;
  // Confidence level (1-10) - affects stake sizing
  confidence?: number;
  // Minimum stake
  minStake?: number;
}

/**
 * Calculate Kelly Criterion stake
 * Formula: f* = (bp - q) / b
 * where: b = odds - 1, p = probability of win, q = probability of loss (1-p)
 */
export function calculateKellyStake(options: KellyOptions): KellyCalculation {
  const {
    bankroll,
    odds,
    probability,
    fraction = 0.25, // Conservative: use 1/4 Kelly by default
    maxStakePercent = 0.05, // Max 5% of bankroll
    confidence = 5,
    minStake = 1,
  } = options;

  // Validate inputs
  if (odds <= 1) {
    throw new Error('Odds must be greater than 1');
  }
  if (probability <= 0 || probability >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  // Kelly formula
  const b = odds - 1; // Net odds received
  const p = probability;
  const q = 1 - p;
  
  // Full Kelly stake as percentage
  const fullKellyPercent = (b * p - q) / b;
  
  // Expected value
  const expectedValue = (p * odds) - 1;
  
  // If EV is negative or zero, don't bet
  if (expectedValue <= 0) {
    return {
      fullKellyStake: 0,
      recommendedStake: 0,
      percentageOfBankroll: 0,
      expectedValue,
      probability: p * 100,
      odds,
      confidence,
    };
  }

  // Apply fractional Kelly
  const fractionalKellyPercent = fullKellyPercent * fraction;
  
  // Apply confidence adjustment (confidence 1-10 scales stake 0.5x to 1.5x)
  const confidenceMultiplier = 0.5 + (confidence / 10);
  const adjustedPercent = fractionalKellyPercent * confidenceMultiplier;
  
  // Apply max stake limit
  const limitedPercent = Math.min(adjustedPercent, maxStakePercent);
  
  // Calculate stakes
  const fullKellyStake = bankroll * fullKellyPercent;
  let recommendedStake = bankroll * limitedPercent;
  
  // Apply minimum stake
  recommendedStake = Math.max(recommendedStake, minStake);
  
  // Round to 2 decimal places
  recommendedStake = Math.round(recommendedStake * 100) / 100;

  return {
    fullKellyStake: Math.round(fullKellyStake * 100) / 100,
    recommendedStake,
    percentageOfBankroll: limitedPercent * 100,
    expectedValue,
    probability: p * 100,
    odds,
    confidence,
  };
}

/**
 * Get Kelly suggestion based on edge
 */
export function getKellySuggestion(expectedValue: number): string {
  if (expectedValue <= 0) {
    return 'Sin valor - No apostar';
  }
  if (expectedValue < 0.05) {
    return 'Valor marginal - Stake mínimo';
  }
  if (expectedValue < 0.1) {
    return 'Valor moderado - Stake conservador';
  }
  if (expectedValue < 0.2) {
    return 'Buen valor - Stake estándar';
  }
  return 'Alto valor - Considerar stake aumentado';
}

/**
 * Calculate stake based on flat betting strategy
 */
export function calculateFlatStake(
  bankroll: number,
  percentage: number = 0.02, // 2% flat
  confidence: number = 5
): number {
  const confidenceMultiplier = 0.5 + (confidence / 10);
  const stake = bankroll * percentage * confidenceMultiplier;
  return Math.round(stake * 100) / 100;
}

/**
 * Calculate stake based on confidence level
 */
export function calculateConfidenceStake(
  bankroll: number,
  confidence: number,
  basePercentage: number = 0.01 // 1% base
): number {
  // Scale: confidence 1 = 0.5%, confidence 10 = 3%
  const multiplier = 0.5 + (confidence * 0.25);
  const stake = bankroll * basePercentage * multiplier;
  return Math.round(stake * 100) / 100;
}

/**
 * Suggest stake sizing based on multiple factors
 */
export function suggestStake(
  bankroll: number,
  odds: number,
  probability: number,
  confidence: number,
  strategy: 'kelly' | 'flat' | 'confidence' = 'kelly'
): { stake: number; explanation: string } {
  switch (strategy) {
    case 'kelly': {
      const kelly = calculateKellyStake({
        bankroll,
        odds,
        probability,
        confidence,
        fraction: 0.25,
      });
      return {
        stake: kelly.recommendedStake,
        explanation: `Kelly 1/4 (${kelly.percentageOfBankroll.toFixed(2)}% del bankroll)`,
      };
    }
    
    case 'flat': {
      const stake = calculateFlatStake(bankroll, 0.02, confidence);
      return {
        stake,
        explanation: `Flat betting 2% ajustado por confianza`,
      };
    }
    
    case 'confidence': {
      const stake = calculateConfidenceStake(bankroll, confidence);
      return {
        stake,
        explanation: `Basado en nivel de confianza (${confidence}/10)`,
      };
    }
    
    default:
      return { stake: 0, explanation: 'Estrategia no reconocida' };
  }
}

/**
 * Calculate edge percentage
 */
export function calculateEdge(odds: number, probability: number): number {
  const fairOdds = 1 / probability;
  return ((fairOdds - odds) / odds) * 100;
}

/**
 * Convert American odds to decimal
 */
export function americanToDecimal(american: number): number {
  if (american > 0) {
    return (american / 100) + 1;
  }
  return (100 / Math.abs(american)) + 1;
}

/**
 * Convert Decimal odds to American
 */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return (decimal - 1) * 100;
  }
  return -100 / (decimal - 1);
}

/**
 * Calculate implied probability from odds
 */
export function impliedProbability(odds: number): number {
  return 1 / odds;
}
