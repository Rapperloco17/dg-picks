'use client';

import { useEffect } from 'react';
import { useLocalData } from '@/services/local-data-provider';
import { LocalDataStatusDetailed } from '@/components/local-data-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AVAILABLE_LOCAL_LEAGUES } from '@/services/local-data-loader';
import { 
  Database, 
  HardDrive, 
  Zap,
  Globe,
  Server,
  AlertTriangle,
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function LocalDataAdminPage() {
  const { isLoaded, summary } = useLocalData();

  // Formato de número
  const formatNumber = (num: number) => num.toLocaleString('es-ES');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Datos Locales</h1>
        <p className="text-muted-foreground">
          Gestiona los datos históricos almacenados localmente para análisis sin límites de API
        </p>
      </div>

      {/* Estado Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Estado de Datos Locales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocalDataStatusDetailed />
        </CardContent>
      </Card>

      {/* Advertencia Importante */}
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <AlertTitle className="text-amber-500">Importante: Temporada Actual</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-2">
            Los datos locales pueden estar desactualizados para la temporada en curso. 
            Para predicciones precisas de partidos actuales, se necesitan datos de agosto a la fecha.
          </p>
          <p className="text-sm text-muted-foreground">
            El sistema detectará automáticamente si los datos locales están desactualizados 
            y usará la API cuando sea necesario. 
            <Link href="/admin/sync-data" className="text-blue-500 hover:underline ml-1">
              Sincronizar datos aquí →
            </Link>
          </p>
        </AlertDescription>
      </Alert>

      {/* Estadísticas */}
      {isLoaded && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Database className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(summary.totalMatches)}</p>
                  <p className="text-sm text-muted-foreground">Partidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Globe className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalLeagues}</p>
                  <p className="text-sm text-muted-foreground">Ligas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Server className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(summary.totalTeams)}</p>
                  <p className="text-sm text-muted-foreground">Equipos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <HardDrive className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.seasons.length}</p>
                  <p className="text-sm text-muted-foreground">Temporadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ligas Disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Ligas Disponibles
            </span>
            <Badge variant="outline">{AVAILABLE_LOCAL_LEAGUES.length} ligas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_LOCAL_LEAGUES.map(leagueId => (
              <Badge 
                key={leagueId} 
                variant="secondary"
                className="text-xs"
              >
                {leagueId}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            IDs de ligas disponibles en archivos locales. Las ligas principales son: 
            39 (Premier League), 140 (La Liga), 135 (Serie A), 61 (Ligue 1), 78 (Bundesliga), 88 (Eredivisie)
          </p>
        </CardContent>
      </Card>

      {/* Ventajas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-500">Velocidad</p>
                <p className="text-sm text-muted-foreground">
                  Acceso instantáneo a datos históricos sin esperar respuestas de API
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-blue-500">Sin Límites</p>
                <p className="text-sm text-muted-foreground">
                  No consume requests de la API para datos históricos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Server className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium text-purple-500">Fallback Inteligente</p>
                <p className="text-sm text-muted-foreground">
                  Si no hay datos locales, automáticamente usa la API
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información de uso */}
      <Card>
        <CardHeader>
          <CardTitle>Cómo Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium">1. Datos Locales Primero</p>
            <p className="text-muted-foreground">
              Al analizar un partido, el sistema primero busca datos en los archivos locales 
              (forma, H2H, standings). Esto es instantáneo y no consume API.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">2. API como Respaldo</p>
            <p className="text-muted-foreground">
              Si no hay datos locales para una liga específica, el sistema automáticamente 
              hace requests a la API Football para obtener la información necesaria.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">3. Siempre Actualizado</p>
            <p className="text-muted-foreground">
              Los partidos del día, cuotas en vivo y resultados live siempre se obtienen 
              de la API para tener la información más reciente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
