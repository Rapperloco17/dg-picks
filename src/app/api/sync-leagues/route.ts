import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeRequest } from '@/services/api-football';

// LIGAS EXCLUIDAS - Juveniles, inferiores, femeninas, etc.
const EXCLUDED_LEAGUES = [
  // Juveniles/Inferiores
  873, 874, 875, 876, 877, 878, 879, 880, 881, 882, 883, 884,
  960, 961, 962, 963, 964, 965, 966, 967, 968, 969, 970,
  152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163,
  757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768,
  511, 512, 513, 514, 515, 516, 517, 518, 519, 520,
  // Inferiores
  43, 44, 45, 46, 47, 48,
  556, 557, 558, 559, 560, 561, 562, 563, 564, 565,
  // Femeninas
  37, 38, 39, 40, 41, 42,
];

// TIER 1 - Élite mundial
const TIER_1_LEAGUES = [
  // Top 5 Europa
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  135,  // Serie A (Italy)
  78,   // Bundesliga (Germany)
  61,   // Ligue 1 (France)
  // Europa
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  // Américas
  13,   // Copa Libertadores
  16,   // Copa Sudamericana
  128,  // Liga MX (Mexico)
  71,   // Brasileirão (Brazil)
  262,  // MLS (USA/Canada)
  // Conmebol
  358,  // Liga Profesional (Argentina)
  99,   // Primera División (Uruguay)
  169,  // Primera División (Chile)
  155,  // Primera A (Colombia)
  1132, // Primera División (Paraguay) 
  1133, // Primera División (Bolivia)
  1134, // Liga FUTVE (Venezuela)
  1135, // Primera División (Ecuador)
  1136, // Liga 1 (Perú)
  // Selecciones
  32,   // World Cup
  960,  // Nations League
  // Asia
  98,   // J1 League (Japan)
  292,  // K League 1 (South Korea)
  345,  // Saudi Pro League
  1030, // Chinese Super League
  236,  // Persian Gulf Pro League (Iran)
  // África
  196,  // Botola Pro (Morocco)
  233,  // Premier Soccer League (South Africa)
  1032, // Egyptian Premier League
];

// TIER 2 - Secundarias importantes
const TIER_2_LEAGUES = [
  // 2nd divisions Top 5
  40,   // Championship (England)
  141,  // Segunda División (Spain) - La Liga 2
  136,  // Serie B (Italy)
  79,   // 2. Bundesliga (Germany)
  62,   // Ligue 2 (France)
  // Europa top
  88,   // Eredivisie (Netherlands)
  94,   // Primeira Liga (Portugal)
  144,  // Pro League (Belgium)
  119,  // Premiership (Scotland)
  172,  // Superliga (Denmark)
  113,  // Allsvenskan (Sweden)
  103,  // Eliteserien (Norway)
  52,   // Veikkausliiga (Finland)
  244,  // Ekstraklasa (Poland)
  345,  // Czech First League
  346,  // SuperLiga (Romania)
  197,  // Super League (Greece)
  333,  // Super League (Switzerland)
  203,  // Süper Lig (Turkey)
  235,  // Premier League (Russia)
  // Ascenso Conmebol
  130,  // Primera Nacional (Argentina 2nd)
  265,  // Segunda División (Chile)
  // Asia 2nd tier
  418,  // J2 League (Japan)
  4181, // K League 2 (South Korea)
  // Concacaf
  96,   // Primera División (Costa Rica)
  116,  // Liga Nacional (Honduras)
  117,  // Primera División (Guatemala)
  340,  // Liga Panameña
  150,  // Primera División (El Salvador)
];

// TIER 3 - Otras relevantes
const TIER_3_LEAGUES = [
  218,  // A-League (Australia)
  242,  // Premier Division (Ireland)
  343,  // Erovnuli Liga (Georgia)
  112,  // HNL (Croatia)
  265,  // A Lyga (Lithuania)
  384,  // First League (Bulgaria)
  349,  // Primera Nacional (Uruguay 2nd)
  351,  // Copa Chile
];

// Unir todas las ligas y eliminar duplicados
const LEAGUES_TO_SYNC = [...new Set([
  ...TIER_1_LEAGUES, 
  ...TIER_2_LEAGUES, 
  ...TIER_3_LEAGUES
])].filter(id => !EXCLUDED_LEAGUES.includes(id));

// Función para obtener el tier
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
  // Lista de nombres que pueden aparecer en múltiples países
  const duplicateNames = ['Primera División', 'Serie A', 'Superliga', 'Premier League', 'First Division'];
  
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
    duplicatesHandled: {
      warning: "These league names exist in multiple countries",
      names: duplicateNames,
      solution: "Grouped by 'Name|Country' in dashboard",
    },
    total: LEAGUES_TO_SYNC.length,
  });
}
