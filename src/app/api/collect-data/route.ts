import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ALL_LEAGUES } from '@/constants/leagues';
import { makeRequest } from '@/services/api-football';

// Initialize Prisma
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Count matches in database
    const totalMatches = await prisma.match.count();
    const withStats = await prisma.match.count({
      where: {
        OR: [
          { homePossession: { not: 50 } },
          { homeShots: { gt: 0 } },
        ],
      },
    });

    // Get by league
    const byLeague = await prisma.match.groupBy({
      by: ['leagueName'],
      _count: { id: true },
    });

    const leagueData: Record<string, number> = {};
    byLeague.forEach(item => {
      leagueData[item.leagueName] = item._count.id;
    });

    return NextResponse.json({
      totalMatches,
      withStats,
      byLeague: leagueData,
      message: totalMatches > 0
        ? `${totalMatches} partidos (${withStats} con estadísticas)`
        : 'No hay datos. Ejecuta POST para recolectar.',
    });
  } catch (error: any) {
    console.error('[API] GET Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: error?.message },
      { status: 500 }
    );
  }
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

    // Get existing fixture IDs to avoid duplicates
    const existingMatches = await prisma.match.findMany({
      select: { fixtureId: true },
    });
    const existingIds = new Set(existingMatches.map(m => m.fixtureId));
    console.log(`[API] Found ${existingIds.size} existing matches`);

    // Process leagues
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
              status: 'FT',
            },
          });

          const fixtures = fixturesData.response || [];
          console.log(`[API] Found ${fixtures.length} fixtures`);

          for (const match of fixtures) {
            // Skip if already exists
            if (existingIds.has(match.fixture.id)) {
              continue;
            }

            // Get statistics
            let hasStats = false;
            let stats = {
              homePossession: 50,
              awayPossession: 50,
              homeShots: 0,
              awayShots: 0,
              homeShotsOnTarget: 0,
              awayShotsOnTarget: 0,
              homeCorners: 0,
              awayCorners: 0,
              homeYellowCards: 0,
              awayYellowCards: 0,
              homeRedCards: 0,
              awayRedCards: 0,
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
                const homeStats = statsData.response[0];
                const awayStats = statsData.response[1];

                const getStat = (s: any[], type: string) => {
                  const item = s.find(x => x.type === type);
                  const val = item?.value;
                  if (!val) return 0;
                  if (typeof val === 'string') {
                    const num = parseInt(val.replace('%', '').trim());
                    return isNaN(num) ? 0 : num;
                  }
                  return val;
                };

                stats = {
                  homePossession: getStat(homeStats.statistics, 'Ball Possession'),
                  awayPossession: getStat(awayStats.statistics, 'Ball Possession'),
                  homeShots: getStat(homeStats.statistics, 'Total Shots'),
                  awayShots: getStat(awayStats.statistics, 'Total Shots'),
                  homeShotsOnTarget: getStat(homeStats.statistics, 'Shots on Goal'),
                  awayShotsOnTarget: getStat(awayStats.statistics, 'Shots on Goal'),
                  homeCorners: getStat(homeStats.statistics, 'Corner Kicks'),
                  awayCorners: getStat(awayStats.statistics, 'Corner Kicks'),
                  homeYellowCards: getStat(homeStats.statistics, 'Yellow Cards'),
                  awayYellowCards: getStat(awayStats.statistics, 'Yellow Cards'),
                  homeRedCards: getStat(homeStats.statistics, 'Red Cards'),
                  awayRedCards: getStat(awayStats.statistics, 'Red Cards'),
                };

                hasStats = true;
              }
            } catch (statsError) {
              // Continue without stats
            }

            // Save to database
            try {
              await prisma.match.create({
                data: {
                  fixtureId: match.fixture.id,
                  leagueId: match.league.id,
                  leagueName: match.league.name,
                  season: match.league.season,
                  date: new Date(match.fixture.date),
                  timestamp: Math.floor(new Date(match.fixture.date).getTime() / 1000),
                  timezone: 'UTC',
                  status: match.fixture.status.short,
                  homeTeamId: match.teams.home.id,
                  homeTeamName: match.teams.home.name,
                  awayTeamId: match.teams.away.id,
                  awayTeamName: match.teams.away.name,
                  homeGoals: match.goals.home,
                  awayGoals: match.goals.away,
                  homeScoreHT: match.score.halftime.home,
                  awayScoreHT: match.score.halftime.away,
                  homeScoreFT: match.score.fulltime.home,
                  awayScoreFT: match.score.fulltime.away,
                  ...stats,
                  rawData: match as any,
                },
              });

              results.processed++;
              existingIds.add(match.fixture.id);

              if (hasStats) {
                results.withStats++;
              }

              if (!results.byLeague[match.league.name]) {
                results.byLeague[match.league.name] = 0;
              }
              results.byLeague[match.league.name]++;
            } catch (createError: any) {
              // Skip duplicates or other errors
              if (createError.code !== 'P2002') {
                console.error(`[API] Error saving match ${match.fixture.id}:`, createError?.message);
              }
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 500));
          }

          // Wait between leagues
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
      message: `Saved ${results.processed} matches (${results.withStats} with stats)`,
    });

  } catch (error: any) {
    console.error('[API] POST Error:', error);
    return NextResponse.json(
      { error: 'Error', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
