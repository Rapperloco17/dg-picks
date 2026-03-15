import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchSize = 100, startFrom = 0 } = body;
    
    // Get matches without team names
    const matches = await prisma.match.findMany({
      where: {
        homeTeamName: ''
      },
      take: batchSize,
      skip: startFrom,
      orderBy: { date: 'desc' },
    });

    if (matches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No more matches to update',
        done: true 
      });
    }

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Update each match
    for (const match of matches) {
      try {
        // Fetch fixture details
        const res = await fetch(
          `${API_BASE}/fixtures?id=${match.fixtureId}`,
          {
            headers: {
              'x-rapidapi-key': API_KEY || '',
              'x-rapidapi-host': 'v3.football.api-sports.io',
            },
          }
        );

        const data = await res.json();
        
        if (data.response && data.response.length > 0) {
          const fixture = data.response[0];
          
          await prisma.match.update({
            where: { id: match.id },
            data: {
              homeTeamName: fixture.teams.home.name,
              awayTeamName: fixture.teams.away.name,
              leagueName: fixture.league.name,
            },
          });
          results.updated++;
        } else {
          results.failed++;
        }

        // Rate limit: 6 requests per second
        await new Promise(r => setTimeout(r, 170));
        
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Match ${match.fixtureId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.updated} of ${matches.length} matches`,
      results,
      nextBatch: startFrom + batchSize,
      done: results.updated === 0,
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
    message: 'POST to update historical matches with missing team names',
    matchesWithoutNames: count,
    estimatedTimeMinutes: Math.ceil(count * 0.17 / 60), // 170ms per request
  });
}
