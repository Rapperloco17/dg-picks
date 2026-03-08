import { NextRequest, NextResponse } from 'next/server';
import { ALL_LEAGUES } from '@/constants/leagues';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  db,
  isFirebaseInitialized
} from '@/lib/firebase';
import { makeRequest } from '@/services/api-football';

const TRAINING_DATA_COLLECTION = 'ml_training_data_complete';
const MATCH_STATS_COLLECTION = 'match_statistics_complete';

interface CompleteMatchData {
  fixtureId: number;
  league: {
    id: number;
    name: string;
    season: number;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number; away: number };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number; away: number };
  };
  // Estadísticas completas
  statistics: {
    possession: { home: number; away: number };
    shots: { home: { total: number; on: number }; away: { total: number; on: number } };
    corners: { home: number; away: number };
    cards: { home: { yellow: number; red: number }; away: { yellow: number; red: number } };
    fouls: { home: number; away: number };
    offsides: { home: number; away: number };
  } | null;
  // Forma y datos históricos
  homeForm: number[]; // últimos 5 partidos: 3=ganó, 1=empató, 0=perdió
  awayForm: number[];
  h2h: {
    homeWins: number;
    draws: number;
    awayWins: number;
  };
  // Features calculadas
  features: {
    homeGoalsScoredAvg: number;
    homeGoalsConcededAvg: number;
    awayGoalsScoredAvg: number;
    awayGoalsConcededAvg: number;
    homeCleanSheets: number;
    awayCleanSheets: number;
    homeBttsRate: number;
    awayBttsRate: number;
    homeOver25Rate: number;
    awayOver25Rate: number;
  };
  // Target
  result: {
    winner: 'home' | 'draw' | 'away';
    btts: boolean;
    over25: boolean;
    totalGoals: number;
    homeCards: number;
    awayCards: number;
    corners: number;
  };
  collectedAt: string;
  hasCompleteStats: boolean;
}

export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseInitialized() || !db) {
      return NextResponse.json({
        error: 'Firebase not initialized',
        message: 'Check Firebase configuration'
      }, { status: 500 });
    }

    // Count existing training data
    const snapshot = await getDocs(collection(db, TRAINING_DATA_COLLECTION));
    const statsSnapshot = await getDocs(collection(db, MATCH_STATS_COLLECTION));
    
    // Count by league
    const byLeague: Record<string, { matches: number; withStats: number }> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data() as CompleteMatchData;
      const leagueName = data?.league?.name || 'Unknown';
      if (!byLeague[leagueName]) {
        byLeague[leagueName] = { matches: 0, withStats: 0 };
      }
      byLeague[leagueName].matches++;
      if (data.hasCompleteStats) {
        byLeague[leagueName].withStats++;
      }
    });

    return NextResponse.json({
      totalMatches: snapshot.size,
      matchesWithStats: statsSnapshot.size,
      byLeague,
      message: snapshot.size > 0 
        ? `${snapshot.size} partidos con ${statsSnapshot.size} sets de estadísticas completas` 
        : 'No hay datos. Usa POST para recolectar.',
      availableLeagues: ALL_LEAGUES.length,
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
  console.log('[API] POST /api/collect-data started - Complete data collection');
  
  try {
    if (!isFirebaseInitialized() || !db) {
      return NextResponse.json(
        { error: 'Firebase not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { 
      mode = 'complete', 
      maxLeagues = 10,
      includeStats = true 
    } = body;
    
    console.log(`[API] Mode: ${mode}, Max leagues: ${maxLeagues}, Include stats: ${includeStats}`);

    const results = {
      fromDatabase: 0,
      fromAPI: 0,
      withCompleteStats: 0,
      total: 0,
      message: '',
      byLeague: {} as Record<string, { matches: number; withStats: number }>,
      errors: [] as string[]
    };

    // Check existing data
    console.log('[API] Checking Firebase for existing data...');
    const existingSnapshot = await getDocs(collection(db, TRAINING_DATA_COLLECTION));
    const existingIds = new Set(existingSnapshot.docs.map(d => d.id));
    results.fromDatabase = existingIds.size;
    console.log(`[API] Found ${existingIds.size} existing matches`);

    // Download from API
    console.log('[API] Downloading complete data from API...');
    
    const leaguesToProcess = ALL_LEAGUES.slice(0, maxLeagues);
    
    for (const league of leaguesToProcess) {
      for (const season of [2024, 2025]) {
        try {
          console.log(`[API] Processing ${league.name} ${season}...`);
          
          // Get fixtures
          const fixturesData = await makeRequest<{
            response: Array<{
              fixture: {
                id: number;
                date: string;
                status: { short: string };
              };
              league: { id: number; name: string; season: number };
              teams: {
                home: { id: number; name: string };
                away: { id: number; name: string };
              };
              goals: { home: number; away: number };
              score: {
                halftime: { home: number; away: number };
                fulltime: { home: number; away: number };
              };
            }>;
          }>({
            endpoint: '/fixtures',
            params: { 
              league: league.id, 
              season: season,
              status: 'FT' // Solo partidos terminados
            }
          });
          
          const fixtures = fixturesData.response || [];
          console.log(`[API] Found ${fixtures.length} fixtures for ${league.name}`);
          
          for (const match of fixtures) {
            // Skip if already exists
            if (existingIds.has(match.fixture.id.toString())) {
              continue;
            }
            
            // Get detailed statistics
            let statistics = null;
            if (includeStats) {
              try {
                const statsData = await makeRequest<{
                  response: Array<{
                    team: { id: number; name: string };
                    statistics: Array<{
                      type: string;
                      value: number | string | null;
                    }>;
                  }>;
                }>({
                  endpoint: '/fixtures/statistics',
                  params: { fixture: match.fixture.id }
                });
                
                if (statsData.response && statsData.response.length === 2) {
                  const homeStats = statsData.response[0];
                  const awayStats = statsData.response[1];
                  
                  const getStat = (stats: any[], type: string) => {
                    const stat = stats.find(s => s.type === type);
                    const val = stat?.value;
                    if (val === null || val === undefined) return 0;
                    if (typeof val === 'string') {
                      const num = parseInt(val.replace('%', '').trim());
                      return isNaN(num) ? 0 : num;
                    }
                    return val;
                  };
                  
                  statistics = {
                    possession: {
                      home: getStat(homeStats.statistics, 'Ball Possession'),
                      away: getStat(awayStats.statistics, 'Ball Possession'),
                    },
                    shots: {
                      home: { 
                        total: getStat(homeStats.statistics, 'Total Shots'),
                        on: getStat(homeStats.statistics, 'Shots on Goal')
                      },
                      away: { 
                        total: getStat(awayStats.statistics, 'Total Shots'),
                        on: getStat(awayStats.statistics, 'Shots on Goal')
                      },
                    },
                    corners: {
                      home: getStat(homeStats.statistics, 'Corner Kicks'),
                      away: getStat(awayStats.statistics, 'Corner Kicks'),
                    },
                    cards: {
                      home: {
                        yellow: getStat(homeStats.statistics, 'Yellow Cards'),
                        red: getStat(homeStats.statistics, 'Red Cards'),
                      },
                      away: {
                        yellow: getStat(awayStats.statistics, 'Yellow Cards'),
                        red: getStat(awayStats.statistics, 'Red Cards'),
                      },
                    },
                    fouls: {
                      home: getStat(homeStats.statistics, 'Fouls'),
                      away: getStat(awayStats.statistics, 'Fouls'),
                    },
                    offsides: {
                      home: getStat(homeStats.statistics, 'Offsides'),
                      away: getStat(awayStats.statistics, 'Offsides'),
                    },
                  };
                  
                  results.withCompleteStats++;
                }
              } catch (statsError) {
                console.error(`[API] Error getting stats for ${match.fixture.id}:`, statsError);
              }
            }
            
            // Prepare complete data
            const completeData: CompleteMatchData = {
              fixtureId: match.fixture.id,
              league: {
                id: match.league.id,
                name: match.league.name,
                season: match.league.season,
              },
              teams: match.teams,
              goals: match.goals,
              score: match.score,
              statistics,
              homeForm: [], // Se calculará después
              awayForm: [],
              h2h: { homeWins: 0, draws: 0, awayWins: 0 },
              features: {
                homeGoalsScoredAvg: 0,
                homeGoalsConcededAvg: 0,
                awayGoalsScoredAvg: 0,
                awayGoalsConcededAvg: 0,
                homeCleanSheets: 0,
                awayCleanSheets: 0,
                homeBttsRate: 0,
                awayBttsRate: 0,
                homeOver25Rate: 0,
                awayOver25Rate: 0,
              },
              result: {
                winner: match.goals.home > match.goals.away ? 'home' : 
                       match.goals.home < match.goals.away ? 'away' : 'draw',
                btts: match.goals.home > 0 && match.goals.away > 0,
                over25: match.goals.home + match.goals.away > 2.5,
                totalGoals: match.goals.home + match.goals.away,
                homeCards: statistics?.cards.home.yellow || 0 + statistics?.cards.home.red || 0,
                awayCards: statistics?.cards.away.yellow || 0 + statistics?.cards.away.red || 0,
                corners: (statistics?.corners.home || 0) + (statistics?.corners.away || 0),
              },
              collectedAt: new Date().toISOString(),
              hasCompleteStats: !!statistics,
            };
            
            // Save to Firebase
            const docRef = doc(db!, TRAINING_DATA_COLLECTION, match.fixture.id.toString());
            await setDoc(docRef, completeData);
            
            // Save stats separately if available
            if (statistics) {
              const statsRef = doc(db!, MATCH_STATS_COLLECTION, match.fixture.id.toString());
              await setDoc(statsRef, {
                fixtureId: match.fixture.id,
                ...statistics,
                collectedAt: new Date().toISOString(),
              });
            }
            
            results.fromAPI++;
            results.total++;
            existingIds.add(match.fixture.id.toString());
            
            // Update by league
            if (!results.byLeague[league.name]) {
              results.byLeague[league.name] = { matches: 0, withStats: 0 };
            }
            results.byLeague[league.name].matches++;
            if (statistics) {
              results.byLeague[league.name].withStats++;
            }
            
            // Rate limiting between matches
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          console.log(`[API] Saved ${fixtures.length} matches from ${league.name}`);
          
          // Rate limiting between leagues
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (err: any) {
          const errorMsg = `${league.name}: ${err?.message || 'Unknown'}`;
          console.error('[API] Error:', errorMsg);
          results.errors.push(errorMsg);
        }
      }
    }

    results.message = `Completado: ${results.total} partidos (${results.fromDatabase} existentes + ${results.fromAPI} nuevos). ${results.withCompleteStats} con estadísticas completas.`;

    console.log('[API] Collection complete:', results);
    return NextResponse.json({ success: true, ...results });

  } catch (error: any) {
    console.error('[API] POST Error:', error);
    return NextResponse.json(
      { 
        error: 'Error collecting data', 
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
