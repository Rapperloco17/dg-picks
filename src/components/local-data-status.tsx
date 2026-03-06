'use client';

import { useLocalData } from '@/services/local-data-provider';
import { Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import { loadAllLocalData, loadPriorityLeagues } from '@/services/local-data-loader';

export function LocalDataStatus() {
  const { isLoading, isLoaded, progress, loadedLeagues, totalLeagues, summary, error } = useLocalData();
  const [showDetails, setShowDetails] = useState(false);

  // Si está cargando, mostrar indicador de progreso
  if (isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden md:inline text-xs">
                {progress}%
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cargando datos históricos...</p>
            <p className="text-xs text-muted-foreground">
              {loadedLeagues} de {totalLeagues} ligas
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Si hay error
  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-red-400"
              onClick={() => loadAllLocalData()}
            >
              <AlertCircle className="w-4 h-4" />
              <span className="hidden md:inline text-xs">Error</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Error cargando datos</p>
            <p className="text-xs text-muted-foreground">Click para reintentar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Si los datos están cargados
  if (isLoaded && summary) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-green-400">
              <Database className="w-4 h-4" />
              <span className="hidden md:inline text-xs">
                {summary.totalMatches.toLocaleString()}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">Datos Locales Cargados</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Partidos:</span>
                  <span>{summary.totalMatches.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Ligas:</span>
                  <span>{summary.totalLeagues}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Equipos:</span>
                  <span>{summary.totalTeams}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Temporadas:</span>
                  <span>{summary.seasons.length} ({Math.min(...summary.seasons)}-{Math.max(...summary.seasons)})</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Si no hay datos cargados, ofrecer cargar
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-muted-foreground hover:text-blue-400"
            onClick={() => loadPriorityLeagues()}
          >
            <Database className="w-4 h-4" />
            <span className="hidden md:inline text-xs">Cargar Datos</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cargar datos históricos locales</p>
          <p className="text-xs text-muted-foreground">
            Acelera el análisis usando datos en disco
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Versión extendida para mostrar en página de admin
export function LocalDataStatusDetailed() {
  const { isLoading, isLoaded, progress, loadedLeagues, totalLeagues, summary, error, loadData, loadPriority } = useLocalData();

  return (
    <div className="space-y-4">
      {/* Estado actual */}
      <div className="flex items-center gap-4">
        {isLoading ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <div>
              <p className="font-medium">Cargando datos históricos...</p>
              <p className="text-sm text-muted-foreground">
                {progress}% - {loadedLeagues} de {totalLeagues} ligas
              </p>
            </div>
          </>
        ) : isLoaded ? (
          <>
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="font-medium">Datos cargados</p>
              <p className="text-sm text-muted-foreground">
                {summary?.totalMatches.toLocaleString()} partidos listos
              </p>
            </div>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-medium">Error al cargar</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </>
        ) : (
          <>
            <Database className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Datos no cargados</p>
              <p className="text-sm text-muted-foreground">
                Carga los datos para análisis más rápido
              </p>
            </div>
          </>
        )}
      </div>

      {/* Botones de acción */}
      {!isLoading && (
        <div className="flex gap-2">
          <Button 
            onClick={loadPriority}
            disabled={isLoading}
            variant="outline"
          >
            Cargar Prioritarias (6 ligas)
          </Button>
          <Button 
            onClick={loadData}
            disabled={isLoading}
          >
            Cargar Todas (58 ligas)
          </Button>
        </div>
      )}

      {/* Resumen si hay datos */}
      {isLoaded && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center p-3 bg-muted rounded">
            <div className="text-2xl font-bold">{summary.totalMatches.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Partidos</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <div className="text-2xl font-bold">{summary.totalLeagues}</div>
            <div className="text-xs text-muted-foreground">Ligas</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <div className="text-2xl font-bold">{summary.totalTeams}</div>
            <div className="text-xs text-muted-foreground">Equipos</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <div className="text-2xl font-bold">{summary.seasons.length}</div>
            <div className="text-xs text-muted-foreground">Temporadas</div>
          </div>
        </div>
      )}
    </div>
  );
}
