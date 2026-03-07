import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseInitialized } from '@/lib/firebase';
import { Match } from '@/types';

const CACHE_COLLECTION = 'matches_cache';
const CACHE_DURATION_MS = {
  fixtures: 15 * 60 * 1000,       // 15 minutes
  live: 30 * 1000,                // 30 seconds (faster updates for live matches)
  statistics: 24 * 60 * 60 * 1000, // 24 hours
  h2h: 7 * 24 * 60 * 60 * 1000,   // 7 days
  standings: 6 * 60 * 60 * 1000,  // 6 hours
  predictions: 24 * 60 * 60 * 1000, // 24 hours
};

interface CacheEntry {
  id: string;
  data: any;
  type: 'fixtures' | 'live' | 'statistics' | 'h2h' | 'standings' | 'predictions';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  metadata?: {
    date?: string;
    leagueId?: number;
    teamId?: number;
    fixtureId?: number;
  };
}

// Generate cache key
function generateCacheKey(type: string, params: Record<string, any>): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}_${v}`)
    .join('_');
  return `${type}_${sortedParams}`;
}

// Sanitize params for Firebase (remove null/undefined values)
function sanitizeParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Get cached data
export async function getCachedData<T>(
  type: CacheEntry['type'], 
  params: Record<string, any>
): Promise<T | null> {
  if (!isFirebaseInitialized()) return null;

  const cacheKey = generateCacheKey(type, params);
  const cacheRef = doc(db!, CACHE_COLLECTION, cacheKey);

  try {
    const docSnap = await getDoc(cacheRef);
    
    if (!docSnap.exists()) return null;

    const entry = docSnap.data() as CacheEntry;
    const now = Timestamp.now();

    // Check if expired
    if (entry.expiresAt.seconds < now.seconds) {
      // Delete expired entry
      await deleteDoc(cacheRef);
      return null;
    }

    return entry.data as T;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

// Set cached data
export async function setCachedData<T>(
  type: CacheEntry['type'],
  params: Record<string, any>,
  data: T,
  customDurationMs?: number
): Promise<void> {
  if (!isFirebaseInitialized()) return;

  const cacheKey = generateCacheKey(type, params);
  const cacheRef = doc(db!, CACHE_COLLECTION, cacheKey);

  const duration = customDurationMs || CACHE_DURATION_MS[type];
  const now = Timestamp.now();
  const expiresAt = new Timestamp(
    now.seconds + Math.floor(duration / 1000),
    now.nanoseconds
  );

  const entry: Omit<CacheEntry, 'id'> = {
    data,
    type,
    createdAt: now,
    expiresAt,
    metadata: sanitizeParams(params),
  };

  try {
    await setDoc(cacheRef, entry);
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

// Cache fixtures by date
export async function cacheFixtures(date: string, leagueIds: number[], matches: Match[]): Promise<void> {
  await setCachedData('fixtures', { date, leagues: leagueIds.join(',') }, matches, CACHE_DURATION_MS.fixtures);
}

// Get cached fixtures
export async function getCachedFixtures(date: string, leagueIds: number[]): Promise<Match[] | null> {
  return getCachedData<Match[]>('fixtures', { date, leagues: leagueIds.join(',') });
}

// Cache live fixtures
export async function cacheLiveFixtures(leagueIds: number[], matches: Match[]): Promise<void> {
  await setCachedData('live', { leagues: leagueIds.join(','), timestamp: Date.now() }, matches, CACHE_DURATION_MS.live);
}

// Get cached live fixtures
export async function getCachedLiveFixtures(leagueIds: number[]): Promise<Match[] | null> {
  return getCachedData<Match[]>('live', { leagues: leagueIds.join(','), timestamp: Date.now() });
}

// Cache H2H data
export async function cacheH2H(homeTeamId: number, awayTeamId: number, matches: Match[]): Promise<void> {
  await setCachedData('h2h', { homeTeamId, awayTeamId }, matches, CACHE_DURATION_MS.h2h);
}

// Get cached H2H
export async function getCachedH2H(homeTeamId: number, awayTeamId: number): Promise<Match[] | null> {
  return getCachedData<Match[]>('h2h', { homeTeamId, awayTeamId });
}

// Clear expired cache entries
export async function clearExpiredCache(): Promise<number> {
  if (!isFirebaseInitialized()) return 0;

  const cacheRef = collection(db!, CACHE_COLLECTION);
  const now = Timestamp.now();
  
  const q = query(cacheRef, where('expiresAt', '<', now));
  
  try {
    const snapshot = await getDocs(q);
    const batch = writeBatch(db!);
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.docs.length;
  } catch (error) {
    console.error('Error clearing expired cache:', error);
    return 0;
  }
}

// Get cache stats
export async function getCacheStats(): Promise<{
  totalEntries: number;
  byType: Record<string, number>;
}> {
  if (!isFirebaseInitialized()) {
    return { totalEntries: 0, byType: {} };
  }

  const cacheRef = collection(db!, CACHE_COLLECTION);
  
  try {
    const snapshot = await getDocs(cacheRef);
    const byType: Record<string, number> = {};
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as CacheEntry;
      byType[data.type] = (byType[data.type] || 0) + 1;
    });
    
    return {
      totalEntries: snapshot.docs.length,
      byType,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalEntries: 0, byType: {} };
  }
}

export { CACHE_DURATION_MS };
