import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeRequest } from '@/services/api-football';

// LIGAS EXCLUIDAS - Juveniles, inferiores, femeninas, etc.
const EXCLUDED_LEAGUES = [
  // Juveniles/Inferiores (Sub-19, Sub-21, Sub-23, Reservas)
  873, 874, 875, 876, 877, 878, 879, 880, 881, 882, 883, 884, // Premier League 2, U23, etc
  960, 961, 962, 963, 964, 965, 966, 967, 968, 969, 970,       // Sub-19, Sub-21 varios
  152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, // Youth leagues
  757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, // U19 Championships
  511, 512, 513, 514, 515, 516, 517, 518, 519, 520,           // UEFA Youth League, etc
  // National League (5ta división inglesa) y similares
  43,   // National League (Inglaterra 5ta)
  44,   // National League North
  45,   // National League South
  46,   // Isthmian League
  47,   // Southern League
  48,   // Northern Premier League
  // Otras ligas muy inferiores
  556, 557, 558, 559, 560, 561, 562, 563, 564, 565, // Divisiones 3ra, 4ta, etc
  // Femeninas (si aparecen)
  37, 38, 39, 40, 41, 42, // Women's leagues - verificar IDs
];

// TIER 1 - Solo élite mundial (1ra división profesional)
const TIER_1_LEAGUES = [
  // Top 5 Europa - 1ra División
  39,   // Premier League (Inglaterra)
  140,  // La Liga (España)
  135,  // Serie A (Italia)
  78,   // Bundesliga (Alemania)
  61,   // Ligue 1 (Francia)
  // Competiciones Europeas
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  // Américas - 1ra División
  13,   // Copa Libertadores
  16,   // Copa Sudamericana
  128,  // Liga MX (México)
  71,   // Brasileirão Serie A (Brasil)
  262,  // MLS (USA)
  358,  // Primera División (Argentina)
  99,   // Primera División (Uruguay)
  169,  // Primera División (Chile)
  155,  // Primera A (Colombia)
  // Selecciones
  32,   // World Cup
  960,  // Nations League
  // Asia - Top tier
  98,   // J1 League (Japón)
  292,  // K League 1 (Corea del Sur)
  345,  // Saudi Pro League (Arabia)
];

// TIER 2 - Ligas secundarias importantes (1ra división de países menores + 2da división top 5)
const TIER_2_LEAGUES = [
  // Segundas divisiones de Top 5
  40,   // Championship (Inglaterra 2da)
  141,  // La Liga 2 (España 2da)
  136,  // Serie B (Italia 2da)
  79,   // 2. Bundesliga (Alemania 2da)
  62,   // Ligue 2 (Francia 2da)
  // Europa - 1ra división países menores
  88,   // Eredivisie (Holanda)
  94,   // Primeira Liga (Portugal)
  144,  // Pro League (Bélgica)
  119,  // Scottish Premiership (Escocia)
  235,  // Premier League (Rusia)
  333,  // Super League (Suiza)
  203,  // Süper Lig (Turquía)
  172,  // Superliga (Dinamarca)
  113,  // Allsvenskan (Suecia)
  103,  // Eliteserien (Noruega)
  52,   // Veikkausliiga (Finlandia)
  244,  // Ekstraklasa (Polonia)
  345,  // Czech Liga (Rep. Checa)
  346,  // Superliga (Rumania)
  197,  // Super League (Grecia)
  // Américas
  292,  // Primera División (Perú) - verificar si es 1ra
];

// TIER 3 - Máximo 10 ligas adicionales relevantes
const TIER_3_LEAGUES = [
  218,  // A-League (Australia)
  349,  // Superliga (Argentina) - si existe
  250,  // Jupiler Pro League (Bélgica) - si es diferente
  242,  // Premier Division (Irlanda)
  343,  // Erovnuli Liga (Georgia)
  112,  // Prva HNL (Croacia)
  66,   // Serie A (Ecuador)
  265,  // Veikkausliiga (Lituania)
];

// Unir todas las ligas y eliminar duplicados
const LEAGUES_TO_SYNC = [...new Set([
  ...TIER_1_LEAGUES, 
  ...TIER_2_LEAGUES, 
  ...TIER_3_LEAGUES
])].filter(id => !EXCLUDED_LEAGUES.includes(id));

// Función para obtener el tier de una liga
function getLeagueTier(leagueId: number): number {
  if (TIER_1_LEAGUES.includes(leagueId)) return 1;
  if (TIER_2_LEAGUES.includes(leagueId)) return 2;
  if (TIER_3_LEAGUES.includes(leagueId)) return 3;
  return 3;
}

export async function POST() {
  try {
    let updated = 0;
    const errors: string[] = [];
    const skipped: number[] = [];

    for (const leagueId of LEAGUES_TO_SYNC) {
      try {
        // Verificar si está excluida
        if (EXCLUDED_LEAGUES.includes(leagueId)) {
          skipped.push(leagueId);
          continue;
        }

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

        // Verificar que no sea liga juvenil por nombre
        const leagueName = item.league.name.toLowerCase();
        const isYouth = leagueName.includes('u19') || 
                       leagueName.includes('u21') || 
                       leagueName.includes('u23') ||
                       leagueName.includes('youth') ||
                       leagueName.includes('sub-19') ||
                       leagueName.includes('sub-21') ||
                       leagueName.includes('reserve') ||
                       leagueName.includes('femenino') ||
                       leagueName.includes('women');
        
        const isLowerDivision = leagueName.includes('national league') ||
                               leagueName.includes('isthmian') ||
                               leagueName.includes('northern premier') ||
                               leagueName.includes('southern league');

        if (isYouth || isLowerDivision) {
          skipped.push(leagueId);
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
      stats: { updated, total: LEAGUES_TO_SYNC.length, skipped: skipped.length },
      tierDistribution: {
        tier1: TIER_1_LEAGUES.length,
        tier2: TIER_2_LEAGUES.length,
        tier3: TIER_3_LEAGUES.length,
      },
      skipped: skipped.length > 0 ? skipped : undefined,
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
    message: 'POST to sync leagues with tiers (youth leagues excluded)',
    excluded: {
      count: EXCLUDED_LEAGUES.length,
      types: ['U19/U21/U23', 'Reserves', 'Youth Leagues', 'National League (5th tier)', 'Women'],
    },
    tiers: {
      tier1: { count: TIER_1_LEAGUES.length, leagues: TIER_1_LEAGUES },
      tier2: { count: TIER_2_LEAGUES.length, leagues: TIER_2_LEAGUES },
      tier3: { count: TIER_3_LEAGUES.length, leagues: TIER_3_LEAGUES },
    },
    total: LEAGUES_TO_SYNC.length,
  });
}
