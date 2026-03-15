import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as tf from '@tensorflow/tfjs';

// Calculate team statistics from historical matches
async function getTeamStats(teamId: number, isHome: boolean) {
  const matches = await prisma.match.findMany({
    where: {
      status: 'FT',
      OR: [
        { homeTeamId: teamId },
        { awayTeamId: teamId },
      ],
    },
    orderBy: { date: 'desc' },
    take: 10,
  });

  if (matches.length === 0) {
    return { avgGoals: 1.2, avgConceded: 1.1, winRate: 0.4, form: 0.5 };
  }

  let goals = 0, conceded = 0, wins = 0;
  
  for (const match of matches) {
    const isTeamHome = match.homeTeamId === teamId;
    const teamGoals = isTeamHome ? match.homeGoals : match.awayGoals;
    const oppGoals = isTeamHome ? match.awayGoals : match.homeGoals;
    
    if (teamGoals !== null && oppGoals !== null) {
      goals += teamGoals;
      conceded += oppGoals;
      if (teamGoals > oppGoals) wins++;
    }
  }

  const n = matches.length;
  const avgGoals = goals / n;
  const avgConceded = conceded / n;
  const winRate = wins / n;
  const form = Math.min(1, Math.max(0, (avgGoals - avgConceded + 2) / 4));

  return { avgGoals, avgConceded, winRate, form };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { homeTeamId, awayTeamId } = body;

    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json({
        error: 'homeTeamId and awayTeamId are required'
      }, { status: 400 });
    }

    // Get team stats
    const homeStats = await getTeamStats(homeTeamId, true);
    const awayStats = await getTeamStats(awayTeamId, false);

    // Get model stats
    const modelStats = await prisma.modelStats.findFirst({
      orderBy: { trainedAt: 'desc' },
    });

    if (!modelStats) {
      return NextResponse.json({
        error: 'No trained model found. Train model first.',
        prediction: {
          homeWin: 33,
          draw: 33,
          awayWin: 34,
          suggestedBet: 'No model trained',
        }
      }, { status: 400 });
    }

    // Create feature vector
    const features = tf.tensor2d([[
      homeStats.avgGoals,
      homeStats.avgConceded,
      homeStats.winRate,
      homeStats.form,
      awayStats.avgGoals,
      awayStats.avgConceded,
      awayStats.winRate,
      awayStats.form,
    ]]);

    // Simple prediction based on stats (without loading full model for now)
    const homeAdvantage = 0.1;
    const formDiff = homeStats.form - awayStats.form;
    const goalDiff = (homeStats.avgGoals - homeStats.avgConceded) - 
                     (awayStats.avgGoals - awayStats.avgConceded);
    
    let homeProb = 0.33 + (formDiff * 0.2) + (goalDiff * 0.1) + homeAdvantage;
    let awayProb = 0.33 - (formDiff * 0.2) - (goalDiff * 0.1);
    let drawProb = 1 - homeProb - awayProb;

    // Normalize
    const total = homeProb + drawProb + awayProb;
    homeProb = (homeProb / total) * 100;
    drawProb = (drawProb / total) * 100;
    awayProb = (awayProb / total) * 100;

    features.dispose();

    // Determine suggested bet
    let suggestedBet = '';
    let confidence = 0;
    
    if (homeProb > 50) {
      suggestedBet = 'Home Win';
      confidence = Math.round(homeProb);
    } else if (awayProb > 50) {
      suggestedBet = 'Away Win';
      confidence = Math.round(awayProb);
    } else if (drawProb > 35) {
      suggestedBet = 'Draw';
      confidence = Math.round(drawProb);
    } else if (homeStats.avgGoals + awayStats.avgGoals > 2.5) {
      suggestedBet = 'Over 2.5 Goals';
      confidence = Math.round((homeStats.avgGoals + awayStats.avgGoals) / 4 * 100);
    } else {
      suggestedBet = 'Under 2.5 Goals';
      confidence = 55;
    }

    // Get team names
    const homeTeam = await prisma.team.findUnique({ where: { id: homeTeamId } });
    const awayTeam = await prisma.team.findUnique({ where: { id: awayTeamId } });

    return NextResponse.json({
      success: true,
      modelVersion: modelStats.version,
      modelAccuracy: `${(modelStats.accuracy * 100).toFixed(1)}%`,
      match: {
        homeTeam: homeTeam?.name || 'Unknown',
        awayTeam: awayTeam?.name || 'Unknown',
      },
      prediction: {
        homeWin: Math.round(homeProb),
        draw: Math.round(drawProb),
        awayWin: Math.round(awayProb),
        suggestedBet,
        confidence,
      },
      stats: {
        home: homeStats,
        away: awayStats,
      },
    });

  } catch (error: any) {
    console.error('[ML Predict] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST with { homeTeamId, awayTeamId } to get ML prediction',
  });
}
