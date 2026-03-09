import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { homeTeam, awayTeam, leagueId } = body;

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'homeTeam and awayTeam required' }, { status: 400 });
    }

    // Get recent matches for both teams
    const homeMatches = await prisma.match.findMany({
      where: { 
        OR: [
          { homeTeamName: { contains: homeTeam, mode: 'insensitive' } },
          { awayTeamName: { contains: homeTeam, mode: 'insensitive' } }
        ],
        status: 'FT'
      },
      orderBy: { date: 'desc' },
      take: 10,
    });

    const awayMatches = await prisma.match.findMany({
      where: { 
        OR: [
          { homeTeamName: { contains: awayTeam, mode: 'insensitive' } },
          { awayTeamName: { contains: awayTeam, mode: 'insensitive' } }
        ],
        status: 'FT'
      },
      orderBy: { date: 'desc' },
      take: 10,
    });

    if (homeMatches.length < 3 || awayMatches.length < 3) {
      return NextResponse.json({
        error: 'Insufficient data',
        homeMatches: homeMatches.length,
        awayMatches: awayMatches.length,
        message: 'Need at least 3 matches per team'
      }, { status: 400 });
    }

    // Calculate basic stats
    const homeStats = calcStats(homeMatches, homeTeam);
    const awayStats = calcStats(awayMatches, awayTeam);

    // Calculate predictions
    const totalGoals = homeStats.avgGoals + awayStats.avgGoals;
    const homeAdvantage = 1.2; // Home teams score 20% more on average

    const prediction = {
      match: `${homeTeam} vs ${awayTeam}`,
      
      // 1X2
      matchResult: {
        home: Math.round(45 * homeAdvantage),
        draw: 25,
        away: Math.round(30 / homeAdvantage),
        recommendation: homeStats.avgGoals > awayStats.avgGoals ? 'HOME' : 'AWAY'
      },

      // Over/Under
      goals: {
        over15: { probability: totalGoals > 2 ? 70 : 50, recommendation: totalGoals > 2 ? 'OVER 1.5' : 'SKIP' },
        over25: { probability: totalGoals > 2.5 ? 60 : 40, recommendation: totalGoals > 2.5 ? 'OVER 2.5' : 'UNDER 2.5' },
        over35: { probability: totalGoals > 3.5 ? 45 : 25, recommendation: totalGoals > 3.5 ? 'OVER 3.5' : 'SKIP' },
      },

      // BTTS
      btts: {
        yes: { probability: (homeStats.bttsRate + awayStats.bttsRate) / 2 },
        recommendation: (homeStats.bttsRate + awayStats.bttsRate) / 2 > 55 ? 'BTTS YES' : 'BTTS NO'
      },

      // Corners
      corners: {
        expected: Math.round((homeStats.corners + awayStats.corners) * 10) / 10,
        over95: { probability: (homeStats.corners + awayStats.corners) > 9.5 ? 60 : 40 }
      },

      // Cards (Tarjetas)
      cards: {
        expected: Math.round((homeStats.cards + awayStats.cards) * 10) / 10,
        over35: { probability: (homeStats.cards + awayStats.cards) > 3.5 ? 60 : 40 }
      },

      // Expected values
      expected: {
        homeGoals: Math.round(homeStats.avgGoals * 10) / 10,
        awayGoals: Math.round(awayStats.avgGoals * 10) / 10,
        totalGoals: Math.round(totalGoals * 10) / 10,
      },

      stats: { home: homeStats, away: awayStats }
    };

    // Normalize 1X2 to sum 100
    const total = prediction.matchResult.home + prediction.matchResult.draw + prediction.matchResult.away;
    prediction.matchResult.home = Math.round((prediction.matchResult.home / total) * 100);
    prediction.matchResult.away = Math.round((prediction.matchResult.away / total) * 100);
    prediction.matchResult.draw = 100 - prediction.matchResult.home - prediction.matchResult.away;

    return NextResponse.json({ success: true, prediction });

  } catch (error: any) {
    console.error('[ML-PREDICT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calcStats(matches: any[], teamName: string) {
  let goals = 0;
  let corners = 0;
  let cards = 0;
  let btts = 0;
  let wins = 0;

  matches.forEach(m => {
    const isHome = m.homeTeamName?.toLowerCase().includes(teamName.toLowerCase());
    const scored = isHome ? m.homeGoals : m.awayGoals;
    const conceded = isHome ? m.awayGoals : m.homeGoals;
    
    goals += scored;
    corners += isHome ? (m.homeCorners || 0) : (m.awayCorners || 0);
    cards += isHome ? (m.homeYellowCards || 0) : (m.awayYellowCards || 0);
    
    if (scored > 0 && conceded > 0) btts++;
    if (scored > conceded) wins++;
  });

  const n = matches.length;
  return {
    matches: n,
    avgGoals: goals / n,
    corners: corners / n,
    cards: cards / n,
    bttsRate: (btts / n) * 100,
    winRate: (wins / n) * 100,
  };
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'ML Predict API - Use POST with {homeTeam, awayTeam, leagueId}',
    example: {
      homeTeam: 'Manchester City',
      awayTeam: 'Liverpool',
      leagueId: 39
    }
  });
}
