// Local Data Loader Service
// Carga datos históricos desde archivos locales vía API

import { historicalData, HistoricalMatch } from './historical-data-store';
import { 
  saveDataToStorage, 
  loadDataFromStorage, 
  hasValidStoredData,
  getStoredDataInfo,
  clearStoredData 
} from './persistent-data-store';

// Lista de ligas disponibles en archivos locales
export const AVAILABLE_LOCAL_LEAGUES = [
  1, 2, 3, 4, 9, 11, 13, 16, 39, 40, 45, 61, 62, 71, 72, 73, 78, 79, 88, 94,
  103, 106, 113, 118, 119, 128, 129, 130, 135, 136, 137, 140, 141, 143, 144,
  162, 164, 169, 172, 173, 179, 180, 181, 182, 184, 186, 188, 197, 210, 218,
  239, 242, 244, 262, 263, 265, 266, 268
];

// Temporadas disponibles (datos enriquecidos)
export const AVAILABLE_SEASONS = [2024, 2025];

// Estado de carga
interface LoadState {
  isLoading: boolean;
  progress: number;
  loadedLeagues: number;
  totalLeagues: number;
  error: string | null;
}

let loadState: LoadState = {
  isLoading: false,
  progress: 0,
  loadedLeagues: 0,
  totalLeagues: 0,
  error: null,
};

// Callbacks para actualizar UI
let progressCallbacks: ((state: LoadState) => void)[] = [];

export function subscribeToLoadProgress(callback: (state: LoadState) => void) {
  progressCallbacks.push(callback);
  // Enviar estado actual inmediatamente
  callback({ ...loadState });
  
  return () => {
    progressCallbacks = progressCallbacks.filter(cb => cb !== callback);
  };
}

function updateProgress(updates: Partial<LoadState>) {
  loadState = { ...loadState, ...updates };
  progressCallbacks.forEach(cb => cb({ ...loadState }));
}

// Verificar si una liga tiene datos locales
export function hasLocalData(leagueId: number): boolean {
  return AVAILABLE_LOCAL_LEAGUES.includes(leagueId);
}

// Cargar TODOS los datos locales (58 ligas)
export async function loadAllLocalData(forceReload = false): Promise<boolean> {
  if (loadState.isLoading) {
    console.log('[LocalData] Already loading...');
    return false;
  }
  
  if (historicalData.isDataLoaded() && !forceReload) {
    console.log('[LocalData] Data already loaded in memory');
    return true;
  }
  
  // 1. Intentar cargar desde localStorage primero
  if (!forceReload && hasValidStoredData()) {
    console.log('[LocalData] Loading from localStorage...');
    updateProgress({
      isLoading: true,
      progress: 10,
      loadedLeagues: 0,
      totalLeagues: AVAILABLE_LOCAL_LEAGUES.length,
      error: null,
    });
    
    const storedMatches = loadDataFromStorage();
    if (storedMatches && storedMatches.length > 0) {
      await historicalData.loadFromFiles([{ leagueId: 0, data: storedMatches }]);
      
      const info = getStoredDataInfo();
      console.log(`[LocalData] Restored ${storedMatches.length} matches from storage (${info.age} old)`);
      
      updateProgress({
        isLoading: false,
        progress: 100,
        loadedLeagues: AVAILABLE_LOCAL_LEAGUES.length,
        totalLeagues: AVAILABLE_LOCAL_LEAGUES.length,
      });
      
      // Guardar en localStorage legacy (para compatibilidad)
      if (typeof window !== 'undefined') {
        localStorage.setItem('local_data_loaded', 'true');
        localStorage.setItem('local_data_timestamp', Date.now().toString());
        localStorage.setItem('local_data_summary', JSON.stringify(historicalData.getSummary()));
      }
      
      return true;
    }
  }
  
  // 2. Si no hay en storage o se fuerza recarga, cargar desde API
  updateProgress({
    isLoading: true,
    progress: 0,
    loadedLeagues: 0,
    totalLeagues: AVAILABLE_LOCAL_LEAGUES.length,
    error: null,
  });
  
  try {
    console.log(`[LocalData] Loading ${AVAILABLE_LOCAL_LEAGUES.length} leagues from API...`);
    
    const response = await fetch('/api/local-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        leagues: AVAILABLE_LOCAL_LEAGUES,
        seasons: AVAILABLE_SEASONS 
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load data');
    }
    
    console.log(`[LocalData] Loaded ${result.loaded} files, ${result.totalMatches} matches from API`);
    
    // Procesar datos en el store
    const allMatches: HistoricalMatch[] = [];
    result.data.forEach((item: any) => {
      console.log(`[LocalData]  Liga ${item.leagueId} Temporada ${item.season}: ${item.count} partidos`);
      allMatches.push(...item.data);
    });
    
    await historicalData.loadFromFiles([{ leagueId: 0, data: allMatches }]);
    
    // 3. Guardar en localStorage para futuras sesiones
    const saved = saveDataToStorage(allMatches);
    if (saved) {
      console.log('[LocalData] Data persisted to localStorage');
    } else {
      console.warn('[LocalData] Could not persist data (too large)');
    }
    
    updateProgress({
      isLoading: false,
      progress: 100,
      loadedLeagues: result.loaded,
      totalLeagues: AVAILABLE_LOCAL_LEAGUES.length,
    });
    
    // Guardar en localStorage legacy
    if (typeof window !== 'undefined') {
      localStorage.setItem('local_data_loaded', 'true');
      localStorage.setItem('local_data_timestamp', Date.now().toString());
      localStorage.setItem('local_data_summary', JSON.stringify(historicalData.getSummary()));
    }
    
    return true;
    
  } catch (error) {
    console.error('[LocalData] Error loading data:', error);
    updateProgress({
      isLoading: false,
      error: String(error),
    });
    return false;
  }
}

// Obtener información de los datos guardados
export function getPersistentDataInfo() {
  return getStoredDataInfo();
}

// Forzar recarga de datos (borra cache y recarga)
export async function forceReloadData(): Promise<boolean> {
  clearStoredData();
  historicalData.clear(); // Necesitarás implementar este método
  return loadAllLocalData(true);
}

// Cargar solo ligas prioritarias (más rápido)
export async function loadPriorityLeagues(): Promise<boolean> {
  const priorityLeagues = [39, 140, 135, 61, 78, 88]; // Top 6 ligas europeas
  return loadSpecificLeagues(priorityLeagues);
}

// Cargar ligas específicas
export async function loadSpecificLeagues(leagueIds: number[]): Promise<boolean> {
  const availableLeagues = leagueIds.filter(id => AVAILABLE_LOCAL_LEAGUES.includes(id));
  
  if (availableLeagues.length === 0) {
    console.warn('[LocalData] No available leagues in request');
    return false;
  }
  
  updateProgress({
    isLoading: true,
    progress: 0,
    loadedLeagues: 0,
    totalLeagues: availableLeagues.length,
    error: null,
  });
  
  try {
    const response = await fetch('/api/local-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagues: availableLeagues }),
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
      loadedLeagues: availableLeagues.length,
      totalLeagues: availableLeagues.length,
    });
    
    return true;
    
  } catch (error) {
    console.error('[LocalData] Error loading specific leagues:', error);
    updateProgress({
      isLoading: false,
      error: String(error),
    });
    return false;
  }
}

// Cargar datos de forma lazy (solo cuando se necesiten)
export async function loadLeaguesLazy(leagueIds: number[]): Promise<boolean> {
  // Filtrar solo las que no están cargadas
  const needsLoad = leagueIds.filter(id => {
    // Verificar si ya tenemos datos de esta liga
    const existingMatches = historicalData.getLeagueMatches(id);
    return existingMatches.length === 0 && AVAILABLE_LOCAL_LEAGUES.includes(id);
  });
  
  if (needsLoad.length === 0) {
    return true; // Todas ya están cargadas
  }
  
  return loadSpecificLeagues(needsLoad);
}

// Verificar si los datos locales están disponibles
export function isLocalDataAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('local_data_loaded') === 'true';
}

// Obtener resumen de datos cargados
export function getLocalDataSummary(): {
  totalMatches: number;
  totalLeagues: number;
  totalTeams: number;
  seasons: number[];
} | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('local_data_summary');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// Limpiar datos locales (forzar recarga)
export function clearLocalDataCache(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('local_data_loaded');
  localStorage.removeItem('local_data_timestamp');
  localStorage.removeItem('local_data_summary');
  
  // Resetear estado
  loadState = {
    isLoading: false,
    progress: 0,
    loadedLeagues: 0,
    totalLeagues: 0,
    error: null,
  };
}

// Obtener estado actual
export function getLoadState(): LoadState {
  return { ...loadState };
}

// Precargar datos en segundo plano
export function preloadLocalData(): void {
  if (typeof window === 'undefined') return;
  
  // No bloquear, cargar en background
  setTimeout(() => {
    if (!historicalData.isDataLoaded() && !loadState.isLoading) {
      loadAllLocalData().then(success => {
        if (success) {
          console.log('[LocalData] Background preload complete');
        }
      });
    }
  }, 2000); // Esperar 2 segundos después de cargar la página
}
