import useSWR from 'swr';
import { HistoricalMatch } from '@/types';

interface MatchesResponse {
  success: boolean;
  total: number;
  filtered: number;
  matches: HistoricalMatch[];
}

interface SyncStatusResponse {
  success: boolean;
  totalMatches: number;
  lastSync: string;
  daysSinceSync: number;
  recentLogs: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    status: string;
    newMatches: number;
    errors: string | null;
  }>;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useDatabaseMatches(filters?: {
  leagueId?: number;
  teamId?: number;
  status?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.leagueId) params.set('leagueId', String(filters.leagueId));
  if (filters?.teamId) params.set('teamId', String(filters.teamId));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);

  const url = `/api/db-matches${params.toString() ? `?${params}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR<MatchesResponse>(
    url,
    fetcher,
    { refreshInterval: 300000 } // Refrescar cada 5 minutos
  );

  return {
    matches: data?.matches || [],
    total: data?.total || 0,
    filtered: data?.filtered || 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useSyncStatus(refreshInterval = 60000) {
  const { data, error, isLoading, mutate } = useSWR<SyncStatusResponse>(
    '/api/sync/status',
    fetcher,
    { refreshInterval }
  );

  return {
    totalMatches: data?.totalMatches || 0,
    lastSync: data?.lastSync ? new Date(data.lastSync) : null,
    daysSinceSync: data?.daysSinceSync ?? null,
    recentLogs: data?.recentLogs || [],
    isLoading,
    error,
    refresh: mutate,
  };
}
