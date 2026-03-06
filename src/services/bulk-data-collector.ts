// Bulk Data Collector - Staged collection for historical data
// Collects data in batches to respect API rate limits

import { makeRequest } from './api-football';
import { getCorrectSeason } from './season-detector';
import { setCache, getCache, CACHE_TYPES } from './local-cache';

export interface CollectionProgress {
  totalMatches: number;
  collectedMatches: number;
  currentLeague: string;
  currentSeason: number;
  estimatedMinutesRemaining: number;
  errors: number;
}

export interface CollectionConfig {
  leagueIds: number[];
  seasons: number[];
  matchesPerBatch: number;
  delayBetweenMatches: number;
  stopOnError: boolean;
}

// Default config optimized for API limits
const DEFAULT_CONFIG: CollectionConfig = {
  leagueIds: [], // Will be filled
  seasons: [],
  matchesPerBatch: 10, // Collect 10 matches, then pause
  delayBetweenMatches: 6000, // 6 seconds (API limit)
  stopOnError: false,
};

// Priority leagues with best data quality
export const PRIORITY_LEAGUES = {
  TIER_1: [39, 140, 135, 78, 61], // Top 5 Europe
  TIER_2: [253, 262, 71, 128, 88, 94], // MLS, LigaMX, Brazil, Argentina, Netherlands, Portugal
  TIER_3: [144, 119, 203, 113, 106, 235], // Belgium, Scotland, Turkey, Sweden, Poland, Russia
  ALL: [] as number[], // Filled dynamically
};

// Calculate collection time estimate
export function estimateCollectionTime(
  leagueCount: number,
  seasonsCount: number,
  avgMatchesPerLeague: number = 300
): string {
  const totalMatches = leagueCount * seasonsCount * avgMatchesPerLeague;
  const seconds = totalMatches * 6; // 6 seconds per match
  const hours = seconds / 3600;
  const days = hours / 24;
  
  if (days >= 1) {
    return `${days.toFixed(1)} días`;
  } else if (hours >= 1) {
    return `${hours.toFixed(1)} horas`;
  } else {
    return `${(seconds / 60).toFixed(0)} minutos`;
  }
}

// Collect matches for a single league/season
async function collectLeagueSeasonMatches(
  leagueId: number,
  season: number,
  onProgress?: (collected: number, total: number) => void
): Promise<any[]> {
  const cacheKey = `league_${leagueId}_${season}_matches`;
  const cached = getCache<any[]>(CACHE_TYPES.MATCH_STATS, cacheKey);
  
  if (cached && cached.length > 0) {
    console.log(`[Bulk] Using cached data for league ${leagueId} season ${season}`);
    return cached;
  }
  
  try {
    const data = await makeRequest<{
      response: any[];
    }>({
      endpoint: '/fixtures',
      params: { league: leagueId, season, status: 'FT' }
    });
    
    const matches = data.response || [];
    
    // Cache for 24 hours
    setCache(CACHE_TYPES.MATCH_STATS, cacheKey, matches, 24 * 60 * 60 * 1000);
    
    return matches;
  } catch (error) {
    console.error(`[Bulk] Error collecting league ${leagueId} season ${season}:`, error);
    return [];
  }
}

// Main collection function with pause/resume capability
export async function collectHistoricalData(
  config: Partial<CollectionConfig> = {},
  onProgress?: (progress: CollectionProgress) => void,
  onBatchComplete?: (batch: any[], batchNumber: number) => void,
  shouldStop?: () => boolean
): Promise<any[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const allMatches: any[] = [];
  
  let collectedMatches = 0;
  let errors = 0;
  const startTime = Date.now();
  
  // Calculate total for estimation
  let totalEstimatedMatches = 0;
  for (const leagueId of finalConfig.leagueIds) {
    for (const season of finalConfig.seasons) {
      const matches = await collectLeagueSeasonMatches(leagueId, season);
      totalEstimatedMatches += matches.length;
    }
  }
  
  console.log(`[Bulk] Starting collection of ${totalEstimatedMatches} estimated matches`);
  
  // Collect by batches
  let batchNumber = 0;
  
  for (const leagueId of finalConfig.leagueIds) {
    for (const season of finalConfig.seasons) {
      if (shouldStop && shouldStop()) {
        console.log('[Bulk] Collection stopped by user');
        break;
      }
      
      const league = await getLeagueName(leagueId);
      
      const matches = await collectLeagueSeasonMatches(leagueId, season);
      
      for (let i = 0; i < matches.length; i++) {
        if (shouldStop && shouldStop()) break;
        
        try {
          const match = matches[i];
          
          // Process match (extract features)
          const processed = await processMatch(match, leagueId, season);
          
          if (processed) {
            allMatches.push(processed);
            collectedMatches++;
          }
          
          // Progress update
          const elapsedMinutes = (Date.now() - startTime) / 60000;
          const matchesPerMinute = collectedMatches / elapsedMinutes;
          const remainingMatches = totalEstimatedMatches - collectedMatches;
          const estimatedMinutesRemaining = matchesPerMinute > 0 
            ? remainingMatches / matchesPerMinute 
            : 0;
          
          onProgress?.({
            totalMatches: totalEstimatedMatches,
            collectedMatches,
            currentLeague: league,
            currentSeason: season,
            estimatedMinutesRemaining,
            errors,
          });
          
          // Batch complete callback
          if (collectedMatches % finalConfig.matchesPerBatch === 0) {
            batchNumber++;
            onBatchComplete?.(allMatches.slice(-finalConfig.matchesPerBatch), batchNumber);
            
            // Save progress to localStorage
            saveProgress(allMatches, {
              leagueId,
              season,
              matchIndex: i,
              totalCollected: collectedMatches,
            });
          }
          
          // Rate limiting delay
          await delay(finalConfig.delayBetweenMatches);
          
        } catch (error) {
          errors++;
          console.error(`[Bulk] Error processing match:`, error);
          
          if (finalConfig.stopOnError) {
            throw error;
          }
        }
      }
    }
  }
  
  console.log(`[Bulk] Collection complete: ${allMatches.length} matches`);
  return allMatches;
}

// Quick collection for top leagues (5-10 matches per league)
export async function collectQuickSample(
  onProgress?: (progress: CollectionProgress) => void
): Promise<any[]> {
  const config: CollectionConfig = {
    leagueIds: PRIORITY_LEAGUES.TIER_1,
    seasons: [2024, 2023],
    matchesPerBatch: 5,
    delayBetweenMatches: 6000,
    stopOnError: false,
  };
  
  return collectHistoricalData(config, onProgress);
}

// Overnight collection (larger batch for running while sleeping)
export async function collectOvernight(
  onProgress?: (progress: CollectionProgress) => void,
  shouldStop?: () => boolean
): Promise<any[]> {
  const config: CollectionConfig = {
    leagueIds: [...PRIORITY_LEAGUES.TIER_1, ...PRIORITY_LEAGUES.TIER_2],
    seasons: [2024, 2023, 2022],
    matchesPerBatch: 50,
    delayBetweenMatches: 6000,
    stopOnError: false,
  };
  
  return collectHistoricalData(config, onProgress, undefined, shouldStop);
}

// Process individual match to extract features
async function processMatch(match: any, leagueId: number, season: number): Promise<any | null> {
  const { fixture, teams, goals } = match;
  
  if (!goals || goals.home === null || goals.away === null) {
    return null;
  }
  
  // Basic match data
  return {
    matchId: fixture.id,
    date: fixture.date,
    leagueId,
    season,
    homeTeamId: teams.home.id,
    awayTeamId: teams.away.id,
    homeTeam: teams.home.name,
    awayTeam: teams.away.name,
    homeGoals: goals.home,
    awayGoals: goals.away,
    result: goals.home > goals.away ? 'H' : goals.home === goals.away ? 'D' : 'A',
    totalGoals: goals.home + goals.away,
    btts: goals.home > 0 && goals.away > 0,
    over25: goals.home + goals.away > 2.5,
    // Features will be added by separate processing
  };
}

// Helper functions
async function getLeagueName(leagueId: number): Promise<string> {
  try {
    const data = await makeRequest<{
      response: Array<{ league: { name: string } }>;
    }>({
      endpoint: '/leagues',
      params: { id: leagueId }
    });
    
    return data.response?.[0]?.league?.name || `League ${leagueId}`;
  } catch {
    return `League ${leagueId}`;
  }
}

function saveProgress(matches: any[], state: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ml_collection_progress', JSON.stringify({
      matches: matches.slice(-100), // Keep last 100 in memory
      state,
      timestamp: Date.now(),
    }));
  }
}

export function loadProgress(): { matches: any[]; state: any } | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('ml_collection_progress');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function clearProgress() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ml_collection_progress');
  }
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Export dataset as JSON
export function exportToJSON(matches: any[]): string {
  return JSON.stringify(matches, null, 2);
}

// Export as CSV
export function exportToCSV(matches: any[]): string {
  if (matches.length === 0) return '';
  
  const headers = Object.keys(matches[0]).join(',');
  const rows = matches.map(m => Object.values(m).join(','));
  
  return [headers, ...rows].join('\n');
}

// Resume collection from saved progress
export async function resumeCollection(
  onProgress?: (progress: CollectionProgress) => void,
  shouldStop?: () => boolean
): Promise<any[]> {
  const progress = loadProgress();
  
  if (!progress) {
    console.log('[Bulk] No saved progress found');
    return [];
  }
  
  console.log(`[Bulk] Resuming from ${progress.state.totalCollected} matches`);
  
  // Continue from where we left off
  const config: CollectionConfig = {
    leagueIds: [], // Would need to store this in progress
    seasons: [progress.state.season],
    matchesPerBatch: 10,
    delayBetweenMatches: 6000,
    stopOnError: false,
  };
  
  // For now, just return what we have
  return progress.matches;
}
