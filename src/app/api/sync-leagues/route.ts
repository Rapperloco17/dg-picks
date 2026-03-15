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

// TIER 1 - TOP ÉLITE MUNDIAL (Lo mejor de cada región)
const TIER_1_LEAGUES = [
  // === EUROPA - TOP 5 + Champions ===
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  135,  // Serie A (Italy)
  78,   // Bundesliga (Germany)
  61,   // Ligue 1 (France)
  // Champions/Europa
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  // Europa - Top secundarias
  88,   // Eredivisie (Netherlands)
  94,   // Primeira Liga (Portugal)
  
  // === AMÉRICAS ===
  // Conmebol - Primera División
  71,   // Brasileirão (Brazil)
  13,   // Copa Libertadores
  16,   // Copa Sudamericana
  358,  // Liga Profesional (Argentina)
  128,  // Liga MX (Mexico)
  262,  // MLS (USA/Canada)
  // Conmebol - Otras top
  99,   // Primera División (Uruguay)
  169,  // Primera División (Chile)
  155,  // Primera A (Colombia)
  
  // === ASIA ===
  98,   // J1 League (Japan)
  345,  // Saudi Pro League (Saudi Arabia)
  
  // === SELECCIONES ===
  32,   // World Cup
  960,  // Nations League
];

// TIER 2 - MUY IMPORTANTES (2nd tier de Top 5 + top de países medios)
const TIER_2_LEAGUES = [
  // 2nd divisions Top 5
  40,   // Championship (England)
  141,  // La Liga 2 (Spain)
  136,  // Serie B (Italy)
  79,   // 2. Bundesliga (Germany)
  62,   // Ligue 2 (France)
  // Europa top secundarias
  144,  // Pro League (Belgium)
  119,  // Premiership (Scotland)
  172,  // Superliga (Denmark)
  113,  // Allsvenskan (Sweden)
  103,  // Eliteserien (Norway)
  52,   // Veikkausliiga (Finland)
  244,  // Ekstraklasa (Poland)
  333,  // Super League (Switzerland)
  203,  // Süper Lig (Turkey)
  235,  // Premier League (Russia)
  345,  // Czech First League
  346,  // SuperLiga (Romania)
  197,  // Super League (Greece)
  // Asia secundarias
  418,  // J2 League (Japan)
  292,  // K League 1 (South Korea)
  // Concacaf
  96,   // Primera División (Costa Rica)
  116,  // Liga Nacional (Honduras)
  117,  // Primera División (Guatemala)
];

// TIER 3 - RELEVANTES REGIONALES
const TIER_3_LEAGUES = [
  218,  // A-League (Australia)
  1030, // Chinese Super League
  196,  // Botola Pro (Morocco)
  242,  // Premier Division (Ireland)
  343,  // Erovnuli Liga (Georgia)
  112,  // HNL (Croatia)
  384,  // First League (Bulgaria)
  130,  // Primera Nacional (Argentina 2nd)
  // Sudamérica otras
  1132, // Primera División (Paraguay)
  1133, // Primera División (Bolivia)
  1134, // Liga FUTVE (Venezuela)
  1135, // Serie A (Ecuador)
  1136, // Liga 1 (Perú)
];

// Unir todas las ligas
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

        // Verificar nombres
        const leagueName = item.league.name.toLowerCase();
        const isYouth = leagueName.includes('u19') || 
                       leagueName.includes('u21') || 
                       leagueName.includes('youth') ||
                       leagueName.includes('women');
        
        if (isYouth) {
          skipped.push(leagueId);
          continue;
        }

        const tier = getLeagueTier(leagueId);

        // Siempre actualizar el tier
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
            tier: tier, // FORZAR ACTUALIZACIÓN DEL TIER
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
