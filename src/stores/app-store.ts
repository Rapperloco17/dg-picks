import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FilterState, ViewMode, Continent, UserSettings } from '@/types';

interface AppState {
  // Filters
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  
  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Settings
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  
  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // API Monitoring
  apiCallsToday: number;
  incrementApiCalls: () => void;
  resetApiCalls: () => void;
}

const defaultFilters: FilterState = {
  view: 'TODAY',
  continent: 'ALL',
  country: 'ALL',
  league: 'ALL',
  minProbability: 0,
  maxProbability: 100,
  searchQuery: '',
};

const defaultSettings: UserSettings = {
  oddsFormat: 'decimal',
  theme: 'dark',
  notifications: true,
  defaultStake: 10,
  kellyFraction: 0.25,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Filters
      filters: defaultFilters,
      setFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value }
      })),
      resetFilters: () => set({ filters: defaultFilters }),
      
      // View
      viewMode: 'TODAY',
      setViewMode: (mode) => set({ viewMode: mode }),
      
      // Settings
      settings: defaultSettings,
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      // UI State
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      // API Monitoring
      apiCallsToday: 0,
      incrementApiCalls: () => set((state) => ({
        apiCallsToday: state.apiCallsToday + 1
      })),
      resetApiCalls: () => set({ apiCallsToday: 0 }),
    }),
    {
      name: 'dg-picks-storage',
      partialize: (state) => ({
        filters: state.filters,
        settings: state.settings,
        viewMode: state.viewMode,
      }),
    }
  )
);
