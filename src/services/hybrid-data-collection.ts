/**
 * Hybrid Data Collection
 * 
 * Estrategia inteligente:
 * 1. Primero usa TODO lo que tenemos en PostgreSQL (rápido, 0 API calls)
 * 2. Identifica qué ligas/temporadas faltan
 * 3. Solo descarga de API lo que no tenemos
 * 
 * Esto maximiza el uso de datos existentes y minimiza consumo de API
 */

import { PrismaClient } from '@prisma/client';
import { ALL_LEAGUES } from '@/constants/leagues';
import { collectLeagueMatches, ProcessedMatchData, saveTrainingData } from './historical-data';
import { setCache, getCache, CACHE_TYPES } from './local-cache';

const prisma = new PrismaClient();
const AVAILABLE_SEASONS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

interface CollectionResult {
  fromDatabase: number;
  fromAPI: number;
  total: number;
  byLeague: Record<string, { db: number; api: number }>;
  missingCombinations: Array<{ leagueId: number; season: number; leagueName: string }>;
}

interface MissingDataInfo {
  leagueId: number;
  season: number;
  leagueName: string;
  reason: 'no_data' | 'insufficient_data';
  existingCount: number;
}

/**
 * Verifica qué datos tenemos en la BD para cada liga/temporada
 */
async function checkExistingData(): Promise<Map<string, number>> {
  console.log('[Hybrid] Checking existing data in database...');
  
  const existingData = new Map<string, number>();
  
  for (const league of ALL_LEAGUES) {
    for (const season of AVAILABLE_SEASONS) {
      const count = await prisma.match.count({
        where: {
          leagueId: league.id,
          season: season,
          status: 'FT', // Solo partidos terminados
        },
      });
      
      const key = `${league.id}_${season}`;
      existingData.set(key, count);
    }
  }
  
  return existingData;
}

/**
 * Carga datos desde PostgreSQL (sin usar API)
 */
async function loadFromDatabase(
  onProgress?: (current: number, total: number) => void
): Promise<{ count: number; matches: ProcessedMatchData[] }> {
  console.log('[Hybrid] Loading data from PostgreSQL...');
  
  try {
    // Get all finished matches from database
    const matches = await prisma.match.findMany({
      where: {
        status: 'FT',
      },
      orderBy: {
        date: 'desc',
      },
    });
    
    console.log(`[Hybrid] Found ${matches.length} matches in database`);
    
    const processedMatches: ProcessedMatchData[] = [];
    
    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);
      
      for (const match of batch) {
        try {
          const processed = await processDatabaseMatch(match);
          if (processed) {
            processedMatches.push(processed);
            await saveTrainingData([processed]);
          }
        } catch (error) {
          console.error(`[Hybrid] Error processing match ${match.fixtureId}:`, error);
        }
      }
      
      if (onProgress) {
        onProgress(Math.min(i + batchSize, matches.length), matches.length);
      }
    }
    
    console.log(`[Hybrid] Processed ${processedMatches.length} matches from database`);
    return { count: processedMatches.length, matches: processedMatches };
    
  } catch (error) {
    console.error('[Hybrid] Error loading from database:', error);
    throw error;
  }
}

/**
 * Procesa un partido de la base de datos
 */
async function processDatabaseMatch(dbMatch: any): Promise<ProcessedMatchData | null> {
  // Get team stats
  const homeStats = await getTeamStats(dbMatch.homeTeamId, dbMatch.leagueId, dbMatch.season);
  const awayStats = await getTeamStats(dbMatch.awayTeamId, dbMatch.leagueId, dbMatch.season);
  
  const totalGoals = (dbMatch.homeGoals || 0) + (dbMatch.awayGoals || 0);
  
  return {
    id: dbMatch.fixtureId,
    fixture: {
      id: dbMatch.fixtureId,
      date: dbMatch.date.toISOString(),
      timestamp: dbMatch.timestamp,
      timezone: dbMatch.timezone,
      status: { short: dbMatch.status, long: dbMatch.status },
    } as any,
    league: {
      id: dbMatch.leagueId,
      name: dbMatch.leagueName,
      season: dbMatch.season,
    } as any,
    teams: {
      home: { id: dbMatch.homeTeamId, name: dbMatch.homeTeamName },
      away: { id: dbMatch.awayTeamId, name: dbMatch.awayTeamName },
    } as any,
    goals: {
      home: dbMatch.homeGoals,
      away: dbMatch.awayGoals,
    },
    score: {
      halftime: { home: dbMatch.homeScoreHT, away: dbMatch.awayScoreHT },
      fulltime: { home: dbMatch.homeScoreFT, away: dbMatch.awayScoreFT },
    } as any,
    features: {
      homeForm: homeStats?.recentForm || [0, 0, 0, 0, 0],
      awayForm: awayStats?.recentForm || [0, 0, 0, 0, 0],
      homeGoalsScoredAvg: homeStats?.avgGoalsScored || 0,
      homeGoalsConcededAvg: homeStats?.avgGoalsConceded || 0,
      awayGoalsScoredAvg: awayStats?.avgGoalsScored || 0,
      awayGoalsConcededAvg: awayStats?.avgGoalsConceded || 0,
      h2hHomeWins: 0,
      h2hDraws: 0,
      h2hAwayWins: 0,
      homeCleanSheets: homeStats?.cleanSheets || 0,
      awayCleanSheets: awayStats?.cleanSheets || 0,
      homeBttsRate: homeStats?.bttsRate || 0.5,
      awayBttsRate: awayStats?.bttsRate || 0.5,
      homeOver15Rate: homeStats?.over15Rate || 0.5,
      homeOver25Rate: homeStats?.over25Rate || 0.5,
      awayOver15Rate: awayStats?.over15Rate || 0.5,
      awayOver25Rate: awayStats?.over25Rate || 0.5,
    },
    target: {
      homeWin: (dbMatch.homeGoals || 0) > (dbMatch.awayGoals || 0),
      draw: (dbMatch.homeGoals || 0) === (dbMatch.awayGoals || 0),
      awayWin: (dbMatch.homeGoals || 0) < (dbMatch.awayGoals || 0),
      btts: (dbMatch.homeGoals || 0) > 0 && (dbMatch.awayGoals || 0) > 0,
      over15: totalGoals > 1.5,
      over25: totalGoals > 2.5,
      over35: totalGoals > 3.5,
      totalGoals: totalGoals,
    },
    metadata: {
      season: dbMatch.season,
      collectedAt: { toDate: () => new Date(), seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      hasCompleteData: true,
    },
  };
}

/**
 * Obtiene estadísticas de equipo desde la BD
 */
async function getTeamStats(teamId: number, leagueId: number, season: number) {
  const recentMatches = await prisma.match.findMany({
    where: {
      OR: [
        { homeTeamId: teamId, leagueId, season },
        { awayTeamId: teamId, leagueId, season },
      ],
      status: 'FT',
    },
    orderBy: { date: 'desc' },
    take: 10,
  });
  
  if (recentMatches.length === 0) return null;
  
  const form: number[] = [];
  let goalsScored = 0;
  let goalsConceded = 0;
  let cleanSheets = 0;
  let bttsCount = 0;
  let over15Count = 0;
  let over25Count = 0;
  
  for (const match of recentMatches) {
    const isHome = match.homeTeamId === teamId;
    const teamGoals = isHome ? (match.homeGoals || 0) : (match.awayGoals || 0);
    const oppGoals = isHome ? (match.awayGoals || 0) : (match.homeGoals || 0);
    const totalGoals = teamGoals + oppGoals;
    
    if (recentMatches.indexOf(match) < 5) {
      if (teamGoals > oppGoals) form.push(3);
      else if (teamGoals === oppGoals) form.push(1);
      else form.push(0);
    }
    
    goalsScored += teamGoals;
    goalsConceded += oppGoals;
    if (oppGoals === 0) cleanSheets++;
    if (teamGoals > 0 && oppGoals > 0) bttsCount++;
    if (totalGoals > 1.5) over15Count++;
    if (totalGoals > 2.5) over25Count++;
  }
  
  const total = recentMatches.length;
  
  return {
    recentForm: form,
    avgGoalsScored: goalsScored / total,
    avgGoalsConceded: goalsConceded / total,
    cleanSheets,
    bttsRate: bttsCount / total,
    over15Rate: over15Count / total,
    over25Rate: over25Count / total,
  };
}

/**
 * Identifica qué datos faltan
 */
async function identifyMissingData(
  existingData: Map<string, number>
): Promise<MissingDataInfo[]> {
  const missing: MissingDataInfo[] = [];
  const MIN_MATCHES_THRESHOLD = 10; // Mínimo partidos para considerar "suficiente"
  
  for (const league of ALL_LEAGUES) {
    for (const season of AVAILABLE_SEASONS) {
      const key = `${league.id}_${season}`;
      const count = existingData.get(key) || 0;
      
      if (count === 0) {
        missing.push({
          leagueId: league.id,
          season,
          leagueName: league.name,
          reason: 'no_data',
          existingCount: 0,
        });
      } else if (count < MIN_MATCHES_THRESHOLD) {
        missing.push({
          leagueId: league.id,
          season,
          leagueName: league.name,
          reason: 'insufficient_data',
          existingCount: count,
        });
      }
    }
  }
  
  return missing;
}

/**
 * Descarga datos faltantes de la API
 */
async function downloadMissingData(
  missingData: MissingDataInfo[],
  onProgress?: (leagueName: string, current: number, total: number) => void
): Promise<number> {
  let totalDownloaded = 0;
  
  // Ordenar: primero las que tienen pocos datos (más prioritarias)
  const sorted = missingData.sort((a, b) => a.existingCount - b.existingCount);
  
  // Limitar para no agotar API (máximo 20 combinaciones)
  const toDownload = sorted.slice(0, 20);
  
  console.log(`[Hybrid] Will download ${toDownload.length} league/season combinations from API`);
  
  for (let i = 0; i < toDownload.length; i++) {
    const { leagueId, season, leagueName } = toDownload[i];
    
    try {
      console.log(`[Hybrid] Downloading ${leagueName} ${season}...`);
      
      const matches = await collectLeagueMatches(leagueId, season, (current, total) => {
        if (onProgress) {
          onProgress(`${leagueName} (${season})`, current, total);
        }
      });
      
      totalDownloaded += matches.length;
      
      // Esperar entre ligas para no saturar la API
      if (i < toDownload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`[Hybrid] Error downloading ${leagueName} ${season}:`, error);
    }
  }
  
  return totalDownloaded;
}

/**
 * Colección híbrida principal
 * Usa BD primero, luego API solo para lo que falta
 */
export async function collectHybridData(
  onDatabaseProgress?: (current: number, total: number) => void,
  onAPIProgress?: (leagueName: string, current: number, total: number) => void,
  onStatusUpdate?: (status: string) => void
): Promise<CollectionResult> {
  console.log('[Hybrid] Starting hybrid data collection...');
  onStatusUpdate?.('Verificando datos existentes...');
  
  // Paso 1: Verificar qué tenemos
  const existingData = await checkExistingData();
  const totalExisting = Array.from(existingData.values()).reduce((a, b) => a + b, 0);
  console.log(`[Hybrid] Found ${totalExisting} matches already in database`);
  
  // Paso 2: Cargar todo de la BD
  onStatusUpdate?.('Cargando datos de PostgreSQL...');
  const { count: dbCount, matches: dbMatches } = await loadFromDatabase(onDatabaseProgress);
  
  // Paso 3: Identificar qué falta
  onStatusUpdate?.('Identificando datos faltantes...');
  const missingData = await identifyMissingData(existingData);
  console.log(`[Hybrid] Missing data for ${missingData.length} league/season combinations`);
  
  // Paso 4: Descargar solo lo que falta (limitado)
  let apiCount = 0;
  if (missingData.length > 0) {
    onStatusUpdate?.(`Descargando ${Math.min(missingData.length, 20)} ligas de API...`);
    apiCount = await downloadMissingData(missingData, onAPIProgress);
  }
  
  // Resultados por liga
  const byLeague: Record<string, { db: number; api: number }> = {};
  
  for (const match of dbMatches) {
    const key = match.league.name;
    if (!byLeague[key]) {
      byLeague[key] = { db: 0, api: 0 };
    }
    byLeague[key].db++;
  }
  
  const result: CollectionResult = {
    fromDatabase: dbCount,
    fromAPI: apiCount,
    total: dbCount + apiCount,
    byLeague,
    missingCombinations: missingData.map(m => ({
      leagueId: m.leagueId,
      season: m.season,
      leagueName: m.leagueName,
    })),
  };
  
  console.log('[Hybrid] Collection complete:', result);
  onStatusUpdate?.(`Completado: ${result.total} partidos (${result.fromDatabase} BD + ${result.fromAPI} API)`);
  
  return result;
}

/**
 * Obtiene estadísticas de la colección híbrida
 */
export function getHybridCollectionStats(): {
  fromDatabase: number;
  fromAPI: number;
  total: number;
} {
  // Esto se podría guardar en caché o localStorage
  return {
    fromDatabase: 0,
    fromAPI: 0,
    total: 0,
  };
}
