import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const DELAY_MS = 80;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchSize = 50 } = body;
    
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { homeTeamName: '' },
          { homeTeamName: null },
        ]
      },
      take: batchSize,
      orderBy: { date: 'desc' },
    });

    if (matches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Todos los partidos actualizados',
        done: true 
      });
    }

    let updated = 0;
    let failed = 0;

    for (const match of matches) {
      try {
        const res = await fetch(
          `${API_BASE}/fixtures?id=${match.fixtureId}`,
          {
            headers: {
              'x-rapidapi-key': API_KEY || '',
              'x-rapidapi-host': 'v3.football.api-sports.io',
            },
          }
        );

        if (!res.ok) {
          failed++;
          continue;
        }

        const data = await res.json();
        
        if (data.response && data.response.length > 0) {
          const fixture = data.response[0];
          
          await prisma.match.update({
            where: { id: match.id },
            data: {
              homeTeamName: fixture.teams.home.name,
              awayTeamName: fixture.teams.away.name,
              leagueName: fixture.league.name,
              status: fixture.fixture.status.short,
            },
          });
          updated++;
        } else {
          failed++;
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
      } catch (err) {
        failed++;
      }
    }

    const remaining = await prisma.match.count({
      where: {
        OR: [
          { homeTeamName: '' },
          { homeTeamName: null },
        ]
      }
    });

    return NextResponse.json({
      success: true,
      message: `Lote: ${updated} actualizados, ${failed} fallidos`,
      updated,
      failed,
      remaining,
      done: remaining === 0,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const count = await prisma.match.count({
    where: {
      OR: [
        { homeTeamName: '' },
        { homeTeamName: null },
      ]
    }
  });
  
  return NextResponse.json({
    matchesWithoutNames: count,
    message: 'POST con body {"batchSize": 50}'
  });
}
