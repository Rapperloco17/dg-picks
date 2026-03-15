import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeRequest } from '@/services/api-football';

// TOP LIGAS - Las más importantes primero (para no saturar la API)
const TOP_LEAGUES = [
  // Top 5 Europa
  39, 140, 135, 78, 61,
  // Copas importantes
  45, 46, 143, 137, 81, 66,
  // Europa
  2, 3, 848,
  // Américas
  128, 71, 262, 358, 16, 13,
  // Otras top
  88, 94, 203, 144,
];

const SEASONS = [2022, 2023, 2024, 2025];

// Estadísticas que guardamos por partido:
// - goles, tiros, tiros a puerta, posesión, córners, faltas, tarjetas
// - estadísticas completas del equipo (ataque, defensa, disciplina)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { maxMatches = 10000, getStats = true } = body;
    
    let totalAdded = 0;
    let totalStats = 0;

    for (const leagueId of TOP_LEAGUES) {
      for (const season of SEASONS) {
        try {
          // Descargar fixtures
          const fixturesData: any = await makeRequest({
            endpoint: '/fixtures',
            params: { league: leagueId, season: season }
          });

          if (!fixturesData.response || fixturesData.response.length === 0) continue;

          for (const fixture of fixturesData.response) {
            try {
              if (!fixture.teams?.home?.name || !fixture.teams?.away?.name) continue;

              // Guardar partido básico
              await prisma.match.upsert({
                where: { fixtureId: fixture.fixture.id },
                update: {},
                create: {
                  fixtureId: fixture.fixture.id,
                  leagueId: fixture.league.id,
                  leagueName: fixture.league.name,
                  season: season,
                  date: new Date(fixture.fixture.date),
                  timestamp: fixture.fixture.timestamp,
                  timezone: fixture.fixture.timezone || 'UTC',
                  status: fixture.fixture.status.short,
                  homeTeamId: fixture.teams.home.id,
                  homeTeamName: fixture.teams.home.name,
                  awayTeamId: fixture.teams.away.id,
                  awayTeamName: fixture.teams.away.name,
                  homeGoals: fixture.goals.home,
                  awayGoals: fixture.awayGoals.home,
                  rawData: fixture,
                },
              });

              totalAdded++;

              // Si es partido terminado, descargar estadísticas detalladas
              if (getStats && fixture.fixture.status.short === 'FT') {
                try {
                  const statsData: any = await makeRequest({
                    endpoint: '/fixtures/statistics',
                    params: { fixture: fixture.fixture.id }
                  });

                  if (statsData.response && statsData.response.length === 2) {
                    // Extraer estadísticas clave
                    const homeStats = statsData.response[0].statistics;
                    const awayStats = statsData.response[1].statistics;

                    const getStat = (stats: any[], type: string) => {
                      const stat = stats.find((s: any) => s.type === type);
                      if (!stat?.value) return 0;
                      if (typeof stat.value === 'string' && stat.value.includes('%')) {
                        return parseInt(stat.value.replace('%', ''));
                      }
                      return parseInt(stat.value) || 0;
                    };

                    await prisma.match.update({
                      where: { fixtureId: fixture.fixture.id },
                      data: {
                        homeShots: getStat(homeStats, 'Total Shots'),
                        awayShots: getStat(awayStats, 'Total Shots'),
                        homeShotsOnTarget: getStat(homeStats, 'Shots on Goal'),
                        awayShotsOnTarget: getStat(awayStats, 'Shots on Goal'),
                        homePossession: getStat(homeStats, 'Ball Possession'),
                        awayPossession: getStat(awayStats, 'Ball Possession'),
                        homeCorners: getStat(homeStats, 'Corner Kicks'),
                        awayCorners: getStat(awayStats, 'Corner Kicks'),
                        homeYellowCards: getStat(homeStats, 'Yellow Cards'),
                        awayYellowCards: getStat(awayStats, 'Yellow Cards'),
                        homeRedCards: getStat(homeStats, 'Red Cards'),
                        awayRedCards: getStat(awayStats, 'Red Cards'),
                      },
                    });

                    totalStats++;
                  }
                } catch (e) {
                  // Stats no disponibles para todos los partidos
                }
              }

              if (totalAdded >= maxMatches) break;
            } catch (e) {}
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {}
        
        if (totalAdded >= maxMatches) break;
      }
      if (totalAdded >= maxMatches) break;
    }

    return NextResponse.json({
      success: true,
      totalAdded,
      totalStats,
      seasons: SEASONS,
      message: `Downloaded ${totalAdded} matches (${totalStats} with full stats) from ${SEASONS.length} seasons`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to download historical matches',
    leagues: TOP_LEAGUES.length,
    seasons: SEASONS,
    years: '2022-2025 (4 seasons)',
    stats: 'Goals, shots, possession, corners, cards, fouls',
    estimated: '~10,000 matches',
  });
}
