import { NextRequest, NextResponse } from 'next/server';
import { ALL_LEAGUES } from '@/constants/leagues';
import { makeRequest } from '@/services/api-football';

// Use a simple in-memory store for now
// Later we can add database storage
const dataStore: Map<string, any> = new Map();

export async function GET(request: NextRequest) {
  return NextResponse.json({
    totalMatches: dataStore.size,
    message: dataStore.size > 0 
      ? `${dataStore.size} partidos en memoria` 
      : 'No hay datos. Ejecuta POST para recolectar.',
    envCheck: {
      hasFootballKey: !!process.env.NEXT_PUBLIC_API_FOOTBALL_KEY,
      hasFirebaseEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasFirebaseKey: !!process.env.FIREBASE_PRIVATE_KEY,
    }
  });
}

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/collect-data started');
  
  try {
    const body = await request.json().catch(() => ({}));
    const { maxLeagues = 5 } = body;

    const results = {
      processed: 0,
      withStats: 0,
      errors: [] as string[],
      byLeague: {} as Record<string, number>,
    };

    // Process leagues
    for (const league of ALL_LEAGUES.slice(0, maxLeagues)) {
      for (const season of [2024, 2025]) {
        try {
          console.log(`[API] Processing ${league.name} ${season}...`);

          // Get fixtures
          const fixturesData = await makeRequest<{
            response: Array<{
              fixture: { id: number; date: string; status: { short: string } };
              league: { id: number; name: string; season: number };
              teams: { home: { id: number; name: string }; away: { id: number; name: string } };
              goals: { home: number; away: number };
              score: { halftime: { home: number; away: number }; fulltime: { home: number; away: number } };
            }>;
          }>({
            endpoint: '/fixtures',
            params: { league: league.id, season, status: 'FT' },
          });

          const fixtures = fixturesData.response || [];

          for (const match of fixtures) {
            const docId = `${league.id}_${match.fixture.id}`;
            
            // Skip if already exists
            if (dataStore.has(docId)) continue;

            // Get statistics
            let statistics = null;
            try {
              const statsData = await makeRequest<{
                response: Array<{
                  team: { id: number };
                  statistics: Array<{ type: string; value: string | number | null }>;
                }>;
              }>({
                endpoint: '/fixtures/statistics',
                params: { fixture: match.fixture.id },
              });

              if (statsData.response?.length === 2) {
                const getStat = (s: any[], type: string) => {
                  const item = s.find((x: any) => x.type === type);
                  const val = item?.value;
                  if (!val) return 0;
                  if (typeof val === 'string') {
                    const num = parseInt(val.replace('%', '').trim());
                    return isNaN(num) ? 0 : num;
                  }
                  return val;
                };

                statistics = {
                  possession: {
                    home: getStat(statsData.response[0].statistics, 'Ball Possession'),
                    away: getStat(statsData.response[1].statistics, 'Ball Possession'),
                  },
                  shots: {
                    home: { 
                      total: getStat(statsData.response[0].statistics, 'Total Shots'), 
                      on: getStat(statsData.response[0].statistics, 'Shots on Goal') 
                    },
                    away: { 
                      total: getStat(statsData.response[1].statistics, 'Total Shots'), 
                      on: getStat(statsData.response[1].statistics, 'Shots on Goal') 
                    },
                  },
                  corners: {
                    home: getStat(statsData.response[0].statistics, 'Corner Kicks'),
                    away: getStat(statsData.response[1].statistics, 'Corner Kicks'),
                  },
                  cards: {
                    home: { 
                      yellow: getStat(statsData.response[0].statistics, 'Yellow Cards'), 
                      red: getStat(statsData.response[0].statistics, 'Red Cards') 
                    },
                    away: { 
                      yellow: getStat(statsData.response[1].statistics, 'Yellow Cards'), 
                      red: getStat(statsData.response[1].statistics, 'Red Cards') 
                    },
                  },
                };
              }
            } catch (e) { /* no stats */ }

            // Store in memory
            const data = {
              fixtureId: match.fixture.id,
              league: match.league,
              teams: match.teams,
              goals: match.goals,
              score: match.score,
              statistics,
              result: {
                winner: match.goals.home > match.goals.away ? 'home' : 
                       match.goals.home < match.goals.away ? 'away' : 'draw',
                btts: match.goals.home > 0 && match.goals.away > 0,
                over25: match.goals.home + match.goals.away > 2.5,
                totalGoals: match.goals.home + match.goals.away,
              },
              hasCompleteStats: !!statistics,
              collectedAt: new Date().toISOString(),
            };

            dataStore.set(docId, data);

            results.processed++;
            if (statistics) results.withStats++;
            
            results.byLeague[league.name] = (results.byLeague[league.name] || 0) + 1;

            await new Promise(r => setTimeout(r, 300));
          }

          await new Promise(r => setTimeout(r, 2000));

        } catch (err: any) {
          console.error(`[API] Error ${league.name}:`, err?.message);
          results.errors.push(`${league.name}: ${err?.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Procesados ${results.processed} partidos (${results.withStats} con estadísticas). Datos guardados en memoria (se perderán al reiniciar).`,
      note: 'Para persistencia permanente, configura Firebase correctamente o usa PostgreSQL.'
    });

  } catch (error: any) {
    console.error('[API] POST Error:', error);
    return NextResponse.json(
      { error: 'Error', details: error?.message },
      { status: 500 }
    );
  }
}
