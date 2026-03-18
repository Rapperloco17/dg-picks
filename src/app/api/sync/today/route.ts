import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TOP_LEAGUES = [39, 140, 61, 78, 135, 262, 2, 3, 848, 531];

// Fechas con partidos reales disponibles en API-Football (2025)
const AVAILABLE_DATES = [
  '2025-03-15', // Sábado - muchos partidos
  '2025-03-16', // Domingo
  '2025-03-12', // Miércoles - Champions
  '2025-03-11', // Martes - Champions
  '2025-03-09', // Premier League
  '2025-03-08', // Varios
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dateParam = body.date;
    
    // Usar fecha proporcionada o buscar una con partidos
    let today = dateParam;
    let matches: any[] = [];
    let usedDate = '';
    
    const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
    
    if (!API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Si el usuario proporciona una fecha específica, usarla
    if (today) {
      usedDate = today;
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures?date=${today}`,
        {
          headers: {
            'x-rapidapi-host': 'v3.football.api-sports.io',
            'x-rapidapi-key': API_KEY
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        matches = data.response || [];
      }
    } else {
      // Buscar en fechas disponibles hasta encontrar partidos
      for (const date of AVAILABLE_DATES) {
        const response = await fetch(
          `https://v3.football.api-sports.io/fixtures?date=${date}`,
          {
            headers: {
              'x-rapidapi-host': 'v3.football.api-sports.io',
              'x-rapidapi-key': API_KEY
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          matches = data.response || [];
          
          // Filtrar ligas top
          const filtered = matches.filter((m: any) => 
            TOP_LEAGUES.includes(m.league.id)
          );
          
          if (filtered.length > 0) {
            usedDate = date;
            break;
          }
        }
      }
    }

    if (matches.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No se encontraron partidos en las fechas disponibles',
        triedDates: AVAILABLE_DATES
      }, { status: 404 });
    }

    // Limpiar partidos antiguos
    await prisma.match.deleteMany({
      where: {
        date: {
          lt: new Date('2025-01-01')
        }
      }
    });

    // Filtrar ligas top
    const filteredMatches = matches.filter((m: any) => 
      TOP_LEAGUES.includes(m.league.id)
    );

    let created = 0;
    let updated = 0;

    for (const match of filteredMatches) {
      try {
        const matchData = {
          fixtureId: match.fixture.id,
          leagueId: match.league.id,
          leagueName: match.league.name,
          season: match.league.season,
          round: match.league.round,
          date: new Date(match.fixture.date),
          timestamp: match.fixture.timestamp,
          timezone: match.fixture.timezone,
          status: match.fixture.status.short,
          homeTeamId: match.teams.home.id,
          homeTeamName: match.teams.home.name,
          awayTeamId: match.teams.away.id,
          awayTeamName: match.teams.away.name,
          homeGoals: match.goals.home,
          awayGoals: match.goals.away,
          rawData: JSON.stringify(match)
        };

        const existing = await prisma.match.findUnique({
          where: { fixtureId: match.fixture.id }
        });

        if (existing) {
          await prisma.match.update({
            where: { fixtureId: match.fixture.id },
            data: {
              status: matchData.status,
              homeGoals: matchData.homeGoals,
              awayGoals: matchData.awayGoals,
              updatedAt: new Date()
            }
          });
          updated++;
        } else {
          await prisma.match.create({ data: matchData });
          created++;
        }
      } catch (e) {
        console.error(`Error syncing match ${match.fixture.id}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      date: usedDate,
      totalFromAPI: matches.length,
      filtered: filteredMatches.length,
      created,
      updated,
      message: `${created + updated} partidos reales sincronizados (${usedDate})`
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync matches' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const count = await prisma.match.count();
  
  const latest = await prisma.match.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true, homeTeamName: true, awayTeamName: true }
  });

  return NextResponse.json({
    totalMatches: count,
    latestMatch: latest,
    availableDates: AVAILABLE_DATES,
    note: 'API-Football tiene datos hasta marzo 2025'
  });
}
