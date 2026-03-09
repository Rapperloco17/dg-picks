import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple ML Training with 130k+ matches
export async function POST(request: NextRequest) {
  console.log('[ML-TRAIN] Starting training with 130k+ matches...');
  
  try {
    // Get all matches with complete stats
    const matches = await prisma.match.findMany({
      where: {
        homeGoals: { not: null },
        awayGoals: { not: null },
        homePossession: { gt: 0 },
        awayPossession: { gt: 0 },
      },
      select: {
        id: true,
        homeGoals: true,
        awayGoals: true,
        homeCorners: true,
        awayCorners: true,
        homeShots: true,
        awayShots: true,
        homeShotsOnTarget: true,
        awayShotsOnTarget: true,
        homePossession: true,
        awayPossession: true,
        homeYellowCards: true,
        awayYellowCards: true,
        homeRedCards: true,
        awayRedCards: true,
        leagueId: true,
        season: true,
      },
      take: 100000, // Limit for training
    });

    console.log(`[ML-TRAIN] Loaded ${matches.length} matches for training`);

    if (matches.length < 1000) {
      return NextResponse.json({
        error: 'Not enough data for training',
        matches: matches.length,
        required: 1000,
      }, { status: 400 });
    }

    // Calculate basic statistics for model
    let totalGoals = 0;
    let totalHomeWins = 0;
    let totalAwayWins = 0;
    let totalDraws = 0;
    let bttsCount = 0;
    let over25Count = 0;

    const features = {
      avgHomeGoals: 0,
      avgAwayGoals: 0,
      avgHomeCorners: 0,
      avgAwayCorners: 0,
      avgHomeShots: 0,
      avgAwayShots: 0,
      avgHomePossession: 0,
      homeWinRate: 0,
      drawRate: 0,
      awayWinRate: 0,
      bttsRate: 0,
      over25Rate: 0,
    };

    matches.forEach(match => {
      const homeGoals = match.homeGoals || 0;
      const awayGoals = match.awayGoals || 0;
      
      totalGoals += (homeGoals + awayGoals);
      
      if (homeGoals > awayGoals) totalHomeWins++;
      else if (awayGoals > homeGoals) totalAwayWins++;
      else totalDraws++;

      if (homeGoals > 0 && awayGoals > 0) bttsCount++;
      if (homeGoals + awayGoals > 2.5) over25Count++;

      features.avgHomeGoals += homeGoals;
      features.avgAwayGoals += awayGoals;
      features.avgHomeCorners += (match.homeCorners || 0);
      features.avgAwayCorners += (match.awayCorners || 0);
      features.avgHomeShots += (match.homeShots || 0);
      features.avgAwayShots += (match.awayShots || 0);
      features.avgHomePossession += (match.homePossession || 50);
    });

    const n = matches.length;
    features.avgHomeGoals = Math.round((features.avgHomeGoals / n) * 100) / 100;
    features.avgAwayGoals = Math.round((features.avgHomeGoals / n) * 100) / 100;
    features.avgHomeCorners = Math.round((features.avgHomeCorners / n) * 100) / 100;
    features.avgAwayCorners = Math.round((features.avgAwayCorners / n) * 100) / 100;
    features.avgHomeShots = Math.round((features.avgHomeShots / n) * 100) / 100;
    features.avgAwayShots = Math.round((features.avgAwayShots / n) * 100) / 100;
    features.avgHomePossession = Math.round((features.avgHomePossession / n) * 100) / 100;
    features.homeWinRate = Math.round((totalHomeWins / n) * 10000) / 100;
    features.drawRate = Math.round((totalDraws / n) * 10000) / 100;
    features.awayWinRate = Math.round((totalAwayWins / n) * 10000) / 100;
    features.bttsRate = Math.round((bttsCount / n) * 10000) / 100;
    features.over25Rate = Math.round((over25Count / n) * 10000) / 100;

    // Simple prediction model based on averages
    const model = {
      id: `model-${Date.now()}`,
      version: '1.0.0',
      trainedAt: new Date().toISOString(),
      trainingSamples: matches.length,
      features,
      predictions: {
        homeWinProbability: features.homeWinRate,
        drawProbability: features.drawRate,
        awayWinProbability: features.awayWinRate,
        bttsProbability: features.bttsRate,
        over25Probability: features.over25Rate,
      },
    };

    console.log('[ML-TRAIN] Model trained successfully');
    console.log('[ML-TRAIN] Features:', features);

    return NextResponse.json({
      success: true,
      model,
      message: `✅ Model trained with ${matches.length} matches`,
      summary: {
        totalMatches: matches.length,
        avgGoalsPerMatch: Math.round((totalGoals / n) * 100) / 100,
        homeWinRate: `${features.homeWinRate}%`,
        drawRate: `${features.drawRate}%`,
        awayWinRate: `${features.awayWinRate}%`,
        bttsRate: `${features.bttsRate}%`,
        over25Rate: `${features.over25Rate}%`,
      }
    });

  } catch (error: any) {
    console.error('[ML-TRAIN] Error:', error);
    return NextResponse.json({
      error: 'Training failed',
      details: error?.message,
    }, { status: 500 });
  }
}

// GET: Check training status
export async function GET(request: NextRequest) {
  const count = await prisma.match.count();
  return NextResponse.json({
    ready: count > 10000,
    totalMatches: count,
    message: count > 10000 
      ? `Ready to train with ${count} matches` 
      : `Need more data. Current: ${count}`,
  });
}
