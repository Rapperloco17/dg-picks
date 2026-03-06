import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseInitialized, getPicksRef } from '@/lib/firebase';
import { useAuthStore } from './auth-store';
import { Pick, PickStatus, MarketType, ConfidenceLevel } from '@/types';

// Helper to sanitize data for Firestore (remove undefined values)
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as unknown as T;
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue; // Skip undefined values
    }
    if (typeof value === 'object') {
      sanitized[key] = sanitizeForFirestore(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

interface PicksState {
  picks: Pick[];
  isLoading: boolean;
  lastSync: Date | null;
  
  // Actions
  addPick: (pick: Omit<Pick, 'id' | 'createdAt' | 'result' | 'profit' | 'settledAt'>) => Promise<string>;
  updatePick: (id: string, updates: Partial<Pick>) => Promise<void>;
  deletePick: (id: string) => Promise<void>;
  settlePick: (id: string, result: PickStatus, profit?: number) => Promise<void>;
  duplicatePick: (id: string) => Promise<string | null>;
  loadPicks: () => Promise<void>;
  syncPicks: () => Promise<void>;
  
  // Queries
  getPickById: (id: string) => Pick | undefined;
  getPicksByDate: (date: string) => Pick[];
  getPicksByStatus: (status: PickStatus) => Pick[];
  getPicksByMatch: (matchId: number) => Pick[];
  
  // Stats
  getStats: () => {
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    pendingPicks: number;
    winRate: number;
    totalProfit: number;
    roi: number;
    streak: number;
  };
}

const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to check if we should use Firestore
const shouldUseFirestore = () => {
  return isFirebaseInitialized() && useAuthStore.getState().isAuthenticated;
};

export const usePicksStore = create<PicksState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        picks: [],
        isLoading: false,
        lastSync: null,
        
        addPick: async (pickData) => {
          const id = generateId();
          const newPick: Pick = {
            ...pickData,
            id,
            result: 'PENDING',
            profit: null,
            createdAt: new Date().toISOString(),
            settledAt: null,
          };
          
          // Update local state
          set((state) => ({
            picks: [newPick, ...state.picks]
          }));
          
          // Sync to Firestore if authenticated
          if (shouldUseFirestore()) {
            try {
              const userId = useAuthStore.getState().user!.uid;
              const pickRef = doc(getPicksRef(userId), id);
              const sanitizedPick = sanitizeForFirestore({
                ...newPick,
                createdAt: Timestamp.now(),
              });
              await setDoc(pickRef, sanitizedPick);
            } catch (error) {
              console.error('Error syncing pick to Firestore:', error);
            }
          }
          
          return id;
        },
        
        updatePick: async (id, updates) => {
          set((state) => ({
            picks: state.picks.map((pick) =>
              pick.id === id ? { ...pick, ...updates } : pick
            )
          }));
          
          if (shouldUseFirestore()) {
            try {
              const userId = useAuthStore.getState().user!.uid;
              const pickRef = doc(getPicksRef(userId), id);
              const sanitizedUpdates = sanitizeForFirestore(updates);
              await setDoc(pickRef, sanitizedUpdates, { merge: true });
            } catch (error) {
              console.error('Error updating pick:', error);
            }
          }
        },
        
        deletePick: async (id) => {
          set((state) => ({
            picks: state.picks.filter((pick) => pick.id !== id)
          }));
          
          if (shouldUseFirestore()) {
            try {
              const userId = useAuthStore.getState().user!.uid;
              await deleteDoc(doc(getPicksRef(userId), id));
            } catch (error) {
              console.error('Error deleting pick:', error);
            }
          }
        },
        
        settlePick: async (id, result, profit) => {
          const pick = get().picks.find(p => p.id === id);
          if (!pick) return;

          const calculatedProfit = profit !== undefined ? profit : 
            result === 'WON' ? pick.odds * pick.stake - pick.stake : 
            result === 'LOST' ? -pick.stake : 
            0;

          const updates = {
            result,
            profit: calculatedProfit,
            settledAt: new Date().toISOString(),
          };
          
          set((state) => ({
            picks: state.picks.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            )
          }));
          
          if (shouldUseFirestore()) {
            try {
              const userId = useAuthStore.getState().user!.uid;
              const pickRef = doc(getPicksRef(userId), id);
              const sanitizedUpdates = sanitizeForFirestore({
                ...updates,
                settledAt: Timestamp.now(),
              });
              await setDoc(pickRef, sanitizedUpdates, { merge: true });
            } catch (error) {
              console.error('Error settling pick:', error);
            }
          }
        },
        
        duplicatePick: async (id) => {
          const pick = get().picks.find((p) => p.id === id);
          if (!pick) return null;
          
          const { id: _, createdAt, result, profit, settledAt, ...pickData } = pick;
          return get().addPick(pickData);
        },
        
        loadPicks: async () => {
          if (!shouldUseFirestore()) return;
          
          set({ isLoading: true });
          
          try {
            const userId = useAuthStore.getState().user!.uid;
            const picksQuery = query(
              getPicksRef(userId),
              orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(picksQuery);
            const picks: Pick[] = [];
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              picks.push({
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                settledAt: data.settledAt?.toDate?.()?.toISOString() || data.settledAt,
              } as Pick);
            });
            
            set({ picks, lastSync: new Date(), isLoading: false });
          } catch (error) {
            console.error('Error loading picks:', error);
            set({ isLoading: false });
          }
        },
        
        syncPicks: async () => {
          const localPicks = get().picks;
          if (!shouldUseFirestore() || localPicks.length === 0) return;
          
          try {
            const userId = useAuthStore.getState().user!.uid;
            const batch = writeBatch(db!);
            
            localPicks.forEach((pick) => {
              const pickRef = doc(getPicksRef(userId), pick.id);
              batch.set(pickRef, {
                ...pick,
                createdAt: Timestamp.fromDate(new Date(pick.createdAt)),
                settledAt: pick.settledAt ? Timestamp.fromDate(new Date(pick.settledAt)) : null,
              }, { merge: true });
            });
            
            await batch.commit();
            set({ lastSync: new Date() });
          } catch (error) {
            console.error('Error syncing picks:', error);
          }
        },
        
        getPickById: (id) => {
          return get().picks.find((pick) => pick.id === id);
        },
        
        getPicksByDate: (date) => {
          return get().picks.filter((pick) => 
            pick.matchDate.startsWith(date)
          );
        },
        
        getPicksByStatus: (status) => {
          return get().picks.filter((pick) => pick.result === status);
        },
        
        getPicksByMatch: (matchId) => {
          return get().picks.filter((pick) => pick.matchId === matchId);
        },
        
        getStats: () => {
          const picks = get().picks;
          const settledPicks = picks.filter(p => p.result !== 'PENDING' && p.result !== 'CANCELLED');
          const wonPicks = settledPicks.filter(p => p.result === 'WON');
          const lostPicks = settledPicks.filter(p => p.result === 'LOST');
          
          const totalStake = settledPicks.reduce((sum, p) => sum + p.stake, 0);
          const totalProfit = settledPicks.reduce((sum, p) => sum + (p.profit || 0), 0);
          
          // Calculate streak
          let streak = 0;
          const sortedPicks = [...settledPicks].sort((a, b) => 
            new Date(b.settledAt || b.createdAt).getTime() - new Date(a.settledAt || a.createdAt).getTime()
          );
          
          for (const pick of sortedPicks) {
            if (pick.result === 'WON') {
              streak++;
            } else if (pick.result === 'LOST') {
              break;
            }
          }
          
          return {
            totalPicks: picks.length,
            wonPicks: wonPicks.length,
            lostPicks: lostPicks.length,
            pendingPicks: picks.filter(p => p.result === 'PENDING').length,
            winRate: settledPicks.length > 0 ? (wonPicks.length / settledPicks.length) * 100 : 0,
            totalProfit,
            roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
            streak,
          };
        },
      }),
      {
        name: 'dg-picks-picks-storage',
        partialize: (state) => ({ 
          picks: state.picks,
        }),
      }
    )
  )
);

// Subscribe to auth changes to load/save picks
if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state) => {
    if (state.isAuthenticated && state.user) {
      // Load picks from Firestore when user logs in
      usePicksStore.getState().loadPicks();
    }
  });
}
