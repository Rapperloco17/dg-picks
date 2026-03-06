'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Download, 
  Play, 
  BarChart3, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Brain,
  ChevronRight,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  collectAllHistoricalData, 
  getTrainingData, 
  exportToCSV, 
  downloadCSV,
  AVAILABLE_SEASONS,
  ProcessedMatchData
} from '@/services/historical-data';
import { ALL_LEAGUES } from '@/constants/leagues';
import { syncNewMatches, getSyncInfo, hasPendingSync } from '@/services/incremental-sync';

export default function AdminPage() {
  const [isCollecting, setIsCollecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [collectionProgress, setCollectionProgress] = useState({
    currentLeague: 0,
    totalLeagues: 0,
    currentLeagueName: '',
    currentMatch: 0,
    totalMatches: 0,
  });
  const [stats, setStats] = useState({
    totalMatches: 0,
    byLeague: {} as Record<string, number>,
  });
  const [trainingData, setTrainingData] = useState<ProcessedMatchData[]>([]);
  const [syncInfo, setSyncInfo] = useState(getSyncInfo());

  const handleCollectData = async () => {
    setIsCollecting(true);
    
    try {
      const result = await collectAllHistoricalData(
        AVAILABLE_SEASONS,
        (leagueName, current, total) => {
          setCollectionProgress(prev => ({
            ...prev,
            currentLeagueName: leagueName,
            currentMatch: current,
            totalMatches: total,
          }));
        },
        (current, total) => {
          setCollectionProgress(prev => ({
            ...prev,
            currentLeague: current,
            totalLeagues: total,
          }));
        }
      );
      
      setStats(result);
      toast.success(`Recolección completada: ${result.totalMatches} partidos`);
    } catch (error) {
      toast.error('Error en la recolección de datos');
      console.error(error);
    } finally {
      setIsCollecting(false);
    }
  };

  const handleLoadData = async () => {
    const data = await getTrainingData();
    setTrainingData(data);
    toast.success(`${data.length} partidos cargados`);
  };

  const handleExportCSV = () => {
    if (trainingData.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    
    const csv = exportToCSV(trainingData);
    downloadCSV(csv, `dg-picks-training-data-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV descargado');
  };

  const handleIncrementalSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Iniciando sincronización...');
    
    try {
      const result = await syncNewMatches((message) => {
        setSyncMessage(message);
      });
      
      setSyncInfo(getSyncInfo());
      
      if (result.errors.length > 0) {
        toast.warning(`Sincronización con ${result.errors.length} errores`);
      } else if (result.newMatches > 0) {
        toast.success(`Sincronizado: ${result.newMatches} partidos nuevos agregados`);
      } else {
        toast.info('No hay partidos nuevos para sincronizar');
      }
    } catch (error) {
      toast.error('Error en sincronización');
      console.error(error);
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Panel de Administración ML</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestión de datos históricos y entrenamiento del modelo
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Ligas</p>
                <p className="text-xl font-bold text-slate-100">{ALL_LEAGUES.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Temporadas</p>
                <p className="text-xl font-bold text-slate-100">{AVAILABLE_SEASONS.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Partidos ML</p>
                <p className="text-xl font-bold text-slate-100">{trainingData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Features</p>
                <p className="text-xl font-bold text-slate-100">28</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/admin/ml-training">
          <Card className="bg-slate-900 border-slate-800 hover:border-blue-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Brain className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">ML Training</p>
                    <p className="text-sm font-bold text-slate-100">Entrenar Modelos</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/local-data">
          <Card className="bg-slate-900 border-slate-800 hover:border-green-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <HardDrive className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Datos Locales</p>
                    <p className="text-sm font-bold text-slate-100">58 Ligas Offline</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/sync-data">
          <Card className="bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Sincronizar</p>
                    <p className="text-sm font-bold text-slate-100">Completar Datos</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Sincronización Incremental */}
        <Card className={`border-slate-800 ${syncInfo.needsSync ? 'bg-amber-900/20 border-amber-500/50' : 'bg-slate-900'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${syncInfo.needsSync ? 'bg-amber-500/20' : 'bg-green-500/10'}`}>
                  {syncInfo.needsSync ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400">Actualización</p>
                  <p className="text-sm font-bold text-slate-100">
                    {syncInfo.needsSync ? `${syncInfo.daysSince} días sin sync` : 'Datos actualizados'}
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant={syncInfo.needsSync ? "default" : "outline"}
                onClick={handleIncrementalSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="ml-2 hidden sm:inline">
                  {isSyncing ? syncMessage : 'Sync Nuevos'}
                </span>
              </Button>
            </div>
            {isSyncing && syncMessage && (
              <p className="text-xs text-slate-400 mt-2">{syncMessage}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="collection" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="collection" className="data-[state=active]:bg-slate-800">
            <Database className="w-4 h-4 mr-2" />
            Recolección
          </TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-slate-800">
            <BarChart3 className="w-4 h-4 mr-2" />
            Datos
          </TabsTrigger>
          <TabsTrigger value="export" className="data-[state=active]:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </TabsTrigger>
        </TabsList>

        {/* Collection Tab */}
        <TabsContent value="collection" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Recolección de Datos</CardTitle>
              <CardDescription className="text-slate-400">
                Recolecta datos históricos de todas las ligas para entrenar el modelo ML.
                Este proceso puede tardar varios minutos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCollecting ? (
                <Button 
                  onClick={handleCollectData}
                  className="bg-blue-500 hover:bg-blue-600"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Recolección
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      Recolectando: {collectionProgress.currentLeagueName}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Progreso Ligas</span>
                      <span className="text-slate-300">
                        {collectionProgress.currentLeague} / {collectionProgress.totalLeagues}
                      </span>
                    </div>
                    <Progress 
                      value={(collectionProgress.currentLeague / collectionProgress.totalLeagues) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Partidos Liga Actual</span>
                      <span className="text-slate-300">
                        {collectionProgress.currentMatch} / {collectionProgress.totalMatches}
                      </span>
                    </div>
                    <Progress 
                      value={collectionProgress.totalMatches > 0 
                        ? (collectionProgress.currentMatch / collectionProgress.totalMatches) * 100 
                        : 0
                      } 
                      className="h-2"
                    />
                  </div>
                </div>
              )}

              {stats.totalMatches > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">
                    Última Recolección
                  </h4>
                  <p className="text-sm text-slate-400">
                    Total: {stats.totalMatches} partidos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Configuración</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Temporadas</span>
                  <Badge variant="secondary" className="bg-slate-800">
                    {AVAILABLE_SEASONS.join(', ')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Ligas Prioritarias</span>
                  <Badge variant="secondary" className="bg-slate-800">
                    Top 10
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Rate Limit</span>
                  <Badge variant="secondary" className="bg-slate-800">
                    10 req/s
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Datos de Entrenamiento</CardTitle>
              <CardDescription className="text-slate-400">
                Visualiza los datos recolectados para entrenamiento del modelo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button onClick={handleLoadData} variant="outline">
                  <Database className="w-4 h-4 mr-2" />
                  Cargar Datos
                </Button>
              </div>

              {trainingData.length > 0 ? (
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="text-left p-3 text-slate-300">ID</th>
                        <th className="text-left p-3 text-slate-300">Liga</th>
                        <th className="text-left p-3 text-slate-300">Temp</th>
                        <th className="text-left p-3 text-slate-300">Local</th>
                        <th className="text-left p-3 text-slate-300">Visitante</th>
                        <th className="text-left p-3 text-slate-300">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {trainingData.slice(0, 10).map((match) => (
                        <tr key={match.id} className="hover:bg-slate-800/50">
                          <td className="p-3 text-slate-400">{match.id}</td>
                          <td className="p-3 text-slate-300">{match.league.name}</td>
                          <td className="p-3 text-slate-400">{match.metadata.season}</td>
                          <td className="p-3 text-slate-100">{match.teams.home.name}</td>
                          <td className="p-3 text-slate-100">{match.teams.away.name}</td>
                          <td className="p-3">
                            <Badge className={
                              match.target.homeWin ? 'bg-emerald-500' :
                              match.target.draw ? 'bg-slate-500' :
                              'bg-rose-500'
                            }>
                              {match.goals.home} - {match.goals.away}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {trainingData.length > 10 && (
                    <p className="text-center text-sm text-slate-500 py-2">
                      Y {trainingData.length - 10} más...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay datos cargados</p>
                  <p className="text-sm">Haz clic en "Cargar Datos" o recolecta primero</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Exportar Datos</CardTitle>
              <CardDescription className="text-slate-400">
                Exporta los datos en formato CSV para entrenamiento externo o análisis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-400">
                  Asegúrate de haber cargado los datos antes de exportar.
                  El archivo CSV incluirá todas las features calculadas.
                </p>
              </div>

              <Button 
                onClick={handleExportCSV}
                disabled={trainingData.length === 0}
                className="w-full"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar CSV ({trainingData.length} registros)
              </Button>

              <div className="space-y-2 pt-4">
                <h4 className="text-sm font-medium text-slate-300">Features incluidas:</h4>
                <div className="flex flex-wrap gap-2">
                  {['Forma (5)', 'Goles avg', 'Clean Sheets', 'BTTS %', 'Over 2.5 %', 'H2H', 'Localía'].map(f => (
                    <Badge key={f} variant="secondary" className="bg-slate-800">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
