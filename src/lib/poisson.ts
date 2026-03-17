/**
 * Modelo Poisson - SharpBet Pro
 * Calcula probabilidades de goles usando distribución de Poisson
 */

export interface PoissonPredictions {
  '1': number;
  'X': number;
  '2': number;
  '1X': number;
  'X2': number;
  '12': number;
  btts_yes: number;
  btts_no: number;
  over_15: number;
  under_15: number;
  over_25: number;
  under_25: number;
  over_35: number;
  under_35: number;
  expected_home_goals: number;
  expected_away_goals: number;
  expected_total: number;
}

export interface MatchData {
  homeTeam: {
    played: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  awayTeam: {
    played: number;
    goalsFor: number;
    goalsAgainst: number;
  };
}

export class PoissonModel {
  private static readonly HOME_ADVANTAGE = 1.25;
  private static readonly AWAY_DISADVANTAGE = 0.85;
  private static readonly LEAGUE_AVG_GOALS = 1.3;
  private static readonly SIMULATIONS = 10000;

  /**
   * Calcula el Expected Goals (xG) para un partido
   */
  static calculateXg(match: MatchData) {
    const homeGoalsPG = match.homeTeam.goalsFor / Math.max(match.homeTeam.played, 1);
    const awayGoalsPG = match.awayTeam.goalsFor / Math.max(match.awayTeam.played, 1);
    const homeConcPG = match.homeTeam.goalsAgainst / Math.max(match.homeTeam.played, 1);
    const awayConcPG = match.awayTeam.goalsAgainst / Math.max(match.awayTeam.played, 1);
    
    // Aplicar ajuste de ventaja local
    const homeXg = homeGoalsPG * this.HOME_ADVANTAGE * (awayConcPG / this.LEAGUE_AVG_GOALS);
    const awayXg = awayGoalsPG * this.AWAY_DISADVANTAGE * (homeConcPG / this.LEAGUE_AVG_GOALS);
    
    return { 
      homeXg: Math.max(homeXg, 0.5), 
      awayXg: Math.max(awayXg, 0.5) 
    };
  }

  /**
   * Simulacion Monte Carlo con distribucion Poisson
   */
  static simulate(homeXg: number, awayXg: number): PoissonPredictions {
    let homeWins = 0, draws = 0, awayWins = 0, bttsYes = 0;
    let over15 = 0, over25 = 0, over35 = 0;

    for (let i = 0; i < this.SIMULATIONS; i++) {
      const homeGoals = this.poissonRandom(homeXg);
      const awayGoals = this.poissonRandom(awayXg);
      const total = homeGoals + awayGoals;

      if (homeGoals > awayGoals) homeWins++;
      else if (homeGoals === awayGoals) draws++;
      else awayWins++;

      if (homeGoals > 0 && awayGoals > 0) bttsYes++;
      if (total > 1.5) over15++;
      if (total > 2.5) over25++;
      if (total > 3.5) over35++;
    }

    const total = this.SIMULATIONS;
    return {
      '1': homeWins / total,
      'X': draws / total,
      '2': awayWins / total,
      '1X': (homeWins + draws) / total,
      'X2': (draws + awayWins) / total,
      '12': (homeWins + awayWins) / total,
      btts_yes: bttsYes / total,
      btts_no: 1 - (bttsYes / total),
      over_15: over15 / total,
      under_15: 1 - (over15 / total),
      over_25: over25 / total,
      under_25: 1 - (over25 / total),
      over_35: over35 / total,
      under_35: 1 - (over35 / total),
      expected_home_goals: homeXg,
      expected_away_goals: awayXg,
      expected_total: homeXg + awayXg
    };
  }

  /**
   * Generador de numero aleatorio Poisson
   */
  private static poissonRandom(lambda: number): number {
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
   * Calcula el valor (edge) vs el mercado
   */
  static calculateEdge(trueProb: number, odds: number) {
    const impliedProb = 1 / odds;
    const edge = trueProb - impliedProb;
    return {
      edge,
      edgePercentage: `${(edge >= 0 ? '+' : '')}${(edge * 100).toFixed(1)}%`,
      impliedProbability: impliedProb
    };
  }

  /**
   * Calcula nivel de confianza (1-10)
   */
  static calculateConfidence(trueProb: number, edge: number): number {
    let confidence = 5;
    
    if (edge > 0.10) confidence += 2;
    else if (edge > 0.06) confidence += 1;
    
    if (trueProb >= 0.40 && trueProb <= 0.70) confidence += 1;
    if (trueProb >= 0.45 && trueProb <= 0.65) confidence += 1;
    
    return Math.min(confidence, 10);
  }

  /**
   * Recomienda nivel de stake basado en edge y confianza
   */
  static recommendStake(edge: number, confidence: number): string {
    if (edge > 0.08 && confidence >= 8) return 'HIGH (3-4%)';
    if (edge > 0.05 && confidence >= 6) return 'MEDIUM (2%)';
    return 'LOW (1%)';
  }
}
