'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadAllLocalData, loadPriorityLeagues, subscribeToLoadProgress, getLoadState, isLocalDataAvailable } from './local-data-loader';
import { historicalData } from './historical-data-store';

interface LocalDataContextType {
  isLoading: boolean;
  isLoaded: boolean;
  progress: number;
  loadedLeagues: number;
  totalLeagues: number;
  error: string | null;
  summary: {
    totalMatches: number;
    totalLeagues: number;
    totalTeams: number;
    seasons: number[];
  } | null;
  loadData: () => Promise<void>;
  loadPriority: () => Promise<void>;
}

const LocalDataContext = createContext<LocalDataContextType | undefined>(undefined);

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    isLoading: false,
    isLoaded: false,
    progress: 0,
    loadedLeagues: 0,
    totalLeagues: 0,
    error: null as string | null,
    summary: null as {
      totalMatches: number;
      totalLeagues: number;
      totalTeams: number;
      seasons: number[];
    } | null,
  });

  // Suscribirse a progreso de carga
  useEffect(() => {
    const unsubscribe = subscribeToLoadProgress((loadState) => {
      setState(prev => ({
        ...prev,
        isLoading: loadState.isLoading,
        progress: loadState.progress,
        loadedLeagues: loadState.loadedLeagues,
        totalLeagues: loadState.totalLeagues,
        error: loadState.error,
      }));
    });

    return unsubscribe;
  }, []);

  // Verificar si ya hay datos cargados
  useEffect(() => {
    if (historicalData.isDataLoaded()) {
      setState(prev => ({
        ...prev,
        isLoaded: true,
        progress: 100,
        summary: historicalData.getSummary(),
      }));
    }
  }, []);

  // Cargar todos los datos
  const loadData = useCallback(async () => {
    if (state.isLoading || state.isLoaded) return;
    
    const success = await loadAllLocalData();
    
    if (success) {
      setState(prev => ({
        ...prev,
        isLoaded: true,
        summary: historicalData.getSummary(),
      }));
    }
  }, [state.isLoading, state.isLoaded]);

  // Cargar solo ligas prioritarias (más rápido)
  const loadPriority = useCallback(async () => {
    if (state.isLoading) return;
    
    const success = await loadPriorityLeagues();
    
    if (success) {
      setState(prev => ({
        ...prev,
        isLoaded: historicalData.isDataLoaded(),
        summary: historicalData.getSummary(),
      }));
    }
  }, [state.isLoading]);

  // Auto-cargar datos si están disponibles en localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Si ya se cargaron previamente, recargar automáticamente
    if (isLocalDataAvailable() && !historicalData.isDataLoaded() && !state.isLoading) {
      console.log('[LocalDataProvider] Auto-loading previously loaded data...');
      loadData();
    }
  }, [loadData, state.isLoading]);

  return (
    <LocalDataContext.Provider
      value={{
        isLoading: state.isLoading,
        isLoaded: state.isLoaded,
        progress: state.progress,
        loadedLeagues: state.loadedLeagues,
        totalLeagues: state.totalLeagues,
        error: state.error,
        summary: state.summary,
        loadData,
        loadPriority,
      }}
    >
      {children}
    </LocalDataContext.Provider>
  );
}

export function useLocalData() {
  const context = useContext(LocalDataContext);
  if (context === undefined) {
    throw new Error('useLocalData must be used within a LocalDataProvider');
  }
  return context;
}

// Hook para saber si debemos mostrar indicador de carga
export function useLocalDataLoading() {
  const { isLoading, progress } = useLocalData();
  return { isLoading, progress };
}

// Hook para saber si los datos están listos
export function useLocalDataReady() {
  const { isLoaded, summary } = useLocalData();
  return { isLoaded, summary };
}
