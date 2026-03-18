import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TOP_LEAGUES = [39, 140, 61, 78, 135, 262, 2, 3, 848, 531];

export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
    
    if (!API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Obtener partidos de hoy desde API-Football
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${today}`,
      {
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const matches = data.response || [];

    // Filtrar solo ligas top
    const filteredMatches = matches.filter((m: any) => 
      TOP_LEAGUES.includes(m.league.id)
    );

    let created = 0;
    let updated = 0;

    for (const match of filteredMatches) {
      try {
        const matchData = {
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
          rawData: JSON.stringify(match)
        };

        const existing = await prisma.match.findUnique({
          where: { fixtureId: match.fixture.id }
        });

        if (existing) {
          await prisma.match.update({
            where: { fixtureId: match.fixture.id },
            data: {
              status: matchData.status,
              homeGoals: matchData.homeGoals,
              awayGoals: matchData.awayGoals,
              updatedAt: new Date()
            }
          });
          updated++;
        } else {
          await prisma.match.create({ data: matchData });
          created++;
        }
      } catch (e) {
        console.error(`Error syncing match ${match.fixture.id}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      totalFromAPI: matches.length,
      filtered: filteredMatches.length,
      created,
      updated
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync matches' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const count = await prisma.match.count({
    where: {
      date: { gte: start, lte: end }
    }
  });

  return NextResponse.json({
    matchesToday: count,
    date: today.toISOString().split('T')[0]
  });
}
