// Local cache service for match statistics
// Caches data in localStorage with 30-minute TTL

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
const CACHE_PREFIX = 'dg_picks_cache_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Generate cache key
function getCacheKey(type: string, id: string | number): string {
  return `${CACHE_PREFIX}${type}_${id}`;
}

// Check if running on client
function isClient(): boolean {
  return typeof window !== 'undefined';
}

// Set cache entry
export function setCache<T>(type: string, id: string | number, data: T, ttl: number = CACHE_TTL): void {
  if (!isClient()) return;
  
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    localStorage.setItem(getCacheKey(type, id), JSON.stringify(entry));
  } catch (error) {
    console.error('[Cache] Error setting cache:', error);
  }
}

// Get cache entry
export function getCache<T>(type: string, id: string | number): T | null {
  if (!isClient()) return null;
  
  try {
    const key = getCacheKey(type, id);
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    const entry: CacheEntry<T> = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('[Cache] Error getting cache:', error);
    return null;
  }
}

// Check if cache exists and is valid
export function hasCache(type: string, id: string | number): boolean {
  if (!isClient()) return false;
  
  try {
    const key = getCacheKey(type, id);
    const stored = localStorage.getItem(key);
    
    if (!stored) return false;
    
    const entry: CacheEntry<unknown> = JSON.parse(stored);
    return Date.now() <= entry.expiresAt;
  } catch {
    return false;
  }
}

// Clear specific cache
export function clearCache(type: string, id: string | number): void {
  if (!isClient()) return;
  
  try {
    localStorage.removeItem(getCacheKey(type, id));
  } catch (error) {
    console.error('[Cache] Error clearing cache:', error);
  }
}

// Clear all caches
export function clearAllCaches(): void {
  if (!isClient()) return;
  
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('[Cache] Error clearing all caches:', error);
  }
}

// Get cache age in minutes
export function getCacheAge(type: string, id: string | number): number | null {
  if (!isClient()) return null;
  
  try {
    const stored = localStorage.getItem(getCacheKey(type, id));
    if (!stored) return null;
    
    const entry: CacheEntry<unknown> = JSON.parse(stored);
    return Math.floor((Date.now() - entry.timestamp) / 60000);
  } catch {
    return null;
  }
}

// Cache types for match stats
export const CACHE_TYPES = {
  MATCH_STATS: 'match_stats',
  TEAM_FORM: 'team_form',
  TEAM_STATS: 'team_stats',
  H2H: 'h2h',
  ODDS: 'odds',
  LEAGUE_TABLE: 'league_table',
} as const;
