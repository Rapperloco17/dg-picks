// Smart Data Selector
// Decide automáticamente si usar datos locales o API según la fecha y temporada

import { historicalData } from './historical-data-store';
import { hasLocalData, loadLeaguesLazy } from './local-data-loader';
import { getCorrectSeason } from './season-detector';

export interface DataFreshness {
  isCurrentSeason: boolean;
  isComplete: boolean;
  lastMatchDate: Date | null;
  daysSinceLastMatch: number;
  recommendedSource: 'local' | 'api' | 'hybrid';
  reason: string;
}

// Detectar si estamos en la misma temporada que los datos
export function getCurrentSeasonYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // En Europa: temporada Aug-May
  // Si estamos entre Agosto y Diciembre, estamos en temporada "year"
  // Si estamos entre Enero y Julio, estamos en temporada "year-1"
  return month >= 8 ? year : year - 1;
}

// Verificar frescura de datos para una liga
export async function checkDataFreshness(
  leagueId: number, 
  season: number
): Promise<DataFreshness> {
  const now = new Date();
  const currentSeason = getCurrentSeasonYear();
  
  // Cargar datos locales si existen
  if (hasLocalData(leagueId) && !historicalData.isDataLoaded()) {
    await loadLeaguesLazy([leagueId]);
  }
  
  const localMatches = historicalData.getLeagueMatches(leagueId, season);
  
  if (localMatches.length === 0) {
    return {
      isCurrentSeason: season === currentSeason,
      isComplete: false,
      lastMatchDate: null,
      daysSinceLastMatch: Infinity,
      recommendedSource: 'api',
      reason: 'No hay datos locales disponibles',
    };
  }
  
  // Encontrar fecha del último partido
  const sortedMatches = [...localMatches].sort((a, b) => 
    new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
  );
  
  const lastMatch = sortedMatches[0];
  const lastDate = new Date(lastMatch.fixture.date);
  const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const isCurrentSeason = season === currentSeason;
  
  // Lógica de decisión
  if (!isCurrentSeason) {
    // Temporada histórica - usar locales siempre
    return {
      isCurrentSeason: false,
      isComplete: true,
      lastMatchDate: lastDate,
      daysSinceLastMatch: daysDiff,
      recommendedSource: 'local',
      reason: `Temporada histórica ${season}, datos locales son suficientes`,
    };
  }
  
  // Temporada actual
  if (daysDiff > 14) {
    // Datos locales desactualizados (más de 2 semanas)
    return {
      isCurrentSeason: true,
      isComplete: false,
      lastMatchDate: lastDate,
      daysSinceLastMatch: daysDiff,
      recommendedSource: 'api',
      reason: `Datos locales desactualizados (${daysDiff} días). Último partido: ${lastDate.toLocaleDateString()}`,
    };
  }
  
  if (daysDiff > 7) {
    // Datos de hace 1-2 semanas - usar hybrid
    return {
      isCurrentSeason: true,
      isComplete: false,
      lastMatchDate: lastDate,
      daysSinceLastMatch: daysDiff,
      recommendedSource: 'hybrid',
      reason: `Datos locales de hace ${daysDiff} días. Recomendado: complementar con API`,
    };
  }
  
  // Datos muy recientes
  return {
    isCurrentSeason: true,
    isComplete: true,
    lastMatchDate: lastDate,
    daysSinceLastMatch: daysDiff,
    recommendedSource: 'local',
    reason: `Datos locales actualizados (${daysDiff} días)`,
    };
}

// Para partidos de hoy/mañana SIEMPRE usar API
export function shouldUseApiForMatch(matchDate: string, leagueId: number): boolean {
  const matchTime = new Date(matchDate).getTime();
  const now = new Date().getTime();
  const daysDiff = Math.floor((matchTime - now) / (1000 * 60 * 60 * 24));
  
  // Partidos en los próximos 7 días: usar API para datos más frescos
  if (daysDiff >= -1 && daysDiff <= 7) {
    return true;
  }
  
  // Partidos lejanos: usar locales
  return false;
}

// Obtener la mejor estrategia para un análisis
export async function getBestDataStrategy(
  leagueId: number,
  season: number,
  matchDate?: string
): Promise<{
  useLocalForm: boolean;
  useLocalH2H: boolean;
  useLocalStandings: boolean;
  useApiForm: boolean;
  useApiH2H: boolean;
  useApiStandings: boolean;
  reason: string;
}> {
  // Si es un partido próximo, priorizar API
  if (matchDate && shouldUseApiForMatch(matchDate, leagueId)) {
    const freshness = await checkDataFreshness(leagueId, season);
    
    if (freshness.recommendedSource === 'api') {
      return {
        useLocalForm: false,
        useLocalH2H: false,
        useLocalStandings: false,
        useApiForm: true,
        useApiH2H: true,
        useApiStandings: true,
        reason: `Partido próximo (${matchDate}) con datos locales desactualizados (${freshness.daysSinceLastMatch} días)`,
      };
    }
    
    if (freshness.recommendedSource === 'hybrid') {
      return {
        useLocalForm: true,
        useLocalH2H: true,
        useLocalStandings: true,
        useApiForm: true,
        useApiH2H: false,
        useApiStandings: true,
        reason: `Partido próximo (${matchDate}) con datos parciales. Usando locales + API para standings actualizados`,
      };
    }
  }
  
  const freshness = await checkDataFreshness(leagueId, season);
  
  switch (freshness.recommendedSource) {
    case 'api':
      return {
        useLocalForm: false,
        useLocalH2H: false,
        useLocalStandings: false,
        useApiForm: true,
        useApiH2H: true,
        useApiStandings: true,
        reason: freshness.reason,
      };
      
    case 'hybrid':
      return {
        useLocalForm: true,
        useLocalH2H: true,
        useLocalStandings: true,
        useApiForm: true,
        useApiH2H: false,
        useApiStandings: true,
        reason: freshness.reason,
      };
      
    case 'local':
    default:
      return {
        useLocalForm: true,
        useLocalH2H: true,
        useLocalStandings: true,
        useApiForm: false,
        useApiH2H: false,
        useApiStandings: false,
        reason: freshness.reason,
      };
  }
}

// Mensaje claro para el usuario
export function getDataStatusMessage(freshness: DataFreshness): {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  action?: string;
} {
  if (freshness.recommendedSource === 'api') {
    return {
      title: 'Datos desactualizados',
      message: `Los datos locales tienen ${freshness.daysSinceLastMatch} días de antigüedad. Último partido: ${freshness.lastMatchDate?.toLocaleDateString()}. Para predicciones precisas se necesitan datos de la temporada actual.`,
      severity: 'warning',
      action: 'Sincronizar datos ahora',
    };
  }
  
  if (freshness.recommendedSource === 'hybrid') {
    return {
      title: 'Datos parciales',
      message: `Los datos locales tienen ${freshness.daysSinceLastMatch} días. Se recomienda sincronizar para mejores predicciones.`,
      severity: 'info',
      action: 'Sincronizar',
    };
  }
  
  if (!freshness.isCurrentSeason) {
    return {
      title: 'Temporada histórica',
      message: `Usando datos históricos completos de la temporada ${freshness.lastMatchDate?.getFullYear()}.`,
      severity: 'info',
    };
  }
  
  return {
    title: 'Datos actualizados',
    message: `Datos locales de hace ${freshness.daysSinceLastMatch} días. Listo para predicciones.`,
    severity: 'info',
  };
}
