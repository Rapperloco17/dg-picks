'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { ALL_LEAGUES, TIER_1_LEAGUES, TIER_2_LEAGUES, TIER_3_LEAGUES } from '@/constants/leagues';
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeagueSelectorProps {
  selectedLeague: number | 'ALL';
  onSelectLeague: (leagueId: number | 'ALL') => void;
  tier?: 'all' | 1 | 2 | 3;
}

export function LeagueSelector({ selectedLeague, onSelectLeague, tier = 'all' }: LeagueSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const leagues = tier === 'all' ? ALL_LEAGUES :
    tier === 1 ? TIER_1_LEAGUES :
    tier === 2 ? TIER_2_LEAGUES :
    TIER_3_LEAGUES;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative group">
      {/* Scroll Left Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 border border-slate-700"
        onClick={() => scroll('left')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Scroll Right Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 border border-slate-700"
        onClick={() => scroll('right')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Leagues Container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* All Leagues Button */}
        <button
          onClick={() => onSelectLeague('ALL')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap flex-shrink-0',
            selectedLeague === 'ALL'
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
          )}
        >
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            selectedLeague === 'ALL' ? 'bg-emerald-500/20' : 'bg-slate-800'
          )}>
            <Globe className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Todas</span>
        </button>

        {/* League Buttons */}
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => onSelectLeague(league.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap flex-shrink-0',
              selectedLeague === league.id
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center overflow-hidden',
              selectedLeague === league.id ? 'bg-emerald-500/20' : 'bg-slate-800'
            )}>
              <img
                src={`https://media.api-sports.io/football/leagues/${league.id}.png`}
                alt={league.name}
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-sm font-medium">{league.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
