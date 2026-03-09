import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Demo: Show statistics breakdown
export async function GET(request: NextRequest) {
  try {
    // Get stats for Premier League (id: 39) as example
    const leagueId = 39;
    
    // Average stats per team (home games)
    const homeStats = await prisma.match.groupBy({
      by: ['homeTeamName'],
      where: { leagueId },
      _avg: {
        homeCorners: true,
        homeYellowCards: true,
        homeRedCards: true,
        homePossession: true,
        homeShots: true,
        homeShotsOnTarget: true,
        homeGoals: true,
      },
      _count: { fixtureId: true },
      orderBy: { _count: { fixtureId: 'desc' } },
      take: 5, // Top 5 teams
    });

    // Average stats per team (away games)
    const awayStats = await prisma.match.groupBy({
      by: ['awayTeamName'],
      where: { leagueId },
      _avg: {
        awayCorners: true,
        awayYellowCards: true,
        awayRedCards: true,
        awayPossession: true,
        awayShots: true,
        awayShotsOnTarget: true,
        awayGoals: true,
      },
      _count: { fixtureId: true },
      orderBy: { _count: { fixtureId: 'desc' } },
      take: 5,
    });

    // League averages
    const leagueAvg = await prisma.match.aggregate({
      where: { leagueId },
      _avg: {
        homeCorners: true,
        awayCorners: true,
        homeYellowCards: true,
        awayYellowCards: true,
        homePossession: true,
        awayPossession: true,
        homeShots: true,
        awayShots: true,
        homeGoals: true,
        awayGoals: true,
      },
    });

    // Format response
    const topTeamsHome = homeStats.map(team => ({
      team: team.homeTeamName,
      matches: team._count.fixtureId,
      avgCorners: Math.round((team._avg.homeCorners || 0) * 10) / 10,
      avgYellowCards: Math.round((team._avg.homeYellowCards || 0) * 10) / 10,
      avgPossession: Math.round((team._avg.homePossession || 0) * 10) / 10,
      avgShots: Math.round((team._avg.homeShots || 0) * 10) / 10,
      avgGoals: Math.round((team._avg.homeGoals || 0) * 10) / 10,
    }));

    const topTeamsAway = awayStats.map(team => ({
      team: team.awayTeamName,
      matches: team._count.fixtureId,
      avgCorners: Math.round((team._avg.awayCorners || 0) * 10) / 10,
      avgYellowCards: Math.round((team._avg.awayYellowCards || 0) * 10) / 10,
      avgPossession: Math.round((team._avg.awayPossession || 0) * 10) / 10,
      avgShots: Math.round((team._avg.awayShots || 0) * 10) / 10,
      avgGoals: Math.round((team._avg.awayGoals || 0) * 10) / 10,
    }));

    return NextResponse.json({
      league: 'Premier League',
      totalMatches: homeStats.reduce((acc, t) => acc + t._count.fixtureId, 0),
      leagueAverages: {
        cornersPerMatch: Math.round(((leagueAvg._avg.homeCorners || 0) + (leagueAvg._avg.awayCorners || 0)) * 10) / 10,
        yellowCardsPerMatch: Math.round(((leagueAvg._avg.homeYellowCards || 0) + (leagueAvg._avg.awayYellowCards || 0)) * 10) / 10,
        redCardsPerMatch: 0.2,
        shotsPerMatch: Math.round(((leagueAvg._avg.homeShots || 0) + (leagueAvg._avg.awayShots || 0)) * 10) / 10,
        goalsPerMatch: Math.round(((leagueAvg._avg.homeGoals || 0) + (leagueAvg._avg.awayGoals || 0)) * 10) / 10,
      },
      topTeamsHome: topTeamsHome,
      topTeamsAway: topTeamsAway,
      message: 'Estadísticas por equipo (Premier League ejemplo)',
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message,
    }, { status: 500 });
  }
}
