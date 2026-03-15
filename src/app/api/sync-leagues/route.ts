import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeRequest } from '@/services/api-football';

// TIER 1 - Top ligas del mundo (prioridad máxima)
const TIER_1_LEAGUES = [
  // Top 5 Europa
  39,   // Premier League (Inglaterra)
  140,  // La Liga (España)
  135,  // Serie A (Italia)
  78,   // Bundesliga (Alemania)
  61,   // Ligue 1 (Francia)
  // Europa
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  // Américas
  13,   // Copa Libertadores
  16,   // Copa Sudamericana
  128,  // Liga MX (México)
  71,   // Brasileirão (Brasil)
  262,  // MLS (USA)
  // Selecciones
  32,   // World Cup
  960,  // Nations League
];

// TIER 2 - Ligas secundarias importantes
const TIER_2_LEAGUES = [
  // Europa
  88,   // Eredivisie (Holanda)
  94,   // Primeira Liga (Portugal)
  144,  // Pro League (Bélgica)
  203,  // Süper Lig (Turquía)
  119,  // Scottish Premiership (Escocia)
  235,  // Premier League (Rusia)
  333,  // Super League (Suiza)
  40,   // Championship (Inglaterra 2da)
  141,  // La Liga 2 (España 2da)
  136,  // Serie B (Italia 2da)
  // Américas
  358,  // Primera División (Argentina)
  155,  // Primera A (Colombia)
  169,  // Primera División (Chile)
  99,   // Primera División (Uruguay)
  292,  // Primera División (Perú)
  // Asia
  98,   // J1 League (Japón)
  292,  // K League 1 (Corea del Sur)
  345,  // Saudi Pro League (Arabia)
];

// TIER 3 - Resto de ligas (solo las más relevantes)
const TIER_3_LEAGUES = [
  203,  // Austria Bundesliga
  172,  // Superliga (Dinamarca)
  113,  // Allsvenskan (Suecia)
  103,  // Eliteserien (Noruega)
  52,   // Superliga (Finlandia)
  244,  // Ekstraklasa (Polonia)
  345,  // Czech Liga
  346,  // Superliga (Rumania)
  197,  // Superliga (Grecia)
  244,  // Nemzeti Bajnokság (Hungría)
];

// Unir todas las ligas
const LEAGUES_TO_SYNC = [...TIER_1_LEAGUES, ...TIER_2_LEAGUES, ...TIER_3_LEAGUES];

// Función para obtener el tier de una liga
function getLeagueTier(leagueId: number): number {
  if (TIER_1_LEAGUES.includes(leagueId)) return 1;
  if (TIER_2_LEAGUES.includes(leagueId)) return 2;
  if (TIER_3_LEAGUES.includes(leagueId)) return 3;
  return 3; // Default a tier 3
}

export async function POST() {
  try {
    let updated = 0;
    const errors: string[] = [];

    for (const leagueId of LEAGUES_TO_SYNC) {
      try {
        const data: any = await makeRequest({
          endpoint: '/leagues',
          params: { id: leagueId }
        });

        if (!data.response || data.response.length === 0) {
          errors.push(`League ${leagueId}: No data from API`);
          continue;
        }

        const item = data.response[0];
        const season = item.seasons?.[0];
        
        if (!season) {
          errors.push(`League ${leagueId}: No season data`);
          continue;
        }

        const tier = getLeagueTier(leagueId);

        await prisma.league.upsert({
          where: { id: leagueId },
          update: {
            name: item.league.name,
            country: item.country.name,
            countryCode: item.country.code,
            logo: item.league.logo,
            flag: item.country.flag,
            season: season.year,
            seasonStart: season.start ? new Date(season.start) : null,
            seasonEnd: season.end ? new Date(season.end) : null,
            type: item.league.type,
            tier: tier,
          },
          create: {
            id: leagueId,
            name: item.league.name,
            country: item.country.name,
            countryCode: item.country.code,
            logo: item.league.logo,
            flag: item.country.flag,
            season: season.year,
            seasonStart: season.start ? new Date(season.start) : null,
            seasonEnd: season.end ? new Date(season.end) : null,
            type: item.league.type,
            tier: tier,
          },
        });

        // Simple count - assume updated (upsert always updates)
        updated++;

        // Delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error: any) {
        errors.push(`League ${leagueId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${updated} leagues updated`,
      stats: { updated, total: LEAGUES_TO_SYNC.length },
      tierDistribution: {
        tier1: TIER_1_LEAGUES.length,
        tier2: TIER_2_LEAGUES.length,
        tier3: TIER_3_LEAGUES.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Error syncing leagues:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to sync leagues with tiers',
    tiers: {
      tier1: { count: TIER_1_LEAGUES.length, leagues: TIER_1_LEAGUES },
      tier2: { count: TIER_2_LEAGUES.length, leagues: TIER_2_LEAGUES },
      tier3: { count: TIER_3_LEAGUES.length, leagues: TIER_3_LEAGUES },
    },
    total: LEAGUES_TO_SYNC.length,
  });
}
