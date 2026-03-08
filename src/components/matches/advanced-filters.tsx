'use client';

import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MarketFilter = 'ALL' | '1X2' | 'OVER_UNDER' | 'BTTS' | 'DOUBLE_CHANCE' | 'CORNERS' | 'CARDS';
export type EVFilter = 'ALL' | 'POSITIVE' | 'STRONG' | 'NEGATIVE';
export type GradeFilter = 'ALL' | 'A' | 'B' | 'C' | 'D';

interface AdvancedFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  marketFilter: MarketFilter;
  onMarketChange: (market: MarketFilter) => void;
  evFilter: EVFilter;
  onEVChange: (ev: EVFilter) => void;
  gradeFilter: GradeFilter;
  onGradeChange: (grade: GradeFilter) => void;
  activeFiltersCount: number;
  onResetFilters: () => void;
}

const MARKET_OPTIONS: { value: MarketFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: '1X2', label: '1X2' },
  { value: 'OVER_UNDER', label: 'Over/Under' },
  { value: 'BTTS', label: 'Ambos Anotan' },
  { value: 'DOUBLE_CHANCE', label: 'Doble Oportunidad' },
  { value: 'CORNERS', label: 'Córners' },
  { value: 'CARDS', label: 'Tarjetas' },
];

const EV_OPTIONS: { value: EVFilter; label: string; color: string }[] = [
  { value: 'ALL', label: 'Todos', color: 'bg-slate-500' },
  { value: 'POSITIVE', label: '+EV', color: 'bg-emerald-500' },
  { value: 'STRONG', label: '+EV Fuerte', color: 'bg-green-500' },
  { value: 'NEGATIVE', label: '-EV', color: 'bg-red-500' },
];

const GRADE_OPTIONS: { value: GradeFilter; label: string; color: string }[] = [
  { value: 'ALL', label: 'Todas', color: 'bg-slate-500' },
  { value: 'A', label: 'A', color: 'bg-emerald-500' },
  { value: 'B', label: 'B', color: 'bg-green-500' },
  { value: 'C', label: 'C', color: 'bg-blue-500' },
  { value: 'D', label: 'D', color: 'bg-yellow-500' },
];

export function AdvancedFilters({
  searchQuery,
  onSearchChange,
  marketFilter,
  onMarketChange,
  evFilter,
  onEVChange,
  gradeFilter,
  onGradeChange,
  activeFiltersCount,
  onResetFilters,
}: AdvancedFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar equipo o liga..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>
        )}
      </div>

      {/* Filter Groups */}
      <div className="space-y-3">
        {/* Market Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter className="w-4 h-4" />
            <span>Mercado</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {MARKET_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onMarketChange(option.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  marketFilter === option.value
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* EV Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Expected Value (EV)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EV_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onEVChange(option.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5',
                  evFilter === option.value
                    ? `${option.color.replace('bg-', 'bg-')}/20 border-${option.color.replace('bg-', '')}/50 text-${option.color.replace('bg-', '')}-400`
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                )}
              >
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  evFilter === option.value ? option.color : 'bg-slate-600'
                )} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grade Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Calificación</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onGradeChange(option.value)}
                className={cn(
                  'w-8 h-8 rounded-full text-xs font-medium border transition-all flex items-center justify-center',
                  gradeFilter === option.value
                    ? `${option.color.replace('bg-', 'bg-')}/20 border-${option.color.replace('bg-', '')}/50 text-${option.color.replace('bg-', '')}-400`
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-500">
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo{activeFiltersCount > 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
