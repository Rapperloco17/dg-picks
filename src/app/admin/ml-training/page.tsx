'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Database, 
  Play, 
  Download,
  TrendingUp,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  Target,
  History,
  Activity,
  Zap,
  ChevronRight,
  Percent,
  Award,
  HardDrive
} from 'lucide-react';
import { 
  trainStatisticalModel, 
  getTrainedModel, 
  hasTrainedModel,
  subscribeToTrainingProgress,
  getTrainingState,
  getTrainingLogs,
  TrainingMetrics,
  TrainedModel
} from '@/services/ml-trainer';
import { runBacktest, runQuickBacktest, BacktestResults } from '@/services/backtest-service';
import { useLocalData } from '@/services/local-data-provider';
import { 
  loadAllEnrichedData, 
  loadPriorityEnrichedData,
  isEnrichedDataLoaded,
  getEnrichedDataSummary,
  subscribeToEnrichedLoadProgress
} from '@/services/enriched-data-loader';
import { 
  loadAllLocalData,
  getPersistentDataInfo 
} from '@/services/local-data-loader';
import { historicalData } from '@/services/historical-data-store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function MLTrainingPage() {
  const [activeTab, setActiveTab] = useState('train');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStage, setTrainingStage] = useState('');
  const [trainedModel, setTrainedModel] = useState<TrainedModel | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [localSummary, setLocalSummary] = useState<{ totalMatches: number; totalLeagues: number } | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [dataType, setDataType] = useState<'enriched' | 'basic'>('enriched');
  const [persistentInfo, setPersistentInfo] = useState<any>(null);

  // Cargar modelo existente y datos enriquecidos
  useEffect(() => {
    const model = getTrainedModel();
    if (model) {
      setTrainedModel(model);
    }
    
    // Obtener info de datos persistentes
    setPersistentInfo(getPersistentDataInfo());
    
    // Cargar datos enriquecidos si no están cargados
    if (!historicalData.isDataLoaded() && !isLoadingData) {
      loadEnrichedData();
    } else if (historicalData.isDataLoaded()) {
      setDataLoaded(true);
      setLocalSummary(historicalData.getSummary());
    }
  }, []);
  
  const loadEnrichedData = async () => {
    setIsLoadingData(true);
    try {
      // Intentar cargar todos los datos enriquecidos
      const success = await loadAllEnrichedData();
      if (success) {
        setDataLoaded(true);
        setDataType('enriched');
        setLocalSummary(historicalData.getSummary());
        console.log('[ML Training] Datos enriquecidos cargados:', historicalData.getSummary());
      }
    } catch (error) {
      console.error('Error loading enriched data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };
  
  const loadPriorityData = async () => {
    setIsLoadingData(true);
    try {
      // Cargar solo top 5 ligas para pruebas rápidas
      const success = await loadPriorityEnrichedData();
      if (success) {
        setDataLoaded(true);
        setDataType('enriched');
        setLocalSummary(historicalData.getSummary());
      }
    } catch (error) {
      console.error('Error loading priority data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Suscribirse a progreso de entrenamiento
  useEffect(() => {
    const unsubscribe = subscribeToTrainingProgress((state) => {
      setIsTraining(state.isTraining);
      setTrainingProgress(state.progress);
      setTrainingStage(state.stage);
      setTrainingLogs(state.logs || []);
      if (state.metrics && !state.isTraining) {
        setTrainedModel(getTrainedModel());
      }
    });
    return unsubscribe;
  }, []);
  
  // Actualizar logs periódicamente
  useEffect(() => {
    if (!isTraining) return;
    const interval = setInterval(() => {
      setTrainingLogs(getTrainingLogs());
    }, 1000);
    return () => clearInterval(interval);
  }, [isTraining]);

  const handleTrain = async () => {
    try {
      setIsTraining(true);
      const model = await trainStatisticalModel({
        testSize: 0.2,
        epochs: 100,
        learningRate: 0.01,
        batchSize: 32,
      });
      setTrainedModel(model);
    } catch (error) {
      console.error('Training error:', error);
    }
  };

  const handleBacktest = async () => {
    setIsBacktesting(true);
    try {
      const results = await runQuickBacktest();
      setBacktestResults(results);
    } catch (error) {
      console.error('Backtest error:', error);
    } finally {
      setIsBacktesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-500" />
            Entrenamiento ML
          </h1>
          <p className="text-muted-foreground">
            Entrena modelos con datos históricos y realiza backtesting
          </p>
        </div>
        
        {trainedModel && (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
            <CheckCircle className="w-3 h-3 mr-1" />
            Modelo Entrenado
          </Badge>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                {isLoadingData ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : dataLoaded ? (
                  <Database className="w-5 h-5 text-blue-500" />
                ) : (
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {dataType === 'enriched' ? 'Partidos Enriquecidos' : 'Partidos Disponibles'}
                </p>
                <p className="text-xl font-bold">
                  {isLoadingData ? 'Cargando...' : localSummary?.totalMatches?.toLocaleString() || '-'}
                </p>
                {dataType === 'enriched' && dataLoaded && (
                  <p className="text-xs text-green-500">Con corners, tarjetas, posesión</p>
                )}
                {persistentInfo?.hasData && (
                  <p className="text-xs text-blue-500">
                    Guardado ({persistentInfo.age})
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="text-xl font-bold">
                  {trainedModel ? `${trainedModel.metrics.accuracy.toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">F1 Score</p>
                <p className="text-xl font-bold">
                  {trainedModel ? `${trainedModel.metrics.f1Score.toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <History className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Backtest ROI</p>
                <p className="text-xl font-bold">
                  {backtestResults ? `${backtestResults.roi.toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="train">
            <Brain className="w-4 h-4 mr-2" />
            Entrenar
          </TabsTrigger>
          <TabsTrigger value="backtest">
            <History className="w-4 h-4 mr-2" />
            Backtest
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Métricas
          </TabsTrigger>
        </TabsList>

        {/* Training Tab */}
        <TabsContent value="train" className="space-y-4">
          {!trainedModel ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No hay modelo entrenado</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Entrena un modelo usando {localSummary?.totalMatches?.toLocaleString() || 'los'} partidos históricos 
                  para generar predicciones más precisas.
                </p>
                
                {!dataLoaded && !isLoadingData && (
                  <div className="flex gap-2">
                    <Button 
                      size="lg" 
                      onClick={loadEnrichedData}
                      className="bg-blue-500 hover:bg-blue-600 mb-4"
                    >
                      <HardDrive className="w-4 h-4 mr-2" />
                      Cargar Todos los Datos
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={loadPriorityData}
                      className="mb-4"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Solo Top 5 Ligas
                    </Button>
                  </div>
                )}
                
                {isLoadingData && (
                  <div className="mb-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Cargando archivos JSON...</p>
                  </div>
                )}
                
                <Button 
                  size="lg" 
                  onClick={handleTrain}
                  disabled={isTraining || !dataLoaded}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrenando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Iniciar Entrenamiento
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Modelo Entrenado</span>
                  <Badge variant="outline">v{trainedModel.version}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Métricas principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-green-500">
                      {trainedModel.metrics.accuracy.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-blue-500">
                      {trainedModel.metrics.f1Score.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">F1 Score</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-purple-500">
                      {trainedModel.metrics.trainingSamples.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Entrenamiento</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-amber-500">
                      {trainedModel.metrics.testSamples.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Test</div>
                  </div>
                </div>

                {/* Cobertura */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Ligas Cubiertas</p>
                    <div className="flex flex-wrap gap-1">
                      {trainedModel.leagueCoverage.slice(0, 10).map(id => (
                        <Badge key={id} variant="secondary" className="text-xs">{id}</Badge>
                      ))}
                      {trainedModel.leagueCoverage.length > 10 && (
                        <Badge variant="outline" className="text-xs">+{trainedModel.leagueCoverage.length - 10}</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Temporadas</p>
                    <div className="flex flex-wrap gap-1">
                      {trainedModel.seasonCoverage.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Re-entrenar */}
                <Button 
                  onClick={handleTrain}
                  disabled={isTraining}
                  variant="outline"
                  className="w-full"
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Re-entrenando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-entrenar Modelo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progreso de entrenamiento */}
          {isTraining && (
            <Card className="border-purple-500/50">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 text-purple-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">{trainingStage}</span>
                </div>
                <Progress value={trainingProgress} className="h-2" />
                
                {/* Logs de entrenamiento */}
                {trainingLogs.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Logs:</p>
                    <div className="bg-slate-950 rounded p-3 max-h-40 overflow-y-auto text-xs font-mono space-y-1">
                      {trainingLogs.slice(-20).map((log, i) => (
                        <div key={i} className="text-slate-300">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Backtest Tab */}
        <TabsContent value="backtest" className="space-y-4">
          {!trainedModel ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Primero debes entrenar un modelo para realizar backtesting
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Simulación Histórica</h3>
                  <p className="text-sm text-muted-foreground">
                    Simula picks en datos históricos para medir rendimiento
                  </p>
                </div>
                <Button 
                  onClick={handleBacktest}
                  disabled={isBacktesting}
                >
                  {isBacktesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Simulando...
                    </>
                  ) : (
                    <>
                      <History className="w-4 h-4 mr-2" />
                      Ejecutar Backtest
                    </>
                  )}
                </Button>
              </div>

              {backtestResults && (
                <div className="space-y-4">
                  {/* Resultados principales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-3xl font-bold">{backtestResults.totalPicks}</div>
                        <div className="text-sm text-muted-foreground">Picks Simulados</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className={`text-3xl font-bold ${backtestResults.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {backtestResults.roi >= 0 ? '+' : ''}{backtestResults.roi.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">ROI</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-3xl font-bold">{backtestResults.winRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Win Rate</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className={`text-3xl font-bold ${backtestResults.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {backtestResults.totalProfit >= 0 ? '+' : ''}{backtestResults.totalProfit.toFixed(0)}u
                        </div>
                        <div className="text-sm text-muted-foreground">Profit Total</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Profit por mercado */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Rendimiento por Mercado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(backtestResults.profitByMarket).map(([market, data]) => (
                          <div key={market} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="font-medium">{market}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">{data.picks} picks</span>
                              <span className={`font-bold ${data.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {trainedModel ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature Importance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Importancia de Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {trainedModel.featureImportance.slice(0, 10).map((f, i) => (
                      <div key={f.feature} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{f.feature}</span>
                          <span className="text-muted-foreground">{(f.importance * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${f.importance * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Métricas detalladas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Métricas del Modelo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{trainedModel.metrics.precision.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Precisión</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{trainedModel.metrics.recall.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Recall</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{trainedModel.metrics.loss.toFixed(3)}</div>
                      <div className="text-xs text-muted-foreground">Loss</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{trainedModel.metrics.validationAccuracy.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Val Accuracy</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Entrena un modelo para ver métricas detalladas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Icono de refresh
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
