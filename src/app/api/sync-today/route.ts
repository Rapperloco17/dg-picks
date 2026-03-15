import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

const TOP_LEAGUES = [39, 140, 135, 78, 61, 88, 94, 2, 3];

export async function POST(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    let totalAdded = 0;
    const errors: string[] = [];

    for (const leagueId of TOP_LEAGUES) {
      try {
        const res = await fetch(
          `${API_BASE}/fixtures?league=${leagueId}&season=2024&from=${today}&to=${tomorrow}`,
          {
            headers: {
              'x-rapidapi-key': API_KEY || '',
              'x-rapidapi-host': 'v3.football.api-sports.io',
            },
          }
        );

        if (!res.ok) {
          errors.push(`League ${leagueId}: HTTP ${res.status}`);
          continue;
        }

        const data = await res.json();
        
        if (!data.response || data.response.length === 0) continue;

        for (const f of data.response) {
          try {
            await prisma.match.upsert({
              where: { fixtureId: f.fixture.id },
              update: {
                status: f.fixture.status.short,
                date: new Date(f.fixture.date),
                homeTeamName: f.teams.home.name,
                awayTeamName: f.teams.away.name,
                leagueName: f.league.name,
                homeGoals: f.goals.home,
                awayGoals: f.goals.away,
              },
              create: {
                fixtureId: f.fixture.id,
                leagueId: f.league.id,
                leagueName: f.league.name,
                season: f.league.season,
                date: new Date(f.fixture.date),
                timestamp: f.fixture.timestamp,
                timezone: f.fixture.timezone || 'UTC',
                status: f.fixture.status.short,
                homeTeamId: f.teams.home.id,
                homeTeamName: f.teams.home.name,
                awayTeamId: f.teams.away.id,
                awayTeamName: f.teams.away.name,
                homeGoals: f.goals.home,
                awayGoals: f.goals.away,
                rawData: f as any,
              },
            });
            totalAdded++;
          } catch (err: any) {
            errors.push(`Fixture ${f.fixture.id}: ${err.message}`);
          }
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (err: any) {
        errors.push(`League ${leagueId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalAdded,
      date: today,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'POST to sync today matches' });
}
