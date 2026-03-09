import { NextRequest, NextResponse } from 'next/server';
import { ALL_LEAGUES } from '@/constants/leagues';
import { makeRequest } from '@/services/api-football';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

// Ultra plan: 450 req/min = 7.5 req/sec
const BATCH_SIZE = 5; // Process 5 matches in parallel
const API_DELAY = 150; // 150ms between calls (400 req/min safe)

// GET: Check existing data
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
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error consultando BD', 
      details: error?.message,
      totalMatches: 0 
    }, { status: 500 });
  }
}

// Fast parallel processing for Ultra plan
export async function POST(request: NextRequest) {
  console.log('[API] Ultra Plan Mode - 450 req/min');
  
  try {
    const body = await request.json().catch(() => ({}));
    const { maxLeagues = 67, seasons = [2024, 2025] } = body;

    const results = {
      fromLocal: 0,
      fromDatabase: 0,
      fromAPI: 0,
      withStats: 0,
      errors: [] as string[],
      byLeague: {} as Record<string, { local: number; db: number; api: number }>,
    };

    // Process each league
    for (const league of ALL_LEAGUES.slice(0, maxLeagues)) {
      console.log(`\n[${league.name}] Procesando...`);
      results.byLeague[league.name] = { local: 0, db: 0, api: 0 };

      for (const season of seasons) {
        try {
          // Check DB first
          const existingMatches = await prisma.match.findMany({
            where: { leagueId: league.id, season },
            select: { fixtureId: true }
          });
          const existingIds = new Set(existingMatches.map(m => m.fixtureId));
          results.fromDatabase += existingMatches.length;
          results.byLeague[league.name].db += existingMatches.length;

          // Try local files
          const localFiles = [
            path.join(process.cwd(), 'data', `${league.id}_${season}_enriched.json`),
            path.join(process.cwd(), 'data', `${league.id}_${season}.json`),
          ];

          for (const filePath of localFiles) {
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              const matches = JSON.parse(content);
              if (!Array.isArray(matches)) continue;

              console.log(`  [${season}] Local: ${matches.length} partidos`);

              for (const match of matches) {
                const fixtureId = match.fixture?.id;
                if (!fixtureId || existingIds.has(fixtureId)) continue;

                try {
                  await saveMatch(match, existingIds, results, league.name, 'local');
                } catch (e) { }
              }
              break;
            } catch (e) { }
          }

          // Get fixtures from API
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
          
          if (missingFixtures.length === 0) {
            console.log(`  [${season}] ✓ Completado (BD + Local)`);
            continue;
          }

          console.log(`  [${season}] API: ${missingFixtures.length} faltan`);

          // Process in parallel batches
          for (let i = 0; i < missingFixtures.length; i += BATCH_SIZE) {
            const batch = missingFixtures.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (match) => {
              try {
                // Get statistics
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
                } catch (e) { }

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

                results.fromAPI++;
                results.byLeague[league.name].api++;
                if (stats.homePossession !== 50) results.withStats++;

              } catch (err: any) {
                console.error(`    Error ${match.fixture.id}:`, err?.message);
              }
            }));

            // Small delay between batches (Ultra plan: 450/min)
            await new Promise(r => setTimeout(r, API_DELAY));
          }

        } catch (err: any) {
          console.error(`  Error ${league.name} ${season}:`, err?.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `✅ Completado:
• ${results.fromLocal} locales
• ${results.fromDatabase} en BD
• ${results.fromAPI} de API
• ${results.withStats} con estadísticas`,
    });

  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Error', details: error?.message }, { status: 500 });
  }
}

async function saveMatch(match: any, existingIds: Set<number>, results: any, leagueName: string, source: string) {
  const fixtureId = match.fixture?.id;
  if (!fixtureId || existingIds.has(fixtureId)) return;

  const stats = match.statistics || [];
  const homeStats = stats[0]?.statistics || [];
  const awayStats = stats[1]?.statistics || [];
  
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

  await prisma.match.create({
    data: {
      fixtureId: match.fixture.id,
      leagueId: match.league?.id || 0,
      leagueName: match.league?.name || leagueName,
      season: match.league?.season || 0,
      round: match.league?.round,
      date: new Date(match.fixture.date),
      timestamp: match.fixture.timestamp,
      timezone: match.fixture.timezone,
      status: match.fixture.status?.short || 'FT',
      homeTeamId: match.teams?.home?.id || 0,
      homeTeamName: match.teams?.home?.name || 'Unknown',
      awayTeamId: match.teams?.away?.id || 0,
      awayTeamName: match.teams?.away?.name || 'Unknown',
      homeGoals: match.goals?.home ?? 0,
      awayGoals: match.goals?.away ?? 0,
      homeScoreHT: match.score?.halftime?.home,
      awayScoreHT: match.score?.halftime?.away,
      homeScoreFT: match.score?.fulltime?.home,
      awayScoreFT: match.score?.fulltime?.away,
      homeCorners: match.corners?.home || getStat(homeStats, 'Corner Kicks'),
      awayCorners: match.corners?.away || getStat(awayStats, 'Corner Kicks'),
      homeYellowCards: getStat(homeStats, 'Yellow Cards'),
      awayYellowCards: getStat(awayStats, 'Yellow Cards'),
      homeRedCards: getStat(homeStats, 'Red Cards'),
      awayRedCards: getStat(awayStats, 'Red Cards'),
      homePossession: match.possession?.home || getStat(homeStats, 'Ball Possession'),
      awayPossession: match.possession?.away || getStat(awayStats, 'Ball Possession'),
      homeShots: match.shots?.home?.total || getStat(homeStats, 'Total Shots'),
      awayShots: match.shots?.away?.total || getStat(awayStats, 'Total Shots'),
      homeShotsOnTarget: match.shots?.home?.on || getStat(homeStats, 'Shots on Goal'),
      awayShotsOnTarget: match.shots?.away?.on || getStat(awayStats, 'Shots on Goal'),
      rawData: match as any,
    }
  });

  if (source === 'local') {
    results.fromLocal++;
    results.byLeague[leagueName].local++;
  }
  existingIds.add(fixtureId);
}
