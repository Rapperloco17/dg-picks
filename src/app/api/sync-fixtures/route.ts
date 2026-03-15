import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

const PRIORITY_LEAGUES = [
  39, 40, 41, 42, 43,  // Premier League + cups
  140, 141, 142, 143,  // La Liga
  135, 136, 137, 138,  // Serie A
  78, 79, 80, 81,      // Bundesliga
  61, 62, 63, 64,      // Ligue 1
  88, 89, 90,          // Eredivisie
  94, 95, 96,          // Primeira Liga
  2, 3, 848,  // Champions, Europa, Conference
];

export async function POST(request: NextRequest) {
  try {
    const results = {
      synced: 0,
      updated: 0,
      errors: [] as string[],
    };

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const leagueId of PRIORITY_LEAGUES) {
      try {
        // Fetch fixtures for next 7 days
        const res = await fetch(
          `${API_BASE}/fixtures?league=${leagueId}&season=2024&from=${today}&to=${nextWeek}`,
          {
            headers: {
              'x-rapidapi-key': API_KEY || '',
              'x-rapidapi-host': 'v3.football.api-sports.io',
            },
          }
        );

        const data = await res.json();
        
        if (!data.response || data.response.length === 0) continue;

        for (const fixture of data.response) {
          try {
            await prisma.match.upsert({
              where: { fixtureId: fixture.fixture.id },
              update: {
                status: fixture.fixture.status.short,
                date: new Date(fixture.fixture.date),
                homeTeamName: fixture.teams.home.name,
                awayTeamName: fixture.teams.away.name,
                homeGoals: fixture.goals.home ?? null,
                awayGoals: fixture.goals.away ?? null,
              },
              create: {
                fixtureId: fixture.fixture.id,
                leagueId: fixture.league.id,
                leagueName: fixture.league.name,
                season: fixture.league.season,
                round: fixture.league.round,
                date: new Date(fixture.fixture.date),
                timestamp: fixture.fixture.timestamp,
                timezone: fixture.fixture.timezone || 'UTC',
                status: fixture.fixture.status.short,
                homeTeamId: fixture.teams.home.id,
                homeTeamName: fixture.teams.home.name,
                awayTeamId: fixture.teams.away.id,
                awayTeamName: fixture.teams.away.name,
                homeGoals: fixture.goals.home ?? null,
                awayGoals: fixture.goals.away ?? null,
                rawData: fixture as any,
              },
            });
            results.synced++;
          } catch (err: any) {
            results.errors.push(`Fixture ${fixture.fixture.id}: ${err.message}`);
          }
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, 150));
      } catch (err: any) {
        results.errors.push(`League ${leagueId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${results.synced} fixtures synced/updated`,
      results,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to sync upcoming fixtures',
    leagues: PRIORITY_LEAGUES.length,
    coverage: 'Next 7 days',
  });
}
