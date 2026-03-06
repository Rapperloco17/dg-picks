// Incremental Sync Service
// Descarga solo partidos NUEVOS desde la última fecha disponible hasta hoy

import { makeRequest } from './api-football';
import { saveDataToStorage, loadDataFromStorage } from './persistent-data-store';
import { HistoricalMatch } from './historical-data-store';

export interface SyncResult {
  newMatches: number;
  updatedMatches: number;
  lastDate: string;
  errors: string[];
}

interface SyncState {
  lastSyncDate: string;
  totalMatches: number;
  leaguesSynced: number[];
}

const SYNC_STATE_KEY = 'dg_picks_sync_state';

/**
 * Obtiene estado de última sincronización
 */
function getSyncState(): SyncState {
  if (typeof window === 'undefined') {
    return { lastSyncDate: '2024-08-01', totalMatches: 0, leaguesSynced: [] };
  }
  
  const saved = localStorage.getItem(SYNC_STATE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  
  return { lastSyncDate: '2024-08-01', totalMatches: 0, leaguesSynced: [] };
}

/**
 * Guarda estado de sincronización
 */
function saveSyncState(state: SyncState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}

/**
 * Encuentra la fecha más reciente en los datos guardados
 */
function findLastDate(matches: HistoricalMatch[]): string {
  if (!matches || matches.length === 0) return '2024-08-01';
  
  const timestamps = matches.map(m => new Date(m.fixture.date).getTime());
  const maxTimestamp = Math.max(...timestamps);
  const lastDate = new Date(maxTimestamp);
  
  // Formato YYYY-MM-DD
  return lastDate.toISOString().split('T')[0];
}

/**
 * Sincroniza partidos nuevos desde la última fecha disponible
 */
export async function syncNewMatches(
  onProgress?: (message: string) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    newMatches: 0,
    updatedMatches: 0,
    lastDate: '',
    errors: [],
  };
  
  try {
    // 1. Cargar datos existentes
    onProgress?.('Cargando datos existentes...');
    const existingMatches = loadDataFromStorage() || [];
    const lastDate = findLastDate(existingMatches);
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`[IncrementalSync] Última fecha: ${lastDate}, Hoy: ${today}`);
    
    if (lastDate >= today) {
      onProgress?.('Los datos ya están actualizados');
      return result;
    }
    
    result.lastDate = lastDate;
    
    // 2. Determinar qué ligas sincronizar (las que tenemos datos)
    const leaguesInData = new Set(existingMatches.map(m => m.league.id));
    const leaguesToSync = Array.from(leaguesInData).slice(0, 20); // Top 20 ligas
    
    onProgress?.(`Sincronizando ${leaguesToSync.length} ligas desde ${lastDate}...`);
    
    // 3. Descargar partidos nuevos por liga
    const newMatches: HistoricalMatch[] = [];
    
    for (const leagueId of leaguesToSync) {
      try {
        onProgress?.(`Descargando liga ${leagueId}...`);
        
        // Llamada a API para partidos desde lastDate hasta hoy
        const data = await makeRequest<{
          response: any[];
          errors?: any;
        }>({
          endpoint: '/fixtures',
          params: {
            league: leagueId,
            season: 2025,
            from: lastDate,
            to: today,
            status: 'FT', // Solo partidos terminados
          },
        });
        
        if (data.response && data.response.length > 0) {
          // Convertir al formato HistoricalMatch
          const matches = data.response.map(apiMatch => convertApiToHistorical(apiMatch));
          newMatches.push(...matches);
          onProgress?.(`  +${matches.length} partidos nuevos`);
        }
        
        // Rate limiting - esperar entre ligas
        await sleep(6500);
        
      } catch (error) {
        const errorMsg = `Error liga ${leagueId}: ${error}`;
        console.error('[IncrementalSync]', errorMsg);
        result.errors.push(errorMsg);
      }
    }
    
    // 4. Filtrar duplicados
    const existingIds = new Set(existingMatches.map(m => m.fixture.id));
    const uniqueNewMatches = newMatches.filter(m => !existingIds.has(m.fixture.id));
    
    console.log(`[IncrementalSync] ${uniqueNewMatches.length} partidos nuevos únicos`);
    
    // 5. Combinar y guardar
    if (uniqueNewMatches.length > 0) {
      const combinedMatches = [...existingMatches, ...uniqueNewMatches];
      
      // Ordenar por fecha
      combinedMatches.sort((a, b) => 
        new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
      );
      
      onProgress?.(`Guardando ${combinedMatches.length} partidos totales...`);
      
      // Guardar en storage
      const saved = saveDataToStorage(combinedMatches);
      if (!saved) {
        result.errors.push('No se pudieron guardar los datos (demasiado grandes)');
      }
      
      result.newMatches = uniqueNewMatches.length;
      
      // Actualizar estado
      saveSyncState({
        lastSyncDate: today,
        totalMatches: combinedMatches.length,
        leaguesSynced: leaguesToSync,
      });
    }
    
    onProgress?.('Sincronización completada');
    return result;
    
  } catch (error) {
    const errorMsg = `Error general: ${error}`;
    console.error('[IncrementalSync]', errorMsg);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Convierte respuesta de API al formato HistoricalMatch
 */
function convertApiToHistorical(apiMatch: any): HistoricalMatch {
  return {
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
      country: apiMatch.league.country || '',
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
    // No incluimos estadísticas en sincronización rápida
    // Se pueden descargar luego si es necesario
  };
}

/**
 * Verifica si hay partidos pendientes de sincronizar
 */
export function hasPendingSync(): boolean {
  const state = getSyncState();
  const lastDate = new Date(state.lastSyncDate);
  const today = new Date();
  const diffDays = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return diffDays > 1; // Si pasó más de 1 día
}

/**
 * Obtiene información de sincronización
 */
export function getSyncInfo(): {
  lastSync: string;
  daysSince: number;
  needsSync: boolean;
} {
  const state = getSyncState();
  const lastDate = new Date(state.lastSyncDate);
  const today = new Date();
  const diffDays = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return {
    lastSync: state.lastSyncDate,
    daysSince: Math.floor(diffDays),
    needsSync: diffDays > 1,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
