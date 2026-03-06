import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  deleteDoc,
  updateDoc,
  writeBatch,
  DocumentData
} from 'firebase/firestore';
import { db, isFirebaseInitialized } from './firebase';
import { Pick, PickStatus, MarketType } from '@/types';

// ==================== HELPERS ====================

/**
 * Sanitize data for Firebase (remove undefined values, convert null to safe defaults)
 * Firebase rejects documents with undefined values or empty fields
 */
function sanitizeForFirebase<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirebase) as unknown as T;
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Skip undefined values completely
      continue;
    }
    if (value === null) {
      // Keep null for explicit null fields, or convert to safe default for numbers
      sanitized[key] = null;
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForFirebase(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ==================== PICKS ====================

export async function savePickToFirebase(pick: Pick): Promise<void> {
  if (!isFirebaseInitialized() || !db) {
    throw new Error('Firebase not initialized');
  }
  
  const pickRef = doc(db!, 'picks', pick.id);
  const sanitizedPick = sanitizeForFirebase({
    ...pick,
    createdAt: Timestamp.fromDate(new Date(pick.createdAt)),
    settledAt: pick.settledAt ? Timestamp.fromDate(new Date(pick.settledAt)) : null,
    updatedAt: Timestamp.now(),
  });
  await setDoc(pickRef, sanitizedPick);
}

export async function updatePickInFirebase(pickId: string, updates: Partial<Pick>): Promise<void> {
  if (!isFirebaseInitialized() || !db) {
    throw new Error('Firebase not initialized');
  }
  
  const pickRef = doc(db!, 'picks', pickId);
  await updateDoc(pickRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deletePickFromFirebase(pickId: string): Promise<void> {
  if (!isFirebaseInitialized() || !db) {
    throw new Error('Firebase not initialized');
  }
  
  const pickRef = doc(db!, 'picks', pickId);
  await deleteDoc(pickRef);
}

export async function getPicksFromFirebase(userId?: string): Promise<Pick[]> {
  if (!isFirebaseInitialized() || !db) {
    return [];
  }
  
  let q = query(
    collection(db, 'picks'),
    orderBy('createdAt', 'desc')
  );
  
  if (userId) {
    q = query(q, where('userId', '==', userId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      settledAt: data.settledAt?.toDate?.()?.toISOString() || data.settledAt,
    } as Pick;
  });
}

// ==================== MATCHES CACHE ====================

export async function cacheMatchesInFirebase(date: string, matches: any[]): Promise<void> {
  if (!isFirebaseInitialized() || !db) {
    return;
  }
  
  const cacheRef = doc(db!, 'matches_cache', date);
  const sanitizedMatches = matches.map(m => sanitizeForFirebase(m));
  await setDoc(cacheRef, {
    date,
    matches: sanitizedMatches,
    cachedAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)), // 30 min
  });
}

export async function getCachedMatchesFromFirebase(date: string): Promise<any[] | null> {
  if (!isFirebaseInitialized() || !db) {
    return null;
  }
  
  const cacheRef = doc(db!, 'matches_cache', date);
  const snapshot = await getDoc(cacheRef);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  const expiresAt = data.expiresAt?.toDate?.();
  
  if (expiresAt && expiresAt < new Date()) {
    // Cache expired
    return null;
  }
  
  return data.matches || null;
}

// ==================== STATISTICS ====================

export interface PickStatistics {
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  pendingPicks: number;
  voidPicks: number;
  winRate: number;
  totalProfit: number;
  roi: number;
  avgOdds: number;
  byMarket: Record<MarketType, {
    picks: number;
    wins: number;
    profit: number;
  }>;
  byLeague: Record<number, {
    picks: number;
    wins: number;
    profit: number;
  }>;
  monthlyStats: Array<{
    month: string;
    picks: number;
    wins: number;
    profit: number;
  }>;
  bankrollHistory: Array<{
    date: string;
    bankroll: number;
  }>;
}

export async function calculatePickStatistics(userId?: string): Promise<PickStatistics> {
  const picks = await getPicksFromFirebase(userId);
  
  const settledPicks = picks.filter(p => p.result !== 'PENDING');
  const wonPicks = picks.filter(p => p.result === 'WON');
  const lostPicks = picks.filter(p => p.result === 'LOST');
  const voidPicks = picks.filter(p => p.result === 'VOID');
  
  const totalProfit = settledPicks.reduce((sum, p) => sum + (p.profit || 0), 0);
  const totalStake = settledPicks.reduce((sum, p) => sum + p.stake, 0);
  const avgOdds = settledPicks.length > 0 
    ? settledPicks.reduce((sum, p) => sum + p.odds, 0) / settledPicks.length 
    : 0;
  
  // By market
  const byMarket: PickStatistics['byMarket'] = {} as any;
  settledPicks.forEach(pick => {
    if (!byMarket[pick.market]) {
      byMarket[pick.market] = { picks: 0, wins: 0, profit: 0 };
    }
    byMarket[pick.market].picks++;
    if (pick.result === 'WON') {
      byMarket[pick.market].wins++;
    }
    byMarket[pick.market].profit += pick.profit || 0;
  });
  
  // By league
  const byLeague: PickStatistics['byLeague'] = {};
  settledPicks.forEach(pick => {
    if (!byLeague[pick.leagueId]) {
      byLeague[pick.leagueId] = { picks: 0, wins: 0, profit: 0 };
    }
    byLeague[pick.leagueId].picks++;
    if (pick.result === 'WON') {
      byLeague[pick.leagueId].wins++;
    }
    byLeague[pick.leagueId].profit += pick.profit || 0;
  });
  
  // Monthly stats
  const monthlyMap = new Map<string, { picks: number; wins: number; profit: number }>();
  settledPicks.forEach(pick => {
    const month = pick.createdAt.substring(0, 7); // YYYY-MM
    const current = monthlyMap.get(month) || { picks: 0, wins: 0, profit: 0 };
    current.picks++;
    if (pick.result === 'WON') current.wins++;
    current.profit += pick.profit || 0;
    monthlyMap.set(month, current);
  });
  
  const monthlyStats = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stats]) => ({ month, ...stats }));
  
  // Bankroll history
  let runningBankroll = 100; // Starting bankroll
  const bankrollHistory: Array<{ date: string; bankroll: number }> = [];
  
  settledPicks
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach(pick => {
      runningBankroll += pick.profit || 0;
      bankrollHistory.push({
        date: pick.createdAt.split('T')[0],
        bankroll: runningBankroll,
      });
    });
  
  return {
    totalPicks: picks.length,
    wonPicks: wonPicks.length,
    lostPicks: lostPicks.length,
    pendingPicks: picks.filter(p => p.result === 'PENDING').length,
    voidPicks: voidPicks.length,
    winRate: settledPicks.length > 0 ? (wonPicks.length / settledPicks.length) * 100 : 0,
    totalProfit,
    roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
    avgOdds,
    byMarket,
    byLeague,
    monthlyStats,
    bankrollHistory,
  };
}

// ==================== SYNC SERVICE ====================

export async function syncPicksToFirebase(picks: Pick[]): Promise<void> {
  if (!isFirebaseInitialized() || !db) {
    console.log('[Firebase] Not initialized, skipping sync');
    return;
  }
  
  const batch = writeBatch(db);
  
  picks.forEach(pick => {
    const pickRef = doc(db!, 'picks', pick.id);
    batch.set(pickRef, {
      ...pick,
      createdAt: Timestamp.fromDate(new Date(pick.createdAt)),
      settledAt: pick.settledAt ? Timestamp.fromDate(new Date(pick.settledAt)) : null,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  });
  
  await batch.commit();
  console.log(`[Firebase] Synced ${picks.length} picks`);
}

export async function importPicksFromFirebase(userId: string): Promise<Pick[]> {
  if (!isFirebaseInitialized() || !db) {
    console.log('[Firebase] Not initialized, returning empty');
    return [];
  }
  
  const picks = await getPicksFromFirebase(userId);
  console.log(`[Firebase] Imported ${picks.length} picks`);
  return picks;
}
