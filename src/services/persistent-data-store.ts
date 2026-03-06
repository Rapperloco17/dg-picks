// Persistent Data Store
// Guarda datos en localStorage para persistencia entre sesiones

import { HistoricalMatch } from './historical-data-store';

const STORAGE_KEY = 'dg_picks_enriched_data';
const STORAGE_META_KEY = 'dg_picks_data_meta';
const MAX_STORAGE_MB = 10; // Límite de localStorage (~5-10MB)

interface StoredData {
  matches: HistoricalMatch[];
  timestamp: number;
  version: string;
}

interface StorageMeta {
  lastLoaded: number;
  totalMatches: number;
  seasons: number[];
  leagues: number[];
}

/**
 * Guarda datos en localStorage
 */
export function saveDataToStorage(matches: HistoricalMatch[]): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Verificar tamaño aproximado
    const dataSize = JSON.stringify(matches).length / 1024 / 1024;
    console.log(`[PersistentStore] Data size: ${dataSize.toFixed(2)} MB`);
    
    if (dataSize > MAX_STORAGE_MB) {
      console.warn(`[PersistentStore] Data too large (${dataSize.toFixed(2)}MB), skipping localStorage`);
      return false;
    }
    
    const storageData: StoredData = {
      matches,
      timestamp: Date.now(),
      version: '1.0',
    };
    
    // Guardar en chunks si es necesario
    const dataString = JSON.stringify(storageData);
    localStorage.setItem(STORAGE_KEY, dataString);
    
    // Guardar metadata
    const leagues = new Set(matches.map(m => m.league.id));
    const seasons = new Set(matches.map(m => m.league.season));
    
    const meta: StorageMeta = {
      lastLoaded: Date.now(),
      totalMatches: matches.length,
      seasons: Array.from(seasons),
      leagues: Array.from(leagues),
    };
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
    
    console.log(`[PersistentStore] Saved ${matches.length} matches to localStorage`);
    return true;
    
  } catch (error) {
    console.error('[PersistentStore] Error saving data:', error);
    // Limpiar si hay error (probablemente quota exceeded)
    clearStoredData();
    return false;
  }
}

/**
 * Carga datos desde localStorage
 */
export function loadDataFromStorage(): HistoricalMatch[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const dataString = localStorage.getItem(STORAGE_KEY);
    if (!dataString) return null;
    
    const storageData: StoredData = JSON.parse(dataString);
    
    // Verificar versión
    if (storageData.version !== '1.0') {
      console.warn('[PersistentStore] Data version mismatch, clearing');
      clearStoredData();
      return null;
    }
    
    console.log(`[PersistentStore] Loaded ${storageData.matches.length} matches from localStorage`);
    return storageData.matches;
    
  } catch (error) {
    console.error('[PersistentStore] Error loading data:', error);
    return null;
  }
}

/**
 * Obtiene metadata de los datos guardados
 */
export function getStorageMeta(): StorageMeta | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const metaString = localStorage.getItem(STORAGE_META_KEY);
    if (!metaString) return null;
    
    return JSON.parse(metaString);
  } catch {
    return null;
  }
}

/**
 * Limpia datos guardados
 */
export function clearStoredData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_META_KEY);
  console.log('[PersistentStore] Data cleared');
}

/**
 * Verifica si hay datos válidos en storage
 */
export function hasValidStoredData(): boolean {
  if (typeof window === 'undefined') return false;
  
  const meta = getStorageMeta();
  if (!meta) return false;
  
  // Datos válidos por 7 días
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const age = Date.now() - meta.lastLoaded;
  
  return age < maxAge;
}

/**
 * Obtiene información de los datos guardados
 */
export function getStoredDataInfo(): {
  hasData: boolean;
  totalMatches: number;
  lastLoaded: string;
  age: string;
  seasons: number[];
} {
  const meta = getStorageMeta();
  
  if (!meta) {
    return {
      hasData: false,
      totalMatches: 0,
      lastLoaded: 'Nunca',
      age: '-',
      seasons: [],
    };
  }
  
  const age = Date.now() - meta.lastLoaded;
  const ageDays = Math.floor(age / (1000 * 60 * 60 * 24));
  const ageHours = Math.floor((age % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return {
    hasData: true,
    totalMatches: meta.totalMatches,
    lastLoaded: new Date(meta.lastLoaded).toLocaleString(),
    age: ageDays > 0 ? `${ageDays}d ${ageHours}h` : `${ageHours}h`,
    seasons: meta.seasons,
  };
}
