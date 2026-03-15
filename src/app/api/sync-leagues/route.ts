import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_BASE = 'https://v3.football.api-sports.io';

// TODAS las ligas - 90+ competiciones
const ALL_LEAGUES = [
  // INGLATERRA
  39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50, 54,
  // ESPAÑA
  140, 141, 143, 142, 556, 82, 83, 117,
  // ITALIA
  135, 136, 137, 138, 157, 158, 159,
  // ALEMANIA
  78, 79, 80, 81, 529, 83,
  // FRANCIA
  61, 62, 63, 66, 65, 53,
  // PORTUGAL
  94, 95, 96, 97,
  // HOLANDA
  88, 89, 90, 91,
  // EUROPA
  2, 3, 848, 4, 5, 6, 7, 8,
  // CONCACAF
  16, 17, 18, 31, 32, 22,
  // SUDAMÉRICA
  13, 11, 44, 45, 129, 246,
  // AMÉRICAS
  128, 130, 131, 71, 72, 73, 75, 239, 240, 265, 266, 262, 263, 265, 358, 255, 345,
  // RESTO EUROPA
  203, 204, 205, 144, 145, 113, 114, 103, 104, 119, 120, 106, 107, 179, 180, 181, 182, 169, 170, 172, 192, 193, 197, 198, 207, 208, 210, 211, 235, 236, 244, 245, 253, 254, 271, 286, 287, 293, 294,
  // ASIA
  98, 99, 100, 292, 307, 308, 309, 98, 99, 307, 308, 300, 301, 302,
  // ÁFRICA
  216, 217, 218, 219, 233,
];

const UNIQUE_LEAGUES = [...new Set(ALL_LEAGUES)];

export async function POST(request: NextRequest) {
  try {
    const API_KEY = process.env.FOOTBALL_API_KEY || 
                   process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
    
    if (!API_KEY) {
      return NextResponse.json({ 
        error: 'API_KEY not found. Set FOOTBALL_API_KEY',
      }, { status: 500 });
    }

    let synced = 0;
    let errors: string[] = [];
    let skipped = 0;

    for (const leagueId of UNIQUE_LEAGUES) {
      try {
        const response = await fetch(`${API_BASE}/leagues?id=${leagueId}`, {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          errors.push(`League ${leagueId}: HTTP ${response.status}`);
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

        // Usar datos del país si están disponibles, si no inferir de la liga
        const countryName = country?.name || league.country || 'Unknown';
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
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error: any) {
        errors.push(`League ${leagueId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: UNIQUE_LEAGUES.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST to sync 90+ leagues and cups from API-Football',
    leagues: UNIQUE_LEAGUES.length,
  });
}
