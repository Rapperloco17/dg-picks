import { Match, TeamStats } from '@/types';
import { makeRequest } from './api-football';
import { calculateMarketEV } from './market-models';
import { getCorrectSeason, getAlternativeSeasons, getSeasonDisplayName } from './season-detector';

// Types for detailed match stats
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
  overUnder: { over25: number | null; under25: number | null; over35: number | null; under35: number | null; };
  btts: { yes: number | null; no: number | null; };
  asianHandicap: { home: number | null; away: number | null; line: string | null } | null;
  corners: { over: number | null; under: number | null; line: string | null } | null;
  cards: { over: number | null; under: number | null; line: string | null } | null;
}

export interface MLPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  over25: number;
  btts: number;
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

// Helper to try multiple seasons
async function tryMultipleSeasons<T>(
  requestFn: (season: number) => Promise<T>,
  leagueId: number
): Promise<T | null> {
  const seasons = getAlternativeSeasons(leagueId);
  
  for (const season of seasons) {
    try {
      const result = await requestFn(season);
      if (result) return result;
    } catch (error) {
      console.log(`[Season] Failed for ${leagueId} season ${season}, trying next...`);
      continue;
    }
  }
  
  return null;
}

// Get last 10 matches for a team
export async function getTeamForm(teamId: number, season: number): Promise<MatchForm> {
  try {
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
  } catch (error) {
    console.error('Error fetching team form:', error);
    return { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, form: '', last10: [] };
  }
}

// Get detailed team statistics
export async function getTeamDetailedStats(
  teamId: number, 
  leagueId: number, 
  season: number
): Promise<TeamDetailedStats> {
  try {
    // Try with multiple seasons if needed
    const result = await tryMultipleSeasons(async (trySeason) => {
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

      const standing = data.response?.league?.standings?.[0]?.find(s => s.team.id === teamId);
      return standing ? { standing, season: trySeason } : null;
    }, leagueId);

    if (!result) {
      console.log(`[Standings] Not available for team ${teamId} in league ${leagueId}`);
      return createEmptyStats();
    }

    const { standing, season: workingSeason } = result;

    // Get additional stats from team statistics endpoint with working season
    let statsData: any = null;
    try {
      const response = await makeRequest<{
        response: {
          fixtures: { played: { total: number }; wins: { total: number }; draws: { total: number }; loses: { total: number } };
          goals: { for: { total: number; average: string }; against: { total: number; average: string } };
          cards: { yellow: { total: number }; red: { total: number } };
        };
      }>({
        endpoint: '/teams/statistics',
        params: { team: teamId, league: leagueId, season: workingSeason }
      });
      statsData = response.response;
    } catch (e) {
      console.log(`[Team Stats] Not available for ${teamId}`);
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
      over15: 0,
      over25: 0,
      over35: 0,
      btts: 0,
      avgGoalsScored: parseFloat(statsData?.goals?.for?.average || '0'),
      avgGoalsConceded: parseFloat(statsData?.goals?.against?.average || '0'),
      cards: {
        yellow: statsData?.cards?.yellow?.total || 0,
        red: statsData?.cards?.red?.total || 0,
      },
      corners: { for: 0, against: 0 },
    };
  } catch (error) {
    console.error('Error fetching team stats:', error);
    return createEmptyStats();
  }
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

// Get H2H stats
export async function getH2HStats(homeTeamId: number, awayTeamId: number): Promise<H2HStats> {
  try {
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
  } catch (error) {
    console.error('Error fetching H2H:', error);
    return { totalMatches: 0, homeWins: 0, draws: 0, awayWins: 0, avgGoals: 0, over25: 0, btts: 0, last5: [] };
  }
}

// Get real odds from API
export async function getMatchOdds(fixtureId: number): Promise<OddsData> {
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
    if (!bookmaker) return createEmptyOdds();

    let matchWinner: { home: number; draw: number; away: number } | null = null;
    let overUnder: { over25: number | null; under25: number | null; over35: number | null; under35: number | null } = { over25: null, under25: null, over35: null, under35: null };
    let btts: { yes: number | null; no: number | null } = { yes: null, no: null };
    let asianHandicap: { home: number | null; away: number | null; line: string | null } | null = null;
    let corners: { over: number | null; under: number | null; line: string | null } | null = null;
    let cards: { over: number | null; under: number | null; line: string | null } | null = null;

    bookmaker.bets?.forEach(bet => {
      // Match Winner (1X2)
      if (bet.name === 'Match Winner') {
        matchWinner = {
          home: parseFloat(bet.values.find(v => v.value === 'Home')?.odd || '0') || 0,
          draw: parseFloat(bet.values.find(v => v.value === 'Draw')?.odd || '0') || 0,
          away: parseFloat(bet.values.find(v => v.value === 'Away')?.odd || '0') || 0,
        };
      }
      
      // Over/Under Goals
      if (bet.name === 'Goals Over/Under') {
        overUnder = {
          over25: parseFloat(bet.values.find(v => v.value === 'Over 2.5')?.odd || '0') || null,
          under25: parseFloat(bet.values.find(v => v.value === 'Under 2.5')?.odd || '0') || null,
          over35: parseFloat(bet.values.find(v => v.value === 'Over 3.5')?.odd || '0') || null,
          under35: parseFloat(bet.values.find(v => v.value === 'Under 3.5')?.odd || '0') || null,
        };
      }
      
      // BTTS
      if (bet.name === 'Both Teams To Score') {
        btts = {
          yes: parseFloat(bet.values.find(v => v.value === 'Yes')?.odd || '0') || null,
          no: parseFloat(bet.values.find(v => v.value === 'No')?.odd || '0') || null,
        };
      }

      // Asian Handicap
      if (bet.name === 'Asian Handicap' || bet.name === 'Handicap Result') {
        const ahValue = bet.values[0];
        if (ahValue) {
          asianHandicap = {
            home: parseFloat(bet.values.find(v => v.value.includes('Home') || v.value.includes('-1') || v.value.includes('+1'))?.odd || '0') || null,
            away: parseFloat(bet.values.find(v => v.value.includes('Away') || v.value.includes('-2') || v.value.includes('+2'))?.odd || '0') || null,
            line: ahValue.value,
          };
        }
      }

      // Corners
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

      // Cards
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
  } catch (error) {
    console.error('Error fetching odds:', error);
    return createEmptyOdds();
  }
}

function createEmptyOdds(): OddsData {
  return {
    matchWinner: null,
    overUnder: { over25: null, under25: null, over35: null, under35: null },
    btts: { yes: null, no: null },
    asianHandicap: null,
    corners: null,
    cards: null,
  };
}

// Calculate ML Prediction with EV
export async function calculateMLPrediction(
  match: Match,
  odds: OddsData,
  homeForm: MatchForm,
  awayForm: MatchForm,
  h2h: H2HStats
): Promise<MLPrediction> {
  // Calculate weights based on available data
  const formWeight = Math.min(homeForm.played, awayForm.played) / 10; // 0-1 based on games played
  const h2hWeight = Math.min(h2h.totalMatches, 5) / 5; // 0-1 based on H2H history
  const homeAdvantage = 0.15; // Base home advantage (15%)
  
  // Goals-based strength
  const homeGoalsPerGame = homeForm.played > 0 ? homeForm.goalsFor / homeForm.played : 1.2;
  const homeConcededPerGame = homeForm.played > 0 ? homeForm.goalsAgainst / homeForm.played : 1.2;
  const awayGoalsPerGame = awayForm.played > 0 ? awayForm.goalsFor / awayForm.played : 1.0;
  const awayConcededPerGame = awayForm.played > 0 ? awayForm.goalsAgainst / awayForm.played : 1.0;
  
  // Expected goals
  const homeXg = (homeGoalsPerGame + awayConcededPerGame) / 2;
  const awayXg = (awayGoalsPerGame + homeConcededPerGame) / 2;
  
  // Win probability based on expected goals (Poisson approximation)
  const totalXg = homeXg + awayXg + 0.3; // Draw factor
  let homeWinProb = (homeXg / totalXg) * 100 * (1 + homeAdvantage);
  let awayWinProb = (awayXg / totalXg) * 100 * (1 - homeAdvantage * 0.5);
  let drawProb = 100 - homeWinProb - awayWinProb;
  
  // Adjust based on form
  if (formWeight > 0.5) {
    const homeFormStrength = homeForm.wins / Math.max(homeForm.played, 1);
    const awayFormStrength = awayForm.wins / Math.max(awayForm.played, 1);
    homeWinProb = homeWinProb * 0.7 + (homeFormStrength * 100) * 0.3;
    awayWinProb = awayWinProb * 0.7 + (awayFormStrength * 100) * 0.3;
  }
  
  // Normalize
  const total = homeWinProb + drawProb + awayWinProb;
  const normalized = {
    homeWin: Math.max(5, Math.min(90, (homeWinProb / total) * 100)),
    draw: Math.max(5, Math.min(60, (drawProb / total) * 100)),
    awayWin: Math.max(5, Math.min(90, (awayWinProb / total) * 100)),
  };

  // Over 2.5 probability
  const over25Prob = Math.min(85, Math.max(20, (homeXg + awayXg) * 25));
  
  // BTTS probability
  const bttsProb = Math.min(80, Math.max(25, (homeXg * awayXg) * 20));

  // Calculate EV for each market
  const picks: Array<{ market: string; selection: string; prob: number; odds: number }> = [];
  
  if (odds.matchWinner) {
    picks.push({ market: '1X2', selection: '1', prob: normalized.homeWin, odds: odds.matchWinner.home });
    picks.push({ market: '1X2', selection: 'X', prob: normalized.draw, odds: odds.matchWinner.draw });
    picks.push({ market: '1X2', selection: '2', prob: normalized.awayWin, odds: odds.matchWinner.away });
  }
  
  if (odds.overUnder.over25 && odds.overUnder.under25) {
    picks.push({ market: 'Over/Under 2.5', selection: 'Over', prob: over25Prob, odds: odds.overUnder.over25 });
    picks.push({ market: 'Over/Under 2.5', selection: 'Under', prob: 100 - over25Prob, odds: odds.overUnder.under25 });
  }
  
  if (odds.btts.yes && odds.btts.no) {
    picks.push({ market: 'BTTS', selection: 'Sí', prob: bttsProb, odds: odds.btts.yes });
    picks.push({ market: 'BTTS', selection: 'No', prob: 100 - bttsProb, odds: odds.btts.no });
  }

  let bestPick: MLPrediction['recommendedPick'] = null;
  let bestEV = 0;

  picks.forEach(pick => {
    const ev = calculateMarketEV(pick.prob, pick.odds);
    const confidence = pick.prob > 58 ? 'high' : pick.prob > 45 ? 'medium' : 'low';
    
    if (ev > bestEV && ev > 0.03) { // Minimum 3% EV
      bestEV = ev;
      bestPick = {
        market: pick.market,
        selection: pick.selection,
        odds: pick.odds,
        probability: pick.prob,
        ev,
        confidence,
      };
    }
  });

  return {
    homeWin: normalized.homeWin,
    draw: normalized.draw,
    awayWin: normalized.awayWin,
    over25: over25Prob,
    btts: bttsProb,
    factors: {
      homeAdvantage: homeAdvantage * 100,
      formWeight: formWeight * 100,
      statsWeight: (1 - formWeight - h2hWeight) * 100,
      h2hWeight: h2hWeight * 100,
    },
    recommendedPick: bestPick,
  };
}

// Get league table
export async function getLeagueTable(leagueId: number, season: number) {
  try {
    const result = await tryMultipleSeasons(async (trySeason) => {
      const data = await makeRequest<{
        response: Array<{
          league: {
            standings: Array<Array<{
              rank: number;
              team: { name: string };
              points: number;
              all: { played: number; goals: { for: number; against: number } };
            }>>;
          };
        }>;
      }>({
        endpoint: '/standings',
        params: { league: leagueId, season: trySeason }
      });

      const standings = data?.response?.[0]?.league?.standings?.[0];
      return standings && standings.length > 0 ? standings : null;
    }, leagueId);

    if (!result) {
      console.log(`[League Table] Not available for league ${leagueId}`);
      return [];
    }

    return result.map(s => ({
      rank: s.rank,
      team: s.team.name,
      points: s.points,
      played: s.all.played,
      goalsDiff: s.all.goals.for - s.all.goals.against,
    }));
  } catch (error) {
    console.error('Error fetching league table:', error);
    return [];
  }
}

// Get complete match analysis
export async function getCompleteMatchAnalysis(match: Match): Promise<CompleteMatchStats> {
  const leagueId = match.league.id;
  const homeTeamId = match.teams.home.id;
  const awayTeamId = match.teams.away.id;
  
  // Get correct season for this league
  const season = getCorrectSeason(leagueId);
  console.log(`[Match Analysis] Using season ${season} for league ${leagueId} (${getSeasonDisplayName(leagueId)})`);

  // Fetch all data in parallel
  const [homeForm, awayForm, homeStats, awayStats, h2h, odds, leagueTable] = await Promise.all([
    getTeamForm(homeTeamId, season),
    getTeamForm(awayTeamId, season),
    getTeamDetailedStats(homeTeamId, leagueId, season),
    getTeamDetailedStats(awayTeamId, leagueId, season),
    getH2HStats(homeTeamId, awayTeamId),
    getMatchOdds(match.fixture.id),
    getLeagueTable(leagueId, season),
  ]);

  const mlPrediction = await calculateMLPrediction(match, odds, homeForm, awayForm, h2h);

  return {
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
}
