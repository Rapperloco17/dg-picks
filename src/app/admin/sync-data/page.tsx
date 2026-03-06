'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  detectDataGaps, 
  syncLeagueData, 
  exportMergedData,
  downloadJSON,
  getSyncRecommendations,
  SyncResult,
  DataGap
} from '@/services/data-sync';
import { AVAILABLE_LOCAL_LEAGUES } from '@/services/local-data-loader';
import { getCurrentSeason } from '@/services/api-football';
import { 
  RefreshCw, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Database,
  Calendar,
  ArrowRight,
  Loader2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatus {
  leagueId: number;
  season: number;
  isSyncing: boolean;
  result?: SyncResult;
  gaps?: DataGap[];
}

export default function SyncDataPage() {
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([]);
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});
  const [recommendations, setRecommendations] = useState<Awaited<ReturnType<typeof getSyncRecommendations>>>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [globalSyncProgress, setGlobalSyncProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  
  // Temporada actual dinámica
  const currentSeason = getCurrentSeason();

  // Cargar recomendaciones al inicio
  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const recs = await getSyncRecommendations();
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleDetectGaps = async (leagueId: number, season: number) => {
    const key = `${leagueId}_${season}`;
    setSyncStatus(prev => ({
      ...prev,
      [key]: { ...prev[key], leagueId, season, isSyncing: true }
    }));

    try {
      const gaps = await detectDataGaps(leagueId, season);
      setSyncStatus(prev => ({
        ...prev,
        [key]: { ...prev[key], isSyncing: false, gaps }
      }));
    } catch (error) {
      toast.error(`Error detectando gaps para liga ${leagueId}`);
      setSyncStatus(prev => ({
        ...prev,
        [key]: { ...prev[key], isSyncing: false }
      }));
    }
  };

  const handleSync = async (leagueId: number, season: number) => {
    const key = `${leagueId}_${season}`;
    setSyncStatus(prev => ({
      ...prev,
      [key]: { ...prev[key], leagueId, season, isSyncing: true }
    }));

    try {
      const result = await syncLeagueData(leagueId, season, (message) => {
        console.log(`[Sync ${leagueId}] ${message}`);
      });

      setSyncStatus(prev => ({
        ...prev,
        [key]: { ...prev[key], isSyncing: false, result }
      }));

      if (result.newMatchesFromApi > 0) {
        toast.success(`Sincronización completa: ${result.newMatchesFromApi} partidos nuevos`);
      } else {
        toast.info('No hay partidos nuevos para sincronizar');
      }
    } catch (error) {
      toast.error(`Error sincronizando liga ${leagueId}`);
      setSyncStatus(prev => ({
        ...prev,
        [key]: { ...prev[key], isSyncing: false }
      }));
    }
  };

  const handleExport = (leagueId: number, season: number) => {
    const json = exportMergedData(leagueId, season);
    downloadJSON(json, `${leagueId}_${season}_updated.json`);
    toast.success('Archivo descargado. Reemplaza el archivo en /data/');
  };

  const handleSyncAllRecommended = async () => {
    if (recommendations.length === 0) return;

    setGlobalSyncProgress({ current: 0, total: recommendations.length, message: 'Iniciando...' });

    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      setGlobalSyncProgress({ 
        current: i + 1, 
        total: recommendations.length, 
        message: `Sincronizando ${rec.leagueId} (${i + 1}/${recommendations.length})...` 
      });

      await handleSync(rec.leagueId, rec.season);
      
      // Esperar entre solicitudes para no saturar la API
      if (i < recommendations.length - 1) {
        await new Promise(r => setTimeout(r, 6000));
      }
    }

    setGlobalSyncProgress(null);
    toast.success('Sincronización masiva completada');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sincronizar Datos</h1>
        <p className="text-muted-foreground">
          Complementa los datos locales con partidos faltantes de la API
        </p>
      </div>

      {/* Recomendaciones */}
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Recomendaciones de Sincronización
          </CardTitle>
          <CardDescription>
            Detectamos lagunas en los siguientes datos locales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRecs ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analizando datos...
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div 
                  key={`${rec.leagueId}_${rec.season}`}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                      {rec.priority === 'high' ? 'Alta' : 'Media'}
                    </Badge>
                    <div>
                      <p className="font-medium">Liga {rec.leagueId} - Temporada {rec.season}</p>
                      <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">~{rec.estimatedMissing} partidos</Badge>
                    <Button 
                      size="sm" 
                      onClick={() => handleSync(rec.leagueId, rec.season)}
                      disabled={syncStatus[`${rec.leagueId}_${rec.season}`]?.isSyncing}
                    >
                      {syncStatus[`${rec.leagueId}_${rec.season}`]?.isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              <Button 
                onClick={handleSyncAllRecommended}
                disabled={!!globalSyncProgress}
                className="w-full"
              >
                {globalSyncProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {globalSyncProgress.message}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sincronizar Todo ({recommendations.length} ligas)
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span>¡Todos los datos están actualizados!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progreso global */}
      {globalSyncProgress && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso sincronización masiva</span>
                <span>{globalSyncProgress.current} / {globalSyncProgress.total}</span>
              </div>
              <Progress value={(globalSyncProgress.current / globalSyncProgress.total) * 100} />
              <p className="text-sm text-muted-foreground">{globalSyncProgress.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Todas las ligas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Todas las Ligas Disponibles
          </CardTitle>
          <CardDescription>
            Selecciona una liga para verificar y sincronizar datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_LOCAL_LEAGUES.slice(0, 12).map((leagueId) => {
              const key = `${leagueId}_${currentSeason}`;
              const status = syncStatus[key];
              
              return (
                <Card key={leagueId} className="bg-muted/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Liga {leagueId}</span>
                      <Badge variant="outline">{currentSeason}</Badge>
                    </div>

                    {status?.gaps && status.gaps.length > 0 && (
                      <div className="text-sm text-amber-500">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Faltan {status.gaps[0].missingMonths.length} meses
                      </div>
                    )}

                    {status?.result && (
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Locales:</span>
                          <span>{status.result.localMatches}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">API:</span>
                          <span>{status.result.newMatchesFromApi} nuevos</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDetectGaps(leagueId, currentSeason)}
                        disabled={status?.isSyncing}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Verificar
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSync(leagueId, currentSeason)}
                        disabled={status?.isSyncing}
                      >
                        {status?.isSyncing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-1" />
                        )}
                        Sync
                      </Button>
                    </div>

                    {status?.result && status.result.newMatchesFromApi > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleExport(leagueId, currentSeason)}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Exportar JSON Actualizado
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-500">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-medium">1</div>
            <div>
              <p className="font-medium">Detectar Gaps</p>
              <p className="text-muted-foreground">El sistema compara tus datos locales con el calendario actual para encontrar meses faltantes.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-medium">2</div>
            <div>
              <p className="font-medium">Sincronizar</p>
              <p className="text-muted-foreground">Descarga los partidos faltantes de la API y los combina con tus datos locales existentes.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-medium">3</div>
            <div>
              <p className="font-medium">Exportar</p>
              <p className="text-muted-foreground">Descarga el archivo JSON actualizado y reemplaza el original en la carpeta <code className="bg-muted px-1 rounded">/data/</code>.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
