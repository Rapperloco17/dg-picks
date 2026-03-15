import { NextResponse } from 'next/server';
import { makeRequest } from '@/services/api-football';

export async function GET() {
  try {
    // Fetch live fixtures from API-Football
    const data: any = await makeRequest({
      endpoint: 'fixtures',
      params: { live: 'all' }
    });

    if (!data.response || data.response.length === 0) {
      return NextResponse.json({ 
        success: true, 
        matches: [],
        message: 'No live matches at the moment'
      });
    }

    // Transform API data to our format
    const matches = data.response.map((fixture: any) => ({
      id: fixture.fixture.id,
      league: fixture.league.name,
      leagueId: fixture.league.id,
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
