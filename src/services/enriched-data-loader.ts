// Enriched Data Loader Service
// Carga datos históricos ENRIQUECIDOS con estadísticas desde archivos locales

import { historicalData, HistoricalMatch } from './historical-data-store';

// Lista de ligas disponibles
export const AVAILABLE_ENRICHED_LEAGUES = [
  1, 2, 3, 4, 9, 11, 13, 16, 39, 40, 45, 61, 62, 71, 72, 73, 78, 79, 88, 94,
  103, 106, 113, 118, 119, 128, 129, 130, 135, 136, 137, 140, 141, 143, 144,
  162, 164, 169, 172, 173, 179, 180, 181, 182, 184, 186, 188, 197, 210, 218,
  239, 242, 244, 262, 263, 265, 266, 268
];

export const ENRICHED_SEASONS = [2024, 2025];

// Estado de carga
interface LoadState {
  isLoading: boolean;
  progress: number;
  loadedFiles: number;
  totalFiles: number;
  error: string | null;
}

let loadState: LoadState = {
  isLoading: false,
  progress: 0,
  loadedFiles: 0,
  totalFiles: 0,
  error: null,
};

// Callbacks para actualizar UI
let progressCallbacks: ((state: LoadState) => void)[] = [];

export function subscribeToEnrichedLoadProgress(callback: (state: LoadState) => void) {
  progressCallbacks.push(callback);
  callback({ ...loadState });
  
  return () => {
    progressCallbacks = progressCallbacks.filter(cb => cb !== callback);
  };
}

function updateProgress(updates: Partial<LoadState>) {
  loadState = { ...loadState, ...updates };
  progressCallbacks.forEach(cb => cb({ ...loadState }));
}

// Verificar si hay datos enriquecidos disponibles
export function hasEnrichedData(leagueId: number, season: number): boolean {
  return AVAILABLE_ENRICHED_LEAGUES.includes(leagueId) && ENRICHED_SEASONS.includes(season);
}

// Cargar TODOS los datos enriquecidos
export async function loadAllEnrichedData(): Promise<boolean> {
  if (loadState.isLoading) {
    console.log('[EnrichedData] Already loading...');
    return false;
  }
  
  if (historicalData.isDataLoaded()) {
    console.log('[EnrichedData] Data already loaded');
    return true;
  }
  
  const totalFiles = AVAILABLE_ENRICHED_LEAGUES.length * ENRICHED_SEASONS.length;
  
  updateProgress({
    isLoading: true,
    progress: 0,
    loadedFiles: 0,
    totalFiles,
    error: null,
  });
  
  try {
    console.log(`[EnrichedData] Loading ${totalFiles} files...`);
    
    const response = await fetch('/api/enriched-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        leagues: AVAILABLE_ENRICHED_LEAGUES,
        seasons: ENRICHED_SEASONS 
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load data');
    }
    
    console.log(`[EnrichedData] Loaded ${result.loaded} files, ${result.totalMatches} matches`);
    
    // Procesar datos en el store
    const fileList = result.data.map((item: any) => ({
      leagueId: item.leagueId,
      data: item.data as HistoricalMatch[],
    }));
    
    await historicalData.loadFromFiles(fileList);
    
    updateProgress({
      isLoading: false,
      progress: 100,
      loadedFiles: result.loaded,
      totalFiles,
    });
    
    // Guardar en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('enriched_data_loaded', 'true');
      localStorage.setItem('enriched_data_timestamp', Date.now().toString());
      localStorage.setItem('enriched_data_summary', JSON.stringify(historicalData.getSummary()));
    }
    
    return true;
    
  } catch (error) {
    console.error('[EnrichedData] Error loading data:', error);
    updateProgress({
      isLoading: false,
      error: String(error),
    });
    return false;
  }
}

// Cargar solo ligas prioritarias (Top 5 europeas)
export async function loadPriorityEnrichedData(): Promise<boolean> {
  const priorityLeagues = [39, 140, 135, 78, 61]; // Top 5
  return loadSpecificEnrichedData(priorityLeagues);
}

// Cargar ligas específicas
export async function loadSpecificEnrichedData(leagueIds: number[]): Promise<boolean> {
  const availableLeagues = leagueIds.filter(id => AVAILABLE_ENRICHED_LEAGUES.includes(id));
  
  if (availableLeagues.length === 0) {
    console.warn('[EnrichedData] No available leagues in request');
    return false;
  }
  
  updateProgress({
    isLoading: true,
    progress: 0,
    loadedFiles: 0,
    totalFiles: availableLeagues.length * ENRICHED_SEASONS.length,
    error: null,
  });
  
  try {
    const response = await fetch('/api/enriched-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        leagues: availableLeagues,
        seasons: ENRICHED_SEASONS 
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load data');
    }
    
    // Procesar datos en el store (merge con existentes)
    const fileList = result.data.map((item: any) => ({
      leagueId: item.leagueId,
      data: item.data as HistoricalMatch[],
    }));
    
    await historicalData.loadFromFiles(fileList);
    
    updateProgress({
      isLoading: false,
      progress: 100,
      loadedFiles: result.loaded,
      totalFiles: availableLeagues.length * ENRICHED_SEASONS.length,
    });
    
    return true;
    
  } catch (error) {
    console.error('[EnrichedData] Error loading specific leagues:', error);
    updateProgress({
      isLoading: false,
      error: String(error),
    });
    return false;
  }
}

// Obtener estado actual
export function getEnrichedLoadState(): LoadState {
  return { ...loadState };
}

// Verificar si datos enriquecidos están cargados
export function isEnrichedDataLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('enriched_data_loaded') === 'true';
}

// Obtener resumen
export function getEnrichedDataSummary(): {
  totalMatches: number;
  totalLeagues: number;
  totalSeasons: number;
} | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('enriched_data_summary');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}
