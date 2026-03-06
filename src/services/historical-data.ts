import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db, isFirebaseInitialized } from '@/lib/firebase';
import { Match, TeamStats, PredictionData } from '@/types';
import { getCurrentSeason, getTeamStatistics, getFixturesByLeague, getFixtureById } from './api-football';
import { ALL_LEAGUES, getAllLeagueIds } from '@/constants/leagues';

// Collection names
const COLLECTIONS = {
  historicalMatches: 'historical_matches',
  teamStats: 'team_statistics',
  leagueStats: 'league_statistics',
  mlFeatures: 'ml_features',
  trainingData: 'training_data',
};

// Available seasons for data collection (extended for more training data)
const AVAILABLE_SEASONS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

// Interface for processed match data
interface ProcessedMatchData {
  id: number;
  fixture: Match['fixture'];
  league: Match['league'];
  teams: Match['teams'];
  goals: Match['goals'];
  score: Match['score'];
  // Calculated features
  features: {
    homeForm: number[];
    awayForm: number[];
    homeGoalsScoredAvg: number;
    homeGoalsConcededAvg: number;
    awayGoalsScoredAvg: number;
    awayGoalsConcededAvg: number;
    h2hHomeWins: number;
    h2hDraws: number;
    h2hAwayWins: number;
    homeCleanSheets: number;
    awayCleanSheets: number;
    homeBttsRate: number;
    awayBttsRate: number;
    homeOver15Rate: number;
    homeOver25Rate: number;
    awayOver15Rate: number;
    awayOver25Rate: number;
  };
  // Target variables
  target: {
    homeWin: boolean;
    draw: boolean;
    awayWin: boolean;
    btts: boolean;
    over15: boolean;
    over25: boolean;
    over35: boolean;
    totalGoals: number;
  };
  metadata: {
    season: number;
    collectedAt: Timestamp;
    hasCompleteData: boolean;
  };
}

// ==========================================
// DATA COLLECTION
// ==========================================

/**
 * Collect historical matches for a league and season
 */
export async function collectLeagueMatches(
  leagueId: number, 
  season: number,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedMatchData[]> {
  console.log(`[ML] Collecting matches for league ${leagueId}, season ${season}`);
  
  // Get all fixtures for the league
  const matches = await getFixturesByLeague(leagueId, season);
  const processedMatches: ProcessedMatchData[] = [];
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    
    // Skip matches that haven't been played
    if (!match.fixture.status.short || match.fixture.status.short === 'NS') {
      continue;
    }
    
    // Skip cancelled/postponed matches
    if (['CANC', 'PST', 'ABD'].includes(match.fixture.status.short)) {
      continue;
    }
    
    try {
      const processed = await processMatchForML(match, season);
      if (processed) {
        processedMatches.push(processed);
      }
      
      if (onProgress) {
        onProgress(i + 1, matches.length);
      }
      
      // Small delay to avoid rate limiting
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error processing match ${match.fixture.id}:`, error);
    }
  }
  
  console.log(`[ML] Collected ${processedMatches.length} matches for league ${leagueId}`);
  return processedMatches;
}

/**
 * Process a single match and extract ML features
 */
async function processMatchForML(match: Match, season: number): Promise<ProcessedMatchData | null> {
  const { fixture, league, teams, goals, score } = match;
  
  // Need final score for training
  if (goals.home === null || goals.away === null) {
    return null;
  }
  
  // Get team statistics before this match
  const [homeStats, awayStats] = await Promise.all([
    getTeamStatsBeforeMatch(teams.home.id, league.id, season, fixture.date),
    getTeamStatsBeforeMatch(teams.away.id, league.id, season, fixture.date)
  ]);
  
  // Get H2H history before this match
  const h2hMatches = await getH2HBeforeMatch(teams.home.id, teams.away.id, fixture.date);
  
  // Calculate features
  const features = calculateFeatures(homeStats, awayStats, h2hMatches);
  
  // Determine target variables
  const target = {
    homeWin: goals.home > goals.away,
    draw: goals.home === goals.away,
    awayWin: goals.away > goals.home,
    btts: goals.home > 0 && goals.away > 0,
    over15: (goals.home + goals.away) > 1.5,
    over25: (goals.home + goals.away) > 2.5,
    over35: (goals.home + goals.away) > 3.5,
    totalGoals: goals.home + goals.away,
  };
  
  return {
    id: fixture.id,
    fixture,
    league,
    teams,
    goals,
    score,
    features,
    target,
    metadata: {
      season,
      collectedAt: Timestamp.now(),
      hasCompleteData: !!homeStats && !!awayStats,
    }
  };
}

/**
 * Sanitize team stats to ensure no null/undefined values are sent to Firebase
 * Firebase rejects documents with empty fields
 */
function sanitizeTeamStats(stats: any): any {
  if (!stats || typeof stats !== 'object') {
    return null;
  }

  // Helper to sanitize a number (null/undefined -> 0)
  const sanitizeNum = (val: any, defaultVal = 0): number => {
    if (val === null || val === undefined || val === '' || Number.isNaN(val)) {
      return defaultVal;
    }
    return Number(val) || defaultVal;
  };

  // Helper to sanitize an object recursively
  const sanitizeObj = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return {};
    
    const result: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined || val === '') {
        // Skip null/undefined/empty string fields
        continue;
      } else if (typeof val === 'number') {
        result[key] = Number.isNaN(val) ? 0 : val;
      } else if (typeof val === 'object' && !Array.isArray(val)) {
        result[key] = sanitizeObj(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  };

  // Build sanitized stats with defaults for critical fields
  const sanitized: any = {
    ...sanitizeObj(stats),
    // Ensure cards object exists with valid numbers
    cards: {
      yellow: sanitizeNum(stats?.cards?.yellow),
      red: sanitizeNum(stats?.cards?.red),
    },
    // Ensure corners object exists with valid numbers
    corners: {
      total: sanitizeNum(stats?.corners?.total),
      perMatch: sanitizeNum(stats?.corners?.perMatch),
    },
  };

  return sanitized;
}

/**
 * Get team statistics before a specific date
 */
async function getTeamStatsBeforeMatch(
  teamId: number,
  leagueId: number,
  season: number,
  beforeDate: string
): Promise<any> {
  if (!isFirebaseInitialized()) return null;
  
  const statsRef = doc(db!, COLLECTIONS.teamStats, `${teamId}_${leagueId}_${season}`);
  
  try {
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      return statsSnap.data();
    }
    
    // Fetch from API if not in cache
    const stats = await getTeamStatistics(teamId, leagueId, season);
    
    if (stats) {
      // Sanitize stats before saving to Firebase (remove null/undefined values)
      const sanitizedStats = sanitizeTeamStats(stats);
      
      if (sanitizedStats) {
        await setDoc(statsRef, {
          ...sanitizedStats,
          teamId,
          leagueId,
          season,
          updatedAt: Timestamp.now(),
        });
        console.log(`[TeamStats] Saved sanitized stats for team ${teamId}, league ${leagueId}, season ${season}`);
      }
    }
    
    return stats;
  } catch (error) {
    console.error(`[TeamStats] Error saving stats for team ${teamId}_${leagueId}_${season}:`, error);
    // Return the stats even if saving failed, so processing can continue
    return null;
  }
}

/**
 * Get H2H matches before a specific date
 */
async function getH2HBeforeMatch(homeId: number, awayId: number, beforeDate: string): Promise<Match[]> {
  // This would fetch from cache or API
  // For now, return empty array as placeholder
  return [];
}

/**
 * Calculate ML features from team stats and H2H
 */
function calculateFeatures(homeStats: any, awayStats: any, h2hMatches: Match[]) {
  // Default values if stats not available
  const defaults = {
    form: [0, 0, 0, 0, 0],
    goalsScoredAvg: 1.5,
    goalsConcededAvg: 1.5,
    cleanSheets: 0.2,
    bttsRate: 0.5,
    over15Rate: 0.7,
    over25Rate: 0.5,
  };
  
  const h = homeStats || defaults;
  const a = awayStats || defaults;
  
  // Calculate H2H stats
  let h2hHomeWins = 0;
  let h2hDraws = 0;
  let h2hAwayWins = 0;
  
  h2hMatches.forEach(m => {
    if (m.goals.home === null || m.goals.away === null) return;
    if (m.goals.home > m.goals.away) h2hHomeWins++;
    else if (m.goals.home === m.goals.away) h2hDraws++;
    else h2hAwayWins++;
  });
  
  return {
    homeForm: h.form || defaults.form,
    awayForm: a.form || defaults.form,
    homeGoalsScoredAvg: h.goalsScoredAvg || defaults.goalsScoredAvg,
    homeGoalsConcededAvg: h.goalsConcededAvg || defaults.goalsConcededAvg,
    awayGoalsScoredAvg: a.goalsScoredAvg || defaults.goalsScoredAvg,
    awayGoalsConcededAvg: a.goalsConcededAvg || defaults.goalsConcededAvg,
    h2hHomeWins,
    h2hDraws,
    h2hAwayWins,
    homeCleanSheets: h.cleanSheets || defaults.cleanSheets,
    awayCleanSheets: a.cleanSheets || defaults.cleanSheets,
    homeBttsRate: h.bttsRate || defaults.bttsRate,
    awayBttsRate: a.bttsRate || defaults.bttsRate,
    homeOver15Rate: h.over15Rate || defaults.over15Rate,
    homeOver25Rate: h.over25Rate || defaults.over25Rate,
    awayOver15Rate: a.over15Rate || defaults.over15Rate,
    awayOver25Rate: a.over25Rate || defaults.over25Rate,
  };
}

// ==========================================
// DATA STORAGE
// ==========================================

/**
 * Save processed match data to Firestore
 */
export async function saveTrainingData(data: ProcessedMatchData[]): Promise<void> {
  if (!isFirebaseInitialized()) {
    console.warn('[ML] Firebase not initialized, cannot save training data');
    return;
  }
  
  const batch = writeBatch(db!);
  
  for (const match of data) {
    const docRef = doc(db!, COLLECTIONS.trainingData, `${match.id}`);
    batch.set(docRef, match, { merge: true });
  }
  
  await batch.commit();
  console.log(`[ML] Saved ${data.length} matches to Firestore`);
}

/**
 * Get training data for ML model
 */
export async function getTrainingData(
  leagueId?: number,
  season?: number,
  limit_count?: number
): Promise<ProcessedMatchData[]> {
  if (!isFirebaseInitialized()) {
    console.warn('[ML] Firebase not initialized');
    return [];
  }
  
  let q = query(collection(db!, COLLECTIONS.trainingData));
  
  if (leagueId) {
    q = query(q, where('league.id', '==', leagueId));
  }
  
  if (season) {
    q = query(q, where('metadata.season', '==', season));
  }
  
  if (limit_count) {
    q = query(q, limit(limit_count));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as ProcessedMatchData);
}

/**
 * Collect data for all leagues and seasons
 */
export async function collectAllHistoricalData(
  seasons: number[] = AVAILABLE_SEASONS,
  onLeagueProgress?: (leagueName: string, current: number, total: number) => void,
  onOverallProgress?: (currentLeague: number, totalLeagues: number) => void
): Promise<{ totalMatches: number; byLeague: Record<string, number> }> {
  const results: Record<string, number> = {};
  let totalMatches = 0;
  
  const leagues = ALL_LEAGUES.slice(0, 10); // Start with top 10 leagues to avoid rate limits
  
  for (let leagueIndex = 0; leagueIndex < leagues.length; leagueIndex++) {
    const league = leagues[leagueIndex];
    
    if (onOverallProgress) {
      onOverallProgress(leagueIndex + 1, leagues.length);
    }
    
    for (const season of seasons) {
      try {
        const matches = await collectLeagueMatches(league.id, season, (current, total) => {
          if (onLeagueProgress) {
            onLeagueProgress(`${league.name} (${season})`, current, total);
          }
        });
        
        if (matches.length > 0) {
          await saveTrainingData(matches);
          results[`${league.name}_${season}`] = matches.length;
          totalMatches += matches.length;
        }
        
        // Wait between leagues to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`[ML] Error collecting ${league.name} ${season}:`, error);
      }
    }
  }
  
  return { totalMatches, byLeague: results };
}

// ==========================================
// FEATURE ENGINEERING
// ==========================================

/**
 * Calculate rolling form (last 5 matches)
 */
export function calculateRollingForm(matches: Match[], teamId: number): number[] {
  const form: number[] = [];
  
  // Sort by date descending
  const sortedMatches = [...matches]
    .filter(m => m.goals.home !== null && m.goals.away !== null)
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, 5);
  
  for (const match of sortedMatches) {
    const isHome = match.teams.home.id === teamId;
    const teamGoals = isHome ? match.goals.home! : match.goals.away!;
    const oppGoals = isHome ? match.goals.away! : match.goals.home!;
    
    if (teamGoals > oppGoals) form.push(3); // Win
    else if (teamGoals === oppGoals) form.push(1); // Draw
    else form.push(0); // Loss
  }
  
  // Pad to 5 if needed
  while (form.length < 5) {
    form.push(0);
  }
  
  return form;
}

/**
 * Calculate team performance metrics
 */
export function calculateTeamMetrics(matches: Match[], teamId: number) {
  const teamMatches = matches.filter(m => 
    (m.teams.home.id === teamId || m.teams.away.id === teamId) &&
    m.goals.home !== null && m.goals.away !== null
  );
  
  if (teamMatches.length === 0) {
    return {
      avgGoalsScored: 1.5,
      avgGoalsConceded: 1.5,
      cleanSheetRate: 0.2,
      bttsRate: 0.5,
      over15Rate: 0.7,
      over25Rate: 0.5,
    };
  }
  
  let goalsScored = 0;
  let goalsConceded = 0;
  let cleanSheets = 0;
  let bttsCount = 0;
  let over15Count = 0;
  let over25Count = 0;
  
  for (const match of teamMatches) {
    const isHome = match.teams.home.id === teamId;
    const gs = isHome ? match.goals.home! : match.goals.away!;
    const gc = isHome ? match.goals.away! : match.goals.home!;
    
    goalsScored += gs;
    goalsConceded += gc;
    
    if (gc === 0) cleanSheets++;
    if (gs > 0 && gc > 0) bttsCount++;
    if ((gs + gc) > 1.5) over15Count++;
    if ((gs + gc) > 2.5) over25Count++;
  }
  
  const count = teamMatches.length;
  
  return {
    avgGoalsScored: goalsScored / count,
    avgGoalsConceded: goalsConceded / count,
    cleanSheetRate: cleanSheets / count,
    bttsRate: bttsCount / count,
    over15Rate: over15Count / count,
    over25Rate: over25Count / count,
  };
}

// ==========================================
// DATA EXPORT
// ==========================================

/**
 * Export training data to CSV format for external ML tools
 */
export function exportToCSV(data: ProcessedMatchData[]): string {
  const headers = [
    'match_id',
    'league_id',
    'season',
    'home_team',
    'away_team',
    'home_form_1',
    'home_form_2',
    'home_form_3',
    'home_form_4',
    'home_form_5',
    'away_form_1',
    'away_form_2',
    'away_form_3',
    'away_form_4',
    'away_form_5',
    'home_goals_scored_avg',
    'home_goals_conceded_avg',
    'away_goals_scored_avg',
    'away_goals_conceded_avg',
    'h2h_home_wins',
    'h2h_draws',
    'h2h_away_wins',
    'home_clean_sheets',
    'away_clean_sheets',
    'home_btts_rate',
    'away_btts_rate',
    'home_over25_rate',
    'away_over25_rate',
    // Targets
    'result_home_win',
    'result_draw',
    'result_away_win',
    'btts',
    'over25',
    'total_goals',
  ];
  
  const rows = data.map(m => [
    m.id,
    m.league.id,
    m.metadata.season,
    m.teams.home.name,
    m.teams.away.name,
    ...m.features.homeForm,
    ...m.features.awayForm,
    m.features.homeGoalsScoredAvg,
    m.features.homeGoalsConcededAvg,
    m.features.awayGoalsScoredAvg,
    m.features.awayGoalsConcededAvg,
    m.features.h2hHomeWins,
    m.features.h2hDraws,
    m.features.h2hAwayWins,
    m.features.homeCleanSheets,
    m.features.awayCleanSheets,
    m.features.homeBttsRate,
    m.features.awayBttsRate,
    m.features.homeOver25Rate,
    m.features.awayOver25Rate,
    // Targets
    m.target.homeWin ? 1 : 0,
    m.target.draw ? 1 : 0,
    m.target.awayWin ? 1 : 0,
    m.target.btts ? 1 : 0,
    m.target.over25 ? 1 : 0,
    m.target.totalGoals,
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export {
  AVAILABLE_SEASONS,
  COLLECTIONS,
};
export type { ProcessedMatchData };
