import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

// Top leagues IDs from API-Football
const TOP_LEAGUES = [
  39,    // Premier League
  140,   // La Liga
  135,   // Serie A
  78,    // Bundesliga
  61,    // Ligue 1
  88,    // Eredivisie
  94,    // Primeira Liga
  2,     // Champions League
  3,     // Europa League
  848,   // Conference League
  203,   // Süper Lig
  144,   // Jupiler Pro League
  113,   // Allsvenskan
  103,   // Eliteserien
  119,   // Superliga
  106,   // Ekstraklasa
  179,   // Premiership
  357,   // Liga MX
  128,   // Liga Profesional Argentina
  71,    // Serie A Brazil
  13,    // Primera A Colombia
  239,   // Primera División Chile
  40,    // Championship
  41,    // League One
];

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_API_FOOTBALL_KEY not set' }, { status: 500 });
    }

    let synced = 0;
    let errors: string[] = [];

    for (const leagueId of TOP_LEAGUES) {
      try {
        // Get current season info
        const response = await fetch(`${API_BASE}/leagues?id=${leagueId}`, {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io',
          },
        });

        const data = await response.json();
        
        if (!data.response || data.response.length === 0) {
          errors.push(`League ${leagueId}: No data found`);
          continue;
        }

        const leagueData = data.response[0];
        const league = leagueData.league;
        const season = leagueData.seasons?.[0];

        if (!season) {
          errors.push(`League ${leagueId}: No season data`);
          continue;
        }

        await prisma.league.upsert({
          where: { id: league.id },
          update: {
            name: league.name,
            country: league.country,
            countryCode: league.countryCode || null,
            logo: league.logo || null,
            flag: league.flag || null,
            season: season.year,
            seasonStart: season.start ? new Date(season.start) : null,
            seasonEnd: season.end ? new Date(season.end) : null,
            type: league.type,
          },
          create: {
            id: league.id,
            name: league.name,
            country: league.country,
            countryCode: league.countryCode || null,
            logo: league.logo || null,
            flag: league.flag || null,
            season: season.year,
            seasonStart: season.start ? new Date(season.start) : null,
            seasonEnd: season.end ? new Date(season.end) : null,
            type: league.type,
          },
        });

        synced++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        errors.push(`League ${leagueId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      total: TOP_LEAGUES.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST to sync leagues from API-Football',
    leagues: TOP_LEAGUES.length,
  });
}
