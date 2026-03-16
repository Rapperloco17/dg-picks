import { NextRequest, NextResponse } from 'next/server';
import { makeRequest } from '@/services/api-football';

interface ApiResponse {
  response?: any[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('league');
    const season = searchParams.get('season');

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      );
    }

    // Si no hay season, usar la actual
    const currentSeason = season || new Date().getFullYear().toString();

    const data = await makeRequest({
      endpoint: '/standings',
      params: {
        league: leagueId,
        season: currentSeason
      }
    }) as ApiResponse;

    if (!data.response?.[0]?.league?.standings?.[0]) {
      return NextResponse.json(
        { error: 'No standings found' },
        { status: 404 }
      );
    }

    const standings = data.response[0].league.standings[0];

    // Enriquecer con estadísticas adicionales
    const enrichedStandings = standings.map((team: any) => ({
      rank: team.rank,
      team: {
        id: team.team.id,
        name: team.team.name,
        logo: team.team.logo,
      },
      points: team.points,
      played: team.all.played,
      won: team.all.win,
      draw: team.all.draw,
      lost: team.all.lose,
      goalsFor: team.all.goals.for,
      goalsAgainst: team.all.goals.against,
      goalDifference: team.all.goals.for - team.all.goals.against,
      form: team.form,
      // Calcular estadísticas adicionales
      winRate: team.all.played > 0 ? ((team.all.win / team.all.played) * 100).toFixed(1) : 0,
      goalsPerGame: team.all.played > 0 ? (team.all.goals.for / team.all.played).toFixed(2) : 0,
      concededPerGame: team.all.played > 0 ? (team.all.goals.against / team.all.played).toFixed(2) : 0,
    }));

    return NextResponse.json({
      success: true,
      league: {
        id: data.response[0].league.id,
        name: data.response[0].league.name,
        country: data.response[0].league.country,
        logo: data.response[0].league.logo,
        season: data.response[0].league.season,
      },
      standings: enrichedStandings,
    });

  } catch (error: any) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
