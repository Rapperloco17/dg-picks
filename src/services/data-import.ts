// Data Import Service
// Import historical data from external sources (CSV, JSON)

import { setCache, CACHE_TYPES } from './local-cache';

export interface ImportedMatch {
  matchId: number;
  date: string;
  leagueId: number;
  season: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  result: 'H' | 'D' | 'A';
  // Optional features
  oddsHome?: number;
  oddsDraw?: number;
  oddsAway?: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: number;
  message: string;
}

// Parse CSV data
export function parseCSV(csvText: string): ImportedMatch[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const matches: ImportedMatch[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;
    
    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });
    
    try {
      const match: ImportedMatch = {
        matchId: parseInt(row.matchId) || i,
        date: row.date || new Date().toISOString(),
        leagueId: parseInt(row.leagueId) || 0,
        season: parseInt(row.season) || new Date().getFullYear(),
        homeTeamId: parseInt(row.homeTeamId) || 0,
        awayTeamId: parseInt(row.awayTeamId) || 0,
        homeTeam: row.homeTeam || 'Home',
        awayTeam: row.awayTeam || 'Away',
        homeGoals: parseInt(row.homeGoals) || 0,
        awayGoals: parseInt(row.awayGoals) || 0,
        result: row.result || calculateResult(row.homeGoals, row.awayGoals),
        oddsHome: row.oddsHome ? parseFloat(row.oddsHome) : undefined,
        oddsDraw: row.oddsDraw ? parseFloat(row.oddsDraw) : undefined,
        oddsAway: row.oddsAway ? parseFloat(row.oddsAway) : undefined,
      };
      
      matches.push(match);
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
    }
  }
  
  return matches;
}

// Parse JSON data
export function parseJSON(jsonText: string): ImportedMatch[] {
  try {
    const data = JSON.parse(jsonText);
    
    // Handle different formats
    if (Array.isArray(data)) {
      return data.map((item, idx) => ({
        matchId: item.matchId || item.id || idx,
        date: item.date || item.fixture?.date || new Date().toISOString(),
        leagueId: item.leagueId || item.league?.id || 0,
        season: item.season || new Date().getFullYear(),
        homeTeamId: item.homeTeamId || item.teams?.home?.id || 0,
        awayTeamId: item.awayTeamId || item.teams?.away?.id || 0,
        homeTeam: item.homeTeam || item.teams?.home?.name || 'Home',
        awayTeam: item.awayTeam || item.teams?.away?.name || 'Away',
        homeGoals: item.homeGoals || item.goals?.home || 0,
        awayGoals: item.awayGoals || item.goals?.away || 0,
        result: item.result || calculateResult(item.homeGoals, item.awayGoals),
        oddsHome: item.oddsHome || item.odds?.home,
        oddsDraw: item.oddsDraw || item.odds?.draw,
        oddsAway: item.oddsAway || item.odds?.away,
      }));
    }
    
    // If it's an object with a matches array (league format)
    if (data.matches && Array.isArray(data.matches)) {
      const leagueId = data.league || data.leagueId || data.id || 0;
      const leagueName = data.leagueName || data.name || '';
      
      return data.matches.map((item: any, idx: number) => ({
        matchId: item.matchId || item.id || item.fixture?.id || idx,
        date: item.date || item.fixture?.date || new Date().toISOString(),
        leagueId: item.leagueId || item.league?.id || leagueId,
        season: item.season || item.league?.season || extractSeasonFromDate(item.date) || new Date().getFullYear(),
        homeTeamId: item.homeTeamId || item.teams?.home?.id || item.home?.id || 0,
        awayTeamId: item.awayTeamId || item.teams?.away?.id || item.away?.id || 0,
        homeTeam: item.homeTeam || item.teams?.home?.name || item.home?.name || 'Home',
        awayTeam: item.awayTeam || item.teams?.away?.name || item.away?.name || 'Away',
        homeGoals: item.homeGoals ?? item.goals?.home ?? item.score?.fulltime?.home ?? 0,
        awayGoals: item.awayGoals ?? item.goals?.away ?? item.score?.fulltime?.away ?? 0,
        result: item.result || calculateResult(
          item.homeGoals ?? item.goals?.home ?? item.score?.fulltime?.home,
          item.awayGoals ?? item.goals?.away ?? item.score?.fulltime?.away
        ),
        oddsHome: item.oddsHome || item.odds?.home || item.odds?.fixture?.bet365?.home,
        oddsDraw: item.oddsDraw || item.odds?.draw || item.odds?.fixture?.bet365?.draw,
        oddsAway: item.oddsAway || item.odds?.away || item.odds?.fixture?.bet365?.away,
      }));
    }
    
    // If it's a single match object
    if (data.fixture || data.homeTeam || data.teams) {
      return parseJSON(JSON.stringify([data]));
    }
    
    return [];
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return [];
  }
}

// Extract season from date
function extractSeasonFromDate(dateStr: string): number | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    // European season: Aug-May spans two years
    return month >= 8 ? year : year - 1;
  } catch {
    return null;
  }
}

// Import matches to local cache
export function importMatches(matches: ImportedMatch[]): ImportResult {
  try {
    let imported = 0;
    let errors = 0;
    
    matches.forEach((match, idx) => {
      try {
        const cacheKey = `imported_${match.matchId}`;
        setCache(CACHE_TYPES.MATCH_STATS, cacheKey, match, 365 * 24 * 60 * 60 * 1000); // 1 year
        imported++;
      } catch (error) {
        errors++;
        console.error(`Error importing match ${idx}:`, error);
      }
    });
    
    // Save import summary
    const summary = {
      totalImported: imported,
      errors,
      timestamp: Date.now(),
      leagues: [...new Set(matches.map(m => m.leagueId))],
      seasons: [...new Set(matches.map(m => m.season))],
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('ml_import_summary', JSON.stringify(summary));
    }
    
    return {
      success: true,
      imported,
      errors,
      message: `Imported ${imported} matches successfully${errors > 0 ? ` (${errors} errors)` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: matches.length,
      message: `Import failed: ${error}`,
    };
  }
}

// Get import summary
export function getImportSummary(): {
  totalImported: number;
  errors: number;
  timestamp: number;
  leagues: number[];
  seasons: number[];
} | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('ml_import_summary');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// Export template CSV
export function generateTemplateCSV(): string {
  const headers = [
    'matchId', 'date', 'leagueId', 'season',
    'homeTeamId', 'awayTeamId', 'homeTeam', 'awayTeam',
    'homeGoals', 'awayGoals', 'result',
    'oddsHome', 'oddsDraw', 'oddsAway'
  ].join(',');
  
  const example = [
    '1', '2024-01-15', '39', '2024',
    '33', '34', 'Manchester United', 'Liverpool',
    '2', '1', 'H',
    '2.10', '3.40', '3.20'
  ].join(',');
  
  return `${headers}\n${example}`;
}

// Export template JSON
export function generateTemplateJSON(): string {
  const template = {
    matches: [
      {
        matchId: 1,
        date: '2024-01-15',
        leagueId: 39,
        season: 2024,
        homeTeamId: 33,
        awayTeamId: 34,
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        homeGoals: 2,
        awayGoals: 1,
        result: 'H',
        oddsHome: 2.10,
        oddsDraw: 3.40,
        oddsAway: 3.20,
      }
    ]
  };
  
  return JSON.stringify(template, null, 2);
}

// Validate data format
export function validateData(matches: ImportedMatch[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (matches.length === 0) {
    errors.push('No matches found in data');
    return { valid: false, errors };
  }
  
  matches.forEach((match, idx) => {
    if (!match.homeTeam || !match.awayTeam) {
      errors.push(`Row ${idx + 1}: Missing team names`);
    }
    if (isNaN(match.homeGoals) || isNaN(match.awayGoals)) {
      errors.push(`Row ${idx + 1}: Invalid goals`);
    }
    if (!match.date) {
      errors.push(`Row ${idx + 1}: Missing date`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Helper function
function calculateResult(homeGoals: any, awayGoals: any): 'H' | 'D' | 'A' {
  const hg = parseInt(homeGoals) || 0;
  const ag = parseInt(awayGoals) || 0;
  
  if (hg > ag) return 'H';
  if (hg === ag) return 'D';
  return 'A';
}

// Get all imported matches count
export function getImportedMatchesCount(): number {
  if (typeof window === 'undefined') return 0;
  
  const summary = getImportSummary();
  return summary?.totalImported || 0;
}

// Clear all imported data
export function clearImportedData(): void {
  if (typeof window === 'undefined') return;
  
  // Clear all imported match caches
  Object.keys(localStorage)
    .filter(key => key.startsWith('dg_picks_cache_match_stats_imported_'))
    .forEach(key => localStorage.removeItem(key));
  
  localStorage.removeItem('ml_import_summary');
}

// Parse multiple league files
export interface LeagueFile {
  leagueId: number;
  leagueName: string;
  fileName: string;
  matches: ImportedMatch[];
}

export function parseLeagueFile(jsonText: string, fileName: string): LeagueFile | null {
  try {
    const data = JSON.parse(jsonText);
    const matches = parseJSON(jsonText);
    
    if (matches.length === 0) {
      return null;
    }
    
    // Try to extract league info from the JSON structure
    const leagueId = data.league || data.leagueId || data.id || matches[0]?.leagueId || 0;
    const leagueName = data.leagueName || data.name || `Liga ${leagueId}`;
    
    // Ensure all matches have the leagueId
    const matchesWithLeague = matches.map(m => ({
      ...m,
      leagueId: m.leagueId || leagueId,
    }));
    
    return {
      leagueId,
      leagueName,
      fileName,
      matches: matchesWithLeague,
    };
  } catch (error) {
    console.error('Error parsing league file:', error);
    return null;
  }
}

// Import multiple league files
export interface MultiLeagueImportResult {
  success: boolean;
  totalImported: number;
  filesProcessed: number;
  leagues: { leagueId: number; leagueName: string; count: number }[];
  errors: string[];
}

export function importMultipleLeagueFiles(files: LeagueFile[]): MultiLeagueImportResult {
  const result: MultiLeagueImportResult = {
    success: true,
    totalImported: 0,
    filesProcessed: 0,
    leagues: [],
    errors: [],
  };
  
  files.forEach((file) => {
    try {
      const importResult = importMatches(file.matches);
      
      if (importResult.success) {
        result.totalImported += importResult.imported;
        result.filesProcessed++;
        result.leagues.push({
          leagueId: file.leagueId,
          leagueName: file.leagueName,
          count: importResult.imported,
        });
      } else {
        result.errors.push(`${file.leagueName}: ${importResult.message}`);
      }
    } catch (error) {
      result.errors.push(`${file.leagueName}: ${error}`);
    }
  });
  
  result.success = result.errors.length === 0;
  return result;
}

// Get imported data by league
export function getImportedDataByLeague(): Map<number, ImportedMatch[]> {
  if (typeof window === 'undefined') return new Map();
  
  const matches: ImportedMatch[] = [];
  
  // Get all imported matches from localStorage
  Object.keys(localStorage)
    .filter(key => key.startsWith('dg_picks_cache_match_stats_imported_'))
    .forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const data = JSON.parse(cached);
          if (data.data) {
            matches.push(data.data);
          }
        }
      } catch (e) {
        // Skip invalid entries
      }
    });
  
  // Group by league
  const byLeague = new Map<number, ImportedMatch[]>();
  matches.forEach(match => {
    const leagueMatches = byLeague.get(match.leagueId) || [];
    leagueMatches.push(match);
    byLeague.set(match.leagueId, leagueMatches);
  });
  
  return byLeague;
}
