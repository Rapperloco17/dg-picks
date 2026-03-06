'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Play, 
  Save, 
  Download,
  BarChart3,
  Target,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Activity,
  History,
  Zap,
  Sparkles,
  Coins,
  Eye,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Check,
  FileDown,
  Trash2,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  trainModel, 
  saveModel, 
  loadModel, 
  evaluateModel,
  getModelSummary,
  predict,
  createModel
} from '@/services/ml-model';
import { trainMarketModel, predictMarket, MarketType, loadAllMarketModels, saveMarketModel } from '@/services/market-models';
import { runBacktest, BacktestResult } from '@/services/backtesting';
import { getTrainingData, ProcessedMatchData } from '@/services/historical-data';
import { getEnsemblePredictions, EnsemblePredictionResult } from '@/services/ensemble-predictions';
import { placePaperBet, DEFAULT_STRATEGIES, TradingStrategy } from '@/services/paper-trading';
import { calculateKellyStake } from '@/services/backtesting';
import { usePicksStore } from '@/stores/picks-store';
import { useAuthStore } from '@/stores/auth-store';
import { 
  getPredictionHistory, 
  calculatePredictionStats, 
  exportPredictionsToCSV,
  clearPredictionHistory,
  StoredPrediction,
  PredictionStats 
} from '@/services/prediction-history';
import { processValueAlerts } from '@/services/notification-service';
import { NotificationSettingsPanel } from '@/components/notification-settings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function MLPage() {
  const [trainingData, setTrainingData] = useState<ProcessedMatchData[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('1X2');
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [trainingProgress, setTrainingProgress] = useState({
    epoch: 0,
    totalEpochs: 100,
    loss: 0,
    accuracy: 0,
    valLoss: 0,
    valAccuracy: 0,
  });
  const [history, setHistory] = useState<Array<{
    epoch: number;
    loss: number;
    accuracy: number;
    valLoss: number;
    valAccuracy: number;
  }>>([]);
  const [modelMetrics, setModelMetrics] = useState({
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
  });

  // Ensemble predictions
  const [ensemblePredictions, setEnsemblePredictions] = useState<EnsemblePredictionResult[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [minEVFilter, setMinEVFilter] = useState(0.05);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  // Advanced filters
  const [selectedLeague, setSelectedLeague] = useState<number | 'ALL'>('ALL');
  const [filterMarket, setFilterMarket] = useState<MarketType | 'ALL'>('ALL');
  const [minOddsFilter, setMinOddsFilter] = useState(1.5);
  const [maxOddsFilter, setMaxOddsFilter] = useState(5.0);
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3 | 'ALL'>('ALL');

  // Prediction history
  const [predictionHistory, setPredictionHistory] = useState<StoredPrediction[]>([]);
  const [predictionStats, setPredictionStats] = useState<PredictionStats | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [showHistory, setShowHistory] = useState(false);

  // Get unique leagues from predictions
  const availableLeagues = Array.from(new Set(ensemblePredictions.map(r => r.match.league.id)))
    .map(id => {
      const match = ensemblePredictions.find(r => r.match.league.id === id);
      return { id, name: match?.match.league.name || '' };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filter predictions
  const filteredPredictions = ensemblePredictions.filter(result => {
    if (selectedLeague !== 'ALL' && result.match.league.id !== selectedLeague) return false;
    if (selectedTier !== 'ALL' && result.leagueTier !== selectedTier) return false;
    
    // Filter predictions within each result
    const filteredPreds = result.predictions.filter(pred => {
      if (filterMarket !== 'ALL' && pred.market !== filterMarket) return false;
      if (pred.odds && (pred.odds < minOddsFilter || pred.odds > maxOddsFilter)) return false;
      if (pred.ev < minEVFilter) return false;
      return true;
    });
    
    // Only include results that have matching predictions
    return filteredPreds.length > 0;
  }).map(result => ({
    ...result,
    predictions: result.predictions.filter(pred => {
      if (filterMarket !== 'ALL' && pred.market !== filterMarket) return false;
      if (pred.odds && (pred.odds < minOddsFilter || pred.odds > maxOddsFilter)) return false;
      if (pred.ev < minEVFilter) return false;
      return true;
    })
  }));

  // Backtest config
  const [backtestConfig, setBacktestConfig] = useState({
    minEV: 0.05,
    minProbability: 50,
    stake: 10,
    kellyFraction: 0.25,
  });

  useEffect(() => {
    checkModelStatus();
    loadData();
    loadPredictionHistory();
  }, []);

  const loadPredictionHistory = () => {
    const history = getPredictionHistory();
    setPredictionHistory(history);
    setPredictionStats(calculatePredictionStats());
  };

  const checkModelStatus = async () => {
    const loaded = await loadModel();
    const marketModels = await loadAllMarketModels();
    setIsModelLoaded(loaded || Object.values(marketModels).some(Boolean));
  };

  const loadData = async () => {
    const data = await getTrainingData();
    setTrainingData(data);
  };

  const loadEnsemblePredictions = async () => {
    setIsLoadingPredictions(true);
    try {
      const predictions = await getEnsemblePredictions(undefined, minEVFilter);
      setEnsemblePredictions(predictions);
      
      // Process value alerts for high EV predictions
      processValueAlerts(predictions);
      
      toast.success(`${predictions.length} oportunidades de valor encontradas`);
    } catch (error) {
      toast.error('Error cargando predicciones');
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const handlePaperTrade = async (result: EnsemblePredictionResult, prediction: EnsemblePredictionResult['predictions'][0]) => {
    try {
      const stake = calculateKellyStake(prediction.probability / 100, prediction.odds || 2, 10, 0.25);
      
      const betResult = placePaperBet({
        userId: 'paper-trading',
        matchId: result.match.fixture.id,
        leagueId: result.match.league.id,
        leagueName: result.match.league.name,
        homeTeam: result.match.teams.home.name,
        awayTeam: result.match.teams.away.name,
        matchDate: result.match.fixture.date,
        market: prediction.market,
        selection: prediction.selection,
        odds: prediction.odds || 2,
        stake,
        confidence: Math.min(10, Math.floor(prediction.probability / 10)) as 1|2|3|4|5|6|7|8|9|10,
        notes: `Ensemble prediction - EV: ${(prediction.ev * 100).toFixed(1)}% - Consensus: ${prediction.consensus}`,
        simulatedOdds: prediction.odds || 2,
        evAtPlacement: prediction.ev,
        modelConfidence: prediction.probability / 100,
      }, DEFAULT_STRATEGIES[0]);

      if (betResult.success) {
        toast.success(`Apuesta virtual de ${stake.toFixed(2)}u colocada`);
      } else {
        toast.error(betResult.message);
      }
    } catch (error) {
      toast.error('Error al colocar apuesta');
    }
  };

  const [createdPicks, setCreatedPicks] = useState<Set<string>>(new Set());

  const handleCreateRealPick = async (result: EnsemblePredictionResult, prediction: EnsemblePredictionResult['predictions'][0]) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      toast.error('Debes iniciar sesión para crear picks');
      return;
    }

    try {
      const pickId = await usePicksStore.getState().addPick({
        userId: user.uid,
        matchId: result.match.fixture.id,
        leagueId: result.match.league.id,
        leagueName: result.match.league.name,
        homeTeam: result.match.teams.home.name,
        awayTeam: result.match.teams.away.name,
        matchDate: result.match.fixture.date,
        market: prediction.market,
        selection: prediction.selection,
        odds: prediction.odds || 2,
        stake: 1, // Default stake
        confidence: Math.min(10, Math.floor(prediction.probability / 10)) as 1|2|3|4|5|6|7|8|9|10,
        notes: `Ensemble prediction - EV: ${(prediction.ev * 100).toFixed(1)}% - Consensus: ${prediction.consensus} - Modelos: ${prediction.modelContributions.map(m => m.model).join(', ')}`,
      });

      setCreatedPicks(prev => new Set(prev).add(`${result.match.fixture.id}-${prediction.market}-${prediction.selection}`));
      toast.success('Pick creado exitosamente');
    } catch (error) {
      toast.error('Error al crear pick');
    }
  };

  const handleExportHistory = () => {
    const csv = exportPredictionsToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediction-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Histórico exportado');
  };

  const handleClearHistory = () => {
    if (confirm('¿Estás seguro de que quieres borrar todo el histórico?')) {
      clearPredictionHistory();
      loadPredictionHistory();
      toast.success('Histórico borrado');
    }
  };

  const handleTrain = async () => {
    if (trainingData.length < 100) {
      toast.error('Se necesitan al menos 100 partidos');
      return;
    }

    setIsTraining(true);
    setHistory([]);

    try {
      // Train general model
      const history = await trainModel(
        trainingData,
        (epoch, logs) => {
          setTrainingProgress({
            epoch: epoch + 1,
            totalEpochs: 100,
            loss: logs.loss,
            accuracy: logs.acc,
            valLoss: logs.val_loss,
            valAccuracy: logs.val_acc,
          });
          
          setHistory(prev => [...prev, {
            epoch: epoch + 1,
            loss: logs.loss,
            accuracy: logs.acc,
            valLoss: logs.val_loss,
            valAccuracy: logs.val_acc,
          }]);
        }
      );

      // Train market-specific models
      const markets: MarketType[] = ['BTTS', 'OVER_UNDER_25'];
      for (const market of markets) {
        toast.info(`Entrenando modelo ${market}...`);
        await trainMarketModel(market, trainingData);
        await saveMarketModel(market);
      }

      const predictions = trainingData.slice(0, 100).map(match => ({
        actual: [match.target.homeWin ? 1 : 0, match.target.draw ? 1 : 0, match.target.awayWin ? 1 : 0],
        predicted: Object.values(predict(match)).slice(0, 3).map((v: any) => v / 100),
      }));

      const metrics = evaluateModel(predictions);
      setModelMetrics(metrics);
      setIsModelLoaded(true);

      toast.success('Entrenamiento completado');
    } catch (error: any) {
      toast.error(error.message || 'Error en el entrenamiento');
    } finally {
      setIsTraining(false);
    }
  };

  const handleRunBacktest = () => {
    if (trainingData.length < 50) {
      toast.error('Se necesitan al menos 50 partidos para backtest');
      return;
    }

    const result = runBacktest(trainingData, {
      minEV: backtestConfig.minEV,
      minProbability: backtestConfig.minProbability,
      stake: backtestConfig.stake,
      kellyFraction: backtestConfig.kellyFraction,
    });

    setBacktestResult(result);
    toast.success('Backtest completado');
  };

  const handleSaveModel = async () => {
    try {
      await saveModel();
      toast.success('Modelo guardado');
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Machine Learning Avanzado</h1>
        <p className="text-sm text-slate-400 mt-1">
          Modelos predictivos para múltiples mercados con backtesting
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isModelLoaded ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
                <Brain className={`w-5 h-5 ${isModelLoaded ? 'text-emerald-400' : 'text-slate-500'}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Estado</p>
                <p className={`text-sm font-medium ${isModelLoaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isModelLoaded ? 'Listo' : 'Sin entrenar'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Accuracy</p>
                <p className="text-sm font-medium text-slate-100">
                  {(modelMetrics.accuracy * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">F1 Score</p>
                <p className="text-sm font-medium text-slate-100">
                  {(modelMetrics.f1Score * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <DatabaseIcon />
              </div>
              <div>
                <p className="text-xs text-slate-400">Datos</p>
                <p className="text-sm font-medium text-slate-100">
                  {trainingData.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="predictions" className="data-[state=active]:bg-slate-800">
            <Sparkles className="w-4 h-4 mr-2" />
            Predicciones
          </TabsTrigger>
          <TabsTrigger value="training" className="data-[state=active]:bg-slate-800">
            <Brain className="w-4 h-4 mr-2" />
            Entrenamiento
          </TabsTrigger>
          <TabsTrigger value="backtest" className="data-[state=active]:bg-slate-800">
            <History className="w-4 h-4 mr-2" />
            Backtest
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-slate-800">
            <BarChart3 className="w-4 h-4 mr-2" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-slate-800">
            <History className="w-4 h-4 mr-2" />
            Histórico
            {predictionStats && predictionStats.totalPredictions > 0 && (
              <Badge className="ml-2 bg-slate-700 text-slate-300 text-xs">
                {predictionStats.totalPredictions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-slate-800">
            <Bell className="w-4 h-4 mr-2" />
            Alertas
          </TabsTrigger>
        </TabsList>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Predicciones Ensemble
                    {filteredPredictions.length > 0 && (
                      <Badge className="bg-slate-800 text-slate-300 ml-2">
                        {filteredPredictions.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Predicciones combinando XGBoost, Neural Network, Poisson y ELO
                    {filteredPredictions.length > 0 && (
                      <span className="ml-2">
                        ({filteredPredictions.filter(r => r.usingRealOdds).length} con odds reales, {filteredPredictions.filter(r => !r.usingRealOdds).length} simuladas)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={loadEnsemblePredictions}
                    disabled={isLoadingPredictions}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {isLoadingPredictions ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...</>
                    ) : (
                      <><Target className="w-4 h-4 mr-2" /> Buscar Valor</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* League Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Liga</Label>
                    <Select value={String(selectedLeague)} onValueChange={(v) => setSelectedLeague(v === 'ALL' ? 'ALL' : Number(v))}>
                      <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="ALL">Todas las ligas</SelectItem>
                        {availableLeagues.map(league => (
                          <SelectItem key={league.id} value={String(league.id)}>{league.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Market Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Mercado</Label>
                    <Select value={filterMarket} onValueChange={(v) => setFilterMarket(v as MarketType | 'ALL')}>
                      <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="1X2">1X2</SelectItem>
                        <SelectItem value="BTTS">BTTS</SelectItem>
                        <SelectItem value="OVER_UNDER_25">Over/Under 2.5</SelectItem>
                        <SelectItem value="OVER_UNDER_15">Over/Under 1.5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tier Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Tier</Label>
                    <Select value={String(selectedTier)} onValueChange={(v) => setSelectedTier(v === 'ALL' ? 'ALL' : Number(v) as 1|2|3)}>
                      <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="1">Tier 1 (Top)</SelectItem>
                        <SelectItem value="2">Tier 2</SelectItem>
                        <SelectItem value="3">Tier 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Min Odds */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Min Odds: {minOddsFilter.toFixed(2)}</Label>
                    <Slider 
                      value={[minOddsFilter]} 
                      onValueChange={([v]) => setMinOddsFilter(v)}
                      min={1.1} max={3} step={0.1}
                    />
                  </div>

                  {/* Max Odds */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Max Odds: {maxOddsFilter.toFixed(2)}</Label>
                    <Slider 
                      value={[maxOddsFilter]} 
                      onValueChange={([v]) => setMaxOddsFilter(v)}
                      min={2} max={10} step={0.5}
                    />
                  </div>
                </div>

                {/* Min EV Row */}
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500">Min EV: {(minEVFilter * 100).toFixed(0)}%</Label>
                    <Slider 
                      value={[minEVFilter * 100]} 
                      onValueChange={([v]) => setMinEVFilter(v / 100)}
                      min={0} max={20} step={1}
                      className="w-32"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedLeague('ALL');
                      setFilterMarket('ALL');
                      setSelectedTier('ALL');
                      setMinOddsFilter(1.5);
                      setMaxOddsFilter(5.0);
                      setMinEVFilter(0.05);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ensemblePredictions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No hay predicciones disponibles</p>
                  <p className="text-xs mt-2">Haz click en "Buscar Valor" para analizar partidos del día</p>
                </div>
              ) : filteredPredictions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Ninguna predicción coincide con los filtros</p>
                  <p className="text-xs mt-2">Intenta ajustar los filtros para ver más resultados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPredictions.map((result) => (
                    <Card key={result.match.fixture.id} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[60px]">
                              <p className="text-xs text-slate-500">
                                {new Date(result.match.fixture.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <div className="flex gap-1 justify-center mt-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    result.leagueTier === 1 ? 'border-amber-500/30 text-amber-400' :
                                    result.leagueTier === 2 ? 'border-slate-500/30 text-slate-400' :
                                    'border-slate-600/30 text-slate-500'
                                  }`}
                                >
                                  T{result.leagueTier}
                                </Badge>
                                {result.usingRealOdds && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs border-emerald-500/30 text-emerald-400"
                                    title="Odds reales de bookmakers"
                                  >
                                    LIVE
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200">
                                {result.match.teams.home.name} vs {result.match.teams.away.name}
                              </p>
                              <p className="text-xs text-slate-500">{result.match.league.name}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedMatch(expandedMatch === result.match.fixture.id ? null : result.match.fixture.id)}
                          >
                            {expandedMatch === result.match.fixture.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        <div className="mt-3 space-y-2">
                          {result.predictions.slice(0, expandedMatch === result.match.fixture.id ? undefined : 2).map((pred, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50"
                            >
                              <div className="flex items-center gap-3">
                                <Badge className={`${
                                  pred.market === '1X2' ? 'bg-blue-500/10 text-blue-400' :
                                  pred.market === 'BTTS' ? 'bg-violet-500/10 text-violet-400' :
                                  pred.market.includes('OVER_UNDER') ? 'bg-emerald-500/10 text-emerald-400' :
                                  'bg-slate-500/10 text-slate-400'
                                }`}>
                                  {pred.market}
                                </Badge>
                                <span className="text-sm font-medium text-slate-200">{pred.selection}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    pred.confidence === 'high' ? 'border-emerald-500/30 text-emerald-400' :
                                    pred.confidence === 'medium' ? 'border-amber-500/30 text-amber-400' :
                                    'border-slate-500/30 text-slate-400'
                                  }`}
                                >
                                  {pred.probability.toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Odds</p>
                                  <p className="text-sm font-medium text-slate-300">{pred.odds?.toFixed(2)}</p>
                                </div>
                                <div className="text-right min-w-[50px]">
                                  <p className="text-xs text-slate-500">EV</p>
                                  <p className={`text-sm font-bold ${pred.ev > 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    +{(pred.ev * 100).toFixed(1)}%
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handlePaperTrade(result, pred)}
                                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  >
                                    <Coins className="w-3 h-3 mr-1" />
                                    Paper
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleCreateRealPick(result, pred)}
                                    disabled={createdPicks.has(`${result.match.fixture.id}-${pred.market}-${pred.selection}`)}
                                    className={`${
                                      createdPicks.has(`${result.match.fixture.id}-${pred.market}-${pred.selection}`)
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}
                                  >
                                    {createdPicks.has(`${result.match.fixture.id}-${pred.market}-${pred.selection}`) ? (
                                      <><Check className="w-3 h-3 mr-1" /> Creado</>
                                    ) : (
                                      <><PlusCircle className="w-3 h-3 mr-1" /> Pick</>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {expandedMatch === result.match.fixture.id && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-500 mb-2">Contribución de Modelos</p>
                            {result.predictions[0]?.modelContributions.map((contrib, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs mb-1">
                                <span className="text-slate-400 w-24">{contrib.model}</span>
                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-amber-500 rounded-full"
                                    style={{ width: `${contrib.probability}%` }}
                                  />
                                </div>
                                <span className="text-slate-500 w-12 text-right">{contrib.probability.toFixed(1)}%</span>
                                <span className="text-slate-600">({(contrib.weight * 100).toFixed(0)}%)</span>
                              </div>
                            ))}
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-slate-500">Consenso:</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  result.predictions[0]?.consensus === 'strong' ? 'border-emerald-500/30 text-emerald-400' :
                                  result.predictions[0]?.consensus === 'moderate' ? 'border-amber-500/30 text-amber-400' :
                                  'border-rose-500/30 text-rose-400'
                                }`}
                              >
                                {result.predictions[0]?.consensus === 'strong' ? 'Fuerte' :
                                 result.predictions[0]?.consensus === 'moderate' ? 'Moderado' : 'Débil'}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Entrenar Modelos</CardTitle>
              <CardDescription className="text-slate-400">
                Entrena modelos para 1X2, BTTS y Over/Under
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainingData.length < 100 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-400">
                    Se necesitan al menos 100 partidos. Ve a Admin → Recolección.
                  </p>
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button 
                  onClick={handleTrain}
                  disabled={isTraining || trainingData.length < 100}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isTraining ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrenando...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Entrenar Todos</>
                  )}
                </Button>
                {isModelLoaded && (
                  <Button onClick={handleSaveModel} variant="outline">
                    <Save className="w-4 h-4 mr-2" /> Guardar
                  </Button>
                )}
              </div>

              {isTraining && (
                <div className="space-y-4 pt-4">
                  <Progress value={(trainingProgress.epoch / 100) * 100} className="h-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Loss: {trainingProgress.loss.toFixed(4)}</div>
                    <div className="text-emerald-400">Acc: {(trainingProgress.accuracy * 100).toFixed(2)}%</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="epoch" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                      <Line type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="valAccuracy" stroke="#3b82f6" name="Val Acc" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Backtest Tab */}
        <TabsContent value="backtest" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Configuración Backtest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min EV: {(backtestConfig.minEV * 100).toFixed(0)}%</Label>
                  <Slider 
                    value={[backtestConfig.minEV * 100]} 
                    onValueChange={([v]) => setBacktestConfig(prev => ({ ...prev, minEV: v / 100 }))}
                    min={0} max={20} step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Prob: {backtestConfig.minProbability}%</Label>
                  <Slider 
                    value={[backtestConfig.minProbability]} 
                    onValueChange={([v]) => setBacktestConfig(prev => ({ ...prev, minProbability: v }))}
                    min={30} max={80} step={5}
                  />
                </div>
              </div>
              <Button onClick={handleRunBacktest} className="bg-emerald-500 hover:bg-emerald-600">
                <Zap className="w-4 h-4 mr-2" /> Ejecutar Backtest
              </Button>
            </CardContent>
          </Card>

          {backtestResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">ROI</p>
                    <p className={`text-2xl font-bold ${backtestResult.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {backtestResult.roi.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">Win Rate</p>
                    <p className="text-2xl font-bold text-slate-100">
                      {backtestResult.winRate.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">Profit</p>
                    <p className={`text-2xl font-bold ${backtestResult.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {backtestResult.profit.toFixed(1)}u
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">Sharpe</p>
                    <p className="text-2xl font-bold text-slate-100">
                      {backtestResult.sharpeRatio.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {backtestResult.monthlyResults.length > 0 && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Resultados Mensuales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={backtestResult.monthlyResults}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="month" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                          <Bar dataKey="profit" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xs text-slate-400 mb-1">Accuracy</p>
              <p className="text-2xl font-bold text-slate-100">
                {(modelMetrics.accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xs text-slate-400 mb-1">Precision</p>
              <p className="text-2xl font-bold text-blue-400">
                {(modelMetrics.precision * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xs text-slate-400 mb-1">Recall</p>
              <p className="text-2xl font-bold text-violet-400">
                {(modelMetrics.recall * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xs text-slate-400 mb-1">F1 Score</p>
              <p className="text-2xl font-bold text-emerald-400">
                {(modelMetrics.f1Score * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Arquitectura</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Input Features</span>
                  <Badge className="bg-blue-500/10 text-blue-400">28</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Hidden Layers</span>
                  <Badge className="bg-violet-500/10 text-violet-400">64→32→16</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Output</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400">3 (1X2)</Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Optimizer</span>
                  <Badge className="bg-slate-700">Adam (lr=0.001)</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {!predictionStats || predictionStats.totalPredictions === 0 ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-12 text-center">
                <History className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">No hay predicciones en el histórico</p>
                <p className="text-sm text-slate-500 mt-2">
                  Ve a "Predicciones" y busca valor para empezar a guardar predicciones
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Total Predicciones</p>
                    <p className="text-2xl font-bold text-slate-100">{predictionStats.totalPredictions}</p>
                    <p className="text-xs text-slate-500">
                      {predictionStats.pendingPredictions} pendientes
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Win Rate</p>
                    <p className={`text-2xl font-bold ${predictionStats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {predictionStats.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {predictionStats.wonPredictions}W / {predictionStats.lostPredictions}L
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Profit Total</p>
                    <p className={`text-2xl font-bold ${predictionStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {predictionStats.totalProfit >= 0 ? '+' : ''}{predictionStats.totalProfit.toFixed(1)}u
                    </p>
                    <p className="text-xs text-slate-500">
                      ROI: {predictionStats.roi.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">EV Promedio</p>
                    <p className="text-2xl font-bold text-blue-400">
                      +{(predictionStats.avgEV * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      Odds avg: {predictionStats.avgOdds.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* By Market Stats */}
              {Object.keys(predictionStats.byMarket).length > 0 && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100 text-base">Por Mercado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(predictionStats.byMarket).map(([market, stats]) => (
                        <div key={market} className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">{market}</p>
                          <p className="text-lg font-bold text-slate-200">{stats.winRate.toFixed(0)}%</p>
                          <p className="text-xs text-slate-500">
                            {stats.wins}W/{stats.losses}L | {stats.profit >= 0 ? '+' : ''}{stats.profit.toFixed(1)}u
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Consensus Stats */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-100 text-base">Por Consenso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(predictionStats.byConsensus).map(([consensus, stats]) => (
                      <div key={consensus} className="p-3 bg-slate-800/50 rounded-lg text-center">
                        <p className="text-xs text-slate-500 mb-1 capitalize">
                          {consensus === 'strong' ? 'Fuerte' : consensus === 'moderate' ? 'Moderado' : 'Débil'}
                        </p>
                        <p className="text-lg font-bold text-slate-200">{stats.winRate.toFixed(0)}%</p>
                        <p className="text-xs text-slate-500">{stats.predictions} predicciones</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleExportHistory}
                  className="border-slate-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClearHistory}
                  className="border-rose-700 text-rose-400 hover:bg-rose-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Borrar Histórico
                </Button>
              </div>

              {/* Recent Predictions List */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-100 text-base">Predicciones Recientes</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={historyFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setHistoryFilter('all')}
                        className="h-7 text-xs"
                      >
                        Todas
                      </Button>
                      <Button 
                        size="sm" 
                        variant={historyFilter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setHistoryFilter('pending')}
                        className="h-7 text-xs"
                      >
                        Pendientes
                      </Button>
                      <Button 
                        size="sm" 
                        variant={historyFilter === 'settled' ? 'default' : 'outline'}
                        onClick={() => setHistoryFilter('settled')}
                        className="h-7 text-xs"
                      >
                        Resueltas
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {predictionHistory
                      .filter(p => {
                        if (historyFilter === 'pending') return p.result === 'PENDING';
                        if (historyFilter === 'settled') return p.result !== 'PENDING';
                        return true;
                      })
                      .slice(0, 20)
                      .map(prediction => (
                        <div 
                          key={prediction.id} 
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-center min-w-[50px]">
                              <p className="text-xs text-slate-500">{prediction.date}</p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  prediction.leagueTier === 1 ? 'border-amber-500/30 text-amber-400' :
                                  prediction.leagueTier === 2 ? 'border-slate-500/30 text-slate-400' :
                                  'border-slate-600/30 text-slate-500'
                                }`}
                              >
                                T{prediction.leagueTier}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm text-slate-200">
                                {prediction.homeTeam} vs {prediction.awayTeam}
                              </p>
                              <p className="text-xs text-slate-500">
                                {prediction.market} - {prediction.selection}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Prob</p>
                              <p className="text-sm font-medium text-slate-300">{prediction.probability.toFixed(0)}%</p>
                            </div>
                            <div className="text-right min-w-[50px]">
                              <p className="text-xs text-slate-500">EV</p>
                              <p className="text-sm font-bold text-emerald-400">+{(prediction.ev * 100).toFixed(1)}%</p>
                            </div>
                            {prediction.result === 'PENDING' ? (
                              <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                                Pendiente
                              </Badge>
                            ) : (
                              <div className="text-right min-w-[50px]">
                                <Badge className={`${
                                  prediction.result === 'WON' 
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                  {prediction.result === 'WON' ? '✓' : '✗'}
                                </Badge>
                                {prediction.profit !== undefined && (
                                  <p className={`text-xs ${prediction.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {prediction.profit >= 0 ? '+' : ''}{prediction.profit.toFixed(1)}u
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <NotificationSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}
