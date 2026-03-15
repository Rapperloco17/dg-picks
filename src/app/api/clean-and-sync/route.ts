import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.FOOTBALL_API_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

export async function POST(request: NextRequest) {
  try {
    // 1. Borrar partidos sin nombres (basura)
    const deleted = await prisma.match.deleteMany({
      where: {
        homeTeamName: ''
      }
    });

    // 2. Sincronizar partidos de hoy
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const TOP_LEAGUES = [39, 140, 135, 78, 61, 88, 94, 2, 3];
    let added = 0;

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

        const data = await res.json();
        if (!data.response) continue;

        for (const f of data.response) {
          await prisma.match.upsert({
            where: { fixtureId: f.fixture.id },
            update: {},
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
              rawData: f as any,
            },
          });
          added++;
        }
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      deleted: deleted.count,
      added,
      message: `Limpieza: ${deleted.count} borrados, ${added} agregados`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'POST para limpiar BD y sincronizar partidos de hoy' });
}
