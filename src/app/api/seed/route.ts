import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const mockMatches = [
  {
    fixtureId: 100001,
    leagueId: 39,
    leagueName: 'Premier League',
    season: 2024,
    round: 'Jornada 28',
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 33,
    homeTeamName: 'Manchester United',
    awayTeamId: 34,
    awayTeamName: 'Newcastle',
  },
  {
    fixtureId: 100002,
    leagueId: 140,
    leagueName: 'La Liga',
    season: 2024,
    round: 'Jornada 28',
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 529,
    homeTeamName: 'Barcelona',
    awayTeamId: 530,
    awayTeamName: 'Atletico Madrid',
  },
  {
    fixtureId: 100003,
    leagueId: 135,
    leagueName: 'Serie A',
    season: 2024,
    round: 'Jornada 28',
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 489,
    homeTeamName: 'AC Milan',
    awayTeamId: 492,
    awayTeamName: 'Napoli',
  },
  {
    fixtureId: 100004,
    leagueId: 78,
    leagueName: 'Bundesliga',
    season: 2024,
    round: 'Jornada 26',
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 157,
    homeTeamName: 'Bayern Munich',
    awayTeamId: 165,
    awayTeamName: 'Borussia Dortmund',
  },
  {
    fixtureId: 100005,
    leagueId: 262,
    leagueName: 'Liga MX',
    season: 2024,
    round: 'Jornada 12',
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 2282,
    homeTeamName: 'Club America',
    awayTeamId: 2283,
    awayTeamName: 'Chivas',
  }
];

export async function POST() {
  try {
    const now = new Date();
    const created = [];

    for (let i = 0; i < mockMatches.length; i++) {
      const base = mockMatches[i];
      const date = new Date(now);
      date.setHours(12 + i * 2, 0, 0, 0);

      const match = await prisma.match.upsert({
        where: { fixtureId: base.fixtureId },
        update: {
          date,
          timestamp: Math.floor(date.getTime() / 1000),
        },
        create: {
          ...base,
          date,
          timestamp: Math.floor(date.getTime() / 1000),
          rawData: JSON.stringify(base),
        }
      });
      
      created.push(`${match.homeTeamName} vs ${match.awayTeamName}`);
    }

    return NextResponse.json({
      success: true,
      message: `${created.length} partidos creados/actualizados`,
      matches: created
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed matches' },
      { status: 500 }
    );
  }
}

// También permitir GET para verificar estado
export async function GET() {
  const count = await prisma.match.count();
  return NextResponse.json({ matchesInDb: count });
}
