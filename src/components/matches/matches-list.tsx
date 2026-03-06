'use client';

import { Match } from '@/types';
import { MatchCard } from './match-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface MatchesListProps {
  matches: Match[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  emptyMessage?: string;
}

export function MatchesList({ 
  matches, 
  isLoading, 
  isError, 
  error,
  emptyMessage = 'No hay partidos disponibles para esta fecha'
}: MatchesListProps) {
  if (isLoading) {
    return <MatchesListSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-100 mb-2">
          Error al cargar partidos
        </h3>
        <p className="text-sm text-slate-400 max-w-sm">
          {error?.message || 'Ha ocurrido un error al obtener los datos. Intenta recargar la página.'}
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <span className="text-2xl">📅</span>
        </div>
        <h3 className="text-lg font-medium text-slate-100 mb-2">
          Sin partidos
        </h3>
        <p className="text-sm text-slate-400 max-w-sm">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {matches.map((match) => (
        <MatchCard key={match.fixture.id} match={match} />
      ))}
    </div>
  );
}

function MatchesListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24 bg-slate-800" />
            <Skeleton className="h-5 w-12 bg-slate-800" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex flex-col items-center">
              <Skeleton className="w-12 h-12 rounded-full bg-slate-800 mb-2" />
              <Skeleton className="h-4 w-20 bg-slate-800" />
            </div>
            <Skeleton className="w-16 h-8 bg-slate-800" />
            <div className="flex-1 flex flex-col items-center">
              <Skeleton className="w-12 h-12 rounded-full bg-slate-800 mb-2" />
              <Skeleton className="h-4 w-20 bg-slate-800" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
            <Skeleton className="h-4 w-24 bg-slate-800" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 bg-slate-800" />
              <Skeleton className="h-8 w-16 bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
