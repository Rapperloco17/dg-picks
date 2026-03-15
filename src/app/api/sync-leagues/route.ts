import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeRequest } from '@/services/api-football';

// Lista de ligas principales
const MAIN_LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78, name: 'Bundesliga' },
  { id: 61, name: 'Ligue 1' },
  { id: 88, name: 'Eredivisie' },
  { id: 94, name: 'Primeira Liga' },
  { id: 2, name: 'Champions League' },
  { id: 3, name: 'Europa League' },
  { id: 848, name: 'Conference League' },
  { id: 45, name: 'FA Cup' },
  { id: 46, name: 'Carabao Cup' },
  { id: 143, name: 'Copa del Rey' },
  { id: 137, name: 'Coppa Italia' },
  { id: 81, name: 'DFB Pokal' },
  { id: 66, name: 'Coupe de France' },
  { id: 16, name: 'CONCACAF Champions' },
  { id: 128, name: 'Argentina Liga Profesional' },
  { id: 71, name: 'Brazil Serie A' },
  { id: 262, name: 'Liga MX' },
  { id: 358, name: 'MLS' },
  { id: 203, name: 'Süper Lig' },
  { id: 144, name: 'Jupiler Pro League' },
];

export async function POST(request: NextRequest) {
  try {
    let synced = 0;
    let errors: string[] = [];

    for (const league of MAIN_LEAGUES) {
      try {
        // Usar el servicio que ya tiene rate limiting y reintentos
        const data = await makeRequest({
          endpoint: 'leagues',
          params: { id: league.id }
        });
        
        if (!data.response || data.response.length === 0) {
          errors.push(`League ${league.id}: No data found`);
          continue;
        }

        const leagueData = data.response[0];
        const leagueInfo = leagueData.league;
        const country = leagueData.country;
        const season = leagueData.seasons?.find((s: any) => s.current) || leagueData.seasons?.[0];

        if (!season) {
          errors.push(`League ${league.id}: No season data`);
          continue;
        }

        await prisma.league.upsert({
          where: { id: leagueInfo.id },
          update: {
            name: leagueInfo.name,
            country: country?.name || 'Unknown',
            countryCode: country?.code || null,
            logo: leagueInfo.logo || null,
            flag: country?.flag || null,
            season: season.year,
            seasonStart: season.start ? new Date(season.start) : null,
            seasonEnd: season.end ? new Date(season.end) : null,
            type: leagueInfo.type,
          },
          create: {
            id: leagueInfo.id,
            name: leagueInfo.name,
            country: country?.name || 'Unknown',
            countryCode: country?.code || null,
            logo: leagueInfo.logo || null,
            flag: country?.flag || null,
            season: season.year,
            seasonStart: season.start ? new Date(season.start) : null,
            seasonEnd: season.end ? new Date(season.end) : null,
            type: leagueInfo.type,
          },
        });

        synced++;
        
      } catch (error: any) {
        errors.push(`League ${league.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
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
    list: MAIN_LEAGUES.map(l => l.name)
  });
}
