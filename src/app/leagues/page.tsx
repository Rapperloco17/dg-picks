'use client';

import { TIER_1_LEAGUES, TIER_2_LEAGUES, TIER_3_LEAGUES } from '@/constants/leagues';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeaguesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Explorador de Ligas</h1>
        <p className="text-sm text-slate-400 mt-1">
          Descubre todas las ligas disponibles para análisis
        </p>
      </div>

      {/* TIER 1 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">TIER 1 - Élite</h2>
          <Badge className="bg-emerald-500/10 text-emerald-400">
            {TIER_1_LEAGUES.length} ligas
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {TIER_1_LEAGUES.map((league) => (
            <LeagueCard key={league.id} league={league} tier={1} />
          ))}
        </div>
      </section>

      {/* TIER 2 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-slate-100">TIER 2 - Competitivo</h2>
          <Badge className="bg-blue-500/10 text-blue-400">
            {TIER_2_LEAGUES.length} ligas
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {TIER_2_LEAGUES.map((league) => (
            <LeagueCard key={league.id} league={league} tier={2} />
          ))}
        </div>
      </section>

      {/* TIER 3 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-100">TIER 3 - Adicional</h2>
          <Badge className="bg-slate-500/10 text-slate-400">
            {TIER_3_LEAGUES.length} ligas
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {TIER_3_LEAGUES.map((league) => (
            <LeagueCard key={league.id} league={league} tier={3} />
          ))}
        </div>
      </section>
    </div>
  );
}

function LeagueCard({ league, tier }: { league: typeof TIER_1_LEAGUES[0]; tier: 1 | 2 | 3 }) {
  const tierColors = {
    1: 'border-emerald-500/20 hover:border-emerald-500/40',
    2: 'border-blue-500/20 hover:border-blue-500/40',
    3: 'border-slate-500/20 hover:border-slate-500/40',
  };

  return (
    <Card className={cn(
      "bg-slate-900 border-slate-800 transition-colors",
      tierColors[tier]
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            tier === 1 ? "bg-emerald-500" :
            tier === 2 ? "bg-blue-500" : "bg-slate-500"
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {league.name}
            </p>
            <p className="text-xs text-slate-500">
              {league.country}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
