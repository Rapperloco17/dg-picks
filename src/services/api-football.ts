import { MatchResponse, Match, PredictionData, H2HData, TeamStats } from '@/types';
import { 
  getCachedFixtures, 
  cacheFixtures, 
  getCachedLiveFixtures, 
  cacheLiveFixtures,
  getCachedH2H,
  cacheH2H 
} from './cache-service';
import { selectCorrectStandings } from './season-detector';

const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || '';
const API_URL = process.env.NEXT_PUBLIC_API_FOOTBALL_URL || 'https://v3.football.api-sports.io';

// Check if running on client side
const isClient = typeof window !== 'undefined';

// Rate limiting configuration - ULTRA PLAN: 450 req/min (conservative: 300)
const RATE_LIMIT = {
  callsPerMinute: 300,     // 300 calls per minute (safe under 450 limit)
  delayBetweenCalls: 200,  // 200ms between calls
  maxRetries: 3,           // Retry failed calls up to 3 times
};

// Track API calls for rate limiting
let apiCallsToday = 0;
let apiCallsThisMinute = 0;
let lastResetTime = Date.now();
let lastCallTime = 0;
const MAX_CALLS_PER_DAY = 75000;

// Call queue for sequential processing
let callQueue: Promise<any> = Promise.resolve();

interface ApiRequestOptions {
  endpoint: string;
  params?: Record<string, string | number>;
  retryCount?: number;
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Reset minute counter
function resetMinuteCounter() {
  const now = Date.now();
  if (now - lastResetTime >= 60000) {
    apiCallsThisMinute = 0;
    lastResetTime = now;
  }
}

// Wait if rate limit is approaching
async function respectRateLimit() {
  resetMinuteCounter();
  
  // Check if we need to wait
  if (apiCallsThisMinute >= RATE_LIMIT.callsPerMinute) {
    const waitTime = 60000 - (Date.now() - lastResetTime) + 1000;
    console.log(`[Rate Limit] Waiting ${waitTime}ms for next minute...`);
    await delay(waitTime);
    resetMinuteCounter();
  }
  
  // Ensure minimum delay between calls
  const timeSinceLastCall = Date.now() - lastCallTime;
  if (timeSinceLastCall < RATE_LIMIT.delayBetweenCalls) {
    const waitTime = RATE_LIMIT.delayBetweenCalls - timeSinceLastCall;
    console.log(`[Rate Limit] Waiting ${waitTime}ms between calls...`);
    await delay(waitTime);
  }
}

export async function makeRequest<T>({ endpoint, params = {}, retryCount = 0 }: ApiRequestOptions): Promise<T> {
  // Check daily rate limit
  if (apiCallsToday >= MAX_CALLS_PER_DAY) {
    throw new Error('API rate limit exceeded for today');
  }

  // Respect rate limiting
  await respectRateLimit();

  // Use proxy API route to avoid CORS issues on client
  const isClientSide = typeof window !== 'undefined';
  
  if (isClientSide) {
    // Use Next.js API route as proxy
    const proxyUrl = new URL('/api/football', window.location.origin);
    proxyUrl.searchParams.append('endpoint', endpoint);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Sanitize date parameters (from/to) to YYYY-MM-DD format
        let sanitizedValue = String(value);
        if ((key === 'from' || key === 'to') && typeof value === 'string') {
          // Extract YYYY-MM-DD from ISO date string or any date format
          const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            sanitizedValue = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }
        }
        proxyUrl.searchParams.append(key, sanitizedValue);
      }
    });

    console.log(`[API Request] #${apiCallsToday + 1} Using proxy:`, endpoint);
    console.log(`[API Request] Full URL:`, proxyUrl.toString());

    try {
      lastCallTime = Date.now();
      apiCallsToday++;
      apiCallsThisMinute++;
      
      const response = await fetch(proxyUrl.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Check for rate limit error and retry
        if (response.status === 429 && retryCount < RATE_LIMIT.maxRetries) {
          console.log(`[Rate Limit] Hit 429, retrying in 10s... (attempt ${retryCount + 1})`);
          await delay(10000);
          return makeRequest({ endpoint, params, retryCount: retryCount + 1 });
        }
        
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('API returned errors:', data.errors);
      }

      return data;
    } catch (error: any) {
      console.error('API Request failed:', error);
      
      // Retry on network errors
      if (retryCount < RATE_LIMIT.maxRetries && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        console.log(`[Retry] Retrying in 5s... (attempt ${retryCount + 1})`);
        await delay(5000);
        return makeRequest({ endpoint, params, retryCount: retryCount + 1 });
      }
      
      throw error;
    }
  } else {
    // Server-side: call API directly
    const url = new URL(`${API_URL}${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Sanitize date parameters (from/to) to YYYY-MM-DD format
        let sanitizedValue = String(value);
        if ((key === 'from' || key === 'to') && typeof value === 'string') {
          // Extract YYYY-MM-DD from ISO date string or any date format
          const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            sanitizedValue = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }
        }
        url.searchParams.append(key, sanitizedValue);
      }
    });

    console.log(`[API Request] #${apiCallsToday + 1} Server-side:`, endpoint);
    console.log(`[API Request] Server URL:`, url.toString());

    try {
      lastCallTime = Date.now();
      apiCallsToday++;
      apiCallsThisMinute++;
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': API_KEY,
        },
        next: { revalidate: 1800 }, // 30 minutes cache
      });

      if (!response.ok) {
        if (response.status === 429 && retryCount < RATE_LIMIT.maxRetries) {
          console.log(`[Rate Limit] Hit 429, retrying in 10s... (attempt ${retryCount + 1})`);
          await delay(10000);
          return makeRequest({ endpoint, params, retryCount: retryCount + 1 });
        }
        
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('API returned errors:', data.errors);
      }

      return data;
    } catch (error: any) {
      console.error('API Request failed:', error);
      
      if (retryCount < RATE_LIMIT.maxRetries && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        console.log(`[Retry] Retrying in 5s... (attempt ${retryCount + 1})`);
        await delay(5000);
        return makeRequest({ endpoint, params, retryCount: retryCount + 1 });
      }
      
      throw error;
    }
  }
}

// Sequential request helper - processes requests one at a time with delay
async function makeSequentialRequests<T>(
  requests: Array<{ leagueId: number; requestFn: () => Promise<T> }>
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i++) {
    const { leagueId, requestFn } = requests[i];
    
    try {
      console.log(`[Sequential] Processing ${i + 1}/${requests.length} - League ${leagueId}`);
      const result = await requestFn();
      results.push(result);
      
      // Add delay between calls (except for the last one)
      if (i < requests.length - 1) {
        await delay(RATE_LIMIT.delayBetweenCalls);
      }
    } catch (error) {
      console.error(`[Sequential] Error for league ${leagueId}:`, error);
      results.push([] as T);
    }
  }
  
  return results;
}

// ==================== FIXTURES ====================

export async function getFixturesByDate(date: string, leagueIds?: number[]): Promise<Match[]> {
  console.log('[getFixturesByDate] Input date:', date);
  console.log('[getFixturesByDate] Input leagueIds count:', leagueIds?.length || 0);
  
  // Get current season
  const season = getCurrentSeason();
  console.log('[getFixturesByDate] Using season:', season);
  
  // OPCIÓN A: Una sola llamada sin filtro de liga
  // La API devuelve todos los partidos del día de todas las ligas
  console.log('[getFixturesByDate] Fetching ALL matches for date (single call)');
  
  const data = await makeRequest<MatchResponse>({ 
    endpoint: '/fixtures', 
    params: { date, season }
  });
  
  let matches = data.response || [];
  console.log('[getFixturesByDate] Total matches fetched:', matches.length);
  
  // Filtrar por ligas específicas si se proporcionaron
  if (leagueIds && leagueIds.length > 0) {
    const validIds = leagueIds
      .map(id => parseInt(String(id), 10))
      .filter(id => !isNaN(id) && id > 0);
    
    // Usar TODAS las ligas proporcionadas (sin límite)
    matches = matches.filter(match => validIds.includes(match.league.id));
    console.log('[getFixturesByDate] Filtered to', matches.length, 'matches for', validIds.length, 'leagues');
    
    // Cache los resultados filtrados
    if (isClient && matches.length > 0) {
      await cacheFixtures(date, validIds, matches);
    }
  }
  
  return matches;
}

export async function getFixturesByLeague(leagueId: number, season: number): Promise<Match[]> {
  const validLeagueId = parseInt(String(leagueId), 10);
  
  if (isNaN(validLeagueId) || validLeagueId <= 0) {
    console.error('[getFixturesByLeague] Invalid leagueId:', leagueId);
    return [];
  }
  
  const validSeason = season || getCurrentSeason();
  
  console.log('[getFixturesByLeague] Fetching league:', validLeagueId, 'season:', validSeason);
  
  const data = await makeRequest<MatchResponse>({
    endpoint: '/fixtures',
    params: { league: validLeagueId, season: validSeason }
  });
  
  return data.response || [];
}

export async function getLiveFixtures(leagueIds?: number[]): Promise<Match[]> {
  console.log('[getLiveFixtures] Input leagueIds count:', leagueIds?.length || 0);
  
  const season = getCurrentSeason();
  
  // OPCIÓN A: Una sola llamada para todos los partidos en vivo
  console.log('[getLiveFixtures] Fetching ALL live matches (single call)');
  
  const data = await makeRequest<MatchResponse>({
    endpoint: '/fixtures',
    params: { live: 'all', season }
  });
  
  let matches = data.response || [];
  console.log('[getLiveFixtures] Total live matches fetched:', matches.length);
  
  // Filtrar por ligas específicas si se proporcionaron
  if (leagueIds && leagueIds.length > 0) {
    const validIds = leagueIds
      .map(id => parseInt(String(id), 10))
      .filter(id => !isNaN(id) && id > 0)
      .slice(0, 20); // Solo primeras 20 ligas
    
    matches = matches.filter(match => validIds.includes(match.league.id));
    console.log('[getLiveFixtures] Filtered to', matches.length, 'matches for priority leagues');
    
    // Cache los resultados filtrados
    if (isClient && matches.length > 0) {
      await cacheLiveFixtures(leagueIds, matches);
    }
  }
  
  return matches;
}

export async function getFixtureById(fixtureId: number): Promise<Match | null> {
  const validId = parseInt(String(fixtureId), 10);
  
  if (isNaN(validId) || validId <= 0) {
    console.error('[getFixtureById] Invalid fixtureId:', fixtureId);
    return null;
  }
  
  const data = await makeRequest<MatchResponse>({
    endpoint: '/fixtures',
    params: { id: validId }
  });
  
  return data.response?.[0] || null;
}

export async function getFixturesByTeam(teamId: number, season: number, last: number = 10): Promise<Match[]> {
  const validTeamId = parseInt(String(teamId), 10);
  
  if (isNaN(validTeamId) || validTeamId <= 0) {
    console.error('[getFixturesByTeam] Invalid teamId:', teamId);
    return [];
  }
  
  const validSeason = season || getCurrentSeason();
  
  const data = await makeRequest<MatchResponse>({
    endpoint: '/fixtures',
    params: { team: validTeamId, season: validSeason, last }
  });
  
  return data.response || [];
}

export async function getFixturesH2H(homeTeamId: number, awayTeamId: number, last: number = 10): Promise<Match[]> {
  const validHomeId = parseInt(String(homeTeamId), 10);
  const validAwayId = parseInt(String(awayTeamId), 10);
  
  if (isNaN(validHomeId) || validHomeId <= 0 || isNaN(validAwayId) || validAwayId <= 0) {
    console.error('[getFixturesH2H] Invalid team IDs:', { homeTeamId, awayTeamId });
    return [];
  }
  
  // Try cache first
  if (isClient) {
    const cached = await getCachedH2H(homeTeamId, awayTeamId);
    if (cached) {
      console.log('[Cache] Using cached H2H');
      return cached;
    }
  }

  const data = await makeRequest<MatchResponse>({
    endpoint: '/fixtures/headtohead',
    params: { h2h: `${validHomeId}-${validAwayId}`, last }
  });
  
  const matches = data.response || [];
  
  // Cache H2H results
  if (isClient && matches.length > 0) {
    await cacheH2H(homeTeamId, awayTeamId, matches);
  }
  
  return matches;
}

// ==================== STATISTICS ====================

export async function getTeamStatistics(
  teamId: number, 
  leagueId: number, 
  season: number
): Promise<TeamStats | null> {
  try {
    const validTeamId = parseInt(String(teamId), 10);
    const validLeagueId = parseInt(String(leagueId), 10);
    const validSeason = season || getCurrentSeason();
    
    if (isNaN(validTeamId) || validTeamId <= 0 || isNaN(validLeagueId) || validLeagueId <= 0) {
      console.error('[getTeamStatistics] Invalid IDs:', { teamId, leagueId });
      return null;
    }
    
    const data = await makeRequest<{ response: TeamStats }>({
      endpoint: '/teams/statistics',
      params: { team: validTeamId, league: validLeagueId, season: validSeason }
    });
    
    return data.response || null;
  } catch (error) {
    console.error('Failed to fetch team statistics:', error);
    return null;
  }
}

// ==================== FIXTURE STATISTICS ====================

export interface FixtureStatistics {
  team: { id: number; name: string; logo: string };
  statistics: Array<{
    type: string;
    value: number | string | null;
  }>;
}

export async function getFixtureStatistics(fixtureId: number): Promise<FixtureStatistics[] | null> {
  try {
    const validId = parseInt(String(fixtureId), 10);
    
    if (isNaN(validId) || validId <= 0) {
      console.error('[getFixtureStatistics] Invalid fixtureId:', fixtureId);
      return null;
    }
    
    const data = await makeRequest<{ response: FixtureStatistics[] }>({
      endpoint: '/fixtures/statistics',
      params: { fixture: validId }
    });
    
    return data.response || null;
  } catch (error) {
    console.error('Failed to fetch fixture statistics:', error);
    return null;
  }
}

// ==================== PREDICTIONS ====================

export async function getPrediction(fixtureId: number): Promise<PredictionData | null> {
  try {
    const validId = parseInt(String(fixtureId), 10);
    
    if (isNaN(validId) || validId <= 0) {
      console.error('[getPrediction] Invalid fixtureId:', fixtureId);
      return null;
    }
    
    const data = await makeRequest<{ response: Array<{ predictions: PredictionData }> }>({
      endpoint: '/predictions',
      params: { fixture: validId }
    });
    
    return data.response?.[0]?.predictions || null;
  } catch (error) {
    console.error('Failed to fetch prediction:', error);
    return null;
  }
}

// ==================== STANDINGS ====================

export async function getStandings(leagueId: number, season: number) {
  try {
    const validLeagueId = parseInt(String(leagueId), 10);
    const validSeason = season || getCurrentSeason();
    
    if (isNaN(validLeagueId) || validLeagueId <= 0) {
      console.error('[getStandings] Invalid leagueId:', leagueId);
      return null;
    }
    
    const data = await makeRequest<{
      response: Array<{ league: { standings: any[][] } }>
    }>({
      endpoint: '/standings',
      params: { league: validLeagueId, season: validSeason }
    });
    
    const allStandings = data.response?.[0]?.league?.standings;
    if (!allStandings || allStandings.length === 0) {
      return null;
    }
    
    // Use helper to select correct standings for leagues with multiple phases
    return selectCorrectStandings(allStandings, validLeagueId);
  } catch (error) {
    console.error('Failed to fetch standings:', error);
    return null;
  }
}

// ==================== LEAGUES ====================

export async function getLeagues(season?: number) {
  try {
    const params: Record<string, number> = {};
    const validSeason = season || getCurrentSeason();
    params.season = validSeason;
    
    const data = await makeRequest<{
      response: Array<{ league: { id: number; name: string; type: string; logo: string }; country: { name: string; code: string; flag: string }; seasons: any[] }>
    }>({
      endpoint: '/leagues',
      params
    });
    
    return data.response || [];
  } catch (error) {
    console.error('Failed to fetch leagues:', error);
    return [];
  }
}

// ==================== HELPERS ====================

export function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  if (month < 7) {
    return year - 1;
  }
  return year;
}

// Get date in YYYY-MM-DD format using LOCAL timezone
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convert ISO date string to YYYY-MM-DD format for API
// Input: "2025-05-25T18:30:00+00:00" -> Output: "2025-05-25"
export function formatISODateForAPI(isoDateString: string): string {
  if (!isoDateString) return '';
  // Extract just the date part (YYYY-MM-DD) from ISO string
  const match = isoDateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  // Fallback: try to parse as Date
  try {
    const date = new Date(isoDateString);
    if (!isNaN(date.getTime())) {
      return formatDateForAPI(date);
    }
  } catch (e) {
    // Invalid date
  }
  return '';
}

export function getTodayDate(): string {
  return formatDateForAPI(new Date());
}

export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateForAPI(tomorrow);
}

export function getWeekendDates(): { from: string; to: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  let saturday = new Date(today);
  let sunday = new Date(today);
  
  if (dayOfWeek < 6) {
    saturday.setDate(today.getDate() + (6 - dayOfWeek));
    sunday.setDate(today.getDate() + (7 - dayOfWeek));
  } else if (dayOfWeek === 6) {
    sunday.setDate(today.getDate() + 1);
  }
  
  return {
    from: formatDateForAPI(saturday),
    to: formatDateForAPI(sunday)
  };
}

export function getWeekDates(): { from: string; to: string } {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  return {
    from: formatDateForAPI(today),
    to: formatDateForAPI(nextWeek)
  };
}

export function getApiCallsCount(): number {
  return apiCallsToday;
}

export function resetApiCallsCount(): void {
  apiCallsToday = 0;
  apiCallsThisMinute = 0;
}
