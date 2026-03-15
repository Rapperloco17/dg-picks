import { NextResponse } from 'next/server';
import { makeRequest } from '@/services/api-football';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[Live Matches] Fetching live fixtures from API...');
    
    const data: any = await makeRequest({
      endpoint: '/fixtures',
      params: { live: 'all' }
    });

    console.log(`[Live Matches] API returned ${data.response?.length || 0} matches`);

    if (!data.response || data.response.length === 0) {
      return NextResponse.json({ 
        success: true, 
        matches: [],
        message: 'No live matches at the moment'
      });
    }

    // Mapear todos los partidos sin filtrar
    const matches = data.response.map((fixture: any) => {
      // Log para debugging de ligas importantes
      if ([39, 140, 135, 78, 61].includes(fixture.league.id)) {
        console.log(`[Live Matches] TOP 5 League: ${fixture.league.name} - ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
      }
      
      return {
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
        hasDetailedStats: false,
      };
    });

    // Agrupar por liga para debug
    const byLeague = matches.reduce((acc: any, m: any) => {
      acc[m.league] = (acc[m.league] || 0) + 1;
      return acc;
    }, {});
    
    console.log('[Live Matches] By league:', byLeague);

    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
      debug: {
        byLeague,
        totalFromApi: data.response.length,
      }
    });

  } catch (error: any) {
    console.error('[Live Matches] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      matches: []
    }, { status: 500 });
  }
}
