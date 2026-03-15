import { NextResponse } from 'next/server';
import { makeRequest } from '@/services/api-football';

/**
 * LIVE MATCHES - Solo datos básicos
 * Stats completas se cargan en /api/live-matches/[id] al abrir un partido
 */

export async function GET() {
  try {
    const data: any = await makeRequest({
      endpoint: '/fixtures',
      params: { live: 'all' }
    });

    if (!data.response || data.response.length === 0) {
      return NextResponse.json({ 
        success: true, 
        matches: [],
        message: 'No live matches at the moment'
      });
    }

    // Solo datos básicos - sin stats ni odds (ahorra requests)
    const matches = data.response.map((fixture: any) => ({
      id: fixture.fixture.id,
      league: fixture.league.name,
      leagueId: fixture.league.id,
      leagueLogo: fixture.league.logo,
      homeTeam: fixture.teams.home.name,
      homeTeamId: fixture.teams.home.id,
      homeLogo: fixture.teams.home.logo,
      awayTeam: fixture.teams.away.name,
      awayTeamId: fixture.teams.away.id,
      awayLogo: fixture.teams.away.logo,
      homeGoals: fixture.goals.home ?? 0,
      awayGoals: fixture.goals.away ?? 0,
      elapsed: fixture.fixture.status.elapsed ?? 0,
      status: fixture.fixture.status.short,
      timestamp: fixture.fixture.timestamp,
      date: fixture.fixture.date,
      // Solo stats básicas si ya vienen en el fixture (sin llamada extra)
      homePossession: fixture.statistics?.[0]?.possession ?? null,
      awayPossession: fixture.statistics?.[1]?.possession ?? null,
      // Flag para saber si hay stats disponibles
      hasDetailedStats: false,
    }));

    return NextResponse.json({
      success: true,
      matches,
      count: matches.length
    });

  } catch (error: any) {
    console.error('Error fetching live matches:', error);
    return NextResponse.json({ 
      error: error.message,
      matches: []
    }, { status: 500 });
  }
}
