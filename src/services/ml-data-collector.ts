// ML Data Collector Service
// Collects historical match data for model training

import { makeRequest, formatISODateForAPI } from './api-football';
import { getCorrectSeason, getAlternativeSeasons, selectCorrectStandings } from './season-detector';
import { getCache, setCache, CACHE_TYPES } from './local-cache';

// Feature vector for a single match
export interface MatchFeatures {
  // Match identification
  matchId: number;
  date: string;
  leagueId: number;
  season: number;
  
  // Team IDs
  homeTeamId: number;
  awayTeamId: number;
  
  // Form features (last 5 matches)
  homeFormWins: number;
  homeFormDraws: number;
  homeFormLosses: number;
  homeFormGoalsFor: number;
  homeFormGoalsAgainst: number;
  
  awayFormWins: number;
  awayFormDraws: number;
  awayFormLosses: number;
  awayFormGoalsFor: number;
  awayFormGoalsAgainst: number;
  
  // Season stats features
  homeLeaguePosition: number;
  homePoints: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  homeCleanSheets: number;
  homeAvgGoalsScored: number;
  homeAvgGoalsConceded: number;
  
  awayLeaguePosition: number;
  awayPoints: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  awayCleanSheets: number;
  awayAvgGoalsScored: number;
  awayAvgGoalsConceded: number;
  
  // H2H features
  h2hHomeWins: number;
  h2hDraws: number;
  h2hAwayWins: number;
  h2hAvgGoals: number;
  h2hOver25: number;
  h2hBtts: number;
  
  // Odds features (if available)
  oddsHome?: number;
  oddsDraw?: number;
  oddsAway?: number;
  oddsOver25?: number;
  oddsUnder25?: number;
  oddsBttsYes?: number;
  oddsBttsNo?: number;
  
  // Target variables (what we want to predict)
  result: 'H' | 'D' | 'A'; // Home, Draw, Away
  homeGoals: number;
  awayGoals: number;
  totalGoals: number;
  btts: boolean; // Both teams scored
  over25: boolean;
  over35: boolean;
}

// Training dataset
export interface TrainingDataset {
  features: number[][];
  labels: {
    result: number[]; // 0=H, 1=D, 2=A
    homeGoals: number[];
    awayGoals: number[];
    over25: number[]; // 0 or 1
    btts: number[]; // 0 or 1
  };
  metadata: MatchFeatures[];
}

// League priorities for data collection
const PRIORITY_LEAGUES = {
  TIER_1: [39, 140, 135, 78, 61], // Premier, LaLiga, SerieA, Bundesliga, Ligue1
  TIER_2: [253, 262, 71, 128, 88], // MLS, LigaMX, Brazil, Argentina, Eredivisie
  TIER_3: [94, 144, 119, 203, 113], // Portugal, Belgium, Scotland, Turkey, Sweden
};

// Collect historical matches for a league
export async function collectLeagueHistoricalData(
  leagueId: number,
  seasons: number[],
  onProgress?: (collected: number, total: number) => void
): Promise<MatchFeatures[]> {
  const allMatches: MatchFeatures[] = [];
  let processed = 0;
  
  for (const season of seasons) {
    console.log(`[ML Data] Collecting season ${season} for league ${leagueId}`);
    
    try {
      // Get all finished matches for the season
      const matches = await getFinishedMatches(leagueId, season);
      
      // Process each match
      for (const match of matches) {
        try {
          const features = await extractMatchFeatures(match, season);
          if (features) {
            allMatches.push(features);
          }
        } catch (error) {
          console.error(`[ML Data] Error processing match ${match.fixture.id}:`, error);
        }
        
        processed++;
        onProgress?.(processed, matches.length * seasons.length);
        
        // Rate limiting delay
        await delay(100);
      }
    } catch (error) {
      console.error(`[ML Data] Error collecting season ${season}:`, error);
    }
  }
  
  return allMatches;
}

// Get finished matches for a league/season
async function getFinishedMatches(leagueId: number, season: number) {
  const cacheKey = `finished_${leagueId}_${season}`;
  const cached = getCache<any[]>(CACHE_TYPES.MATCH_STATS, cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const data = await makeRequest<{
    response: Array<{
      fixture: {
        id: number;
        date: string;
        status: { short: string };
      };
      league: { id: number };
      teams: {
        home: { id: number; name: string };
        away: { id: number; name: string };
      };
      goals: { home: number; away: number };
    }>;
  }>({
    endpoint: '/fixtures',
    params: { league: leagueId, season, status: 'FT' }
  });
  
  const matches = data.response || [];
  setCache(CACHE_TYPES.MATCH_STATS, cacheKey, matches, 24 * 60 * 60 * 1000); // 24h cache
  
  return matches;
}

// Extract features from a single match
async function extractMatchFeatures(match: any, season: number): Promise<MatchFeatures | null> {
  const { fixture, league, teams, goals } = match;
  
  if (goals.home === null || goals.away === null) {
    return null;
  }
  
  const homeTeamId = teams.home.id;
  const awayTeamId = teams.away.id;
  
  // Get form before this match (last 5)
  const [homeForm, awayForm] = await Promise.all([
    getTeamFormBeforeMatch(homeTeamId, season, fixture.date),
    getTeamFormBeforeMatch(awayTeamId, season, fixture.date),
  ]);
  
  // Get season stats before this match
  const [homeStats, awayStats] = await Promise.all([
    getTeamStatsBeforeMatch(homeTeamId, league.id, season, fixture.date),
    getTeamStatsBeforeMatch(awayTeamId, league.id, season, fixture.date),
  ]);
  
  // Get H2H history before this match
  const h2h = await getH2HBeforeMatch(homeTeamId, awayTeamId, fixture.date);
  
  // Get odds if available
  const odds = await getMatchOddsForTraining(fixture.id);
  
  // Calculate derived features
  const totalGoals = goals.home + goals.away;
  
  return {
    matchId: fixture.id,
    date: fixture.date,
    leagueId: league.id,
    season,
    homeTeamId,
    awayTeamId,
    
    // Form
    homeFormWins: homeForm.wins,
    homeFormDraws: homeForm.draws,
    homeFormLosses: homeForm.losses,
    homeFormGoalsFor: homeForm.goalsFor,
    homeFormGoalsAgainst: homeForm.goalsAgainst,
    
    awayFormWins: awayForm.wins,
    awayFormDraws: awayForm.draws,
    awayFormLosses: awayForm.losses,
    awayFormGoalsFor: awayForm.goalsFor,
    awayFormGoalsAgainst: awayForm.goalsAgainst,
    
    // Stats
    homeLeaguePosition: homeStats.position,
    homePoints: homeStats.points,
    homeGoalsFor: homeStats.goalsFor,
    homeGoalsAgainst: homeStats.goalsAgainst,
    homeCleanSheets: homeStats.cleanSheets,
    homeAvgGoalsScored: homeStats.avgGoalsScored,
    homeAvgGoalsConceded: homeStats.avgGoalsConceded,
    
    awayLeaguePosition: awayStats.position,
    awayPoints: awayStats.points,
    awayGoalsFor: awayStats.goalsFor,
    awayGoalsAgainst: awayStats.goalsAgainst,
    awayCleanSheets: awayStats.cleanSheets,
    awayAvgGoalsScored: awayStats.avgGoalsScored,
    awayAvgGoalsConceded: awayStats.avgGoalsConceded,
    
    // H2H
    h2hHomeWins: h2h.homeWins,
    h2hDraws: h2h.draws,
    h2hAwayWins: h2h.awayWins,
    h2hAvgGoals: h2h.avgGoals,
    h2hOver25: h2h.over25,
    h2hBtts: h2h.btts,
    
    // Odds
    oddsHome: odds?.home,
    oddsDraw: odds?.draw,
    oddsAway: odds?.away,
    oddsOver25: odds?.over25,
    oddsUnder25: odds?.under25,
    oddsBttsYes: odds?.bttsYes,
    oddsBttsNo: odds?.bttsNo,
    
    // Target
    result: goals.home > goals.away ? 'H' : goals.home === goals.away ? 'D' : 'A',
    homeGoals: goals.home,
    awayGoals: goals.away,
    totalGoals,
    btts: goals.home > 0 && goals.away > 0,
    over25: totalGoals > 2.5,
    over35: totalGoals > 3.5,
  };
}

// Get team form before a specific date
async function getTeamFormBeforeMatch(
  teamId: number,
  season: number,
  beforeDate: string
): Promise<{ wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }> {
  try {
    // Format date to YYYY-MM-DD for API
    const formattedDate = formatISODateForAPI(beforeDate);
    
    const data = await makeRequest<{
      response: Array<{
        fixture: { date: string };
        teams: { home: { id: number }; away: { id: number } };
        goals: { home: number; away: number };
      }>;
    }>({
      endpoint: '/fixtures',
      params: { team: teamId, season, status: 'FT', to: formattedDate, last: 5 }
    });
    
    const matches = data.response || [];
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    
    matches.forEach(match => {
      const isHome = match.teams.home.id === teamId;
      const teamGoals = isHome ? match.goals.home : match.goals.away;
      const oppGoals = isHome ? match.goals.away : match.goals.home;
      
      goalsFor += teamGoals;
      goalsAgainst += oppGoals;
      
      if (teamGoals > oppGoals) wins++;
      else if (teamGoals === oppGoals) draws++;
      else losses++;
    });
    
    return { wins, draws, losses, goalsFor, goalsAgainst };
  } catch (error) {
    return { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  }
}

// Get team stats before a specific date
async function getTeamStatsBeforeMatch(
  teamId: number,
  leagueId: number,
  season: number,
  beforeDate: string
): Promise<{
  position: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
}> {
  try {
    // Get standings at that point
    const data = await makeRequest<{
      response: {
        league: {
          standings: Array<Array<{
            rank: number;
            team: { id: number };
            points: number;
            all: {
              played: number;
              win: number;
              draw: number;
              lose: number;
              goals: { for: number; against: number };
            };
            clean_sheet: { total: number };
          }>>;
        };
      };
    }>({
      endpoint: '/standings',
      params: { team: teamId, league: leagueId, season }
    });
    
    const allStandings = data.response?.league?.standings;
    let standing = null;
    
    if (allStandings && allStandings.length > 0) {
      // Select correct standings phase for leagues with Apertura/Clausura
      const selectedStandings = selectCorrectStandings(allStandings, leagueId);
      standing = selectedStandings.find(s => s.team.id === teamId);
    }
    
    if (!standing) {
      return {
        position: 0, points: 0, goalsFor: 0, goalsAgainst: 0,
        cleanSheets: 0, avgGoalsScored: 0, avgGoalsConceded: 0
      };
    }
    
    const played = standing.all.played || 1;
    
    return {
      position: standing.rank,
      points: standing.points,
      goalsFor: standing.all.goals.for,
      goalsAgainst: standing.all.goals.against,
      cleanSheets: standing.clean_sheet?.total || 0,
      avgGoalsScored: standing.all.goals.for / played,
      avgGoalsConceded: standing.all.goals.against / played,
    };
  } catch (error) {
    return {
      position: 0, points: 0, goalsFor: 0, goalsAgainst: 0,
      cleanSheets: 0, avgGoalsScored: 0, avgGoalsConceded: 0
    };
  }
}

// Get H2H before a specific date
async function getH2HBeforeMatch(
  homeTeamId: number,
  awayTeamId: number,
  beforeDate: string
): Promise<{
  homeWins: number;
  draws: number;
  awayWins: number;
  avgGoals: number;
  over25: number;
  btts: number;
}> {
  try {
    // Format date to YYYY-MM-DD for API
    const formattedDate = formatISODateForAPI(beforeDate);
    
    const data = await makeRequest<{
      response: Array<{
        fixture: { date: string };
        goals: { home: number; away: number };
      }>;
    }>({
      endpoint: '/fixtures/headtohead',
      params: { h2h: `${homeTeamId}-${awayTeamId}`, to: formattedDate, last: 5 }
    });
    
    const matches = data.response || [];
    let homeWins = 0, draws = 0, awayWins = 0, totalGoals = 0, over25Count = 0, bttsCount = 0;
    
    matches.forEach(match => {
      const homeG = match.goals.home;
      const awayG = match.goals.away;
      
      totalGoals += homeG + awayG;
      if (homeG + awayG > 2.5) over25Count++;
      if (homeG > 0 && awayG > 0) bttsCount++;
      
      if (homeG > awayG) homeWins++;
      else if (homeG === awayG) draws++;
      else awayWins++;
    });
    
    return {
      homeWins,
      draws,
      awayWins,
      avgGoals: matches.length > 0 ? totalGoals / matches.length : 0,
      over25: matches.length > 0 ? (over25Count / matches.length) * 100 : 0,
      btts: matches.length > 0 ? (bttsCount / matches.length) * 100 : 0,
    };
  } catch (error) {
    return { homeWins: 0, draws: 0, awayWins: 0, avgGoals: 0, over25: 0, btts: 0 };
  }
}

// Get odds for training
async function getMatchOddsForTraining(fixtureId: number) {
  try {
    const data = await makeRequest<{
      response: Array<{
        bookmakers: Array<{
          bets: Array<{
            name: string;
            values: Array<{ value: string; odd: string }>;
          }>;
        }>;
      }>;
    }>({
      endpoint: '/odds',
      params: { fixture: fixtureId }
    });
    
    const bookmaker = data.response?.[0]?.bookmakers?.[0];
    if (!bookmaker) return null;
    
    const result: any = {};
    
    bookmaker.bets?.forEach(bet => {
      if (bet.name === 'Match Winner') {
        result.home = parseFloat(bet.values.find(v => v.value === 'Home')?.odd || '0') || undefined;
        result.draw = parseFloat(bet.values.find(v => v.value === 'Draw')?.odd || '0') || undefined;
        result.away = parseFloat(bet.values.find(v => v.value === 'Away')?.odd || '0') || undefined;
      }
      if (bet.name === 'Goals Over/Under') {
        result.over25 = parseFloat(bet.values.find(v => v.value === 'Over 2.5')?.odd || '0') || undefined;
        result.under25 = parseFloat(bet.values.find(v => v.value === 'Under 2.5')?.odd || '0') || undefined;
      }
      if (bet.name === 'Both Teams To Score') {
        result.bttsYes = parseFloat(bet.values.find(v => v.value === 'Yes')?.odd || '0') || undefined;
        result.bttsNo = parseFloat(bet.values.find(v => v.value === 'No')?.odd || '0') || undefined;
      }
    });
    
    return result;
  } catch (error) {
    return null;
  }
}

// Convert to training format
export function convertToTrainingFormat(matches: MatchFeatures[]): TrainingDataset {
  const features: number[][] = [];
  const resultLabels: number[] = [];
  const homeGoalsLabels: number[] = [];
  const awayGoalsLabels: number[] = [];
  const over25Labels: number[] = [];
  const bttsLabels: number[] = [];
  
  matches.forEach(match => {
    // Feature vector (exclude IDs and targets)
    const featureVector = [
      // Form features
      match.homeFormWins / 5,
      match.homeFormDraws / 5,
      match.homeFormLosses / 5,
      match.homeFormGoalsFor / 10,
      match.homeFormGoalsAgainst / 10,
      match.awayFormWins / 5,
      match.awayFormDraws / 5,
      match.awayFormLosses / 5,
      match.awayFormGoalsFor / 10,
      match.awayFormGoalsAgainst / 10,
      
      // Stats features
      match.homeLeaguePosition / 20,
      match.homePoints / 100,
      match.homeGoalsFor / 100,
      match.homeGoalsAgainst / 100,
      match.homeCleanSheets / 20,
      match.homeAvgGoalsScored / 3,
      match.homeAvgGoalsConceded / 3,
      match.awayLeaguePosition / 20,
      match.awayPoints / 100,
      match.awayGoalsFor / 100,
      match.awayGoalsAgainst / 100,
      match.awayCleanSheets / 20,
      match.awayAvgGoalsScored / 3,
      match.awayAvgGoalsConceded / 3,
      
      // H2H features
      match.h2hHomeWins / 5,
      match.h2hDraws / 5,
      match.h2hAwayWins / 5,
      match.h2hAvgGoals / 5,
      match.h2hOver25 / 100,
      match.h2hBtts / 100,
      
      // Odds features (if available, otherwise 0)
      match.oddsHome ? 1 / match.oddsHome : 0,
      match.oddsDraw ? 1 / match.oddsDraw : 0,
      match.oddsAway ? 1 / match.oddsAway : 0,
    ];
    
    features.push(featureVector);
    
    // Labels
    resultLabels.push(match.result === 'H' ? 0 : match.result === 'D' ? 1 : 2);
    homeGoalsLabels.push(match.homeGoals);
    awayGoalsLabels.push(match.awayGoals);
    over25Labels.push(match.over25 ? 1 : 0);
    bttsLabels.push(match.btts ? 1 : 0);
  });
  
  return {
    features,
    labels: {
      result: resultLabels,
      homeGoals: homeGoalsLabels,
      awayGoals: awayGoalsLabels,
      over25: over25Labels,
      btts: bttsLabels,
    },
    metadata: matches,
  };
}

// Export dataset to JSON
export function exportDatasetToJSON(dataset: TrainingDataset): string {
  return JSON.stringify(dataset, null, 2);
}

// Calculate feature importance (simple correlation)
export function calculateFeatureImportance(dataset: TrainingDataset): Array<{ feature: string; importance: number }> {
  const featureNames = [
    'Home Form Wins', 'Home Form Draws', 'Home Form Losses', 'Home Form GF', 'Home Form GA',
    'Away Form Wins', 'Away Form Draws', 'Away Form Losses', 'Away Form GF', 'Away Form GA',
    'Home Position', 'Home Points', 'Home GF', 'Home GA', 'Home CS',
    'Home Avg Scored', 'Home Avg Conceded',
    'Away Position', 'Away Points', 'Away GF', 'Away GA', 'Away CS',
    'Away Avg Scored', 'Away Avg Conceded',
    'H2H Home Wins', 'H2H Draws', 'H2H Away Wins', 'H2H Avg Goals', 'H2H Over25', 'H2H BTTS',
    'Implied Prob Home', 'Implied Prob Draw', 'Implied Prob Away',
  ];
  
  // Simple variance-based importance
  const importances = dataset.features[0].map((_, idx) => {
    const values = dataset.features.map(f => f[idx]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return {
      feature: featureNames[idx] || `Feature ${idx}`,
      importance: variance,
    };
  });
  
  return importances.sort((a, b) => b.importance - a.importance);
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
