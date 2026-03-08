import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ALL_LEAGUES } from '@/constants/leagues';
import { makeRequest } from '@/services/api-football';

// Initialize Firebase Admin
let db: any = null;
let initError: string | null = null;

try {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!privateKey || !clientEmail) {
      throw new Error('Missing FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL');
    }

    initializeApp({
      credential: cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    console.log('[API] Firebase Admin initialized');
  }
  db = getFirestore();
} catch (e: any) {
  initError = e?.message || 'Unknown error';
  console.error('[API] Firebase Admin init error:', initError);
}

const TRAINING_DATA_COLLECTION = 'ml_training_data_v2';

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({
        error: 'Firebase not initialized',
        details: initError,
        envCheck: {
          hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        }
      }, { status: 500 });
    }

    const snapshot = await db.collection(TRAINING_DATA_COLLECTION).get();
    const count = snapshot.size;

    // Get sample
    let sample = null;
    if (count > 0) {
      const firstDoc = snapshot.docs[0];
      sample = {
        id: firstDoc.id,
        hasStats: !!firstDoc.data().statistics,
        league: firstDoc.data().league?.name,
      };
    }

    return NextResponse.json({
      totalMatches: count,
      sample,
      message: count > 0 
        ? `${count} partidos guardados` 
        : 'No hay datos. Ejecuta POST para recolectar.',
    });
  } catch (error: any) {
    console.error('[API] GET Error:', error);
    return NextResponse.json(
      { error: 'Error', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/collect-data started');
  
  try {
    if (!db) {
      return NextResponse.json(
        { 
          error: 'Firebase not initialized', 
          details: initError,
          envCheck: {
            hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          }
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { maxLeagues = 10 } = body;

    const results = {
      processed: 0,
      withStats: 0,
      errors: [] as string[],
      byLeague: {} as Record<string, number>,
    };

    // Get existing IDs
    const existingSnapshot = await db.collection(TRAINING_DATA_COLLECTION).get();
    const existingIds = new Set(existingSnapshot.docs.map((d: any) => d.id));
    console.log(`[API] Found ${existingIds.size} existing matches`);

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
            const docId = match.fixture.id.toString();
            
            if (existingIds.has(docId)) continue;

            // Get stats
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
                    home: { total: getStat(statsData.response[0].statistics, 'Total Shots'), on: getStat(statsData.response[0].statistics, 'Shots on Goal') },
                    away: { total: getStat(statsData.response[1].statistics, 'Total Shots'), on: getStat(statsData.response[1].statistics, 'Shots on Goal') },
                  },
                  corners: {
                    home: getStat(statsData.response[0].statistics, 'Corner Kicks'),
                    away: getStat(statsData.response[1].statistics, 'Corner Kicks'),
                  },
                  cards: {
                    home: { yellow: getStat(statsData.response[0].statistics, 'Yellow Cards'), red: getStat(statsData.response[0].statistics, 'Red Cards') },
                    away: { yellow: getStat(statsData.response[1].statistics, 'Yellow Cards'), red: getStat(statsData.response[1].statistics, 'Red Cards') },
                  },
                  fouls: {
                    home: getStat(statsData.response[0].statistics, 'Fouls'),
                    away: getStat(statsData.response[1].statistics, 'Fouls'),
                  },
                };
              }
            } catch (e) { /* no stats */ }

            // Save to Firestore
            const data = {
              fixtureId: match.fixture.id,
              league: match.league,
              teams: match.teams,
              goals: match.goals,
              score: match.score,
              statistics,
              result: {
                winner: match.goals.home > match.goals.away ? 'home' : match.goals.home < match.goals.away ? 'away' : 'draw',
                btts: match.goals.home > 0 && match.goals.away > 0,
                over25: match.goals.home + match.goals.away > 2.5,
                totalGoals: match.goals.home + match.goals.away,
              },
              hasCompleteStats: !!statistics,
              collectedAt: new Date().toISOString(),
            };

            await db.collection(TRAINING_DATA_COLLECTION).doc(docId).set(data);

            results.processed++;
            existingIds.add(docId);
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
      message: `Guardados ${results.processed} partidos (${results.withStats} con estadísticas)`,
    });

  } catch (error: any) {
    console.error('[API] POST Error:', error);
    return NextResponse.json(
      { error: 'Error', details: error?.message },
      { status: 500 }
    );
  }
}
