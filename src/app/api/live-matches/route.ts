import { NextResponse } from 'next/server';
import { makeRequest } from '@/services/api-football';

// Helper to get stat value from fixture statistics
function getStat(stats: any[], teamIndex: number, statType: string): number {
  if (!stats || !stats[teamIndex] || !stats[teamIndex].statistics) return 0;
  const stat = stats[teamIndex].statistics.find((s: any) => s.type === statType);
  if (!stat || !stat.value) return 0;
  // Handle percentage strings (e.g., "58%")
  if (typeof stat.value === 'string' && stat.value.includes('%')) {
    return parseInt(stat.value.replace('%', ''));
  }
  return parseInt(stat.value) || 0;
}

export async function GET() {
  try {
    // Fetch live fixtures
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

    // Transform API data with full statistics
    const matches = await Promise.all(data.response.map(async (fixture: any) => {
      // Fetch detailed statistics for this fixture
      let statsData: any = { response: [] };
      try {
        statsData = await makeRequest({
          endpoint: '/fixtures/statistics',
          params: { fixture: fixture.fixture.id }
        });
      } catch (e) {
        // Stats might not be available for all matches
      }

      const stats = statsData.response || [];
      const homeStats = stats[0]?.statistics || [];
      const awayStats = stats[1]?.statistics || [];

      // Fetch odds if available
      let oddsData: any = { response: [] };
      try {
        oddsData = await makeRequest({
          endpoint: '/odds/live',
          params: { fixture: fixture.fixture.id }
        });
      } catch (e) {
        // Odds might not be available
      }

      // Extract odds
      const matchWinnerOdds = oddsData.response?.[0]?.bookmakers?.[0]?.bets?.find((b: any) => b.name === 'Match Winner')?.values || [];
      const odds = {
        home: parseFloat(matchWinnerOdds.find((o: any) => o.value === 'Home')?.odd || '0'),
        draw: parseFloat(matchWinnerOdds.find((o: any) => o.value === 'Draw')?.odd || '0'),
        away: parseFloat(matchWinnerOdds.find((o: any) => o.value === 'Away')?.odd || '0'),
      };

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
        // Detailed Statistics
        homePossession: getStat(stats, 0, 'Ball Possession'),
        awayPossession: getStat(stats, 1, 'Ball Possession'),
        homeShots: getStat(stats, 0, 'Total Shots'),
        awayShots: getStat(stats, 1, 'Total Shots'),
        homeShotsOnTarget: getStat(stats, 0, 'Shots on Goal'),
        awayShotsOnTarget: getStat(stats, 1, 'Shots on Goal'),
        homeCorners: getStat(stats, 0, 'Corner Kicks'),
        awayCorners: getStat(stats, 1, 'Corner Kicks'),
        homeYellowCards: getStat(stats, 0, 'Yellow Cards'),
        awayYellowCards: getStat(stats, 1, 'Yellow Cards'),
        homeRedCards: getStat(stats, 0, 'Red Cards'),
        awayRedCards: getStat(stats, 1, 'Red Cards'),
        homeFouls: getStat(stats, 0, 'Fouls'),
        awayFouls: getStat(stats, 1, 'Fouls'),
        homeOffsides: getStat(stats, 0, 'Offsides'),
        awayOffsides: getStat(stats, 1, 'Offsides'),
        // Odds
        odds: odds.home > 0 ? odds : null,
      };
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
