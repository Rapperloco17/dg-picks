// ==================== API FOOTBALL TYPES ====================

export interface Team {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

export interface Fixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    city: string | null;
  };
  status: {
    long: string;
    short: string;
    elapsed: number | null;
    extra?: number | null;
  };
}

export interface League {
  id: number;
  name: string;
  type: string;
  logo: string;
  country?: string;
  flag?: string;
  season?: number;
  round?: string;
  standings?: boolean;
}

export interface Goals {
  home: number | null;
  away: number | null;
}

export interface Score {
  halftime: Goals;
  fulltime: Goals;
  extratime: Goals;
  penalty: Goals;
}

export interface Match {
  fixture: Fixture;
  league: League;
  teams: {
    home: Team;
    away: Team;
  };
  goals: Goals;
  score: Score;
}

export interface MatchResponse {
  response: Match[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  errors: any[];
}

// ==================== PICK TYPES ====================

export type MarketType = 
  | '1X2' 
  | 'DOUBLE_CHANCE'
  | 'OVER_UNDER'
  | 'OVER_UNDER_25'
  | 'OVER_UNDER_15'
  | 'OVER_UNDER_35'
  | 'BTTS' 
  | 'ASIAN_HANDICAP'
  | 'CORNERS'
  | 'CARDS';

export type PickStatus = 'PENDING' | 'WON' | 'LOST' | 'VOID' | 'CANCELLED';

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Pick {
  id: string;
  userId: string;
  matchId: number;
  leagueId: number;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  market: MarketType;
  selection: string;
  odds: number;
  stake: number;
  confidence: ConfidenceLevel;
  notes?: string;
  result: PickStatus;
  profit: number | null;
  createdAt: string;
  settledAt: string | null;
}

// ==================== USER TYPES ====================

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
}

export interface Bankroll {
  current: number;
  initial: number;
  currency: string;
}

export interface UserSettings {
  oddsFormat: 'decimal' | 'american' | 'fractional';
  theme: 'dark' | 'light';
  notifications: boolean;
  defaultStake: number;
  kellyFraction: number;
}

// ==================== STATS TYPES ====================

export interface TeamStats {
  form: string;
  fixtures: {
    played: { home: number; away: number; total: number };
    wins: { home: number; away: number; total: number };
    draws: { home: number; away: number; total: number };
    loses: { home: number; away: number; total: number };
  };
  goals: {
    for: { home: { total: number; average: string }; away: { total: number; average: string }; total: { total: number; average: string } };
    against: { home: { total: number; average: string }; away: { total: number; average: string }; total: { total: number; average: string } };
  };
  clean_sheet: { home: number; away: number; total: number };
  failed_to_score: { home: number; away: number; total: number };
}

export interface H2HData {
  fixtures: Match[];
  statistics?: {
    home: TeamStats;
    away: TeamStats;
  };
}

export interface PredictionData {
  winner?: {
    id: number;
    name: string;
    comment: string;
  };
  win_or_draw: boolean;
  under_over: string | null;
  goals: {
    home: string;
    away: string;
  };
  percentage: {
    home: string;
    draw: string;
    away: string;
  };
}

// ==================== UI TYPES ====================

export type ViewMode = 'TODAY' | 'TOMORROW' | 'WEEKEND' | 'WEEK' | 'LIVE';

export type Continent = 'EUROPE' | 'SOUTH_AMERICA' | 'NORTH_AMERICA' | 'ASIA' | 'AFRICA' | 'OCEANIA';

export interface LeagueTier {
  id: number;
  name: string;
  country: string;
  tier: 1 | 2 | 3 | 4;
  continent: Continent;
}

export interface FilterState {
  view: ViewMode;
  continent: Continent | 'ALL';
  country: string | 'ALL';
  league: number | 'ALL';
  minProbability: number;
  maxProbability: number;
  searchQuery: string;
}

// ==================== HISTORICAL MATCH TYPES ====================

export interface HistoricalMatch {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
    venue?: {
      id: number;
      name: string;
      city: string;
    };
    referee?: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
    round?: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo?: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo?: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime?: { home: number | null; away: number | null };
    fulltime?: { home: number | null; away: number | null };
    extratime?: { home: number | null; away: number | null };
    penalty?: { home: number | null; away: number | null };
  };
  estadisticas?: any[];
}
