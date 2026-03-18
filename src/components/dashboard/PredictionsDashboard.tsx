'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Target, 
  Zap,
  Filter,
  Calendar,
  Trophy,
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchPrediction {
  id: string;
  fixtureId: number;
  league: string;
  country: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  status: 'NS' | 'LIVE' | 'FT';
  homeGoals?: number;
  awayGoals?: number;
  predictions: {
    // 1X2
    homeWin: number;
    draw: number;
    awayWin: number;
    // Doble oportunidad
    homeOrDraw: number;
    awayOrDraw: number;
    homeOrAway: number;
    // Goles
    over25: number;
    under25: number;
    over35: number;
    under35: number;
    // BTTS
    bttsYes: number;
    bttsNo: number;
    // Corners
    overCorners95: number;
    underCorners95: number;
    overCorners105: number;
    underCorners105: number;
    // Tarjetas
    overCards35: number;
    underCards35: number;
    overCards45: number;
    underCards45: number;
  };
  odds?: {
    home: number;
    draw: number;
    away: number;
    over25: number;
    under25: number;
  };
  hasValue: boolean;
  valueBets: ValueBet[];
}

interface ValueBet {
  market: string;
  selection: string;
  probability: number;
  odds: number;
  edge: number;
  stake: string;
}

export function PredictionsDashboard() {
  const [matches, setMatches] = useState<MatchPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'value' | 'live'>('all');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      // Por ahora usar mock data, luego conectar con API
      const mockMatches: MatchPrediction[] = generateMockMatches();
      setMatches(mockMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockMatches = (): MatchPrediction[] => {
    const teams = [
      { name: 'Real Madrid', league: 'La Liga', country: 'Spain' },
      { name: 'Barcelona', league: 'La Liga', country: 'Spain' },
      { name: 'Man City', league: 'Premier League', country: 'England' },
      { name: 'Liverpool', league: 'Premier League', country: 'England' },
      { name: 'Bayern Munich', league: 'Bundesliga', country: 'Germany' },
      { name: 'PSG', league: 'Ligue 1', country: 'France' },
      { name: 'Inter', league: 'Serie A', country: 'Italy' },
      { name: 'Ajax', league: 'Eredivisie', country: 'Netherlands' },
    ];

    return teams.slice(0, 6).map((team, i) => {
      const isHome = i % 2 === 0;
      const homeTeam = isHome ? team.name : teams[(i + 1) % teams.length].name;
      const awayTeam = !isHome ? team.name : teams[(i + 1) % teams.length].name;
      
      // Generar probabilidades realistas con Poisson
      const homeXg = 1.2 + Math.random() * 1.5;
      const awayXg = 0.8 + Math.random() * 1.2;
      
      return {
        id: `match-${i}`,
        fixtureId: 1000 + i,
        league: team.league,
        country: team.country,
        date: 'Hoy',
        time: `${18 + i}:00`,
        homeTeam,
        awayTeam,
        status: 'NS',
        predictions: calculatePredictions(homeXg, awayXg),
        hasValue: Math.random() > 0.5,
        valueBets: generateValueBets(homeXg, awayXg),
      };
    });
  };

  const calculatePredictions = (homeXg: number, awayXg: number) => {
    // Simular cálculos Poisson
    const totalXg = homeXg + awayXg;
    
    return {
      homeWin: Math.min(0.25 + (homeXg - awayXg) * 0.15, 0.65),
      draw: 0.20 + Math.random() * 0.10,
      awayWin: Math.min(0.25 + (awayXg - homeXg) * 0.15, 0.65),
      homeOrDraw: 0,
      awayOrDraw: 0,
      homeOrAway: 0,
      over25: Math.min(0.30 + totalXg * 0.15, 0.75),
      under25: 0,
      over35: Math.min(0.20 + totalXg * 0.10, 0.50),
      under35: 0,
      bttsYes: Math.min(0.40 + (homeXg * awayXg) * 0.05, 0.70),
      bttsNo: 0,
      overCorners95: 0.55 + Math.random() * 0.15,
      underCorners95: 0,
      overCorners105: 0.45 + Math.random() * 0.15,
      underCorners105: 0,
      overCards35: 0.50 + Math.random() * 0.20,
      underCards35: 0,
      overCards45: 0.40 + Math.random() * 0.15,
      underCards45: 0,
    };
  };

  const generateValueBets = (homeXg: number, awayXg: number): ValueBet[] => {
    const bets: ValueBet[] = [];
    
    if (homeXg > 1.5 && awayXg > 1.0) {
      bets.push({
        market: 'Over 2.5',
        selection: 'Goles',
        probability: 0.65,
        odds: 1.85,
        edge: 0.08,
        stake: '2%'
      });
    }
    
    if (homeXg + awayXg > 2.8) {
      bets.push({
        market: 'BTTS',
        selection: 'Si',
        probability: 0.58,
        odds: 1.75,
        edge: 0.06,
        stake: '1%'
      });
    }
    
    return bets;
  };

  const filteredMatches = matches.filter(m => {
    if (filter === 'value') return m.hasValue;
    if (filter === 'live') return m.status === 'LIVE';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Predicciones Deportivas
        </h1>
        <p className="text-slate-400">
          Modelo Poisson con probabilidades reales y detección de valor
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Partidos Hoy" 
          value={matches.length.toString()} 
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard 
          title="Con Valor" 
          value={matches.filter(m => m.hasValue).length.toString()} 
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
          highlight
        />
        <StatCard 
          title="En Vivo" 
          value={matches.filter(m => m.status === 'LIVE').length.toString()} 
          icon={<Activity className="w-5 h-5 text-green-500" />}
        />
        <StatCard 
          title="Análisis" 
          value="Poisson" 
          icon={<BarChart3 className="w-5 h-5" />}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-blue-600' : ''}
        >
          Todos
        </Button>
        <Button 
          variant={filter === 'value' ? 'default' : 'outline'}
          onClick={() => setFilter('value')}
          className={filter === 'value' ? 'bg-green-600' : ''}
        >
          <Zap className="w-4 h-4 mr-1" />
          Con Valor
        </Button>
        <Button 
          variant={filter === 'live' ? 'default' : 'outline'}
          onClick={() => setFilter('live')}
          className={filter === 'live' ? 'bg-red-600' : ''}
        >
          <Activity className="w-4 h-4 mr-1" />
          En Vivo
        </Button>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            Cargando predicciones...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No hay partidos disponibles
          </div>
        ) : (
          filteredMatches.map(match => (
            <MatchCard 
              key={match.id}
              match={match}
              isExpanded={expandedMatch === match.id}
              onToggle={() => setExpandedMatch(
                expandedMatch === match.id ? null : match.id
              )}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, highlight = false }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(
      "bg-slate-900 border-slate-800",
      highlight && "border-yellow-500/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase">{title}</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              highlight ? "text-yellow-500" : "text-white"
            )}>
              {value}
            </p>
          </div>
          <div className={cn(
            "p-2 rounded-lg",
            highlight ? "bg-yellow-500/10" : "bg-slate-800"
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchCard({ 
  match, 
  isExpanded, 
  onToggle 
}: { 
  match: MatchPrediction; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const p = match.predictions;
  
  // Calcular doble oportunidad
  const homeOrDraw = p.homeWin + p.draw;
  const awayOrDraw = p.awayWin + p.draw;
  const homeOrAway = p.homeWin + p.awayWin;
  
  // Calcular unders
  const under25 = 1 - p.over25;
  const under35 = 1 - p.over35;
  const bttsNo = 1 - p.bttsYes;

  return (
    <Card className={cn(
      "bg-slate-900 border-slate-800 overflow-hidden",
      match.hasValue && "border-l-4 border-l-green-500"
    )}>
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          {/* League & Time */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs border-slate-700">
              {match.league}
            </Badge>
            <span className="text-sm text-slate-400">{match.time}</span>
            {match.hasValue && (
              <Badge className="bg-green-600 text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Valor
              </Badge>
            )}
          </div>
          
          {/* Expand icon */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex-1">
            <p className="text-lg font-semibold text-white">{match.homeTeam}</p>
          </div>
          <div className="px-4 text-center">
            <span className="text-sm text-slate-500">VS</span>
          </div>
          <div className="flex-1 text-right">
            <p className="text-lg font-semibold text-white">{match.awayTeam}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <QuickStat 
            label="1X2" 
            value={`${(p.homeWin * 100).toFixed(0)}%`}
            subValue={`${(p.awayWin * 100).toFixed(0)}%`}
          />
          <QuickStat 
            label="O/U 2.5" 
            value={`${(p.over25 * 100).toFixed(0)}%`}
            highlight={p.over25 > 0.6}
          />
          <QuickStat 
            label="BTTS" 
            value={`${(p.bttsYes * 100).toFixed(0)}%`}
          />
          <QuickStat 
            label="Corners 9.5" 
            value={`${(p.overCorners95 * 100).toFixed(0)}%`}
          />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-800 p-4 bg-slate-900/50">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1X2 & Doble Oportunidad */}
            <PredictionGroup title="Resultado Final">
              <PredictionRow label="1 (Local)" prob={p.homeWin} />
              <PredictionRow label="X (Empate)" prob={p.draw} />
              <PredictionRow label="2 (Visitante)" prob={p.awayWin} />
              <div className="border-t border-slate-700 my-2" />
              <PredictionRow label="1X (Local o Empate)" prob={homeOrDraw} />
              <PredictionRow label="X2 (Empate o Visitante)" prob={awayOrDraw} />
              <PredictionRow label="12 (Sin Empate)" prob={homeOrAway} />
            </PredictionGroup>

            {/* Goles */}
            <PredictionGroup title="Goles">
              <PredictionRow 
                label="Over 2.5" 
                prob={p.over25} 
                highlight={p.over25 > 0.6}
              />
              <PredictionRow label="Under 2.5" prob={under25} />
              <div className="border-t border-slate-700 my-2" />
              <PredictionRow 
                label="Over 3.5" 
                prob={p.over35}
                highlight={p.over35 > 0.5}
              />
              <PredictionRow label="Under 3.5" prob={under35} />
            </PredictionGroup>

            {/* BTTS & Corners & Tarjetas */}
            <PredictionGroup title="BTTS, Corners & Tarjetas">
              <PredictionRow label="BTTS Si" prob={p.bttsYes} />
              <PredictionRow label="BTTS No" prob={bttsNo} />
              <div className="border-t border-slate-700 my-2" />
              <PredictionRow 
                label="Over Corners 9.5" 
                prob={p.overCorners95}
                highlight={p.overCorners95 > 0.55}
              />
              <PredictionRow label="Over Corners 10.5" prob={p.overCorners105} />
              <div className="border-t border-slate-700 my-2" />
              <PredictionRow label="Over Tarjetas 3.5" prob={p.overCards35} />
              <PredictionRow label="Over Tarjetas 4.5" prob={p.overCards45} />
            </PredictionGroup>
          </div>

          {/* Value Bets */}
          {match.valueBets.length > 0 && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Picks con Valor Detectados
              </h4>
              <div className="space-y-2">
                {match.valueBets.map((bet, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {bet.market} - {bet.selection}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        Prob: {(bet.probability * 100).toFixed(0)}%
                      </span>
                      <span className="text-green-400 font-medium">
                        Edge: +{(bet.edge * 100).toFixed(1)}%
                      </span>
                      <Badge className="bg-blue-600 text-xs">
                        Stake {bet.stake}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function QuickStat({ label, value, subValue, highlight = false }: {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "text-center p-2 rounded-lg",
      highlight ? "bg-green-500/10" : "bg-slate-800"
    )}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn(
        "text-lg font-bold",
        highlight ? "text-green-400" : "text-white"
      )}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-slate-500">{subValue}</p>
      )}
    </div>
  );
}

function PredictionGroup({ title, children }: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Target className="w-4 h-4 text-blue-500" />
        {title}
      </h4>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function PredictionRow({ label, prob, highlight = false }: {
  label: string;
  prob: number;
  highlight?: boolean;
}) {
  const percentage = (prob * 100).toFixed(1);
  
  return (
    <div className="flex items-center justify-between">
      <span className={cn(
        "text-sm",
        highlight ? "text-green-400 font-medium" : "text-slate-400"
      )}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              highlight ? "bg-green-500" : "bg-blue-500",
              prob > 0.6 ? "opacity-100" : prob > 0.4 ? "opacity-70" : "opacity-50"
            )}
            style={{ width: `${prob * 100}%` }}
          />
        </div>
        <span className={cn(
          "text-sm font-medium w-12 text-right",
          highlight ? "text-green-400" : "text-white"
        )}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}
