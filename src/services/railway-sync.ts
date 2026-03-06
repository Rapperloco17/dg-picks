import { syncRecentMatches } from './enriched-sync';
import { saveMatches, getExistingFixtureIds, getLastSyncDate } from './db-service';
import { prisma } from '@/lib/prisma';
import { HistoricalMatch } from '@/types';

const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const PRIORITY_LEAGUES = [
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A
  78,   // Bundesliga
  61,   // Ligue 1
  88,   // Eredivisie
  94,   // Primeira Liga
  144,  // Jupiler Pro League
  40,   // Championship
  45,   // FA Cup
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  143,  // Copa del Rey
  137,  // Coppa Italia
  529,  // MLS
  71,   // Serie A Brasil
  13,   // Copa Libertadores
  11,   // Copa Sudamericana
  128,  // Liga MX
];

async function fetchFromAPI(endpoint: string, params: Record<string, any>): Promise<any> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.append(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': API_KEY!,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || [];
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function syncMatchesToDatabase(
  onProgress?: (message: string) => void
): Promise<{ newMatches: number; errors: string[] }> {
  const errors: string[] = [];
  let totalNewMatches = 0;

  // Crear log de sincronización
  const syncLog = await prisma.syncLog.create({
    data: { status: 'running' }
  });

  try {
    const lastDate = await getLastSyncDate();
    const fromDate = lastDate 
      ? lastDate.toISOString().split('T')[0]
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    onProgress?.(`📅 Sincronizando desde ${fromDate} hasta ${toDate}`);

    const existingIds = await getExistingFixtureIds();
    const allNewMatches: HistoricalMatch[] = [];

    for (let i = 0; i < PRIORITY_LEAGUES.length; i++) {
      const leagueId = PRIORITY_LEAGUES[i];
      onProgress?.(`🔄 Liga ${i + 1}/${PRIORITY_LEAGUES.length}: ${leagueId}`);

      try {
        const matches = await fetchFromAPI('/fixtures', {
          league: leagueId,
          season: 2025,
          from: fromDate,
          to: toDate,
          status: 'FT',
        });

        await delay(6500); // Rate limit: 10 calls/minute

        const newMatches = matches.filter((m: HistoricalMatch) => 
          !existingIds.has(m.fixture.id)
        );

        if (newMatches.length > 0) {
          // Fetch estadísticas para cada partido nuevo
          for (const match of newMatches) {
            try {
              const stats = await fetchFromAPI('/fixtures/statistics', {
                fixture: match.fixture.id,
              });
              
              if (stats && stats.length >= 2) {
                match.estadisticas = stats;
                
                // Extraer corners y cards de estadísticas
                const homeStats = stats[0].statistics;
                const awayStats = stats[1].statistics;
                
                const getStat = (s: any[], type: string) => {
                  const stat = s.find((x: any) => x.type === type);
                  return stat?.value ? parseInt(stat.value) || 0 : 0;
                };
                
                match.corners = {
                  home: getStat(homeStats, 'Corner Kicks'),
                  away: getStat(awayStats, 'Corner Kicks'),
                };
                
                match.possession = {
                  home: getStat(homeStats, 'Ball Possession'),
                  away: getStat(awayStats, 'Ball Possession'),
                };
                
                match.shots = {
                  home: { total: getStat(homeStats, 'Total Shots'), on: getStat(homeStats, 'Shots on Goal') },
                  away: { total: getStat(awayStats, 'Total Shots'), on: getStat(awayStats, 'Shots on Goal') },
                };
              }
              
              await delay(6500);
            } catch (e) {
              // Continuar sin estadísticas si falla
            }
          }

          allNewMatches.push(...newMatches);
          totalNewMatches += newMatches.length;
          onProgress?.(`  ✅ ${newMatches.length} partidos nuevos`);
        }
      } catch (error) {
        const msg = `Error en liga ${leagueId}: ${error}`;
        errors.push(msg);
        onProgress?.(`  ❌ ${msg}`);
      }
    }

    // Guardar en base de datos
    if (allNewMatches.length > 0) {
      onProgress?.(`💾 Guardando ${allNewMatches.length} partidos en la base de datos...`);
      await saveMatches(allNewMatches);
    }

    // Actualizar log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        newMatches: totalNewMatches,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      }
    });

    onProgress?.(`✅ Sincronización completada: ${totalNewMatches} partidos nuevos`);
    return { newMatches: totalNewMatches, errors };

  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'error',
        endedAt: new Date(),
        errors: String(error),
      }
    });
    throw error;
  }
}

// Función para el cron job diario
export async function runDailySync() {
  console.log('🕐 Iniciando sincronización diaria:', new Date().toISOString());
  
  try {
    const result = await syncMatchesToDatabase(console.log);
    console.log('✅ Sincronización completada:', result);
    return result;
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    throw error;
  }
}
