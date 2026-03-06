import { Match, MarketType } from '@/types';

// The Odds API - https://the-odds-api.com
// Free tier: 500 requests/month
const ODDS_API_KEY = process.env.NEXT_PUBLIC_ODDS_API_KEY || '';
const ODDS_API_URL = 'https://api.the-odds-api.com/v4';

// Bookmakers prioritarios (por calidad de odds)
const PRIORITY_BOOKMAKERS = [
  'pinnacle',
  'bet365',
  'williamhill',
  'betfair',
  'unibet',
  'betsson'
];

// Mapeo de ligas de API-Football a The Odds API
const LEAGUE_MAPPING: Record<number, string> = {
  // Premier League
  39: 'soccer_epl',
  // La Liga
  140: 'soccer_spain_la_liga',
  // Serie A
  135: 'soccer_italy_serie_a',
  // Bundesliga
  78: 'soccer_germany_bundesliga',
  // Ligue 1
  61: 'soccer_france_ligue_one',
  // Champions League
  2: 'soccer_uefa_champs_league',
  // Europa League
  3: 'soccer_uefa_europa_league',
  // Primeira Liga
  94: 'soccer_portugal_primeira_liga',
  // Eredivisie
  88: 'soccer_netherlands_eredivisie',
  // Championship
  40: 'soccer_england_efl_cup',
  // MLS
  253: 'soccer_usa_mls',
  // Brasileirão
  71: 'soccer_brazil_campeonato',
  // Argentina Primera División
  128: 'soccer_argentina_primera_division',
  // World Cup
  1: 'soccer_fifa_world_cup',
};

export interface RealOdds {
  bookmaker: string;
  home: number;
  draw: number;
  away: number;
  over25?: number;
  under25?: number;
  bttsYes?: number;
  bttsNo?: number;
  lastUpdated: string;
}

export interface MatchOdds {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  odds: RealOdds[];
  bestOdds: {
    home: { odds: number; bookmaker: string };
    draw: { odds: number; bookmaker: string };
    away: { odds: number; bookmaker: string };
    over25?: { odds: number; bookmaker: string };
    under25?: { odds: number; bookmaker: string };
    bttsYes?: { odds: number; bookmaker: string };
    bttsNo?: { odds: number; bookmaker: string };
  };
}

// Check if API key is available
const hasApiKey = () => ODDS_API_KEY.length > 0;

// Get odds from The Odds API
export async function getRealOdds(
  leagueId: number,
  date?: string
): Promise<MatchOdds[]> {
  // If no API key, return empty array (will fall back to simulated odds)
  if (!hasApiKey()) {
    console.log('[Odds API] No API key configured, using simulated odds');
    return [];
  }

  const oddsLeague = LEAGUE_MAPPING[leagueId];
  if (!oddsLeague) {
    console.log(`[Odds API] League ${leagueId} not mapped`);
    return [];
  }

  try {
    const params = new URLSearchParams({
      apiKey: ODDS_API_KEY,
      regions: 'eu', // European bookmakers
      markets: 'h2h,totals,btts', // 1X2, Over/Under, BTTS
      oddsFormat: 'decimal',
      dateFormat: 'iso',
    });

    if (date) {
      params.append('commenceTimeFrom', `${date}T00:00:00Z`);
      params.append('commenceTimeTo', `${date}T23:59:59Z`);
    }

    const response = await fetch(
      `${ODDS_API_URL}/sports/${oddsLeague}/odds?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return data.map((event: any) => parseOddsResponse(event));
  } catch (error) {
    console.error('[Odds API] Error fetching odds:', error);
    return [];
  }
}

// Parse odds response from The Odds API
function parseOddsResponse(event: any): MatchOdds {
  const odds: RealOdds[] = [];
  
  // Process each bookmaker
  for (const bookmaker of event.bookmakers || []) {
    const oddsData: RealOdds = {
      bookmaker: bookmaker.key,
      home: 0,
      draw: 0,
      away: 0,
      lastUpdated: bookmaker.last_update,
    };

    // Extract markets
    for (const market of bookmaker.markets || []) {
      switch (market.key) {
        case 'h2h': // 1X2
          for (const outcome of market.outcomes) {
            if (outcome.name === event.home_team) oddsData.home = outcome.price;
            else if (outcome.name === event.away_team) oddsData.away = outcome.price;
            else if (outcome.name === 'Draw') oddsData.draw = outcome.price;
          }
          break;
        case 'totals': // Over/Under
          for (const outcome of market.outcomes) {
            if (outcome.name.includes('Over') && outcome.point === 2.5) {
              oddsData.over25 = outcome.price;
            } else if (outcome.name.includes('Under') && outcome.point === 2.5) {
              oddsData.under25 = outcome.price;
            }
          }
          break;
        case 'btts': // Both Teams To Score
          for (const outcome of market.outcomes) {
            if (outcome.name === 'Yes') oddsData.bttsYes = outcome.price;
            else if (outcome.name === 'No') oddsData.bttsNo = outcome.price;
          }
          break;
      }
    }

    odds.push(oddsData);
  }

  // Calculate best odds
  const bestOdds = calculateBestOdds(odds);

  return {
    matchId: 0, // Will be matched by team names
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    commenceTime: event.commence_time,
    odds,
    bestOdds,
  };
}

// Calculate best odds across all bookmakers
function calculateBestOdds(odds: RealOdds[]) {
  const best = {
    home: { odds: 0, bookmaker: '' },
    draw: { odds: 0, bookmaker: '' },
    away: { odds: 0, bookmaker: '' },
  } as MatchOdds['bestOdds'];

  for (const bookmakerOdds of odds) {
    // Home
    if (bookmakerOdds.home > best.home.odds) {
      best.home = { odds: bookmakerOdds.home, bookmaker: bookmakerOdds.bookmaker };
    }
    // Draw
    if (bookmakerOdds.draw > best.draw.odds) {
      best.draw = { odds: bookmakerOdds.draw, bookmaker: bookmakerOdds.bookmaker };
    }
    // Away
    if (bookmakerOdds.away > best.away.odds) {
      best.away = { odds: bookmakerOdds.away, bookmaker: bookmakerOdds.bookmaker };
    }
    // Over 2.5
    if (bookmakerOdds.over25 && (!best.over25 || bookmakerOdds.over25 > best.over25.odds)) {
      best.over25 = { odds: bookmakerOdds.over25, bookmaker: bookmakerOdds.bookmaker };
    }
    // Under 2.5
    if (bookmakerOdds.under25 && (!best.under25 || bookmakerOdds.under25 > best.under25.odds)) {
      best.under25 = { odds: bookmakerOdds.under25, bookmaker: bookmakerOdds.bookmaker };
    }
    // BTTS Yes
    if (bookmakerOdds.bttsYes && (!best.bttsYes || bookmakerOdds.bttsYes > best.bttsYes.odds)) {
      best.bttsYes = { odds: bookmakerOdds.bttsYes, bookmaker: bookmakerOdds.bookmaker };
    }
    // BTTS No
    if (bookmakerOdds.bttsNo && (!best.bttsNo || bookmakerOdds.bttsNo > best.bttsNo.odds)) {
      best.bttsNo = { odds: bookmakerOdds.bttsNo, bookmaker: bookmakerOdds.bookmaker };
    }
  }

  return best;
}

// Match odds to our match data
export function matchOddsToMatch(
  oddsData: MatchOdds[],
  match: Match
): MatchOdds | null {
  const normalizedHome = match.teams.home.name.toLowerCase().trim();
  const normalizedAway = match.teams.away.name.toLowerCase().trim();

  // Try exact match first
  let matchOdds = oddsData.find(
    o => 
      o.homeTeam.toLowerCase().trim() === normalizedHome &&
      o.awayTeam.toLowerCase().trim() === normalizedAway
  );

  // If no exact match, try fuzzy matching
  if (!matchOdds) {
    matchOdds = oddsData.find(
      o => 
        (o.homeTeam.toLowerCase().includes(normalizedHome) || normalizedHome.includes(o.homeTeam.toLowerCase())) &&
        (o.awayTeam.toLowerCase().includes(normalizedAway) || normalizedAway.includes(o.awayTeam.toLowerCase()))
    );
  }

  if (matchOdds) {
    matchOdds.matchId = match.fixture.id;
  }

  return matchOdds || null;
}

// Get odds for a specific match
export async function getMatchOdds(match: Match): Promise<MatchOdds | null> {
  const leagueOdds = await getRealOdds(match.league.id);
  return matchOddsToMatch(leagueOdds, match);
}

// Calculate EV with real odds
export function calculateRealEV(
  probability: number,
  odds: number | undefined
): number {
  if (!odds || odds <= 1) return -1;
  return (probability * odds) - 1;
}

// Get odds for specific market
export function getOddsForMarket(
  matchOdds: MatchOdds,
  market: MarketType,
  selection: string
): number | undefined {
  const best = matchOdds.bestOdds;
  
  switch (market) {
    case '1X2':
      if (selection === '1') return best.home?.odds;
      if (selection === 'X') return best.draw?.odds;
      if (selection === '2') return best.away?.odds;
      break;
    case 'OVER_UNDER_25':
      if (selection.startsWith('Over')) return best.over25?.odds;
      if (selection.startsWith('Under')) return best.under25?.odds;
      break;
    case 'BTTS':
      if (selection === 'Sí') return best.bttsYes?.odds;
      if (selection === 'No') return best.bttsNo?.odds;
      break;
  }
  
  return undefined;
}

// Check API quota
export async function checkOddsApiQuota(): Promise<{
  used: number;
  remaining: number;
  total: number;
} | null> {
  if (!hasApiKey()) return null;

  try {
    const response = await fetch(
      `${ODDS_API_URL}/sports?apiKey=${ODDS_API_KEY}`
    );
    
    const used = parseInt(response.headers.get('x-requests-used') || '0');
    const remaining = parseInt(response.headers.get('x-requests-remaining') || '0');
    
    return {
      used,
      remaining,
      total: used + remaining,
    };
  } catch (error) {
    console.error('[Odds API] Error checking quota:', error);
    return null;
  }
}
