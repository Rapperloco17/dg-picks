import { LeagueTier, Continent } from '@/types';

// TIER 1: Top European Leagues + Champions League
export const TIER_1_LEAGUES: LeagueTier[] = [
  // Europe - Major Leagues
  { id: 39, name: 'Premier League', country: 'England', tier: 1, continent: 'EUROPE' },
  { id: 140, name: 'La Liga', country: 'Spain', tier: 1, continent: 'EUROPE' },
  { id: 135, name: 'Serie A', country: 'Italy', tier: 1, continent: 'EUROPE' },
  { id: 78, name: 'Bundesliga', country: 'Germany', tier: 1, continent: 'EUROPE' },
  { id: 61, name: 'Ligue 1', country: 'France', tier: 1, continent: 'EUROPE' },
  { id: 94, name: 'Primeira Liga', country: 'Portugal', tier: 1, continent: 'EUROPE' },
  { id: 88, name: 'Eredivisie', country: 'Netherlands', tier: 1, continent: 'EUROPE' },
  
  // International Competitions
  { id: 2, name: 'Champions League', country: 'Europe', tier: 1, continent: 'EUROPE' },
  { id: 3, name: 'Europa League', country: 'Europe', tier: 1, continent: 'EUROPE' },
  { id: 1, name: 'World Cup', country: 'World', tier: 1, continent: 'EUROPE' },
  { id: 4, name: 'Euro Championship', country: 'Europe', tier: 1, continent: 'EUROPE' },
];

// TIER 2: Secondary European Leagues + Major Americas
export const TIER_2_LEAGUES: LeagueTier[] = [
  // Europe - Second Divisions
  { id: 40, name: 'Championship', country: 'England', tier: 2, continent: 'EUROPE' },
  { id: 141, name: 'Segunda División', country: 'Spain', tier: 2, continent: 'EUROPE' },
  { id: 136, name: 'Serie B', country: 'Italy', tier: 2, continent: 'EUROPE' },
  { id: 79, name: '2. Bundesliga', country: 'Germany', tier: 2, continent: 'EUROPE' },
  { id: 62, name: 'Ligue 2', country: 'France', tier: 2, continent: 'EUROPE' },
  
  // Europe - Other Top Leagues
  { id: 179, name: 'Premiership', country: 'Scotland', tier: 2, continent: 'EUROPE' },
  { id: 144, name: 'Pro League', country: 'Belgium', tier: 2, continent: 'EUROPE' },
  { id: 218, name: 'Bundesliga', country: 'Austria', tier: 2, continent: 'EUROPE' },
  { id: 207, name: 'Super League', country: 'Switzerland', tier: 2, continent: 'EUROPE' },
  { id: 119, name: 'Superliga', country: 'Denmark', tier: 2, continent: 'EUROPE' },
  { id: 113, name: 'Allsvenskan', country: 'Sweden', tier: 2, continent: 'EUROPE' },
  { id: 103, name: 'Eliteserien', country: 'Norway', tier: 2, continent: 'EUROPE' },
  { id: 203, name: 'Süper Lig', country: 'Turkey', tier: 2, continent: 'EUROPE' },
  { id: 197, name: 'Super League 1', country: 'Greece', tier: 2, continent: 'EUROPE' },
  
  // South America - Top Leagues
  { id: 71, name: 'Série A', country: 'Brazil', tier: 2, continent: 'SOUTH_AMERICA' },
  { id: 128, name: 'Liga Profesional', country: 'Argentina', tier: 2, continent: 'SOUTH_AMERICA' },
  { id: 13, name: 'Copa Libertadores', country: 'South America', tier: 2, continent: 'SOUTH_AMERICA' },
  { id: 11, name: 'Copa Sudamericana', country: 'South America', tier: 2, continent: 'SOUTH_AMERICA' },
  
  // North America
  { id: 253, name: 'MLS', country: 'USA', tier: 2, continent: 'NORTH_AMERICA' },
  { id: 262, name: 'Liga MX', country: 'Mexico', tier: 2, continent: 'NORTH_AMERICA' },
  
  // Asia - Top Leagues
  { id: 98, name: 'J1 League', country: 'Japan', tier: 2, continent: 'ASIA' },
  { id: 292, name: 'K League 1', country: 'South Korea', tier: 2, continent: 'ASIA' },
  { id: 169, name: 'Super League', country: 'China', tier: 2, continent: 'ASIA' },
  { id: 307, name: 'Pro League', country: 'Saudi Arabia', tier: 2, continent: 'ASIA' },
  
  // International
  { id: 848, name: 'Conference League', country: 'Europe', tier: 2, continent: 'EUROPE' },
  { id: 5, name: 'UEFA Nations League', country: 'Europe', tier: 2, continent: 'EUROPE' },
  { id: 9, name: 'Copa America', country: 'South America', tier: 2, continent: 'SOUTH_AMERICA' },
];

// TIER 3: Additional competitive leagues
export const TIER_3_LEAGUES: LeagueTier[] = [
  // Europe
  { id: 106, name: 'Ekstraklasa', country: 'Poland', tier: 3, continent: 'EUROPE' },
  { id: 208, name: 'Czech Liga', country: 'Czech Republic', tier: 3, continent: 'EUROPE' },
  { id: 235, name: 'Premier League', country: 'Russia', tier: 3, continent: 'EUROPE' },
  { id: 333, name: 'Premier League', country: 'Ukraine', tier: 3, continent: 'EUROPE' },
  { id: 172, name: 'First League', country: 'Bulgaria', tier: 3, continent: 'EUROPE' },
  { id: 210, name: 'HNL', country: 'Croatia', tier: 3, continent: 'EUROPE' },
  { id: 283, name: 'Liga I', country: 'Romania', tier: 3, continent: 'EUROPE' },
  { id: 286, name: 'Super Liga', country: 'Serbia', tier: 3, continent: 'EUROPE' },
  
  // South America
  { id: 265, name: 'Primera División', country: 'Chile', tier: 3, continent: 'SOUTH_AMERICA' },
  { id: 239, name: 'Primera A', country: 'Colombia', tier: 3, continent: 'SOUTH_AMERICA' },
  { id: 281, name: 'Primera División', country: 'Peru', tier: 3, continent: 'SOUTH_AMERICA' },
  { id: 242, name: 'Liga Pro', country: 'Ecuador', tier: 3, continent: 'SOUTH_AMERICA' },
  { id: 268, name: 'Primera División', country: 'Uruguay', tier: 3, continent: 'SOUTH_AMERICA' },
  { id: 72, name: 'Série B', country: 'Brazil', tier: 3, continent: 'SOUTH_AMERICA' },
  
  // North America
  { id: 255, name: 'USL Championship', country: 'USA', tier: 3, continent: 'NORTH_AMERICA' },
  { id: 263, name: 'Liga de Expansión', country: 'Mexico', tier: 3, continent: 'NORTH_AMERICA' },
  { id: 259, name: 'Premier League', country: 'Canada', tier: 3, continent: 'NORTH_AMERICA' },
  { id: 22, name: 'Gold Cup', country: 'North America', tier: 3, continent: 'NORTH_AMERICA' },
  
  // Asia
  { id: 188, name: 'A-League', country: 'Australia', tier: 3, continent: 'ASIA' },
  { id: 300, name: 'Pro League', country: 'UAE', tier: 3, continent: 'ASIA' },
  { id: 305, name: 'Stars League', country: 'Qatar', tier: 3, continent: 'ASIA' },
  { id: 290, name: 'Persian Gulf Pro League', country: 'Iran', tier: 3, continent: 'ASIA' },
  { id: 17, name: 'AFC Champions League', country: 'Asia', tier: 3, continent: 'ASIA' },
  { id: 7, name: 'Asian Cup', country: 'Asia', tier: 3, continent: 'ASIA' },
  
  // Africa
  { id: 233, name: 'Premier League', country: 'Egypt', tier: 3, continent: 'AFRICA' },
  { id: 246, name: 'Premiership', country: 'South Africa', tier: 3, continent: 'AFRICA' },
  { id: 200, name: 'Botola Pro', country: 'Morocco', tier: 3, continent: 'AFRICA' },
  { id: 12, name: 'CAF Champions League', country: 'Africa', tier: 3, continent: 'AFRICA' },
  { id: 6, name: 'Africa Cup of Nations', country: 'Africa', tier: 3, continent: 'AFRICA' },
];

// Combine all leagues
export const ALL_LEAGUES: LeagueTier[] = [
  ...TIER_1_LEAGUES,
  ...TIER_2_LEAGUES,
  ...TIER_3_LEAGUES,
];

// Helper functions
export const getLeagueById = (id: number): LeagueTier | undefined => {
  return ALL_LEAGUES.find(league => league.id === id);
};

export const getLeaguesByTier = (tier: 1 | 2 | 3): LeagueTier[] => {
  return ALL_LEAGUES.filter(league => league.tier === tier);
};

export const getLeaguesByContinent = (continent: Continent): LeagueTier[] => {
  return ALL_LEAGUES.filter(league => league.continent === continent);
};

export const getTier1LeagueIds = (): number[] => TIER_1_LEAGUES.map(l => l.id);
export const getTier2LeagueIds = (): number[] => TIER_2_LEAGUES.map(l => l.id);
export const getTier3LeagueIds = (): number[] => TIER_3_LEAGUES.map(l => l.id);
export const getAllLeagueIds = (): number[] => ALL_LEAGUES.map(l => l.id);

// Countries list for filtering
export const COUNTRIES = Array.from(new Set(ALL_LEAGUES.map(l => l.country))).sort();

// Continents with labels
export const CONTINENTS: { value: Continent | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'EUROPE', label: 'Europa' },
  { value: 'SOUTH_AMERICA', label: 'Sudamérica' },
  { value: 'NORTH_AMERICA', label: 'Norteamérica' },
  { value: 'ASIA', label: 'Asia' },
  { value: 'AFRICA', label: 'África' },
  { value: 'OCEANIA', label: 'Oceanía' },
];
