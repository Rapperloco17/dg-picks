'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown,
  Zap,
  Activity,
  Target,
  Calendar,
  Trophy,
  Percent,
  DollarSign,
  Filter,
  ChevronRight,
  Flame,
  BarChart3,
  Clock,
  MapPin,
  ShoppingCart,
  Copy,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Tipos
interface Match {
  id: string;
  league: string;
  country: string;
  time: string;
  status: 'NS' | 'LIVE' | 'FT';
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  odds: {
    home: number;
    draw: number;
    away: number;
    over25: number;
    btts: number;
  };
  predictions: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
    btts: number;
    corners: number;
    cards: number;
  };
  valueBets: ValueBet[];
}

interface ValueBet {
  id: string;
  market: string;
  selection: string;
  odds: number;
  modelProb: number;
  edge: number;
  stake: string;
}

interface Parlay {
  id: string;
  name: string;
  picks: { match: string; selection: string; odds: number }[];
  totalOdds: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedValue: number;
}

export function UnifiedDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'value' | 'live'>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [cart, setCart] = useState<ValueBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    // Mock data realista
    const mockMatches: Match[] = [
      {
        id: '1',
        league: 'Champions League',
        country: 'Europe',
        time: '20:45',
        status: 'NS',
        homeTeam: 'Real Madrid',
        awayTeam: 'Man City',
        odds: { home: 2.40, draw: 3.50, away: 2.80, over25: 1.75, btts: 1.70 },
        predictions: { homeWin: 0.42, draw: 0.25, awayWin: 0.33, over25: 0.65, btts: 0.68, corners: 0.58, cards: 0.45 },
        valueBets: [
          { id: 'v1', market: 'Over 2.5', selection: 'Goles', odds: 1.75, modelProb: 0.65, edge: 0.12, stake: '3%' },
          { id: 'v2', market: 'BTTS', selection: 'Sí', odds: 1.70, modelProb: 0.68, edge: 0.15, stake: '3%' },
        ]
      },
      {
        id: '2',
        league: 'Premier League',
        country: 'England',
        time: '16:00',
        status: 'NS',
        homeTeam: 'Arsenal',
        awayTeam: 'Liverpool',
        odds: { home: 2.10, draw: 3.40, away: 3.40, over25: 1.85, btts: 1.65 },
        predictions: { homeWin: 0.48, draw: 0.26, awayWin: 0.26, over25: 0.58, btts: 0.62, corners: 0.55, cards: 0.52 },
        valueBets: [
          { id: 'v3', market: '1X2', selection: 'Arsenal', odds: 2.10, modelProb: 0.48, edge: 0.09, stake: '2%' },
        ]
      },
      {
        id: '3',
        league: 'Serie A',
        country: 'Italy',
        time: '18:30',
        status: 'NS',
        homeTeam: 'Inter',
        awayTeam: 'Juventus',
        odds: { home: 2.00, draw: 3.30, away: 3.80, over25: 2.00, btts: 1.85 },
        predictions: { homeWin: 0.52, draw: 0.28, awayWin: 0.20, over25: 0.45, btts: 0.55, corners: 0.48, cards: 0.60 },
        valueBets: [
          { id: 'v4', market: 'Corners 9.5', selection: 'Over', odds: 1.90, modelProb: 0.58, edge: 0.10, stake: '2%' },
          { id: 'v5', market: 'Cards 4.5', selection: 'Over', odds: 1.85, modelProb: 0.60, edge: 0.11, stake: '2%' },
        ]
      },
      {
        id: '4',
        league: 'La Liga',
        country: 'Spain',
        time: '21:00',
        status: 'NS',
        homeTeam: 'Barcelona',
        awayTeam: 'Atletico',
        odds: { home: 1.75, draw: 3.60, away: 4.50, over25: 1.95, btts: 1.95 },
        predictions: { homeWin: 0.58, draw: 0.24, awayWin: 0.18, over25: 0.52, btts: 0.58, corners: 0.52, cards: 0.48 },
        valueBets: []
      },
      {
        id: '5',
        league: 'Bundesliga',
        country: 'Germany',
        time: '15:30',
        status: 'LIVE',
        homeTeam: 'Bayern',
        awayTeam: 'Dortmund',
        homeScore: 2,
        awayScore: 1,
        odds: { home: 1.60, draw: 4.00, away: 5.00, over25: 1.40, btts: 1.50 },
        predictions: { homeWin: 0.65, draw: 0.20, awayWin: 0.15, over25: 0.72, btts: 0.65, corners: 0.60, cards: 0.40 },
        valueBets: [
          { id: 'v6', market: 'Over 3.5', selection: 'Goles', odds: 1.80, modelProb: 0.58, edge: 0.08, stake: '2%' },
        ]
      },
    ];

    const mockParlays: Parlay[] = [
      {
        id: 'p1',
        name: 'Parlay Seguro',
        picks: [
          { match: 'Real Madrid vs Man City', selection: 'BTTS Sí', odds: 1.70 },
          { match: 'Arsenal vs Liverpool', selection: 'Over 2.5', odds: 1.85 },
          { match: 'Inter vs Juventus', selection: 'Corners Over 9.5', odds: 1.90 },
        ],
        totalOdds: 5.97,
        confidence: 'HIGH',
        expectedValue: 0.15
      },
      {
        id: 'p2',
        name: 'Alto Valor',
        picks: [
          { match: 'Real Madrid vs Man City', selection: 'Over 2.5', odds: 1.75 },
          { match: 'Inter vs Juventus', selection: 'Cards Over 4.5', odds: 1.85 },
        ],
        totalOdds: 3.24,
        confidence: 'MEDIUM',
        expectedValue: 0.22
      },
    ];

    setMatches(mockMatches);
    setParlays(mockParlays);
    setLoading(false);
  };

  // Filtros
  const filteredMatches = matches.filter(m => {
    if (activeTab === 'value') return m.valueBets.length > 0;
    if (activeTab === 'live') return m.status === 'LIVE';
    return true;
  });

  const valueMatches = matches.filter(m => m.valueBets.length > 0);
  const liveMatches = matches.filter(m => m.status === 'LIVE');

  // Stats
  const totalValueBets = valueMatches.reduce((acc, m) => acc + m.valueBets.length, 0);
  const avgEdge = valueMatches.length > 0 
    ? valueMatches.flatMap(m => m.valueBets).reduce((acc, v) => acc + v.edge, 0) / totalValueBets 
    : 0;

  const addToCart = (bet: ValueBet) => {
    if (!cart.find(b => b.id === bet.id)) {
      setCart([...cart, bet]);
    }
  };

  const cartOdds = cart.reduce((acc, b) => acc * b.odds, 1);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="bg-[#0f0f0f] border-b border-[#262626] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">DG Picks Pro</h1>
                <p className="text-sm text-slate-400">Centro de Predicciones Deportivas</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {cart.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
                  <ShoppingCart className="w-4 h-4 text-slate-400" />
                  <span className="text-white font-medium">{cart.length}</span>
                  <span className="text-slate-400">@{cartOdds.toFixed(2)}</span>
                </div>
              )}
              <Link href="/stats">
                <Button variant="outline" size="sm" className="border-slate-700">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Estadísticas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <QuickStat 
            icon={<Target className="w-5 h-5" />}
            label="Picks Hoy"
            value={totalValueBets.toString()}
            subValue="Con valor detectado"
            color="green"
          />
          <QuickStat 
            icon={<Flame className="w-5 h-5" />}
            label="Edge Promedio"
            value={`+${(avgEdge * 100).toFixed(0)}%`}
            subValue="Ventaja sobre el mercado"
            color="yellow"
          />
          <QuickStat 
            icon={<Activity className="w-5 h-5" />}
            label="En Vivo"
            value={liveMatches.length.toString()}
            subValue="Partidos ahora"
            color="red"
          />
          <QuickStat 
            icon={<Calendar className="w-5 h-5" />}
            label="Total Partidos"
            value={matches.length.toString()}
            subValue="Analizados hoy"
            color="blue"
          />
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <TabButton 
              active={activeTab === 'all'} 
              onClick={() => setActiveTab('all')}
              label="Todos"
              count={matches.length}
            />
            <TabButton 
              active={activeTab === 'value'} 
              onClick={() => setActiveTab('value')}
              label="Con Valor"
              count={valueMatches.length}
              highlight
            />
            <TabButton 
              active={activeTab === 'live'} 
              onClick={() => setActiveTab('live')}
              label="En Vivo"
              count={liveMatches.length}
              live
            />
          </div>

          <div className="flex gap-2">
            {['1X2', 'Over/Under', 'BTTS', 'Corners', 'Cards'].map(market => (
              <Button
                key={market}
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs border-slate-700",
                  selectedMarket === market && "bg-slate-800 border-slate-600"
                )}
                onClick={() => setSelectedMarket(selectedMarket === market ? 'all' : market)}
              >
                {market}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Matches */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Partidos del Día
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-400">
                Analizando partidos...
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No hay partidos con estos filtros
              </div>
            ) : (
              filteredMatches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match}
                  onAddToCart={addToCart}
                  isInCart={(betId) => cart.some(b => b.id === betId)}
                />
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Best Picks */}
            <Card className="bg-[#0f0f0f] border-[#262626]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Mejores Picks Hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {matches
                  .flatMap(m => m.valueBets.map(v => ({ ...v, match: `${m.homeTeam} vs ${m.awayTeam}`, league: m.league })))
                  .sort((a, b) => b.edge - a.edge)
                  .slice(0, 5)
                  .map(bet => (
                    <div key={bet.id} className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                          {bet.league}
                        </Badge>
                        <span className="text-xs font-bold text-green-400">+{(bet.edge * 100).toFixed(0)}% edge</span>
                      </div>
                      <p className="text-sm text-slate-300 mb-1 truncate">{bet.match}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{bet.market}</p>
                          <p className="text-sm text-slate-400">{bet.selection}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">@{bet.odds}</p>
                          <p className="text-xs text-slate-500">Stake {bet.stake}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-2 h-8"
                        onClick={() => addToCart(bet)}
                        disabled={cart.some(b => b.id === bet.id)}
                      >
                        {cart.some(b => b.id === bet.id) ? '✓ Agregado' : '+ Agregar al Parlay'}
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Suggested Parlays */}
            <Card className="bg-[#0f0f0f] border-[#262626]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-500" />
                  Parlays Sugeridos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {parlays.map(parlay => (
                  <div key={parlay.id} className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{parlay.name}</span>
                      <Badge className={cn(
                        parlay.confidence === 'HIGH' ? 'bg-green-600' :
                        parlay.confidence === 'MEDIUM' ? 'bg-yellow-600' : 'bg-slate-600'
                      )}>
                        {parlay.confidence}
                      </Badge>
                    </div>
                    <div className="space-y-1 mb-3">
                      {parlay.picks.map((pick, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-slate-500 truncate">{pick.match}</p>
                          <p className="text-slate-300">→ {pick.selection} <span className="text-green-400">@{pick.odds}</span></p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                      <div>
                        <p className="text-xs text-slate-400">Cuota Total</p>
                        <p className="text-xl font-bold text-white">{parlay.totalOdds.toFixed(2)}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8">
                        <Copy className="w-3 h-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-[#0f0f0f] border-[#262626]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Accesos Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/matches">
                  <Button variant="outline" className="w-full justify-between border-slate-700">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Todos los Partidos
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/live">
                  <Button variant="outline" className="w-full justify-between border-slate-700">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      En Vivo
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/stats">
                  <Button variant="outline" className="w-full justify-between border-slate-700">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Estadísticas
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ icon, label, value, subValue, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
}) {
  const colors = {
    green: 'from-green-500/20 to-green-600/10 text-green-400 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 text-yellow-400 border-yellow-500/30',
    red: 'from-red-500/20 to-red-600/10 text-red-400 border-red-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl p-4 border bg-gradient-to-br",
      colors[color]
    )}>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm font-medium opacity-80">{label}</span>
        </div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-xs opacity-60 mt-1">{subValue}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count, highlight, live }: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
  live?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
        active 
          ? highlight 
            ? "bg-green-600 text-white"
            : live
              ? "bg-red-600 text-white"
              : "bg-slate-800 text-white"
          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
      )}
    >
      {label}
      <span className={cn(
        "px-2 py-0.5 rounded-full text-xs",
        active ? "bg-white/20" : "bg-slate-800"
      )}>
        {count}
      </span>
    </button>
  );
}

function MatchCard({ match, onAddToCart, isInCart }: {
  match: Match;
  onAddToCart: (bet: any) => void;
  isInCart: (id: string) => boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const impliedHome = 1 / match.odds.home;
  const impliedAway = 1 / match.odds.away;
  const impliedDraw = 1 / match.odds.draw;

  return (
    <Card className={cn(
      "bg-[#0f0f0f] border-[#262626] overflow-hidden transition-all",
      match.valueBets.length > 0 && "border-l-4 border-l-green-500"
    )}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-slate-700 text-slate-400">
              {match.league}
            </Badge>
            <span className="text-sm text-slate-500">{match.time}</span>
            {match.status === 'LIVE' && (
              <Badge className="bg-red-600 animate-pulse">
                <Activity className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            )}
          </div>
          {match.valueBets.length > 0 && (
            <Badge className="bg-green-600">
              <Zap className="w-3 h-3 mr-1" />
              {match.valueBets.length} valor
            </Badge>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-lg font-bold text-white">{match.homeTeam}</p>
            {match.status === 'LIVE' && (
              <p className="text-2xl font-bold text-red-400">{match.homeScore}</p>
            )}
          </div>
          <div className="px-6 text-center">
            <span className="text-slate-500 text-sm">VS</span>
          </div>
          <div className="flex-1 text-right">
            <p className="text-lg font-bold text-white">{match.awayTeam}</p>
            {match.status === 'LIVE' && (
              <p className="text-2xl font-bold text-red-400">{match.awayScore}</p>
            )}
          </div>
        </div>

        {/* Quick Odds */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <OddsBox 
            label="1" 
            odds={match.odds.home}
            prob={match.predictions.homeWin}
            isValue={match.predictions.homeWin > impliedHome + 0.05}
          />
          <OddsBox 
            label="X" 
            odds={match.odds.draw}
            prob={match.predictions.draw}
            isValue={match.predictions.draw > impliedDraw + 0.05}
          />
          <OddsBox 
            label="2" 
            odds={match.odds.away}
            prob={match.predictions.awayWin}
            isValue={match.predictions.awayWin > impliedAway + 0.05}
          />
        </div>

        {/* Expand Button */}
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          {expanded ? 'Ver menos' : 'Ver más mercados'}
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-[#262626] p-4 bg-slate-900/30">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">Goles</p>
              <OddsRow 
                label="Over 2.5" 
                odds={match.odds.over25}
                prob={match.predictions.over25}
              />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">BTTS</p>
              <OddsRow 
                label="Ambos anotan" 
                odds={match.odds.btts}
                prob={match.predictions.btts}
              />
            </div>
          </div>

          {/* Value Bets */}
          {match.valueBets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Picks con Valor
              </p>
              {match.valueBets.map(bet => (
                <div key={bet.id} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{bet.market}</p>
                    <p className="text-sm text-slate-400">{bet.selection}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">@{bet.odds}</p>
                      <p className="text-xs text-green-400">+{(bet.edge * 100).toFixed(0)}% edge</p>
                    </div>
                    <Button 
                      size="sm"
                      className="h-8"
                      onClick={() => onAddToCart(bet)}
                      disabled={isInCart(bet.id)}
                    >
                      {isInCart(bet.id) ? '✓' : '+'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function OddsBox({ label, odds, prob, isValue }: {
  label: string;
  odds: number;
  prob: number;
  isValue: boolean;
}) {
  return (
    <div className={cn(
      "text-center p-2 rounded-lg border transition-all",
      isValue 
        ? "bg-green-500/10 border-green-500/50" 
        : "bg-slate-800 border-slate-700 hover:border-slate-600"
    )}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn(
        "text-lg font-bold",
        isValue ? "text-green-400" : "text-white"
      )}>
        {odds.toFixed(2)}
      </p>
      <p className="text-xs text-slate-500">{(prob * 100).toFixed(0)}%</p>
    </div>
  );
}

function OddsRow({ label, odds, prob }: {
  label: string;
  odds: number;
  prob: number;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white font-medium">{odds.toFixed(2)}</span>
        <span className="text-xs text-slate-500">({(prob * 100).toFixed(0)}%)</span>
      </div>
    </div>
  );
}
