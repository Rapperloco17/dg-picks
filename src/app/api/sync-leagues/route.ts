import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_BASE = 'https://v3.football.api-sports.io';

// Lista de ligas principales (las que sabemos que funcionan)
const MAIN_LEAGUES = [
  39, 140, 135, 78, 61,  // Top 5 Europe
  88, 94, 203, 144,      // Netherlands, Portugal, Turkey, Belgium
  2, 3, 848,             // European cups
  128, 71, 262, 358,     // Argentina, Brazil, Mexico, USA
  16,                    // CONCACAF Champions
  45, 46,                // FA Cup, Carabao Cup
  143, 137, 81, 66,      // Copa del Rey, Coppa Italia, DFB Pokal, Coupe de France
];

export async function POST(request: NextRequest) {
  try {
    const API_KEY = process.env.FOOTBALL_API_KEY || 
                   process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
    
    if (!API_KEY) {
      return NextResponse.json({ 
        error: 'API_KEY not found',
      }, { status: 500 });
    }

    let synced = 0;
    let errors: string[] = [];
    let skipped = 0;

    for (const leagueId of MAIN_LEAGUES) {
      try {
        const url = `${API_BASE}/leagues?id=${leagueId}`;
        const response = await fetch(url, {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io',
          },
          // Agregar timeout
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          errors.push(`League ${leagueId}: HTTP ${response.status} - ${errorText.slice(0, 100)}`);
          continue;
        }

        const data = await response.json();
        
        if (!data.response || data.response.length === 0) {
          skipped++;
          continue;
        }

        const leagueData = data.response[0];
        const league = leagueData.league;
        const country = leagueData.country;
        const season = leagueData.seasons?.find((s: any) => s.current) || leagueData.seasons?.[0];

        if (!season) {
          skipped++;
          continue;
        }

        const countryName = country?.name || 'Unknown';
        const flag = country?.flag || null;

        await prisma.league.upsert({
          where: { id: league.id },
          update: {
            name: league.name,
            country: countryName,
            countryCode: country?.code || null,
            logo: league.logo || null,
            flag: flag,
            season: season.year,
            seasonStart: season.start ? new Date(season.start) : null,
            seasonEnd: season.end ? new Date(season.end) : null,
            type: league.type,
          },
          create: {
            id: league.id,
            name: league.name,
            country: countryName,
            countryCode: country?.code || null,
            logo: league.logo || null,
            flag: flag,
            season: season.year,
            seasonStart: season.start ? new Date(season.start) : null,
            seasonEnd: season.end ? new Date(season.end) : null,
            type: league.type,
          },
        });

        synced++;
        
        // Delay más largo para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error: any) {
        errors.push(`League ${leagueId}: ${error.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: MAIN_LEAGUES.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST to sync main leagues from API-Football',
    leagues: MAIN_LEAGUES.length,
  });
}
