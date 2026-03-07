import useSWR from 'swr';
import { Match } from '@/types';
import { 
  getFixturesByDate, 
  getLiveFixtures, 
  getTodayDate, 
  getTomorrowDate, 
  getWeekendDates, 
  getWeekDates,
  getCurrentSeason 
} from '@/services/api-football';
import { getTier1LeagueIds, getTier2LeagueIds, getTier3LeagueIds, getAllLeagueIds } from '@/constants/leagues';
import { useAppStore } from '@/stores/app-store';

// Custom fetcher that tracks API calls
const createFetcher = (incrementApiCalls: () => void) => async <T>(fetchFn: () => Promise<T>): Promise<T> => {
  incrementApiCalls();
  return fetchFn();
};

// Hook for matches by date
export function useMatchesByDate(date: string, tier: 1 | 2 | 3 | 'all' = 'all') {
  const { incrementApiCalls } = useAppStore();
  
  const leagueIds = tier === 1 
    ? getTier1LeagueIds() 
    : tier === 2 
      ? [...getTier1LeagueIds(), ...getTier2LeagueIds()]
      : tier === 3
        ? [...getTier1LeagueIds(), ...getTier2LeagueIds(), ...getTier3LeagueIds()]
        : getAllLeagueIds();
  
  const fetcher = createFetcher(incrementApiCalls);
  
  const { data, error, isLoading, mutate } = useSWR<Match[]>(
    ['matches', date, tier],
    () => fetcher(() => getFixturesByDate(date, leagueIds)),
    {
      refreshInterval: 900000, // 15 minutes
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );
  
  return {
    matches: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// Hook for today's matches
export function useTodayMatches(tier: 1 | 2 | 3 | 'all' = 'all') {
  const today = getTodayDate();
  return useMatchesByDate(today, tier);
}

// Hook for tomorrow's matches
export function useTomorrowMatches(tier: 1 | 2 | 3 | 'all' = 'all') {
  const tomorrow = getTomorrowDate();
  return useMatchesByDate(tomorrow, tier);
}

// Hook for live matches
export function useLiveMatches(tier: 1 | 2 | 3 | 'all' = 'all') {
  const { incrementApiCalls } = useAppStore();
  const fetcher = createFetcher(incrementApiCalls);
  
  const leagueIds = tier === 1 
    ? getTier1LeagueIds() 
    : tier === 2 
      ? [...getTier1LeagueIds(), ...getTier2LeagueIds()]
      : tier === 3
        ? [...getTier1LeagueIds(), ...getTier2LeagueIds(), ...getTier3LeagueIds()]
        : getAllLeagueIds();
  
  const { data, error, isLoading, mutate, dataUpdatedAt } = useSWR<Match[]>(
    ['live-matches', tier],
    () => fetcher(() => getLiveFixtures(leagueIds)),
    {
      refreshInterval: 30000, // 30 seconds for live matches (more frequent updates)
      revalidateOnFocus: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );
  
  return {
    matches: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
    lastUpdated: dataUpdatedAt,
  };
}

// Hook for weekend matches
export function useWeekendMatches(tier: 1 | 2 | 3 | 'all' = 'all') {
  const { incrementApiCalls } = useAppStore();
  const { from } = getWeekendDates();
  
  const leagueIds = tier === 1 
    ? getTier1LeagueIds() 
    : tier === 2 
      ? [...getTier1LeagueIds(), ...getTier2LeagueIds()]
      : tier === 3
        ? [...getTier1LeagueIds(), ...getTier2LeagueIds(), ...getTier3LeagueIds()]
        : getAllLeagueIds();
  
  const fetcher = createFetcher(incrementApiCalls);
  
  const { data, error, isLoading, mutate } = useSWR<Match[]>(
    ['weekend-matches', from, tier],
    () => fetcher(() => getFixturesByDate(from, leagueIds)),
    {
      refreshInterval: 1800000, // 30 minutes
      revalidateOnFocus: false,
    }
  );
  
  return {
    matches: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// Hook for week matches
export function useWeekMatches(tier: 1 | 2 | 3 | 'all' = 1) {
  const { incrementApiCalls } = useAppStore();
  const { from } = getWeekDates();
  
  const leagueIds = tier === 1 
    ? getTier1LeagueIds() 
    : tier === 2 
      ? [...getTier1LeagueIds(), ...getTier2LeagueIds()]
      : tier === 3
        ? [...getTier1LeagueIds(), ...getTier2LeagueIds(), ...getTier3LeagueIds()]
        : getAllLeagueIds();
  
  const fetcher = createFetcher(incrementApiCalls);
  
  const { data, error, isLoading, mutate } = useSWR<Match[]>(
    ['week-matches', from, tier],
    () => fetcher(() => getFixturesByDate(from, leagueIds)),
    {
      refreshInterval: 3600000, // 1 hour
      revalidateOnFocus: false,
    }
  );
  
  return {
    matches: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// Hook for single match
export function useMatch(fixtureId: number | null) {
  const { incrementApiCalls } = useAppStore();
  const fetcher = createFetcher(incrementApiCalls);
  
  const { data, error, isLoading, mutate } = useSWR(
    fixtureId ? ['match', fixtureId] : null,
    () => fixtureId ? fetcher(() => import('@/services/api-football').then(m => m.getFixtureById(fixtureId))) : null,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
    }
  );
  
  return {
    match: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
