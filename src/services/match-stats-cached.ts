import { Match } from '@/types';
import { makeRequest } from './api-football';
import { calculateMarketEV } from './market-models';
import { getCorrectSeason, getAlternativeSeasons, selectCorrectStandings } from './season-detector';
import { getCache, setCache, CACHE_TYPES } from './local-cache';
import { predictHybrid, HybridPrediction } from './ml-hybrid-model';
import { predictMatch } from './ml-predictor';
import { 
  getTeamFormLocal, 
  getTeamStatsLocal, 
  getH2HLocal, 
  getStandingsLocal,
  getCompleteMatchStatsWithLocal 
} from './local-data-adapter';
import { loadLeaguesLazy, hasLocalData } from './local-data-loader';
// Local delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Import types for internal use
export interface MatchForm {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string;
  last10: Array<{
    date: string;
    opponent: string;
    home: boolean;
    result: 'W' | 'D' | 'L';
    goalsFor: number;
    goalsAgainst: number;
  }>;
}

export interface TeamDetailedStats {
  leaguePosition: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
  cleanSheets: number;
  failedToScore: number;
  over15: number;
  over25: number;
  over35: number;
  btts: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
  cards: { yellow: number; red: number };
  corners: { for: number; against: number };
}

export interface H2HStats {
  totalMatches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  avgGoals: number;
  over25: number;
  btts: number;
  last5: Array<{
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
    league: string;
  }>;
}

export interface OddsData {
  matchWinner: { home: number; draw: number; away: number } | null;
  overUnder: { 
    over15: number | null; 
    under15: number | null;
    over25: number | null; 
    under25: number | null; 
    over35: number | null; 
    under35: number | null; 
  };
  btts: { yes: number | null; no: number | null; };
  asianHandicap: { home: number | null; away: number | null; line: string | null } | null;
  corners: { over: number | null; under: number | null; line: string | null } | null;
  cards: { over: number | null; under: number | null; line: string | null } | null;
}

export interface MLPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  over15: number;  // Over/Under 1.5 goals
  over25: number;  // Over/Under 2.5 goals
  over35: number;  // Over/Under 3.5 goals
  btts: number;    // Both Teams To Score
  cards: {
    over45: number;   // Over 4.5 cards
    over55: number;   // Over 5.5 cards
    avgTotal: number; // Expected total cards
  };
  corners: {
    over85: number;   // Over 8.5 corners
    over95: number;   // Over 9.5 corners
    over105: number;  // Over 10.5 corners
    avgTotal: number; // Expected total corners
  };
  factors: {
    homeAdvantage: number;
    formWeight: number;
    statsWeight: number;
    h2hWeight: number;
  };
  recommendedPick: {
    market: string;
    selection: string;
    odds: number;
    probability: number;
    ev: number;
    confidence: 'high' | 'medium' | 'low';
  } | null;
}

export interface CompleteMatchStats {
  match: Match;
  homeForm: MatchForm;
  awayForm: MatchForm;
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  h2h: H2HStats;
  odds: OddsData;
  mlPrediction: MLPrediction;
  leagueTable: Array<{
    rank: number;
    team: string;
    points: number;
    played: number;
    goalsDiff: number;
  }>;
}

// Loading state type
export type LoadingState = {
  standings: boolean;
  form: boolean;
  h2h: boolean;
  odds: boolean;
};

// Cache helpers with fallback
async function getCachedOrFetch<T>(
  type: string,
  id: string | number,
  fetchFn: () => Promise<T>,
  ttl: number = 30 * 60 * 1000
): Promise<T> {
  // Try cache first
  const cached = getCache<T>(type, id);
  if (cached) {
    console.log(`[Cache] Hit for ${type}_${id}`);
    return cached;
  }
  
  // Fetch and cache
  console.log(`[Cache] Miss for ${type}_${id}, fetching...`);
  const data = await fetchFn();
  setCache(type, id, data, ttl);
  return data;
}

// Get team form - uses local data first, API as fallback
async function getTeamForm(teamId: number, season: number, leagueId?: number): Promise<MatchForm> {
  const cacheKey = `${teamId}_${season}`;
  
  return getCachedOrFetch(CACHE_TYPES.TEAM_FORM, cacheKey, async () => {
    // Try local data first
    const localForm = await getTeamFormLocal(teamId, leagueId);
    if (localForm && localForm.played > 0) {
      console.log(`[Form] Using local data for team ${teamId}`);
      return localForm;
    }
    
    // Fallback to API
    console.log(`[Form] Fetching from API for team ${teamId}`);
    const data = await makeRequest<{
      response: Array<{
        fixture: { date: string };
        teams: { home: { id: number; name: string }; away: { id: number; name: string } };
        goals: { home: number; away: number };
        league: { name: string };
      }>;
    }>({
      endpoint: '/fixtures',
      params: { team: teamId, season, last: 10 }
    });

    const matches = data.response || [];
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    const last10: MatchForm['last10'] = [];
    let formString = '';

    matches.forEach(match => {
      const isHome = match.teams.home.id === teamId;
      const teamGoals = isHome ? match.goals.home : match.goals.away;
      const oppGoals = isHome ? match.goals.away : match.goals.home;
      const opponent = isHome ? match.teams.away.name : match.teams.home.name;

      goalsFor += teamGoals;
      goalsAgainst += oppGoals;

      let result: 'W' | 'D' | 'L';
      if (teamGoals > oppGoals) { result = 'W'; wins++; }
      else if (teamGoals === oppGoals) { result = 'D'; draws++; }
      else { result = 'L'; losses++; }

      formString = result + formString;
      last10.push({
        date: match.fixture.date,
        opponent,
        home: isHome,
        result,
        goalsFor: teamGoals,
        goalsAgainst: oppGoals,
      });
    });

    return {
      played: matches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      form: formString,
      last10,
    };
  }, 15 * 60 * 1000); // 15 minutes cache for form
}

// Get team detailed stats with season retry - uses local data first
async function getTeamDetailedStats(
  teamId: number, 
  leagueId: number, 
  season: number
): Promise<TeamDetailedStats> {
  const cacheKey = `${teamId}_${leagueId}`;
  
  return getCachedOrFetch(CACHE_TYPES.TEAM_STATS, cacheKey, async () => {
    // Try local data first
    const localStats = await getTeamStatsLocal(teamId, leagueId, season);
    if (localStats && localStats.played > 0) {
      console.log(`[Stats] Using local data for team ${teamId}`);
      return localStats;
    }
    
    // Fallback to API
    console.log(`[Stats] Fetching from API for team ${teamId}`);
    
    // Try multiple seasons
    const seasons = getAlternativeSeasons(leagueId, new Date());
    
    for (const trySeason of seasons) {
      try {
        const data = await makeRequest<{
          response: {
            league: {
              standings: Array<Array<{
                rank: number;
                team: { id: number; name: string };
                points: number;
                all: {
                  played: number;
                  win: number;
                  draw: number;
                  lose: number;
                  goals: { for: number; against: number };
                };
                form: string;
                clean_sheet: { total: number };
                failed_to_score: { total: number };
              }>>;
            };
          };
        }>({
          endpoint: '/standings',
          params: { team: teamId, league: leagueId, season: trySeason }
        });

        const allStandings = data.response?.league?.standings;
        if (!allStandings || allStandings.length === 0) continue;
        
        // Select correct standings phase for leagues with Apertura/Clausura
        const selectedStandings = selectCorrectStandings(allStandings, leagueId);
        const standing = selectedStandings.find(s => s.team.id === teamId);
        
        if (!standing) continue;

        // Get additional stats
        let statsData: any = null;
        try {
          const response = await makeRequest<{
            response: {
              goals: { for: { average: string }; against: { average: string } };
              cards: { yellow: { total: number }; red: { total: number } };
            };
          }>({
            endpoint: '/teams/statistics',
            params: { team: teamId, league: leagueId, season: trySeason }
          });
          statsData = response.response;
        } catch (e) {
          // Ignore stats errors
        }

        return {
          leaguePosition: standing.rank,
          points: standing.points,
          played: standing.all.played,
          won: standing.all.win,
          drawn: standing.all.draw,
          lost: standing.all.lose,
          goalsFor: standing.all.goals.for,
          goalsAgainst: standing.all.goals.against,
          goalDifference: standing.all.goals.for - standing.all.goals.against,
          form: standing.form || '',
          cleanSheets: standing.clean_sheet?.total || 0,
          failedToScore: standing.failed_to_score?.total || 0,
          over15: 0, over25: 0, over35: 0, btts: 0,
          avgGoalsScored: parseFloat(statsData?.goals?.for?.average || '0'),
          avgGoalsConceded: parseFloat(statsData?.goals?.against?.average || '0'),
          cards: {
            yellow: statsData?.cards?.yellow?.total || 0,
            red: statsData?.cards?.red?.total || 0,
          },
          corners: { for: 0, against: 0 },
        };
      } catch (error) {
        continue;
      }
    }
    
    // Return empty stats if nothing found
    return createEmptyStats();
  }, 30 * 60 * 1000); // 30 minutes cache
}

function createEmptyStats(): TeamDetailedStats {
  return {
    leaguePosition: 0, points: 0, played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, form: '',
    cleanSheets: 0, failedToScore: 0, over15: 0, over25: 0, over35: 0, btts: 0,
    avgGoalsScored: 0, avgGoalsConceded: 0,
    cards: { yellow: 0, red: 0 }, corners: { for: 0, against: 0 },
  };
}

// Get H2H stats - uses local data first, API as fallback
async function getH2HStats(homeTeamId: number, awayTeamId: number, leagueId?: number): Promise<H2HStats> {
  const cacheKey = `${homeTeamId}_${awayTeamId}`;
  
  return getCachedOrFetch(CACHE_TYPES.H2H, cacheKey, async () => {
    // Try local data first
    const localH2H = await getH2HLocal(homeTeamId, awayTeamId, leagueId);
    if (localH2H && localH2H.totalMatches > 0) {
      console.log(`[H2H] Using local data for ${homeTeamId} vs ${awayTeamId}`);
      return localH2H;
    }
    
    // Fallback to API
    console.log(`[H2H] Fetching from API for ${homeTeamId} vs ${awayTeamId}`);
    
    const data = await makeRequest<{
      response: Array<{
        fixture: { date: string; venue: { name: string } };
        teams: { home: { name: string }; away: { name: string } };
        goals: { home: number; away: number };
        league: { name: string };
      }>;
    }>({
      endpoint: '/fixtures/headtohead',
      params: { h2h: `${homeTeamId}-${awayTeamId}`, last: 10 }
    });

    const matches = data.response || [];
    let homeWins = 0, draws = 0, awayWins = 0, totalGoals = 0, over25Count = 0, bttsCount = 0;

    const last5 = matches.slice(0, 5).map(match => {
      totalGoals += match.goals.home + match.goals.away;
      if (match.goals.home + match.goals.away > 2.5) over25Count++;
      if (match.goals.home > 0 && match.goals.away > 0) bttsCount++;

      if (match.goals.home > match.goals.away) homeWins++;
      else if (match.goals.home === match.goals.away) draws++;
      else awayWins++;

      return {
        date: match.fixture.date,
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeGoals: match.goals.home,
        awayGoals: match.goals.away,
        league: match.league.name,
      };
    });

    return {
      totalMatches: matches.length,
      homeWins,
      draws,
      awayWins,
      avgGoals: matches.length > 0 ? totalGoals / matches.length : 0,
      over25: matches.length > 0 ? (over25Count / matches.length) * 100 : 0,
      btts: matches.length > 0 ? (bttsCount / matches.length) * 100 : 0,
      last5,
    };
  }, 60 * 60 * 1000); // 1 hour cache for H2H
}

// Get odds
async function getMatchOdds(fixtureId: number): Promise<OddsData> {
  return getCachedOrFetch(CACHE_TYPES.ODDS, fixtureId, async () => {
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
    if (!bookmaker) return createEmptyOdds();

    let matchWinner: { home: number; draw: number; away: number } | null = null;
    let overUnder = { 
      over15: null as number | null, 
      under15: null as number | null,
      over25: null as number | null, 
      under25: null as number | null, 
      over35: null as number | null, 
      under35: null as number | null 
    };
    let btts = { yes: null as number | null, no: null as number | null };
    let asianHandicap: { home: number | null; away: number | null; line: string | null } | null = null;
    let corners: { over: number | null; under: number | null; line: string | null } | null = null;
    let cards: { over: number | null; under: number | null; line: string | null } | null = null;

    bookmaker.bets?.forEach(bet => {
      if (bet.name === 'Match Winner') {
        matchWinner = {
          home: parseFloat(bet.values.find(v => v.value === 'Home')?.odd || '0') || 0,
          draw: parseFloat(bet.values.find(v => v.value === 'Draw')?.odd || '0') || 0,
          away: parseFloat(bet.values.find(v => v.value === 'Away')?.odd || '0') || 0,
        };
      }
      if (bet.name === 'Goals Over/Under') {
        overUnder = {
          over15: parseFloat(bet.values.find(v => v.value === 'Over 1.5')?.odd || '0') || null,
          under15: parseFloat(bet.values.find(v => v.value === 'Under 1.5')?.odd || '0') || null,
          over25: parseFloat(bet.values.find(v => v.value === 'Over 2.5')?.odd || '0') || null,
          under25: parseFloat(bet.values.find(v => v.value === 'Under 2.5')?.odd || '0') || null,
          over35: parseFloat(bet.values.find(v => v.value === 'Over 3.5')?.odd || '0') || null,
          under35: parseFloat(bet.values.find(v => v.value === 'Under 3.5')?.odd || '0') || null,
        };
      }
      if (bet.name === 'Both Teams To Score') {
        btts = {
          yes: parseFloat(bet.values.find(v => v.value === 'Yes')?.odd || '0') || null,
          no: parseFloat(bet.values.find(v => v.value === 'No')?.odd || '0') || null,
        };
      }
      if (bet.name === 'Asian Handicap' || bet.name === 'Handicap Result') {
        const ahValue = bet.values[0];
        if (ahValue) {
          asianHandicap = {
            home: parseFloat(bet.values.find(v => v.value.includes('Home'))?.odd || '0') || null,
            away: parseFloat(bet.values.find(v => v.value.includes('Away'))?.odd || '0') || null,
            line: ahValue.value,
          };
        }
      }
      if (bet.name.includes('Corner') || bet.name.includes('Corners')) {
        const cornerOver = bet.values.find(v => v.value.includes('Over'));
        const cornerUnder = bet.values.find(v => v.value.includes('Under'));
        if (cornerOver || cornerUnder) {
          corners = {
            over: parseFloat(cornerOver?.odd || '0') || null,
            under: parseFloat(cornerUnder?.odd || '0') || null,
            line: cornerOver?.value || cornerUnder?.value || null,
          };
        }
      }
      if (bet.name.includes('Card') || bet.name.includes('Cards') || bet.name.includes('Booking')) {
        const cardOver = bet.values.find(v => v.value.includes('Over'));
        const cardUnder = bet.values.find(v => v.value.includes('Under'));
        if (cardOver || cardUnder) {
          cards = {
            over: parseFloat(cardOver?.odd || '0') || null,
            under: parseFloat(cardUnder?.odd || '0') || null,
            line: cardOver?.value || cardUnder?.value || null,
          };
        }
      }
    });

    return { matchWinner, overUnder, btts, asianHandicap, corners, cards };
  }, 15 * 60 * 1000); // 15 minutes cache for odds
}

function createEmptyOdds(): OddsData {
  return {
    matchWinner: null,
    overUnder: { over15: null, under15: null, over25: null, under25: null, over35: null, under35: null },
    btts: { yes: null, no: null },
    asianHandicap: null,
    corners: null,
    cards: null,
  };
}

// Get league table - uses local data first, API as fallback
async function getLeagueTable(leagueId: number, season: number) {
  return getCachedOrFetch(CACHE_TYPES.LEAGUE_TABLE, leagueId, async () => {
    // Try local data first
    const localStandings = await getStandingsLocal(leagueId, season);
    if (localStandings && localStandings.length > 0) {
      console.log(`[Standings] Using local data for league ${leagueId}`);
      return localStandings.map(s => ({
        rank: s.rank,
        team: s.team,
        points: s.points,
        played: s.played,
        goalsDiff: s.goalsDiff,
      }));
    }
    
    // Fallback to API
    console.log(`[Standings] Fetching from API for league ${leagueId}`);
    
    const seasons = getAlternativeSeasons(leagueId, new Date());
    
    for (const trySeason of seasons) {
      try {
        const data = await makeRequest<{
          response: Array<{
            league: {
              standings: Array<Array<{
                rank: number;
                team: { name: string };
                points: number;
                all: { played: number; goals: { for: number; against: number } };
                group?: string;
                stage?: string;
              }>>;
            };
          }>;
        }>({
          endpoint: '/standings',
          params: { league: leagueId, season: trySeason }
        });

        const allStandings = data?.response?.[0]?.league?.standings;
        
        if (!allStandings || allStandings.length === 0) {
          continue;
        }

        // Para ligas con múltiples fases (Apertura/Clausura), seleccionar la correcta
        let selectedStandings = allStandings[0];
        
        if (allStandings.length > 1) {
          const currentMonth = new Date().getMonth() + 1; // 1-12
          
          // Buscar standings por grupo/fase
          for (const standingGroup of allStandings) {
            const firstTeam = standingGroup[0];
            const groupName = firstTeam?.group?.toLowerCase() || '';
            const stageName = firstTeam?.stage?.toLowerCase() || '';
            
            // Apertura = primera mitad del año (generalmente)
            // Clausura = segunda mitad del año (generalmente)
            const isApertura = groupName.includes('apertura') || stageName.includes('apertura');
            const isClausura = groupName.includes('clausura') || stageName.includes('clausura');
            
            // Determinar fase actual basada en el mes
            // Apertura: generalmente enero-junio
            // Clausura: generalmente julio-diciembre
            if (currentMonth <= 6 && isApertura) {
              selectedStandings = standingGroup;
              console.log(`[Standings] Using Apertura table for league ${leagueId}`);
              break;
            } else if (currentMonth > 6 && isClausura) {
              selectedStandings = standingGroup;
              console.log(`[Standings] Using Clausura table for league ${leagueId}`);
              break;
            }
          }
          
          // Si no encontramos por nombre, usar la tabla más reciente (menos partidos jugados = más reciente)
          // o la que tenga más partidos si estamos a finales de la fase
          if (selectedStandings === allStandings[0] && allStandings.length > 1) {
            // Para ligas mexicanas y similares, preferir la fase específica sobre la acumulada
            // La acumulada generalmente tiene más partidos (suma de ambas fases)
            const avgGamesPerGroup = allStandings.map(group => ({
              group,
              avgGames: group.reduce((sum, t) => sum + (t.all?.played || 0), 0) / group.length
            }));
            
            // Si hay una tabla con ~2x más partidos, es probablemente la acumulada
            // Tomar la segunda tabla más jugada (la fase actual)
            avgGamesPerGroup.sort((a, b) => b.avgGames - a.avgGames);
            
            // Si la primera tiene muchos más partidos que la segunda, la segunda es la fase actual
            if (avgGamesPerGroup.length >= 2 && 
                avgGamesPerGroup[0].avgGames > avgGamesPerGroup[1].avgGames * 1.5) {
              selectedStandings = avgGamesPerGroup[1].group;
              console.log(`[Standings] Using current phase table (not accumulated) for league ${leagueId}`);
            }
          }
        }
        
        if (selectedStandings && selectedStandings.length > 0) {
          return selectedStandings.map(s => ({
            rank: s.rank,
            team: s.team.name,
            points: s.points,
            played: s.all.played,
            goalsDiff: s.all.goals.for - s.all.goals.against,
          }));
        }
      } catch (error) {
        continue;
      }
    }
    
    return [];
  }, 60 * 60 * 1000); // 1 hour cache for league table
}

// Calculate ML Prediction using Trained Model or Hybrid (fallback)
async function calculateMLPrediction(
  match: Match,
  odds: OddsData,
  homeForm: MatchForm,
  awayForm: MatchForm,
  homeStats: TeamDetailedStats,
  awayStats: TeamDetailedStats,
  h2h: H2HStats
): Promise<MLPrediction> {
  // Use trained model if available, otherwise hybrid
  const prediction = predictMatch({
    match,
    homeForm,
    awayForm,
    homeStats,
    awayStats,
    h2h,
    odds,
  });
  
  return {
    homeWin: prediction.homeWin,
    draw: prediction.draw,
    awayWin: prediction.awayWin,
    over15: prediction.over15,
    over25: prediction.over25,
    over35: prediction.over35,
    btts: prediction.btts,
    cards: prediction.cards,
    corners: prediction.corners,
    factors: prediction.method === 'trained_model' 
      ? { formWeight: 35, statsWeight: 30, h2hWeight: 20, homeAdvantage: 15 }
      : { formWeight: 35, statsWeight: 30, h2hWeight: 20, homeAdvantage: 15 },
    recommendedPick: prediction.recommendedPick,
  };
}

// Progressive loading - returns data as it becomes available
export async function getCompleteMatchAnalysisProgressive(
  match: Match,
  onProgress?: (data: Partial<CompleteMatchStats>, stage: string) => void
): Promise<CompleteMatchStats> {
  const leagueId = match.league.id;
  const homeTeamId = match.teams.home.id;
  const awayTeamId = match.teams.away.id;
  const season = getCorrectSeason(leagueId);
  
  console.log(`[Progressive] Starting load for match ${match.fixture.id}`);
  
  // Stage 1: Load odds and forms first (parallel, fast)
  // Try to preload local data for this league if available
  if (hasLocalData(leagueId)) {
    loadLeaguesLazy([leagueId]).catch(() => {}); // Non-blocking
  }
  
  const [odds, homeForm, awayForm] = await Promise.all([
    getMatchOdds(match.fixture.id),
    getTeamForm(homeTeamId, season, leagueId),
    getTeamForm(awayTeamId, season, leagueId),
  ]);
  
  onProgress?.({ match, odds, homeForm, awayForm }, 'forms');
  
  // Stage 2: Load standings (can be slow)
  const [homeStats, awayStats] = await Promise.all([
    getTeamDetailedStats(homeTeamId, leagueId, season),
    getTeamDetailedStats(awayTeamId, leagueId, season),
  ]);
  
  onProgress?.({ match, odds, homeForm, awayForm, homeStats, awayStats }, 'standings');
  
  // Stage 3: Load H2H and league table
  const [h2h, leagueTable] = await Promise.all([
    getH2HStats(homeTeamId, awayTeamId, leagueId),
    getLeagueTable(leagueId, season),
  ]);
  
  onProgress?.({ match, odds, homeForm, awayForm, homeStats, awayStats, h2h, leagueTable }, 'h2h');
  
  // Calculate ML prediction
  const mlPrediction = await calculateMLPrediction(match, odds, homeForm, awayForm, homeStats, awayStats, h2h);
  
  const result: CompleteMatchStats = {
    match,
    homeForm,
    awayForm,
    homeStats,
    awayStats,
    h2h,
    odds,
    mlPrediction,
    leagueTable,
  };
  
  // Cache complete result
  setCache(CACHE_TYPES.MATCH_STATS, match.fixture.id, result, 20 * 60 * 1000);
  
  onProgress?.(result, 'complete');
  
  return result;
}

// Simple cached version - returns all at once
export async function getCompleteMatchAnalysis(match: Match): Promise<CompleteMatchStats> {
  // Check for complete cached result
  const cached = getCache<CompleteMatchStats>(CACHE_TYPES.MATCH_STATS, match.fixture.id);
  if (cached) {
    console.log(`[Cache] Complete match stats found for ${match.fixture.id}`);
    return cached;
  }
  
  return getCompleteMatchAnalysisProgressive(match);
}

// Clear match cache
export function clearMatchCache(matchId: number): void {
  const { clearCache } = require('./local-cache');
  clearCache(CACHE_TYPES.MATCH_STATS, matchId);
}

// Re-export for compatibility
export { getCorrectSeason, getSeasonDisplayName } from './season-detector';
