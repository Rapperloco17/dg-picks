'use client';

import { useAppStore } from '@/stores/app-store';
import { CONTINENTS, ALL_LEAGUES, COUNTRIES } from '@/constants/leagues';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MatchFilters() {
  const { filters, setFilter, resetFilters } = useAppStore();

  // Filter countries based on selected continent
  const availableCountries = filters.continent === 'ALL' 
    ? COUNTRIES 
    : Array.from(new Set(
        ALL_LEAGUES
          .filter(l => l.continent === filters.continent)
          .map(l => l.country)
      )).sort();

  // Filter leagues based on selected continent and country
  const availableLeagues = ALL_LEAGUES.filter(l => {
    if (filters.continent !== 'ALL' && l.continent !== filters.continent) return false;
    if (filters.country !== 'ALL' && l.country !== filters.country) return false;
    return true;
  });

  const hasActiveFilters = 
    filters.continent !== 'ALL' || 
    filters.country !== 'ALL' || 
    filters.league !== 'ALL' ||
    filters.minProbability > 0 ||
    filters.maxProbability < 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Filtros</span>
        </div>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={resetFilters}
            className="text-slate-400 hover:text-slate-100 h-8"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Continent Filter */}
        <Select
          value={filters.continent}
          onValueChange={(value) => {
            setFilter('continent', value as any);
            setFilter('country', 'ALL');
            setFilter('league', 'ALL');
          }}
        >
          <SelectTrigger className="w-[140px] bg-slate-900 border-slate-800 text-slate-100">
            <SelectValue placeholder="Continente" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            {CONTINENTS.map((c) => (
              <SelectItem 
                key={c.value} 
                value={c.value}
                className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
              >
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Country Filter */}
        <Select
          value={filters.country}
          onValueChange={(value) => {
            setFilter('country', value);
            setFilter('league', 'ALL');
          }}
          disabled={availableCountries.length === 0}
        >
          <SelectTrigger className="w-[140px] bg-slate-900 border-slate-800 text-slate-100">
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem 
              value="ALL"
              className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
            >
              Todos
            </SelectItem>
            {availableCountries.map((country) => (
              <SelectItem 
                key={country} 
                value={country}
                className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
              >
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* League Filter */}
        <Select
          value={filters.league.toString()}
          onValueChange={(value) => setFilter('league', value === 'ALL' ? 'ALL' : parseInt(value))}
          disabled={availableLeagues.length === 0}
        >
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-slate-100">
            <SelectValue placeholder="Liga" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 max-h-[300px]">
            <SelectItem 
              value="ALL"
              className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
            >
              Todas las ligas
            </SelectItem>
            {availableLeagues.map((league) => (
              <SelectItem 
                key={league.id} 
                value={league.id.toString()}
                className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
              >
                <span className={cn(
                  "inline-block w-2 h-2 rounded-full mr-2",
                  league.tier === 1 ? "bg-emerald-500" :
                  league.tier === 2 ? "bg-blue-500" : "bg-slate-500"
                )} />
                {league.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Probability Range */}
        <Select
          value={`${filters.minProbability}-${filters.maxProbability}`}
          onValueChange={(value) => {
            const [min, max] = value.split('-').map(Number);
            setFilter('minProbability', min);
            setFilter('maxProbability', max);
          }}
        >
          <SelectTrigger className="w-[160px] bg-slate-900 border-slate-800 text-slate-100">
            <SelectValue placeholder="Probabilidad" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem 
              value="0-100"
              className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
            >
              Todas
            </SelectItem>
            <SelectItem 
              value="70-100"
              className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
            >
              Alta (70%+)
            </SelectItem>
            <SelectItem 
              value="50-70"
              className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
            >
              Media (50-70%)
            </SelectItem>
            <SelectItem 
              value="0-50"
              className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
            >
              Baja (&lt;50%)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.continent !== 'ALL' && (
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">
              {CONTINENTS.find(c => c.value === filters.continent)?.label}
              <button 
                onClick={() => {
                  setFilter('continent', 'ALL');
                  setFilter('country', 'ALL');
                  setFilter('league', 'ALL');
                }}
                className="ml-1 hover:text-blue-300"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.country !== 'ALL' && (
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">
              {filters.country}
              <button 
                onClick={() => {
                  setFilter('country', 'ALL');
                  setFilter('league', 'ALL');
                }}
                className="ml-1 hover:text-blue-300"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.league !== 'ALL' && (
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">
              {ALL_LEAGUES.find(l => l.id === filters.league)?.name}
              <button 
                onClick={() => setFilter('league', 'ALL')}
                className="ml-1 hover:text-blue-300"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
