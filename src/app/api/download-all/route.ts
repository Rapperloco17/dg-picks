import { NextRequest, NextResponse } from 'next/server';
import { ALL_LEAGUES } from '@/constants/leagues';
import { makeRequest } from '@/services/api-football';
import { prisma } from '@/lib/prisma';

// 500 req/min plan - FAST download
const API_DELAY = 125; // 125ms = 480 req/min

export async function POST(request: NextRequest) {
  console.log('[DOWNLOAD-ALL] Starting full download 2018-2026 @ 480 req/min...');
  
  const START_YEAR = 2018;
  const END_YEAR = 2026;  // Include 2026 season
  const seasons = Array.from({length: END_YEAR - START_YEAR + 1}, (_, i) => START_YEAR + i);
  
  let totalProcessed = 0;
  let totalWithStats = 0;
  let errors = 0;
  
  const results = {
    byLeague: [] as {name: string, count: number, withStats: number}[],
  };

  for (const league of ALL_LEAGUES) {
    console.log(`\n[${league.name}] ========================================`);
    let leagueCount = 0;
    let leagueStats = 0;

    for (const season of seasons) {
      try {
        // Get fixtures for this league/season
        console.log(`  [${season}] Getting fixtures...`);
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
        if (fixtures.length === 0) {
          console.log(`  [${season}] No matches`);
          continue;
        }

        console.log(`  [${season}] ${fixtures.length} matches found`);

        // Get existing matches to avoid duplicates
        const existing = await prisma.match.findMany({
          where: { leagueId: league.id, season },
          select: { fixtureId: true }
        });
        const existingIds = new Set(existing.map(m => m.fixtureId));

        // Process each match
        for (const match of fixtures) {
          if (existingIds.has(match.fixture.id)) continue;

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

                stats = {
                  homeCorners: getStat(statsData.response[0].statistics, 'Corner Kicks'),
                  awayCorners: getStat(statsData.response[1].statistics, 'Corner Kicks'),
                  homeYellowCards: getStat(statsData.response[0].statistics, 'Yellow Cards'),
                  awayYellowCards: getStat(statsData.response[1].statistics, 'Yellow Cards'),
                  homeRedCards: getStat(statsData.response[0].statistics, 'Red Cards'),
                  awayRedCards: getStat(statsData.response[1].statistics, 'Red Cards'),
                  homePossession: getStat(statsData.response[0].statistics, 'Ball Possession'),
                  awayPossession: getStat(statsData.response[1].statistics, 'Ball Possession'),
                  homeShots: getStat(statsData.response[0].statistics, 'Total Shots'),
                  awayShots: getStat(statsData.response[1].statistics, 'Total Shots'),
                  homeShotsOnTarget: getStat(statsData.response[0].statistics, 'Shots on Goal'),
                  awayShotsOnTarget: getStat(statsData.response[1].statistics, 'Shots on Goal'),
                };
              }
            } catch (e) { /* no stats */ }

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
                homeScoreHT: match.score?.halftime?.home,
                awayScoreHT: match.score?.halftime?.away,
                homeScoreFT: match.score?.fulltime?.home,
                awayScoreFT: match.score?.fulltime?.away,
                ...stats,
                rawData: match as any,
              }
            });

            totalProcessed++;
            leagueCount++;
            if (stats.homePossession !== 50) {
              totalWithStats++;
              leagueStats++;
            }

            // Log progress every 100 matches
            if (totalProcessed % 100 === 0) {
              console.log(`  [PROGRESS] Total: ${totalProcessed} matches`);
            }

            // Delay for rate limiting (480 req/min)
            await new Promise(r => setTimeout(r, API_DELAY));

          } catch (err: any) {
            errors++;
          }
        }

        console.log(`  [${season}] ✅ Done`);

      } catch (err: any) {
        console.error(`  [${season}] ❌ Error:`, err?.message);
      }
    }

    if (leagueCount > 0) {
      results.byLeague.push({
        name: league.name,
        count: leagueCount,
        withStats: leagueStats
      });
      console.log(`[${league.name}] Total: ${leagueCount} matches`);
    }
  }

  return NextResponse.json({
    success: true,
    totalProcessed,
    totalWithStats,
    errors,
    seasons: seasons.length,
    leagues: ALL_LEAGUES.length,
    byLeague: results.byLeague,
    message: `✅ Complete! ${totalProcessed} matches downloaded (2018-2025)`,
  });
}

// GET: Status check
export async function GET(request: NextRequest) {
  const count = await prisma.match.count();
  return NextResponse.json({
    currentTotal: count,
    target: '67 leagues × 8 seasons (2018-2025)',
    message: `${count} matches in database. Use POST to start full download.`,
  });
}
