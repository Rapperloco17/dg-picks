import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeRequest } from '@/services/api-football';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const leagueId = searchParams.get('league');
    const teamId = searchParams.get('team');
    const status = searchParams.get('status'); // live, finished, upcoming

    // Si es búsqueda por equipo, usar endpoint diferente
    if (teamId) {
      const season = new Date().getFullYear();
      const data: any = await makeRequest({
        endpoint: '/fixtures',
        params: { team: teamId, season, last: 10 }
      });

      const matches = data.response?.map((f: any) => ({
        id: f.fixture.id,
        league: f.league.name,
        leagueId: f.league.id,
        leagueLogo: f.league.logo,
        date: f.fixture.date,
        status: f.fixture.status.short,
        homeTeam: f.teams.home.name,
        homeTeamId: f.teams.home.id,
        homeLogo: f.teams.home.logo,
        awayTeam: f.teams.away.name,
        awayTeamId: f.teams.away.id,
        awayLogo: f.teams.away.logo,
        homeGoals: f.goals.home,
        awayGoals: f.goals.away,
        source: 'api',
      })) || [];

      return NextResponse.json({ 
        success: true, 
        matches,
        count: matches.length,
        team: teamId,
      });
    }

    if (!date) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 });
    }

    // Buscar en la base de datos primero
    const dbMatches = await prisma.match.findMany({
      where: {
        date: {
          gte: new Date(`${date}T00:00:00`),
          lt: new Date(`${date}T23:59:59`),
        },
        ...(leagueId && { leagueId: parseInt(leagueId) }),
        ...(status === 'finished' && { status: 'FT' }),
        ...(status === 'live' && { 
          status: { in: ['1H', '2H', 'ET', 'P', 'HT', 'LIVE'] } 
        }),
        ...(status === 'upcoming' && { 
          status: { in: ['NS', 'TBD', 'SCHEDULED'] } 
        }),
      },
      orderBy: { date: 'asc' },
    });

    // Si tenemos datos en DB, usarlos
    if (dbMatches.length > 0) {
      const matches = dbMatches.map(m => ({
        id: m.fixtureId,
        league: m.leagueName,
        leagueId: m.leagueId,
        date: m.date,
        status: m.status,
        homeTeam: m.homeTeamName,
        homeTeamId: m.homeTeamId,
        awayTeam: m.awayTeamName,
        awayTeamId: m.awayTeamId,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        homeLogo: null,
        awayLogo: null,
        source: 'database',
      }));

      return NextResponse.json({ 
        success: true, 
        matches,
        count: matches.length,
        date,
        league: leagueId,
      });
    }

    // Si no hay en DB, buscar en API
    const params: any = { date };
    if (leagueId) params.league = leagueId;

    const data: any = await makeRequest({
      endpoint: '/fixtures',
      params
    });

    const matches = data.response?.map((f: any) => ({
      id: f.fixture.id,
      league: f.league.name,
      leagueId: f.league.id,
      leagueLogo: f.league.logo,
      date: f.fixture.date,
      status: f.fixture.status.short,
      homeTeam: f.teams.home.name,
      homeTeamId: f.teams.home.id,
      homeLogo: f.teams.home.logo,
      awayTeam: f.teams.away.name,
      awayTeamId: f.teams.away.id,
      awayLogo: f.teams.away.logo,
      homeGoals: f.goals.home,
      awayGoals: f.goals.away,
      source: 'api',
    })) || [];

    return NextResponse.json({ 
      success: true, 
      matches,
      count: matches.length,
      date,
      league: leagueId,
    });

  } catch (error: any) {
    console.error('Error fetching fixtures by date:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
