'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Wallet, 
  Target, 
  Activity,
  RotateCcw,
  Settings,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  initializePaperTrading, 
  getPaperBets, 
  settlePaperBet,
  getPerformanceReport,
  resetPaperTrading,
  getActiveStrategy,
  setActiveStrategy,
  getTradingStrategies,
  TradingStrategy,
  PaperBet
} from '@/services/paper-trading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function PaperTradingPage() {
  const [account, setAccount] = useState(initializePaperTrading(100));
  const [bets, setBets] = useState<PaperBet[]>([]);
  const [activeStrategy, setActiveStrategyState] = useState<TradingStrategy | null>(null);
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [performance, setPerformance] = useState<{
    dailyPnL: any[];
    byMarket: any;
    byOddsRange: any[];
  } | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const acc = initializePaperTrading();
    const betList = getPaperBets();
    const strategy = getActiveStrategy();
    const strategyList = getTradingStrategies();
    const perf = getPerformanceReport();
    
    setAccount(acc);
    setBets(betList);
    setActiveStrategyState(strategy);
    setStrategies(strategyList);
    setPerformance({
      dailyPnL: perf.dailyPnL,
      byMarket: perf.byMarket,
      byOddsRange: perf.byOddsRange,
    });
  };

  const handleSettleBet = (betId: string, result: 'WON' | 'LOST') => {
    settlePaperBet(betId, result);
    loadData();
    toast.success(`Apuesta marcada como ${result === 'WON' ? 'ganada' : 'perdida'}`);
  };

  const handleChangeStrategy = (strategyName: string) => {
    setActiveStrategy(strategyName);
    const strategy = strategies.find(s => s.name === strategyName);
    setActiveStrategyState(strategy || null);
    toast.success(`Estrategia cambiada a: ${strategyName}`);
  };

  const handleReset = () => {
    resetPaperTrading();
    setShowResetDialog(false);
    loadData();
    toast.success('Cuenta de paper trading reiniciada');
  };

  const pendingBets = bets.filter(b => b.result === 'PENDING');
  const settledBets = bets.filter(b => b.result !== 'PENDING').slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Paper Trading</h1>
          <p className="text-sm text-slate-400 mt-1">
            Simula estrategias sin riesgo de dinero real
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={activeStrategy?.name} onValueChange={handleChangeStrategy}>
            <SelectTrigger className="w-[200px] bg-slate-900 border-slate-800">
              <Settings className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estrategia" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {strategies.map(s => (
                <SelectItem key={s.name} value={s.name} className="text-slate-100">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Balance</p>
                <p className={`text-xl font-bold ${account.currentBalance >= account.initialBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {account.currentBalance.toFixed(1)}u
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">ROI</p>
                <p className={`text-xl font-bold ${account.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {account.roi.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Win Rate</p>
                <p className="text-xl font-bold text-slate-100">
                  {account.totalBets > 0 ? ((account.wonBets / account.totalBets) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Yield</p>
                <p className={`text-xl font-bold ${account.yield >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {account.yield.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Info */}
      {activeStrategy && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-100 text-base">Estrategia Activa: {activeStrategy.name}</CardTitle>
            <CardDescription className="text-slate-400">{activeStrategy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-slate-800">Min EV: {(activeStrategy.minEV * 100).toFixed(0)}%</Badge>
              <Badge variant="secondary" className="bg-slate-800">Odds: {activeStrategy.minOdds.toFixed(1)}-{activeStrategy.maxOdds.toFixed(1)}</Badge>
              <Badge variant="secondary" className="bg-slate-800">Confianza: {activeStrategy.minConfidence}%+</Badge>
              <Badge variant="secondary" className="bg-slate-800">Stake: {activeStrategy.stakeType}</Badge>
              <Badge variant="secondary" className="bg-slate-800">Max apuestas/día: {activeStrategy.dailyBetLimit}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="bets" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="bets" className="data-[state=active]:bg-slate-800">
            Apuestas ({pendingBets.length} pendientes)
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-slate-800">
            Rendimiento
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-800">
            Análisis
          </TabsTrigger>
        </TabsList>

        {/* Bets Tab */}
        <TabsContent value="bets" className="space-y-4">
          {pendingBets.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 text-base">Apuestas Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingBets.map(bet => (
                    <div key={bet.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          {bet.homeTeam} vs {bet.awayTeam}
                        </p>
                        <p className="text-xs text-slate-400">
                          {bet.market}: {bet.selection} @ {bet.simulatedOdds.toFixed(2)} | Stake: {bet.stake}u | EV: {(bet.evAtPlacement * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-emerald-500 hover:bg-emerald-600"
                          onClick={() => handleSettleBet(bet.id, 'WON')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Ganó
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleSettleBet(bet.id, 'LOST')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Perdió
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {settledBets.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 text-base">Historial</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Partido</TableHead>
                      <TableHead className="text-slate-400">Selección</TableHead>
                      <TableHead className="text-slate-400">Cuota</TableHead>
                      <TableHead className="text-slate-400">Stake</TableHead>
                      <TableHead className="text-slate-400">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settledBets.map(bet => (
                      <TableRow key={bet.id} className="border-slate-800">
                        <TableCell className="text-slate-300 text-sm">
                          {bet.homeTeam} vs {bet.awayTeam}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">{bet.selection}</TableCell>
                        <TableCell className="text-slate-300 text-sm">{bet.simulatedOdds.toFixed(2)}</TableCell>
                        <TableCell className="text-slate-300 text-sm">{bet.stake}u</TableCell>
                        <TableCell>
                          <Badge className={
                            bet.result === 'WON' ? 'bg-emerald-500' :
                            bet.result === 'LOST' ? 'bg-rose-500' :
                            'bg-slate-500'
                          }>
                            {bet.result === 'WON' ? `+${bet.profit?.toFixed(1)}u` :
                             bet.result === 'LOST' ? `-${bet.stake}u` :
                             'Nula'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {performance && performance.dailyPnL.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">P&L Diario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performance.dailyPnL}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                        formatter={(value: any) => [`${Number(value).toFixed(2)}u`, 'Profit']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorProfit)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {performance && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-100">Por Mercado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(performance.byMarket).filter(([_, m]: [string, any]) => m.bets > 0).map(([market, data]: [string, any]) => ({ market, ...data }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="market" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                        <Bar dataKey="profit" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-100">Por Rango de Cuotas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performance.byOddsRange}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="range" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                        <Bar dataKey="roi" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Reiniciar Paper Trading</DialogTitle>
            <DialogDescription className="text-slate-400">
              Esto eliminará todas las apuestas y reiniciará el balance a 100u. ¿Estás seguro?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reiniciar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
