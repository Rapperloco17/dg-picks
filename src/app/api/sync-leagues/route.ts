import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_BASE = 'https://v3.football.api-sports.io';

// MEGA LIST: 80+ ligas y copas
const ALL_LEAGUES = [
  // ===== INGLATERRA (12 competiciones) =====
  39,   // Premier League
  40,   // Championship
  41,   // League One
  42,   // League Two
  43,   // National League
  45,   // FA Cup
  46,   // Carabao Cup (EFL Cup)
  47,   // Community Shield
  48,   // FA Trophy
  49,   // EFL Trophy
  50,   // FA Women's Super League
  54,   // National League North/South

  // ===== ESPAÑA (8 competiciones) =====
  140,  // La Liga
  141,  // Segunda División (La Liga 2)
  143,  // Copa del Rey
  142,  // Supercopa de España
  556,  // Primera RFEF (3ra división)
  82,   // Segunda RFEF (4ta división)
  83,   // Tercera RFEF (5ta división)
  117,  // Copa Federación

  // ===== ITALIA (7 competiciones) =====
  135,  // Serie A
  136,  // Serie B
  137,  // Coppa Italia
  138,  // Supercoppa Italiana
  157,  // Serie C
  158,  // Coppa Italia Serie C
  159,  // Serie D

  // ===== ALEMANIA (6 competiciones) =====
  78,   // Bundesliga
  79,   // 2. Bundesliga
  80,   // 3. Liga
  81,   // DFB Pokal (Copa Alemana)
  529,  // Supercup Germany
  83,   // Regionalliga

  // ===== FRANCIA (6 competiciones) =====
  61,   // Ligue 1
  62,   // Ligue 2
  63,   // National (3ra)
  66,   // Coupe de France
  65,   // Coupe de la Ligue
  53,   // Trophée des Champions

  // ===== PORTUGAL (4 competiciones) =====
  94,   // Primeira Liga
  95,   // Segunda Liga
  96,   // Taça de Portugal
  97,   // Taça da Liga

  // ===== HOLANDA (4 competiciones) =====
  88,   // Eredivisie
  89,   // Eerste Divisie
  90,   // Tweede Divisie
  91,   // KNVB Cup

  // ===== COMPETICIONES EUROPEAS (8) =====
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  4,    // UEFA Super Cup
  5,    // UEFA Nations League
  6,    // European Championship (Euro)
  7,    // Euro Qualifiers
  8,    // World Cup Qualifiers Europe

  // ===== CONCACAF (6) =====
  16,   // CONCACAF Champions League
  17,   // CONCACAF League
  18,   // CONCACAF Cup
  31,   // CONCACAF Gold Cup
  32,   // CONCACAF Nations League
  22,   // CONCACAF Caribbean Club Championship

  // ===== SUDAMÉRICA (6) =====
  13,   // Copa Libertadores
  11,   // Copa Sudamericana
  44,   // Copa América
  45,   // Copa América Qualifiers
  129,  // Recopa Sudamericana
  246,  // Copa do Brasil

  // ===== AMÉRICA (Más ligas) =====
  128,  // Argentina Primera División
  130,  // Argentina Copa de la Liga
  131,  // Argentina Copa Argentina
  71,   // Brazil Serie A
  72,   // Brazil Serie B
  73,   // Brazil Copa do Brasil
  75,   // Brazil Serie C
  239,  // Chile Primera División
  240,  // Chile Copa Chile
  265,  // Colombia Primera A
  266,  // Colombia Copa Colombia
  262,  // México Liga MX
  263,  // México Copa MX
  265,  // México Expansion MX
  358,  // USA MLS
  255,  // US Open Cup
  345,  // Canada Premier League

  // ===== RESTO DE EUROPA (20+) =====
  203,  // Turkey Süper Lig
  204,  // Turkey 1. Lig
  205,  // Turkey Cup
  144,  // Belgium Pro League
  145,  // Belgium First Division B
  113,  // Sweden Allsvenskan
  114,  // Sweden Superettan
  103,  // Norway Eliteserien
  104,  // Norway OBOS-ligaen
  119,  // Denmark Superliga
  120,  // Denmark 1st Division
  106,  // Poland Ekstraklasa
  107,  // Poland I liga
  179,  // Scotland Premiership
  180,  // Scotland Championship
  181,  // Scotland League One
  182,  // Scotland League Two
  169,  // Austria Bundesliga
  170,  // Austria 2. Liga
  172,  // Austria Cup
  192,  // Croatia HNL
  193,  // Croatia Cup
  197,  // Greece Super League
  198,  // Greece Cup
  207,  // Switzerland Super League
  208,  // Switzerland Challenge League
  210,  // Ukraine Premier League
  211,  // Ukraine Cup
  235,  // Russia Premier League
  236,  // Russia Cup
  244,  // Czech Republic First League
  245,  // Czech Republic Cup
  253,  // Romania Liga I
  254,  // Romania Cup
  271,  // Serbia SuperLiga
  286,  // Bulgaria First League
  287,  // Bulgaria Cup
  293,  // Hungary NB I
  294,  // Hungary Cup

  // ===== ASIA (10) =====
  98,   // Japan J1 League
  99,   // Japan J2 League
  100,  // Japan Emperor's Cup
  292,  // Japan J.League Cup
  307,  // South Korea K League 1
  308,  // South Korea K League 2
  309,  // South Korea FA Cup
  98,   // China Super League
  99,   // China League One
  307,  // Saudi Pro League
  308,  // Saudi King's Cup
  300,  // UAE Pro League
  301,  // Qatar Stars League
  302,  // Iran Pro League

  // ===== ÁFRICA (5) =====
  216,  // Egypt Premier League
  217,  // Morocco Botola Pro
  218,  // South Africa Premier Division
  219,  // Tunisia Ligue 1
  233,  // Algeria Ligue 1
];

// Eliminar duplicados
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
        const season = leagueData.seasons?.find((s: any) => s.current) || leagueData.seasons?.[0];

        if (!season) {
          skipped++;
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
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        errors.push(`League ${leagueId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: UNIQUE_LEAGUES.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Solo mostrar primeros 5 errores
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST to sync 90+ leagues and cups from API-Football',
    leagues: UNIQUE_LEAGUES.length,
    categories: [
      'England: Premier League, Championship, League One/Two, FA Cup, Carabao Cup, + more',
      'Spain: La Liga, Segunda, Copa del Rey, + more',
      'Italy: Serie A/B, Coppa Italia, + more',
      'Germany, France, Portugal, Netherlands',
      'Europe: Champions League, Europa League, Conference League',
      'Americas: CONCACAF Champions, Libertadores, Sudamericana, MLS, Liga MX',
      'Asia: J-League, K-League, China, Saudi Pro League',
      'Africa: Egypt, Morocco, South Africa',
    ],
  });
}
