'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown,
  Target,
  Calendar,
  Trophy,
  Percent,
  DollarSign,
  Activity,
  Zap,
  BarChart3,
  Filter,
  ChevronUp,
  ChevronDown,
  Award,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BetRecord {
  id: string;
  date: string;
  match: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  result: 'WON' | 'LOST' | 'PENDING';
  profit: number;
  edge: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface MarketStats {
  market: string;
  totalBets: number;
  won: number;
  lost: number;
  winRate: number;
  avgOdds: number;
  totalProfit: number;
  roi: number;
}

interface DailyStats {
  date: string;
  bets: number;
  won: number;
  profit: number;
  cumulativeBankroll: number;
}

export function StatsPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'markets' | 'performance'>('overview');
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    // Mock data de picks históricos
    const mockBets: BetRecord[] = [
      { id: '1', date: '2024-03-15', match: 'Man City vs Liverpool', market: 'Over 2.5', selection: 'Over', odds: 1.85, stake: 100, result: 'WON', profit: 85, edge: 0.08, confidence: 'HIGH' },
      { id: '2', date: '2024-03-15', match: 'Real Madrid vs Barcelona', market: '1X2', selection: 'Home', odds: 2.10, stake: 100, result: 'LOST', profit: -100, edge: 0.06, confidence: 'MEDIUM' },
      { id: '3', date: '2024-03-14', match: 'Bayern vs Dortmund', market: 'BTTS', selection: 'Yes', odds: 1.75, stake: 150, result: 'WON', profit: 112.50, edge: 0.10, confidence: 'HIGH' },
      { id: '4', date: '2024-03-14', match: 'Inter vs Juventus', market: 'Corners 9.5', selection: 'Over', odds: 1.90, stake: 100, result: 'WON', profit: 90, edge: 0.07, confidence: 'MEDIUM' },
      { id: '5', date: '2024-03-13', match: 'PSG vs Marseille', market: 'Over 2.5', selection: 'Over', odds: 1.80, stake: 200, result: 'WON', profit: 160, edge: 0.12, confidence: 'HIGH' },
      { id: '6', date: '2024-03-13', match: 'Arsenal vs Chelsea', market: '1X2', selection: 'Home', odds: 1.95, stake: 100, result: 'LOST', profit: -100, edge: 0.05, confidence: 'LOW' },
      { id: '7', date: '2024-03-12', match: 'Atletico vs Sevilla', market: 'BTTS', selection: 'Yes', odds: 1.85, stake: 150, result: 'WON', profit: 127.50, edge: 0.09, confidence: 'HIGH' },
      { id: '8', date: '2024-03-12', match: 'Napoli vs Roma', market: 'Over 3.5', selection: 'Over', odds: 2.20, stake: 100, result: 'LOST', profit: -100, edge: 0.06, confidence: 'MEDIUM' },
      { id: '9', date: '2024-03-11', match: 'Leverkusen vs Leipzig', market: 'Corners 10.5', selection: 'Over', odds: 1.95, stake: 100, result: 'WON', profit: 95, edge: 0.08, confidence: 'HIGH' },
      { id: '10', date: '2024-03-11', match: 'Porto vs Benfica', market: 'Cards 4.5', selection: 'Over', odds: 1.80, stake: 100, result: 'WON', profit: 80, edge: 0.07, confidence: 'MEDIUM' },
    ];
    setBets(mockBets);
    setLoading(false);
  };

  // Calcular estadísticas
  const totalBets = bets.length;
  const wonBets = bets.filter(b => b.result === 'WON').length;
  const lostBets = bets.filter(b => b.result === 'LOST').length;
  const pendingBets = bets.filter(b => b.result === 'PENDING').length;
  const winRate = totalBets > 0 ? (wonBets / (wonBets + lostBets)) * 100 : 0;
  
  const totalStaked = bets.reduce((acc, b) => acc + b.stake, 0);
  const totalProfit = bets.reduce((acc, b) => acc + b.profit, 0);
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  
  const avgOdds = totalBets > 0 ? bets.reduce((acc, b) => acc + b.odds, 0) / totalBets : 0;
  const avgEdge = totalBets > 0 ? bets.reduce((acc, b) => acc + b.edge, 0) / totalBets : 0;

  // Calcular racha actual
  const currentStreak = calculateStreak(bets);

  // Estadísticas por mercado
  const marketStats = calculateMarketStats(bets);

  // Stats por confianza
  const highConfBets = bets.filter(b => b.confidence === 'HIGH');
  const highConfWinRate = highConfBets.filter(b => b.result === 'WON').length / highConfBets.filter(b => b.result !== 'PENDING').length * 100 || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          Estadísticas de Rendimiento
        </h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-blue-600' : ''}
            >
              {range === 'all' ? 'Todo' : range}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Resumen', icon: Activity },
          { id: 'history', label: 'Historial', icon: Calendar },
          { id: 'markets', label: 'Por Mercado', icon: Target },
          { id: 'performance', label: 'Rendimiento', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id 
                ? "border-blue-500 text-blue-400" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <OverviewTab 
          totalBets={totalBets}
          wonBets={wonBets}
          lostBets={lostBets}
          winRate={winRate}
          totalProfit={totalProfit}
          roi={roi}
          avgOdds={avgOdds}
          avgEdge={avgEdge}
          currentStreak={currentStreak}
          highConfWinRate={highConfWinRate}
          totalStaked={totalStaked}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab bets={bets} />
      )}

      {activeTab === 'markets' && (
        <MarketsTab marketStats={marketStats} />
      )}

      {activeTab === 'performance' && (
        <PerformanceTab bets={bets} />
      )}
    </div>
  );
}

function OverviewTab({ 
  totalBets, wonBets, lostBets, winRate, totalProfit, roi, 
  avgOdds, avgEdge, currentStreak, highConfWinRate, totalStaked 
}: {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  winRate: number;
  totalProfit: number;
  roi: number;
  avgOdds: number;
  avgEdge: number;
  currentStreak: { type: 'WIN' | 'LOSS'; count: number };
  highConfWinRate: number;
  totalStaked: number;
}) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="ROI Total" 
          value={`${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`}
          subValue="Return on Investment"
          icon={<Percent className="w-5 h-5" />}
          trend={roi > 0 ? 'up' : roi < 0 ? 'down' : 'neutral'}
          color={roi > 0 ? 'green' : roi < 0 ? 'red' : 'neutral'}
        />
        <StatCard 
          title="Profit Total" 
          value={`${totalProfit > 0 ? '+' : ''}$${totalProfit.toFixed(0)}`}
          subValue={`Stake total: $${totalStaked}`}
          icon={<DollarSign className="w-5 h-5" />}
          trend={totalProfit > 0 ? 'up' : 'down'}
          color={totalProfit > 0 ? 'green' : 'red'}
        />
        <StatCard 
          title="Win Rate" 
          value={`${winRate.toFixed(1)}%`}
          subValue={`${wonBets}G / ${lostBets}P`}
          icon={<Target className="w-5 h-5" />}
          trend={winRate > 55 ? 'up' : winRate < 45 ? 'down' : 'neutral'}
          color={winRate > 55 ? 'green' : winRate < 45 ? 'red' : 'yellow'}
        />
        <StatCard 
          title="Racha Actual" 
          value={`${currentStreak.type === 'WIN' ? '🔥' : '❄️'} ${currentStreak.count}`}
          subValue={currentStreak.type === 'WIN' ? 'Victorias seguidas' : 'Sin ganar'}
          icon={<Flame className="w-5 h-5" />}
          trend={currentStreak.type === 'WIN' ? 'up' : 'down'}
          color={currentStreak.type === 'WIN' ? 'green' : 'red'}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400">Cuota Promedio</p>
                <p className="text-2xl font-bold text-white">{avgOdds.toFixed(2)}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400">Edge Promedio</p>
                <p className="text-2xl font-bold text-green-400">+{(avgEdge * 100).toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400">Win Rate (Alta Conf.)</p>
                <p className="text-2xl font-bold text-yellow-400">{highConfWinRate.toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bankroll Visual */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Evolución del Bankroll
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BankrollChart bets={[]} />
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryTab({ bets }: { bets: BetRecord[] }) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800">
              <tr className="text-left text-sm text-slate-400">
                <th className="p-4">Fecha</th>
                <th className="p-4">Partido</th>
                <th className="p-4">Apuesta</th>
                <th className="p-4">Cuota</th>
                <th className="p-4">Stake</th>
                <th className="p-4">Resultado</th>
                <th className="p-4 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {bets.map(bet => (
                <tr key={bet.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="p-4 text-sm text-slate-400">{bet.date}</td>
                  <td className="p-4 text-white font-medium">{bet.match}</td>
                  <td className="p-4">
                    <div>
                      <span className="text-white">{bet.market}</span>
                      <span className="text-slate-400 text-sm ml-2">({bet.selection})</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs mt-1",
                        bet.confidence === 'HIGH' ? 'border-green-500 text-green-400' :
                        bet.confidence === 'MEDIUM' ? 'border-yellow-500 text-yellow-400' :
                        'border-slate-600 text-slate-400'
                      )}
                    >
                      {bet.confidence}
                    </Badge>
                  </td>
                  <td className="p-4 text-white">{bet.odds.toFixed(2)}</td>
                  <td className="p-4 text-white">${bet.stake}</td>
                  <td className="p-4">
                    <Badge className={cn(
                      bet.result === 'WON' ? 'bg-green-600' :
                      bet.result === 'LOST' ? 'bg-red-600' :
                      'bg-yellow-600'
                    )}>
                      {bet.result}
                    </Badge>
                  </td>
                  <td className={cn(
                    "p-4 text-right font-bold",
                    bet.profit > 0 ? 'text-green-400' : bet.profit < 0 ? 'text-red-400' : 'text-slate-400'
                  )}>
                    {bet.profit > 0 ? '+' : ''}{bet.profit.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketsTab({ marketStats }: { marketStats: MarketStats[] }) {
  return (
    <div className="space-y-4">
      {marketStats.map(stat => (
        <Card key={stat.market} className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{stat.market}</h3>
                <div className="flex gap-4 text-sm text-slate-400">
                  <span>{stat.totalBets} picks</span>
                  <span>{stat.won}G / {stat.lost}P</span>
                  <span>Cuota avg: {stat.avgOdds.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-right mr-6">
                <p className={cn(
                  "text-2xl font-bold",
                  stat.roi > 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {stat.roi > 0 ? '+' : ''}{stat.roi.toFixed(1)}% ROI
                </p>
                <p className={cn(
                  "text-sm font-medium",
                  stat.totalProfit > 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {stat.totalProfit > 0 ? '+' : ''}${stat.totalProfit.toFixed(0)}
                </p>
              </div>

              <div className="w-32">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Win Rate</span>
                  <span className={cn(
                    "font-medium",
                    stat.winRate > 55 ? 'text-green-400' : stat.winRate < 45 ? 'text-red-400' : 'text-yellow-400'
                  )}>
                    {stat.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      stat.winRate > 55 ? 'bg-green-500' : stat.winRate < 45 ? 'bg-red-500' : 'bg-yellow-500'
                    )}
                    style={{ width: `${Math.min(stat.winRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PerformanceTab({ bets }: { bets: BetRecord[] }) {
  // Calcular rendimiento por nivel de confianza
  const byConfidence = {
    HIGH: bets.filter(b => b.confidence === 'HIGH'),
    MEDIUM: bets.filter(b => b.confidence === 'MEDIUM'),
    LOW: bets.filter(b => b.confidence === 'LOW'),
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Rendimiento por Confianza</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(byConfidence).map(([level, bets]) => {
            const completed = bets.filter(b => b.result !== 'PENDING');
            const won = bets.filter(b => b.result === 'WON').length;
            const winRate = completed.length > 0 ? (won / completed.length) * 100 : 0;
            const profit = bets.reduce((acc, b) => acc + b.profit, 0);
            
            return (
              <div key={level} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <Badge className={cn(
                    level === 'HIGH' ? 'bg-green-600' :
                    level === 'MEDIUM' ? 'bg-yellow-600' : 'bg-slate-600'
                  )}>
                    {level}
                  </Badge>
                  <p className="text-sm text-slate-400 mt-1">{bets.length} picks</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-bold",
                    winRate > 55 ? 'text-green-400' : winRate < 45 ? 'text-red-400' : 'text-yellow-400'
                  )}>
                    {winRate.toFixed(1)}% WR
                  </p>
                  <p className={cn(
                    "text-sm",
                    profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-slate-400'
                  )}>
                    {profit > 0 ? '+' : ''}${profit.toFixed(0)}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Distribución de Edge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { range: 'Edge > 10%', count: bets.filter(b => b.edge > 0.10).length, color: 'bg-green-500' },
              { range: 'Edge 7-10%', count: bets.filter(b => b.edge >= 0.07 && b.edge <= 0.10).length, color: 'bg-green-400' },
              { range: 'Edge 5-7%', count: bets.filter(b => b.edge >= 0.05 && b.edge < 0.07).length, color: 'bg-yellow-500' },
              { range: 'Edge < 5%', count: bets.filter(b => b.edge < 0.05).length, color: 'bg-slate-500' },
            ].map(item => (
              <div key={item.range} className="flex items-center gap-3">
                <div className="w-32 text-sm text-slate-400">{item.range}</div>
                <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${(item.count / bets.length) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-right text-white font-medium">{item.count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ 
  title, value, subValue, icon, trend, color 
}: {
  title: string;
  value: string;
  subValue: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
  color: 'green' | 'red' | 'yellow' | 'neutral';
}) {
  const colors = {
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    neutral: 'bg-slate-800 text-slate-400',
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{subValue}</p>
          </div>
          <div className={cn("p-2 rounded-lg", colors[color])}>
            {icon}
          </div>
        </div>
        {trend !== 'neutral' && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-sm",
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          )}>
            {trend === 'up' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{trend === 'up' ? 'Positivo' : 'Negativo'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BankrollChart({ bets }: { bets: BetRecord[] }) {
  // Simular evolución del bankroll
  let bankroll = 1000;
  const data = bets.map(bet => {
    bankroll += bet.profit;
    return bankroll;
  });

  const max = Math.max(...data, 1000);
  const min = Math.min(...data, 1000);
  const range = max - min;

  return (
    <div className="h-48 flex items-end gap-1">
      {[1000, ...data].map((value, i) => {
        const height = range > 0 ? ((value - min) / range) * 100 : 50;
        const isProfit = i > 0 ? value > [1000, ...data][i - 1] : true;
        
        return (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div 
              className={cn(
                "w-full rounded-t transition-all",
                isProfit ? 'bg-green-500/70' : 'bg-red-500/70'
              )}
              style={{ height: `${Math.max(height, 5)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Funciones helper
function calculateStreak(bets: BetRecord[]): { type: 'WIN' | 'LOSS'; count: number } {
  // Encontrar racha actual (últimos resultados consecutivos)
  const completed = bets.filter(b => b.result !== 'PENDING').reverse();
  if (completed.length === 0) return { type: 'WIN', count: 0 };
  
  const firstResult = completed[0].result;
  let count = 0;
  
  for (const bet of completed) {
    if (bet.result === firstResult) {
      count++;
    } else {
      break;
    }
  }
  
  return { 
    type: firstResult === 'WON' ? 'WIN' : 'LOSS', 
    count 
  };
}

function calculateMarketStats(bets: BetRecord[]): MarketStats[] {
  const markets = ['Over 2.5', '1X2', 'BTTS', 'Corners', 'Cards'];
  
  return markets.map(market => {
    const marketBets = bets.filter(b => b.market.includes(market) || 
      (market === 'Over 2.5' && b.market.includes('Over')) ||
      (market === 'Corners' && b.market.includes('Corners')) ||
      (market === 'Cards' && b.market.includes('Cards'))
    );
    
    const won = marketBets.filter(b => b.result === 'WON').length;
    const lost = marketBets.filter(b => b.result === 'LOST').length;
    const totalProfit = marketBets.reduce((acc, b) => acc + b.profit, 0);
    const totalStaked = marketBets.reduce((acc, b) => acc + b.stake, 0);
    
    return {
      market,
      totalBets: marketBets.length,
      won,
      lost,
      winRate: (won + lost) > 0 ? (won / (won + lost)) * 100 : 0,
      avgOdds: marketBets.length > 0 ? marketBets.reduce((acc, b) => acc + b.odds, 0) / marketBets.length : 0,
      totalProfit,
      roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
    };
  }).filter(m => m.totalBets > 0);
}
