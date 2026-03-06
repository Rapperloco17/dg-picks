import { Match, TeamStats } from '@/types';
import { getFixturesByTeam, getTeamStatistics, getFixturesH2H, getCurrentSeason } from './api-football';
import { getCachedData, setCachedData } from './cache-service';

// Extended seasons for more training data
export const EXTENDED_SEASONS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

// Weather impact on matches (simulated based on historical patterns)
interface WeatherImpact {
  temperature: number; // Celsius
  rainProbability: number; // 0-1
  windSpeed: number; // km/h
  impact: 'low' | 'medium' | 'high';
}

// Squad rotation indicator
interface SquadRotation {
  rotationScore: number; // 0-10 (10 = heavy rotation)
  keyPlayersOut: number;
  avgRestDays: number;
  europeanCompetition: boolean;
}

// Injury impact
interface InjuryReport {
  keyInjuries: string[];
  impactScore: number; // 0-10
  attackingInjuries: number;
  defensiveInjuries: number;
}

// Motivation factors
interface MotivationFactors {
  titleRace: number; // 0-10
  relegationBattle: number; // 0-10
  europeanSpots: number; // 0-10
  derbyMatch: boolean;
  revengeFactor: number; // 0-10 (lost heavily last time)
}

/**
 * Calculate advanced features for a match
 */
export async function calculateAdvancedFeatures(
  match: Match,
  season: number
): Promise<{
  weather: WeatherImpact;
  homeRotation: SquadRotation;
  awayRotation: SquadRotation;
  homeInjuries: InjuryReport;
  awayInjuries: InjuryReport;
  motivation: MotivationFactors;
  fatigue: {
    homeFatigue: number;
    awayFatigue: number;
    homeGamesLast14: number;
    awayGamesLast14: number;
  };
  xG: {
    homeXGF: number;
    homeXGA: number;
    awayXGF: number;
    awayXGA: number;
  };
  pressure: {
    homePressureScore: number;
    awayPressureScore: number;
  };
}> {
  const homeId = match.teams.home.id;
  const awayId = match.teams.away.id;
  const leagueId = match.league.id;
  
  // Get historical matches for both teams
  const homeMatches = await getTeamRecentMatches(homeId, season, 20);
  const awayMatches = await getTeamRecentMatches(awayId, season, 20);
  
  // Calculate fatigue
  const homeFatigue = calculateFatigue(homeMatches, match.fixture.date);
  const awayFatigue = calculateFatigue(awayMatches, match.fixture.date);
  
  // Calculate xG from recent matches
  const homeXGData = calculateXGFromMatches(homeMatches, homeId);
  const awayXGData = calculateXGFromMatches(awayMatches, awayId);
  
  // Calculate pressure based on standings (if available)
  const homePressure = await calculatePressureScore(homeId, leagueId, season, homeMatches);
  const awayPressure = await calculatePressureScore(awayId, leagueId, season, awayMatches);
  
  // Squad rotation estimation
  const homeRotation = estimateSquadRotation(homeMatches, homeId);
  const awayRotation = estimateSquadRotation(awayMatches, awayId);
  
  // Motivation factors
  const motivation = await calculateMotivation(match, homeMatches, awayMatches, season);
  
  // Weather (based on location and date)
  const weather = estimateWeather(match.fixture.venue.city, match.fixture.date);
  
  // Injury simulation (would be real data in production)
  const homeInjuries = simulateInjuryReport(homeMatches, homeId);
  const awayInjuries = simulateInjuryReport(awayMatches, awayId);
  
  return {
    weather,
    homeRotation,
    awayRotation,
    homeInjuries,
    awayInjuries,
    motivation,
    fatigue: {
      homeFatigue: homeFatigue.score,
      awayFatigue: awayFatigue.score,
      homeGamesLast14: homeFatigue.gamesLast14,
      awayGamesLast14: awayFatigue.gamesLast14,
    },
    xG: {
      homeXGF: homeXGData.xGF,
      homeXGA: homeXGData.xGA,
      awayXGF: awayXGData.xGF,
      awayXGA: awayXGData.xGA,
    },
    pressure: {
      homePressureScore: homePressure,
      awayPressureScore: awayPressure,
    },
  };
}

/**
 * Get team recent matches
 */
async function getTeamRecentMatches(teamId: number, season: number, limit: number = 20): Promise<Match[]> {
  const cacheKey = `team_matches_${teamId}_${season}_${limit}`;
  
  const cached = await getCachedData<Match[]>('fixtures', { key: cacheKey });
  if (cached) return cached;
  
  const matches = await getFixturesByTeam(teamId, season, limit);
  
  await setCachedData('fixtures', { key: cacheKey }, matches, 24 * 60 * 60 * 1000); // 24h cache
  
  return matches;
}

/**
 * Calculate fatigue score based on recent matches
 */
function calculateFatigue(matches: Match[], beforeDate: string): { score: number; gamesLast14: number } {
  const targetDate = new Date(beforeDate);
  const fourteenDaysAgo = new Date(targetDate);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  const thirtyDaysAgo = new Date(targetDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentMatches = matches.filter(m => {
    const matchDate = new Date(m.fixture.date);
    return matchDate < targetDate && matchDate >= fourteenDaysAgo;
  });
  
  const monthMatches = matches.filter(m => {
    const matchDate = new Date(m.fixture.date);
    return matchDate < targetDate && matchDate >= thirtyDaysAgo;
  });
  
  const gamesLast14 = recentMatches.length;
  const gamesLast30 = monthMatches.length;
  
  // Fatigue algorithm
  let fatigueScore = 0;
  
  // Base fatigue from games in last 14 days
  if (gamesLast14 >= 5) fatigueScore += 7;
  else if (gamesLast14 >= 4) fatigueScore += 5;
  else if (gamesLast14 >= 3) fatigueScore += 3;
  else fatigueScore += 1;
  
  // Additional fatigue from high intensity (European competition)
  const europeanMatches = recentMatches.filter(m => 
    m.league.id === 2 || m.league.id === 3 || m.league.id === 848 // UCL, UEL, UECL
  ).length;
  fatigueScore += europeanMatches * 1.5;
  
  // Travel fatigue (for away matches)
  const awayMatches = recentMatches.filter(m => {
    const isHome = m.teams.home.id === matches[0]?.teams.home.id;
    return !isHome;
  }).length;
  fatigueScore += awayMatches * 0.5;
  
  // Rest days since last match
  if (recentMatches.length > 0) {
    const lastMatch = recentMatches[0];
    const lastMatchDate = new Date(lastMatch.fixture.date);
    const restDays = Math.floor((targetDate.getTime() - lastMatchDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (restDays < 3) fatigueScore += 3;
    else if (restDays < 5) fatigueScore += 1;
    else if (restDays > 7) fatigueScore -= 2; // Well rested
  }
  
  return {
    score: Math.min(10, Math.max(0, fatigueScore)),
    gamesLast14,
  };
}

/**
 * Calculate expected goals from recent matches
 */
function calculateXGFromMatches(matches: Match[], teamId: number): { xGF: number; xGA: number } {
  if (matches.length === 0) return { xGF: 1.5, xGA: 1.5 };
  
  let totalXGF = 0;
  let totalXGA = 0;
  let count = 0;
  
  // Take last 10 matches
  const recentMatches = matches.slice(0, 10);
  
  for (const match of recentMatches) {
    if (match.goals.home === null || match.goals.away === null) continue;
    
    const isHome = match.teams.home.id === teamId;
    const gf = isHome ? match.goals.home : match.goals.away;
    const ga = isHome ? match.goals.away : match.goals.home;
    
    // Simple xG estimation based on shots (if available) or goals
    // In a real system, you'd have actual xG data
    const shots = isHome ? (match as any).shots?.home : (match as any).shots?.away;
    const shotsAgainst = isHome ? (match as any).shots?.away : (match as any).shots?.home;
    
    if (shots && shotsAgainst) {
      // Estimate xG from shots (0.1 xG per shot as rough estimate)
      totalXGF += shots * 0.11;
      totalXGA += shotsAgainst * 0.11;
    } else {
      // Use actual goals with regression
      totalXGF += gf * 0.8 + 0.3; // Regression to mean
      totalXGA += ga * 0.8 + 0.3;
    }
    count++;
  }
  
  if (count === 0) return { xGF: 1.5, xGA: 1.5 };
  
  return {
    xGF: totalXGF / count,
    xGA: totalXGA / count,
  };
}

/**
 * Calculate pressure score based on standings and recent form
 */
async function calculatePressureScore(
  teamId: number, 
  leagueId: number, 
  season: number,
  recentMatches: Match[]
): Promise<number> {
  // Would ideally fetch actual standings
  // For now, calculate from recent form
  
  if (recentMatches.length < 5) return 5; // Neutral
  
  const form = recentMatches.slice(0, 5).map(m => {
    if (m.goals.home === null || m.goals.away === null) return 1;
    const isHome = m.teams.home.id === teamId;
    const gf = isHome ? m.goals.home : m.goals.away;
    const ga = isHome ? m.goals.away : m.goals.home;
    
    if (gf! > ga!) return 3;
    if (gf === ga) return 1;
    return 0;
  });
  
  const formPoints = form.reduce((a, b) => a + b, 0 as number);
  
  // Pressure increases with bad form, decreases with good form
  // But also depends on time of season (more pressure at end)
  let pressure = 5;
  
  if (formPoints <= 3) pressure += 3; // Very bad form
  else if (formPoints <= 6) pressure += 1; // Bad form
  else if (formPoints >= 12) pressure -= 2; // Excellent form
  else if (formPoints >= 10) pressure -= 1; // Good form
  
  return Math.min(10, Math.max(0, pressure));
}

/**
 * Estimate squad rotation based on lineup changes
 */
function estimateSquadRotation(matches: Match[], teamId: number): SquadRotation {
  if (matches.length < 3) {
    return {
      rotationScore: 5,
      keyPlayersOut: 0,
      avgRestDays: 3.5,
      europeanCompetition: false,
    };
  }
  
  // Analyze lineup changes between matches
  // This is simplified - real implementation would analyze actual lineups
  const recentMatches = matches.slice(0, 5);
  
  let europeanMatches = 0;
  let shortRestMatches = 0;
  
  for (let i = 0; i < recentMatches.length - 1; i++) {
    const current = new Date(recentMatches[i].fixture.date);
    const next = new Date(recentMatches[i + 1].fixture.date);
    const restDays = (next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
    
    if (restDays < 4) shortRestMatches++;
    
    if ([2, 3, 848].includes(recentMatches[i].league.id)) {
      europeanMatches++;
    }
  }
  
  const rotationScore = Math.min(10, shortRestMatches * 2 + (europeanMatches > 0 ? 2 : 0));
  
  return {
    rotationScore,
    keyPlayersOut: Math.floor(rotationScore / 2),
    avgRestDays: shortRestMatches > 0 ? 2.5 : 4.5,
    europeanCompetition: europeanMatches > 0,
  };
}

/**
 * Calculate motivation factors
 */
async function calculateMotivation(
  match: Match,
  homeMatches: Match[],
  awayMatches: Match[],
  season: number
): Promise<MotivationFactors> {
  // Title race motivation (simplified)
  const titleRace = 5; // Would need standings
  
  // Relegation battle
  const relegationBattle = 5; // Would need standings
  
  // European spots
  const europeanSpots = 5; // Would need standings
  
  // Derby detection
  const derbyMatch = isDerby(match);
  
  // Revenge factor (lost heavily last time?)
  const h2h = await getFixturesH2H(match.teams.home.id, match.teams.away.id, 5);
  let revengeFactor = 0;
  
  if (h2h.length > 0) {
    const lastMatch = h2h[0];
    if (lastMatch.goals.home !== null && lastMatch.goals.away !== null) {
      const homeLost = lastMatch.teams.home.id === match.teams.home.id 
        ? lastMatch.goals.home < lastMatch.goals.away
        : lastMatch.goals.home > lastMatch.goals.away;
      
      const goalDiff = Math.abs(lastMatch.goals.home - lastMatch.goals.away);
      
      if (homeLost && goalDiff >= 2) {
        revengeFactor = Math.min(10, goalDiff * 2);
      }
    }
  }
  
  return {
    titleRace,
    relegationBattle,
    europeanSpots,
    derbyMatch,
    revengeFactor,
  };
}

/**
 * Detect derby matches
 */
function isDerby(match: Match): boolean {
  const cityDerbies: Record<string, string[]> = {
    'Madrid': ['Real Madrid', 'Atletico Madrid', 'Rayo Vallecano'],
    'Barcelona': ['Barcelona', 'Espanyol'],
    'London': ['Arsenal', 'Chelsea', 'Tottenham', 'West Ham', 'Crystal Palace', 'Fulham'],
    'Manchester': ['Manchester City', 'Manchester United'],
    'Liverpool': ['Liverpool', 'Everton'],
    'Milan': ['AC Milan', 'Inter'],
    'Rome': ['Roma', 'Lazio'],
    'Turin': ['Juventus', 'Torino'],
  };
  
  const homeCity = Object.keys(cityDerbies).find(city => 
    cityDerbies[city].some(team => match.teams.home.name.includes(team))
  );
  
  if (homeCity) {
    return cityDerbies[homeCity].some(team => 
      match.teams.away.name.includes(team) && 
      !match.teams.home.name.includes(team)
    );
  }
  
  return false;
}

/**
 * Estimate weather conditions
 */
function estimateWeather(city: string | null, date: string): WeatherImpact {
  // Simplified weather estimation
  // In production, use actual weather API
  
  const month = new Date(date).getMonth();
  
  // Northern Europe colder in winter
  const coldCities = ['Moscow', 'Saint Petersburg', 'Stockholm', 'Oslo', 'Helsinki'];
  const rainyCities = ['London', 'Manchester', 'Liverpool', 'Glasgow', 'Seattle'];
  
  let temperature = 15; // Default
  let rainProbability = 0.3;
  let windSpeed = 10;
  
  // Seasonal adjustment
  if (month >= 11 || month <= 2) { // Winter
    temperature = 5;
    rainProbability = 0.4;
    windSpeed = 15;
  } else if (month >= 5 && month <= 8) { // Summer
    temperature = 25;
    rainProbability = 0.2;
    windSpeed = 8;
  }
  
  // City adjustment
  if (city && coldCities.some(c => city.includes(c))) {
    temperature -= 5;
  }
  if (city && rainyCities.some(c => city.includes(c))) {
    rainProbability += 0.3;
    windSpeed += 5;
  }
  
  // Determine impact
  let impact: 'low' | 'medium' | 'high' = 'low';
  if (rainProbability > 0.6 || windSpeed > 20 || temperature < 0) {
    impact = 'high';
  } else if (rainProbability > 0.4 || windSpeed > 15 || temperature < 5) {
    impact = 'medium';
  }
  
  return {
    temperature,
    rainProbability,
    windSpeed,
    impact,
  };
}

/**
 * Simulate injury report (would be real data in production)
 */
function simulateInjuryReport(matches: Match[], teamId: number): InjuryReport {
  // Analyze recent performance drops as injury indicator
  const recentForm = matches.slice(0, 3);
  const olderForm = matches.slice(3, 6);
  
  const recentPoints = calculateFormPoints(recentForm, teamId);
  const olderPoints = calculateFormPoints(olderForm, teamId);
  
  const performanceDrop = olderPoints - recentPoints;
  
  let impactScore = 5;
  if (performanceDrop > 4) impactScore = 8;
  else if (performanceDrop > 2) impactScore = 6;
  else if (performanceDrop < -2) impactScore = 3;
  
  return {
    keyInjuries: [], // Would be real data
    impactScore,
    attackingInjuries: Math.floor(Math.random() * 3),
    defensiveInjuries: Math.floor(Math.random() * 3),
  };
}

/**
 * Calculate form points
 */
function calculateFormPoints(matches: Match[], teamId: number): number {
  return matches.reduce((total, m) => {
    if (m.goals.home === null || m.goals.away === null) return total;
    const isHome = m.teams.home.id === teamId;
    const gf = isHome ? m.goals.home : m.goals.away;
    const ga = isHome ? m.goals.away : m.goals.home;
    
    if (gf! > ga!) return total + 3;
    if (gf === ga) return total + 1;
    return total;
  }, 0);
}

export type {
  WeatherImpact,
  SquadRotation,
  InjuryReport,
  MotivationFactors,
};
