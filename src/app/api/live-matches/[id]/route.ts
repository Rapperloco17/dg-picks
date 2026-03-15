import { NextRequest, NextResponse } from 'next/server';
import { makeRequest } from '@/services/api-football';

// Helper to get stat value from fixture statistics
function getStat(stats: any[], teamIndex: number, statType: string): number {
  if (!stats || !stats[teamIndex] || !stats[teamIndex].statistics) return 0;
  const stat = stats[teamIndex].statistics.find((s: any) => s.type === statType);
  if (!stat || !stat.value) return 0;
  if (typeof stat.value === 'string' && stat.value.includes('%')) {
    return parseInt(stat.value.replace('%', ''));
  }
  return parseInt(stat.value) || 0;
}

/**
 * DETALLE DE PARTIDO EN VIVO - Stats completas + Odds
 * Se llama cuando el usuario abre un partido específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fixtureId = parseInt(id);
    
    if (isNaN(fixtureId)) {
      return NextResponse.json({ error: 'Invalid fixture ID' }, { status: 400 });
    }

    // 1. Datos del fixture
    const fixtureData: any = await makeRequest({
      endpoint: '/fixtures',
      params: { id: fixtureId }
    });

    if (!fixtureData.response || fixtureData.response.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const fixture = fixtureData.response[0];

    // 2. Estadísticas detalladas
    let statsData: any = { response: [] };
    try {
      statsData = await makeRequest({
        endpoint: '/fixtures/statistics',
        params: { fixture: fixtureId }
      });
    } catch (e) {
      console.log('[Live Match Detail] Stats not available for fixture', fixtureId);
    }

    const stats = statsData.response || [];
    const homeStats = stats[0]?.statistics || [];
    const awayStats = stats[1]?.statistics || [];

    // 3. Odds en vivo
    let oddsData: any = { response: [] };
    try {
      oddsData = await makeRequest({
        endpoint: '/odds/live',
        params: { fixture: fixtureId }
      });
    } catch (e) {
      console.log('[Live Match Detail] Odds not available for fixture', fixtureId);
    }

    // Extract odds
    const matchWinnerOdds = oddsData.response?.[0]?.bookmakers?.[0]?.bets?.find((b: any) => b.name === 'Match Winner')?.values || [];
    const odds = {
      home: parseFloat(matchWinnerOdds.find((o: any) => o.value === 'Home')?.odd || '0') || null,
      draw: parseFloat(matchWinnerOdds.find((o: any) => o.value === 'Draw')?.odd || '0') || null,
      away: parseFloat(matchWinnerOdds.find((o: any) => o.value === 'Away')?.odd || '0') || null,
    };

    // 4. Eventos del partido (goles, tarjetas, sustituciones)
    let eventsData: any = { response: [] };
    try {
      eventsData = await makeRequest({
        endpoint: '/fixtures/events',
        params: { fixture: fixtureId }
      });
    } catch (e) {
      console.log('[Live Match Detail] Events not available for fixture', fixtureId);
    }

    const events = (eventsData.response || []).map((e: any) => ({
      time: e.time.elapsed,
      extraTime: e.time.extra,
      team: e.team.name,
      player: e.player?.name,
      assist: e.assist?.name,
      type: e.type,
      detail: e.detail,
      comments: e.comments,
    }));

    // 5. Alineaciones (si están disponibles)
    let lineupsData: any = { response: [] };
    try {
      lineupsData = await makeRequest({
        endpoint: '/fixtures/lineups',
        params: { fixture: fixtureId }
      });
    } catch (e) {
      console.log('[Live Match Detail] Lineups not available for fixture', fixtureId);
    }

    const lineups = lineupsData.response?.map((l: any) => ({
      team: l.team.name,
      formation: l.formation,
      startXI: l.startXI?.map((p: any) => ({
        name: p.player.name,
        number: p.player.number,
        pos: p.player.pos,
        grid: p.player.grid,
      })) || [],
      substitutes: l.substitutes?.map((p: any) => ({
        name: p.player.name,
        number: p.player.number,
        pos: p.player.pos,
      })) || [],
    })) || [];

    // Construir respuesta completa
    const detail = {
      id: fixture.fixture.id,
      league: fixture.league,
      teams: fixture.teams,
      goals: fixture.goals,
      score: fixture.score,
      status: fixture.fixture.status,
      referee: fixture.fixture.referee,
      venue: fixture.fixture.venue,
      
      // Estadísticas completas
      statistics: {
        possession: {
          home: getStat(stats, 0, 'Ball Possession'),
          away: getStat(stats, 1, 'Ball Possession'),
        },
        shots: {
          home: getStat(stats, 0, 'Total Shots'),
          away: getStat(stats, 1, 'Total Shots'),
        },
        shotsOnTarget: {
          home: getStat(stats, 0, 'Shots on Goal'),
          away: getStat(stats, 1, 'Shots on Goal'),
        },
        corners: {
          home: getStat(stats, 0, 'Corner Kicks'),
          away: getStat(stats, 1, 'Corner Kicks'),
        },
        yellowCards: {
          home: getStat(stats, 0, 'Yellow Cards'),
          away: getStat(stats, 1, 'Yellow Cards'),
        },
        redCards: {
          home: getStat(stats, 0, 'Red Cards'),
          away: getStat(stats, 1, 'Red Cards'),
        },
        fouls: {
          home: getStat(stats, 0, 'Fouls'),
          away: getStat(stats, 1, 'Fouls'),
        },
        offsides: {
          home: getStat(stats, 0, 'Offsides'),
          away: getStat(stats, 1, 'Offsides'),
        },
        saves: {
          home: getStat(stats, 0, 'Goalkeeper Saves'),
          away: getStat(stats, 1, 'Goalkeeper Saves'),
        },
        passes: {
          total: {
            home: getStat(stats, 0, 'Total Passes'),
            away: getStat(stats, 1, 'Total Passes'),
          },
          accurate: {
            home: getStat(stats, 0, 'Passes Accurate'),
            away: getStat(stats, 1, 'Passes Accurate'),
          },
        },
      },
      
      // Odds
      odds: odds.home ? odds : null,
      
      // Eventos
      events,
      
      // Alineaciones
      lineups: lineups.length > 0 ? lineups : null,
    };

    return NextResponse.json({
      success: true,
      match: detail,
    });

  } catch (error: any) {
    console.error('Error fetching live match detail:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
