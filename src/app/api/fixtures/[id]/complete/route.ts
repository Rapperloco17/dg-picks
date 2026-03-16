import { NextRequest, NextResponse } from 'next/server';
import { makeRequest } from '@/services/api-football';

interface ApiResponse {
  response?: any[];
}

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

    // Llamadas paralelas a todos los endpoints disponibles
    const [
      fixtureData,
      statisticsData,
      eventsData,
      lineupsData,
      playersData,
    ] = await Promise.all([
      // Info básica del partido
      makeRequest({
        endpoint: '/fixtures',
        params: { id: fixtureId.toString() }
      }) as Promise<ApiResponse>,
      
      // Estadísticas del partido
      makeRequest({
        endpoint: '/fixtures/statistics',
        params: { fixture: fixtureId.toString() }
      }).catch(() => null) as Promise<ApiResponse | null>,

      // Eventos (goles, tarjetas, sustituciones)
      makeRequest({
        endpoint: '/fixtures/events',
        params: { fixture: fixtureId.toString() }
      }).catch(() => null) as Promise<ApiResponse | null>,

      // Alineaciones
      makeRequest({
        endpoint: '/fixtures/lineups',
        params: { fixture: fixtureId.toString() }
      }).catch(() => null) as Promise<ApiResponse | null>,

      // Estadísticas de jugadores
      makeRequest({
        endpoint: '/fixtures/players',
        params: { fixture: fixtureId.toString() }
      }).catch(() => null) as Promise<ApiResponse | null>,
    ]);

    const fixture = fixtureData.response?.[0];
    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }

    // Obtener H2H si tenemos los IDs de equipos
    let h2hResult: ApiResponse | null = null;
    if (fixture.teams?.home?.id && fixture.teams?.away?.id) {
      try {
        const h2hResponse = await makeRequest({
          endpoint: '/fixtures/head-to-head',
          params: { 
            h2h: `${fixture.teams.home.id}-${fixture.teams.away.id}`,
            last: '10'
          }
        }) as ApiResponse;
        h2hResult = h2hResponse;
      } catch {
        h2hResult = null;
      }
    }

    // Obtener standings de la liga
    let standingsData: ApiResponse | null = null;
    if (fixture.league?.id && fixture.league?.season) {
      try {
        const standingsResponse = await makeRequest({
          endpoint: '/standings',
          params: {
            league: fixture.league.id.toString(),
            season: fixture.league.season.toString()
          }
        }) as ApiResponse;
        standingsData = standingsResponse;
      } catch {
        standingsData = null;
      }
    }

    // Obtener predicciones
    let predictionsData: ApiResponse | null = null;
    try {
      const predictionsResponse = await makeRequest({
        endpoint: '/predictions',
        params: { fixture: fixtureId.toString() }
      }) as ApiResponse;
      predictionsData = predictionsResponse;
    } catch {
      predictionsData = null;
    }

    // Obtener odds
    let oddsData: ApiResponse | null = null;
    try {
      const oddsResponse = await makeRequest({
        endpoint: '/odds',
        params: { 
          fixture: fixtureId.toString(),
          bet: '1' // Match Winner
        }
      }) as ApiResponse;
      oddsData = oddsResponse;
    } catch {
      oddsData = null;
    }

    // Procesar y combinar toda la información
    const completeData = {
      fixture,
      statistics: statisticsData?.response || [],
      events: eventsData?.response || [],
      lineups: lineupsData?.response || [],
      players: playersData?.response || [],
      headToHead: h2hResult?.response || [],
      standings: standingsData?.response?.[0]?.league?.standings?.[0] || [],
      predictions: predictionsData?.response?.[0] || null,
      odds: oddsData?.response?.[0] || null,
    };

    return NextResponse.json({
      success: true,
      data: completeData
    });

  } catch (error: any) {
    console.error('Error fetching complete fixture data:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
