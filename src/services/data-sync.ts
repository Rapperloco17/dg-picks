// Data Sync Service
// Complementa datos locales con API y detecta gaps

import { makeRequest, getCurrentSeason, formatISODateForAPI } from './api-football';
import { historicalData, HistoricalMatch } from './historical-data-store';
import { loadLeaguesLazy, hasLocalData } from './local-data-loader';
import { getCorrectSeason, getAlternativeSeasons } from './season-detector';

export interface DataGap {
  leagueId: number;
  season: number;
  missingMonths: string[];
  estimatedMissingMatches: number;
  lastLocalDate: string | null;
  currentSeasonStart: string;
}

export interface SyncResult {
  leagueId: number;
  season: number;
  localMatches: number;
  apiMatches: number;
  mergedMatches: number;
  newMatchesFromApi: number;
  gaps: DataGap[];
}

// Detectar qué datos faltan en una liga/temporada
export async function detectDataGaps(leagueId: number, season: number): Promise<DataGap[]> {
  const gaps: DataGap[] = [];
  
  // Asegurar que tenemos datos locales cargados
  if (!historicalData.isDataLoaded() && hasLocalData(leagueId)) {
    await loadLeaguesLazy([leagueId]);
  }
  
  const localMatches = historicalData.getLeagueMatches(leagueId, season);
  
  if (localMatches.length === 0) {
    // No hay datos locales de esta temporada
    return [{
      leagueId,
      season,
      missingMonths: ['all'],
      estimatedMissingMatches: 380, // Aprox para liga típica
      lastLocalDate: null,
      currentSeasonStart: `${season}-08-01`,
    }];
  }
  
  // Encontrar último partido local
  const sortedMatches = [...localMatches].sort((a, b) => 
    new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
  );
  
  const lastMatch = sortedMatches[0];
  const lastDate = new Date(lastMatch.fixture.date);
  const now = new Date();
  
  // Calcular meses faltantes
  const missingMonths: string[] = [];
  let current = new Date(lastDate);
  current.setMonth(current.getMonth() + 1);
  
  while (current < now) {
    missingMonths.push(current.toISOString().slice(0, 7)); // YYYY-MM
    current.setMonth(current.getMonth() + 1);
  }
  
  if (missingMonths.length > 0) {
    gaps.push({
      leagueId,
      season,
      missingMonths,
      estimatedMissingMatches: missingMonths.length * 30, // ~30 partidos por mes
      lastLocalDate: lastMatch.fixture.date,
      currentSeasonStart: `${season}-08-01`,
    });
  }
  
  return gaps;
}

// Obtener partidos de API para complementar
export async function fetchMissingMatches(
  leagueId: number, 
  season: number,
  fromDate?: string
): Promise<HistoricalMatch[]> {
  const matches: HistoricalMatch[] = [];
  
  try {
    // Intentar obtener partidos desde la API
    const params: Record<string, string | number> = { 
      league: leagueId, 
      season,
      to: new Date().toISOString().split('T')[0],
      status: 'FT' // Solo partidos terminados
    };
    
    if (fromDate) {
      params.from = fromDate;
    }
    
    console.log(`[fetchMissingMatches] Params:`, params);
    console.log(`[fetchMissingMatches] from: ${params.from}, to: ${params.to}`);
    
    const data = await makeRequest<{
      response: any[];
    }>({
      endpoint: '/fixtures',
      params
    });
    
    if (!data.response || data.response.length === 0) {
      return matches;
    }
    
    // Convertir al formato HistoricalMatch
    data.response.forEach(apiMatch => {
      const match: HistoricalMatch = {
        fixture: {
          id: apiMatch.fixture.id,
          date: apiMatch.fixture.date,
          timestamp: apiMatch.fixture.timestamp,
          status: {
            long: apiMatch.fixture.status?.long || 'Match Finished',
            short: apiMatch.fixture.status?.short || 'FT',
            elapsed: apiMatch.fixture.status?.elapsed || 90,
          },
          venue: apiMatch.fixture.venue,
          referee: apiMatch.fixture.referee,
        },
        league: {
          id: apiMatch.league.id,
          name: apiMatch.league.name,
          country: apiMatch.league.country,
          season: apiMatch.league.season,
          round: apiMatch.league.round,
        },
        teams: {
          home: {
            id: apiMatch.teams.home.id,
            name: apiMatch.teams.home.name,
            logo: apiMatch.teams.home.logo,
            winner: apiMatch.teams.home.winner,
          },
          away: {
            id: apiMatch.teams.away.id,
            name: apiMatch.teams.away.name,
            logo: apiMatch.teams.away.logo,
            winner: apiMatch.teams.away.winner,
          },
        },
        goals: {
          home: apiMatch.goals.home,
          away: apiMatch.goals.away,
        },
        score: apiMatch.score || {},
      };
      
      matches.push(match);
    });
    
    console.log(`[DataSync] Fetched ${matches.length} matches from API for league ${leagueId} season ${season}`);
    return matches;
    
  } catch (error) {
    console.error(`[DataSync] Error fetching matches:`, error);
    return matches;
  }
}

// Merge datos locales + API
export async function syncLeagueData(
  leagueId: number, 
  season: number,
  onProgress?: (message: string) => void
): Promise<SyncResult> {
  onProgress?.(`Analizando datos locales de liga ${leagueId}...`);
  
  // Cargar datos locales si no están cargados
  if (!historicalData.isDataLoaded() && hasLocalData(leagueId)) {
    await loadLeaguesLazy([leagueId]);
  }
  
  const localMatches = historicalData.getLeagueMatches(leagueId, season);
  const localIds = new Set(localMatches.map(m => m.fixture.id));
  
  onProgress?.(`Encontrados ${localMatches.length} partidos locales`);
  
  // Detectar gaps
  const gaps = await detectDataGaps(leagueId, season);
  
  let apiMatches: HistoricalMatch[] = [];
  let newMatches: HistoricalMatch[] = [];
  
  // Si hay gaps, obtener datos de API
  if (gaps.length > 0 && gaps[0].lastLocalDate) {
    // Formatear fecha a YYYY-MM-DD para la API
    const formattedFromDate = formatISODateForAPI(gaps[0].lastLocalDate);
    console.log(`[Sync Debug] lastLocalDate raw: ${gaps[0].lastLocalDate}`);
    console.log(`[Sync Debug] formattedFromDate: ${formattedFromDate}`);
    onProgress?.(`Buscando partidos desde ${formattedFromDate}...`);
    
    apiMatches = await fetchMissingMatches(leagueId, season, formattedFromDate);
    
    // Filtrar solo partidos nuevos
    newMatches = apiMatches.filter(m => !localIds.has(m.fixture.id));
    
    onProgress?.(`Encontrados ${newMatches.length} partidos nuevos`);
  } else if (gaps.length > 0 && gaps[0].missingMonths.includes('all')) {
    // No hay datos locales de esta temporada
    onProgress?.(`No hay datos locales, descargando temporada completa...`);
    apiMatches = await fetchMissingMatches(leagueId, season);
    newMatches = apiMatches;
  }
  
  return {
    leagueId,
    season,
    localMatches: localMatches.length,
    apiMatches: apiMatches.length,
    mergedMatches: localMatches.length + newMatches.length,
    newMatchesFromApi: newMatches.length,
    gaps,
  };
}

// Exportar datos complementados como JSON
export function exportMergedData(leagueId: number, season: number): string {
  const matches = historicalData.getLeagueMatches(leagueId, season);
  
  const exportData = {
    league: leagueId,
    season,
    lastUpdated: new Date().toISOString(),
    totalMatches: matches.length,
    matches: matches.map(m => ({
      fixture: m.fixture,
      league: m.league,
      teams: m.teams,
      goals: m.goals,
      score: m.score,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Descargar archivo JSON
export function downloadJSON(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Sincronizar múltiples ligas
export async function syncMultipleLeagues(
  leagues: { leagueId: number; season: number }[],
  onProgress?: (current: number, total: number, message: string) => void
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  for (let i = 0; i < leagues.length; i++) {
    const { leagueId, season } = leagues[i];
    onProgress?.(i, leagues.length, `Sincronizando liga ${leagueId}...`);
    
    const result = await syncLeagueData(leagueId, season, (msg) => {
      onProgress?.(i, leagues.length, msg);
    });
    
    results.push(result);
    
    // Delay para no saturar la API
    if (i < leagues.length - 1) {
      await new Promise(r => setTimeout(r, 6000)); // 6 segundos entre ligas
    }
  }
  
  return results;
}

// Obtener recomendaciones de sincronización
export async function getSyncRecommendations(): Promise<{
  leagueId: number;
  season: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedMissing: number;
}[]> {
  const recommendations: {
    leagueId: number;
    season: number;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    estimatedMissing: number;
  }[] = [];
  
  // Top ligas europeas - usar temporada actual dinámica
  const currentSeason = getCurrentSeason();
  const topLeagues = [
    { id: 39, season: currentSeason, name: 'Premier League' },
    { id: 140, season: currentSeason, name: 'La Liga' },
    { id: 135, season: currentSeason, name: 'Serie A' },
    { id: 78, season: currentSeason, name: 'Bundesliga' },
    { id: 61, season: currentSeason, name: 'Ligue 1' },
  ];
  
  for (const league of topLeagues) {
    const gaps = await detectDataGaps(league.id, league.season);
    
    if (gaps.length > 0 && !gaps[0].missingMonths.includes('all')) {
      recommendations.push({
        leagueId: league.id,
        season: league.season,
        priority: gaps[0].missingMonths.length > 3 ? 'high' : 'medium',
        reason: `Faltan ${gaps[0].missingMonths.length} meses de datos`,
        estimatedMissing: gaps[0].estimatedMissingMatches,
      });
    } else if (gaps.length > 0) {
      recommendations.push({
        leagueId: league.id,
        season: league.season,
        priority: 'high',
        reason: 'Sin datos locales de esta temporada',
        estimatedMissing: 380,
      });
    }
  }
  
  return recommendations.sort((a, b) => 
    a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
  );
}
