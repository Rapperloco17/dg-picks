import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

// Optimizado para MEGA plan: 750 req/min
const DELAY_MS = 80; // 80ms = 750 req/min max
const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startFrom = 0, limit = BATCH_SIZE } = body;
    
    // Get matches without team names
    const matches = await prisma.match.findMany({
      where: {
        homeTeamName: ''
      },
      take: limit,
      skip: startFrom,
      orderBy: { date: 'desc' },
    });

    if (matches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '✅ Todos los partidos han sido actualizados',
        done: true,
        totalProcessed: startFrom
      });
    }

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(`[UPDATE-ALL] Procesando ${matches.length} partidos desde offset ${startFrom}...`);

    // Update each match
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
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
          results.failed++;
          results.errors.push(`Fixture ${match.fixtureId}: HTTP ${res.status}`);
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
              homeGoals: fixture.goals.home,
              awayGoals: fixture.goals.away,
              date: new Date(fixture.fixture.date),
            },
          });
          results.updated++;
          
          if ((i + 1) % 10 === 0) {
            console.log(`[UPDATE-ALL] Progreso: ${i + 1}/${matches.length}`);
          }
        } else {
          results.failed++;
          results.errors.push(`Fixture ${match.fixtureId}: No data in API`);
        }

        // Rate limit: 750 req/min = 12.5 req/seg = 80ms entre requests
        await new Promise(r => setTimeout(r, DELAY_MS));
        
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Match ${match.fixtureId}: ${err.message}`);
      }
    }

    const nextBatch = startFrom + matches.length;
    const remaining = await prisma.match.count({
      where: {
        homeTeamName: ''
      }
    });

    return NextResponse.json({
      success: true,
      message: `Lote completado: ${results.updated} actualizados, ${results.failed} fallidos`,
      results,
      nextBatch,
      remaining,
      done: remaining === 0,
      estimatedMinutesLeft: Math.ceil((remaining * DELAY_MS) / 60000),
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const count = await prisma.match.count({
    where: {
      homeTeamName: ''
    }
  });
  
  return NextResponse.json({
    message: 'POST para actualizar todos los partidos con nombres de equipos',
    matchesWithoutNames: count,
    estimatedTimeHours: Math.ceil((count * DELAY_MS) / 3600000 * 10) / 10,
    requestsNeeded: count,
    dailyQuota: 150000,
    endpoint: '/api/update-all',
    method: 'POST',
    body: { startFrom: 0, limit: 100 }
  });
}
