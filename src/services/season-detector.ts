// Season detection utility for different leagues
// Different leagues use different season formats

// League season configurations
const LEAGUE_SEASONS: Record<number, { startMonth: number; endMonth: number; usesCalendarYear: boolean }> = {
  // Europe - Traditional Aug-May season (2024-2025)
  39: { startMonth: 8, endMonth: 5, usesCalendarYear: false },   // Premier League
  140: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // La Liga
  135: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Serie A
  78: { startMonth: 8, endMonth: 5, usesCalendarYear: false },   // Bundesliga
  61: { startMonth: 8, endMonth: 5, usesCalendarYear: false },   // Ligue 1
  88: { startMonth: 8, endMonth: 5, usesCalendarYear: false },   // Eredivisie
  94: { startMonth: 8, endMonth: 5, usesCalendarYear: false },   // Primeira Liga
  144: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Jupiler Pro League
  119: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Scottish Premiership
  235: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Russian Premier League
  203: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Süper Lig
  218: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Swiss Super League
  179: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Austrian Bundesliga
  345: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Czech Liga
  168: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Super League Greece
  106: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Ekstraklasa
  113: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Allsvenskan (May-Nov but API uses same)
  103: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Eliteserien
  104: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Superliga
  283: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Liga I Romania
  1190: { startMonth: 8, endMonth: 5, usesCalendarYear: false }, // 2. Bundesliga
  136: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Serie B
  141: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // La Liga 2
  40: { startMonth: 8, endMonth: 5, usesCalendarYear: false },   // Championship
  41: { startMonth: 8, endMonth: 5, usesCalendarYear: false },   // League One
  42: { startMonth: 8, endMonth: 5, usesCalendarYear: false },   // League Two
  186: { startMonth: 8, endMonth: 5, usesCalendarYear: false },  // Ligue 2
  
  // Americas - Calendar year season (2025)
  262: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Liga MX
  265: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Liga MX Clausura
  266: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Liga MX Apertura
  71: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // Brasileirão
  72: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // Serie B Brazil
  253: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // MLS
  128: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Primera Argentina
  129: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Primera B Nacional
  130: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Primera C
  250: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Copa Chile
  112: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Primera Colombia
  115: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Primera Uruguay
  116: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Primera Paraguay
  124: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Primera Bolivia
  125: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Liga Peruana
  134: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Primera Ecuador
  263: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Liga de Expansión MX
  255: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // USL Championship
  254: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // USL League One
  526: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Copa MX
  
  // Asia - Calendar year or split season
  98: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // J1 League
  99: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // J2 League
  100: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // J3 League
  292: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // K League 1
  293: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // K League 2
  169: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Super League China
  170: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // China League One
  297: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Thai League 1
  298: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Thai League 2
  357: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Indian Super League
  275: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // A-League (Australia)
  307: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Saudi Pro League
  308: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // UAE Pro League
  299: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Qatar Stars League
  305: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Persian Gulf Pro League
  246: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // V.League 1
  247: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Malaysia Super League
  244: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Indonesia Liga 1
  383: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Philippines Football League
  
  // Africa - Calendar year or split
  233: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // Premier League Egypt
  371: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // Ligue 1 Algeria
  373: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // Botola Pro Morocco
  384: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // NPFL Nigeria
  399: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // Premier League South Africa
  288: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // Ligue 1 Tunisia
  
  // International - Calendar year
  4: { startMonth: 1, endMonth: 12, usesCalendarYear: true },    // Euro Championship
  5: { startMonth: 1, endMonth: 12, usesCalendarYear: true },    // Nations League
  32: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // World Cup
  34: { startMonth: 1, endMonth: 12, usesCalendarYear: true },   // World Cup Qualifiers
  960: { startMonth: 1, endMonth: 12, usesCalendarYear: true },  // Club Friendlies
};

/**
 * Get the correct season for a league based on current date
 */
export function getCorrectSeason(leagueId: number, date: Date = new Date()): number {
  const config = LEAGUE_SEASONS[leagueId];
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1; // 1-12
  
  if (!config) {
    // Default: European style if not configured
    return currentMonth >= 8 ? currentYear : currentYear - 1;
  }
  
  if (config.usesCalendarYear) {
    // Calendar year leagues (Americas, most of Asia)
    // If we're in the first few months, might still be using previous year season
    if (currentMonth <= 3) {
      return currentYear - 1;
    }
    return currentYear;
  } else {
    // European style (Aug-May)
    // Season 2024 = 2024-2025 season
    return currentMonth >= 8 ? currentYear : currentYear - 1;
  }
}

/**
 * Try to get the season string that API-Football expects
 * Some leagues use "2024" others "2024-2025"
 */
export function getSeasonString(leagueId: number, date: Date = new Date()): string {
  const season = getCorrectSeason(leagueId, date);
  return String(season);
}

/**
 * Get alternative seasons to try if first fails
 */
export function getAlternativeSeasons(leagueId: number, date: Date = new Date()): number[] {
  const primary = getCorrectSeason(leagueId, date);
  const alternatives = [primary];
  
  // Try previous year
  alternatives.push(primary - 1);
  
  // Try next year (for edge cases)
  alternatives.push(primary + 1);
  
  // For calendar year leagues, also try current year
  const config = LEAGUE_SEASONS[leagueId];
  if (config?.usesCalendarYear && primary !== date.getFullYear()) {
    alternatives.push(date.getFullYear());
  }
  
  return [...new Set(alternatives)]; // Remove duplicates
}

/**
 * Check if a league uses calendar year season
 */
export function usesCalendarYear(leagueId: number): boolean {
  return LEAGUE_SEASONS[leagueId]?.usesCalendarYear ?? false;
}

/**
 * Get season display name (e.g., "2024-2025" or "2025")
 */
export function getSeasonDisplayName(leagueId: number, date: Date = new Date()): string {
  const season = getCorrectSeason(leagueId, date);
  const config = LEAGUE_SEASONS[leagueId];
  
  if (!config || config.usesCalendarYear) {
    return String(season);
  }
  
  // European style
  return `${season}-${season + 1}`;
}
