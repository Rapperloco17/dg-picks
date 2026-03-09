import { NextRequest, NextResponse } from 'next/server';
import { ALL_LEAGUES } from '@/constants/leagues';
import { makeRequest } from '@/services/api-football';
import { prisma } from '@/lib/prisma';

// GET: Check existing data in database
export async function GET(request: NextRequest) {
  try {
    const count = await prisma.match.count();
    const byLeague = await prisma.match.groupBy({
      by: ['leagueId', 'leagueName'],
      _count: { fixtureId: true }
    });

    return NextResponse.json({
      totalMatches: count,
      byLeague: byLeague.map(l => ({
        leagueId: l.leagueId,
        leagueName: l.leagueName,
        count: l._count.fixtureId
      })),
      message: count > 0 
        ? `${count} partidos en PostgreSQL` 
        : 'No hay datos. Ejecuta POST para recolectar.',
      envCheck: {
        hasFootballKey: !!process.env.NEXT_PUBLIC_API_FOOTBALL_KEY,
        hasDatabase: !!process.env.DATABASE_URL,
      }
    });
  } catch (error: any) {
    console.error('[GET] Error:', error);
    return NextResponse.json({ 
      error: 'Error consultando BD', 
      details: error?.message,
      totalMatches: 0 
    }, { status: 500 });
  }
}

// POST: Hybrid collection - DB first, API for gaps
export async function POST(request: NextRequest) {
  console.log('[API] POST /api/collect-data - Modo Híbrido (BD + API)');
  
  try {
    const body = await request.json().catch(() => ({}));
    const { maxLeagues = 10, seasons = [2024, 2025] } = body;

    const results = {
      fromDatabase: 0,
      fromAPI: 0,
      withStats: 0,
      errors: [] as string[],
      byLeague: {} as Record<string, { db: number; api: number }>,
    };

    // Process each league
    for (const league of ALL_LEAGUES.slice(0, maxLeagues)) {
      console.log(`\n[${league.name}] Procesando...`);
      results.byLeague[league.name] = { db: 0, api: 0 };

      for (const season of seasons) {
        try {
          // Step 1: Check what we already have in database
          const existingMatches = await prisma.match.findMany({
            where: { leagueId: league.id, season },
            select: { fixtureId: true }
          });
          const existingIds = new Set(existingMatches.map(m => m.fixtureId));
          console.log(`  [${season}] En BD: ${existingIds.size} partidos`);
          results.fromDatabase += existingIds.size;
          results.byLeague[league.name].db += existingIds.size;

          // Step 2: Get fixtures from API to see what's available
          const fixturesData = await makeRequest<{
            response: Array<{
              fixture: { id: number; date: string; status: { short: string }; timezone: string; timestamp: number };
              league: { id: number; name: string; season: number; round: string };
              teams: { home: { id: number; name: string }; away: { id: number; name: string } };
              goals: { home: number; away: number };
              score: { halftime: { home: number; away: number }; fulltime: { home: number; away: number } };
            }>;
          }>({
            endpoint: '/fixtures',
            params: { league: league.id, season, status: 'FT' },
          });

          const fixtures = fixturesData.response || [];
          const missingFixtures = fixtures.filter(f => !existingIds.has(f.fixture.id));
          console.log(`  [${season}] En API: ${fixtures.length}, Faltan: ${missingFixtures.length}`);

          // Step 3: Download missing matches with statistics
          for (const match of missingFixtures) {
            try {
              // Get detailed statistics
              let stats = {
                homeCorners: 0, awayCorners: 0,
                homeYellowCards: 0, awayYellowCards: 0,
                homeRedCards: 0, awayRedCards: 0,
                homePossession: 50, awayPossession: 50,
                homeShots: 0, awayShots: 0,
                homeShotsOnTarget: 0, awayShotsOnTarget: 0,
              };

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

                  const homeStats = statsData.response[0].statistics;
                  const awayStats = statsData.response[1].statistics;

                  stats = {
                    homeCorners: getStat(homeStats, 'Corner Kicks'),
                    awayCorners: getStat(awayStats, 'Corner Kicks'),
                    homeYellowCards: getStat(homeStats, 'Yellow Cards'),
                    awayYellowCards: getStat(awayStats, 'Yellow Cards'),
                    homeRedCards: getStat(homeStats, 'Red Cards'),
                    awayRedCards: getStat(awayStats, 'Red Cards'),
                    homePossession: getStat(homeStats, 'Ball Possession'),
                    awayPossession: getStat(awayStats, 'Ball Possession'),
                    homeShots: getStat(homeStats, 'Total Shots'),
                    awayShots: getStat(awayStats, 'Total Shots'),
                    homeShotsOnTarget: getStat(homeStats, 'Shots on Goal'),
                    awayShotsOnTarget: getStat(awayStats, 'Shots on Goal'),
                  };
                }
              } catch (e) { /* no stats available */ }

              // Save to database
              await prisma.match.create({
                data: {
                  fixtureId: match.fixture.id,
                  leagueId: match.league.id,
                  leagueName: match.league.name,
                  season: match.league.season,
                  round: match.league.round,
                  date: new Date(match.fixture.date),
                  timestamp: match.fixture.timestamp,
                  timezone: match.fixture.timezone,
                  status: match.fixture.status.short,
                  homeTeamId: match.teams.home.id,
                  homeTeamName: match.teams.home.name,
                  awayTeamId: match.teams.away.id,
                  awayTeamName: match.teams.away.name,
                  homeGoals: match.goals.home,
                  awayGoals: match.goals.away,
                  homeScoreHT: match.score.halftime?.home,
                  awayScoreHT: match.score.halftime?.away,
                  homeScoreFT: match.score.fulltime?.home,
                  awayScoreFT: match.score.fulltime?.away,
                  ...stats,
                  rawData: match as any,
                }
              });

              results.fromAPI++;
              results.byLeague[league.name].api++;
              if (stats.homePossession !== 50) results.withStats++;

              await new Promise(r => setTimeout(r, 300)); // Rate limit

            } catch (err: any) {
              console.error(`    Error partido ${match.fixture.id}:`, err?.message);
            }
          }

          await new Promise(r => setTimeout(r, 2000)); // Between leagues

        } catch (err: any) {
          console.error(`  Error ${league.name} ${season}:`, err?.message);
          results.errors.push(`${league.name} ${season}: ${err?.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `✅ Procesamiento completo:
• ${results.fromDatabase} partidos ya existían en BD
• ${results.fromAPI} partidos nuevos descargados de API
• ${results.withStats} con estadísticas completas`,
    });

  } catch (error: any) {
    console.error('[API] POST Error:', error);
    return NextResponse.json(
      { error: 'Error', details: error?.message },
      { status: 500 }
    );
  }
}
