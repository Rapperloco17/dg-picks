import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as tf from '@tensorflow/tfjs';

// Feature extraction from match history
function calculateTeamStats(matches: any[], teamId: number, isHome: boolean) {
  const teamMatches = matches.filter(m => 
    isHome ? m.homeTeamId === teamId : m.awayTeamId === teamId
  ).slice(0, 10); // Last 10 matches

  if (teamMatches.length === 0) {
    return {
      avgGoals: 1.2,
      avgConceded: 1.1,
      winRate: 0.4,
      form: 0.5,
      avgShots: 12,
      avgPossession: 50,
    };
  }

  const goals = teamMatches.map(m => isHome ? m.homeGoals : m.awayGoals).filter(g => g !== null);
  const conceded = teamMatches.map(m => isHome ? m.awayGoals : m.homeGoals).filter(g => g !== null);
  
  const wins = teamMatches.filter(m => {
    if (isHome) return m.homeGoals > m.awayGoals;
    return m.awayGoals > m.homeGoals;
  }).length;

  const avgGoals = goals.length > 0 ? goals.reduce((a, b) => a + b, 0) / goals.length : 1.2;
  const avgConceded = conceded.length > 0 ? conceded.reduce((a, b) => a + b, 0) / conceded.length : 1.1;
  const winRate = teamMatches.length > 0 ? wins / teamMatches.length : 0.4;
  const form = Math.min(1, Math.max(0, (avgGoals - avgConceded + 2) / 4));

  return {
    avgGoals,
    avgConceded,
    winRate,
    form,
    avgShots: 12,
    avgPossession: 50,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get completed matches with results
    const matches = await prisma.match.findMany({
      where: {
        status: 'FT',
        homeGoals: { not: null },
        awayGoals: { not: null },
      },
      orderBy: { date: 'desc' },
      take: 5000, // Train with last 5000 matches
    });

    if (matches.length < 100) {
      return NextResponse.json({
        error: 'Not enough data. Need at least 100 matches.',
        current: matches.length,
      }, { status: 400 });
    }

    // Prepare training data
    const features: number[][] = [];
    const labels: number[] = [];

    for (const match of matches) {
      // Get historical stats for both teams
      const homeStats = calculateTeamStats(matches, match.homeTeamId, true);
      const awayStats = calculateTeamStats(matches, match.awayTeamId, false);

      // Feature vector
      features.push([
        homeStats.avgGoals,
        homeStats.avgConceded,
        homeStats.winRate,
        homeStats.form,
        awayStats.avgGoals,
        awayStats.avgConceded,
        awayStats.winRate,
        awayStats.form,
      ]);

      // Label: 0 = Away win, 1 = Draw, 2 = Home win
      const homeGoals = match.homeGoals ?? 0;
      const awayGoals = match.awayGoals ?? 0;
      if (homeGoals > awayGoals) labels.push(2);
      else if (homeGoals === awayGoals) labels.push(1);
      else labels.push(0);
    }

    // Create and train model
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [8], units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'softmax' }),
      ],
    });

    model.compile({
      optimizer: 'adam',
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy'],
    });

    const xs = tf.tensor2d(features);
    const ys = tf.tensor1d(labels, 'int32');

    const history = await model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 0,
    });

    // Calculate accuracy
    const predictions = model.predict(xs) as tf.Tensor;
    const predArray = predictions.argMax(-1).dataSync();
    let correct = 0;
    for (let i = 0; i < labels.length; i++) {
      if (predArray[i] === labels[i]) correct++;
    }
    const accuracy = correct / labels.length;

    // Save model weights to database (simplified)
    const weights = model.getWeights().map(w => Array.from(w.dataSync()));
    
    await prisma.modelStats.upsert({
      where: { version: 'v1.0-full' },
      update: {
        trainedAt: new Date(),
        matchesCount: matches.length,
        accuracy: accuracy,
        features: features[0] as any,
        weights: weights as any,
      },
      create: {
        version: 'v1.0-full',
        trainedAt: new Date(),
        matchesCount: matches.length,
        accuracy: accuracy,
        rmse: 0,
        features: features[0] as any,
        weights: weights as any,
      },
    });

    // Cleanup
    xs.dispose();
    ys.dispose();
    predictions.dispose();

    return NextResponse.json({
      success: true,
      message: 'Model trained successfully',
      matches: matches.length,
      accuracy: `${(accuracy * 100).toFixed(1)}%`,
      finalLoss: history.history.loss[history.history.loss.length - 1],
    });

  } catch (error: any) {
    console.error('[ML Train] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const stats = await prisma.modelStats.findFirst({
    orderBy: { trainedAt: 'desc' },
  });

  return NextResponse.json({
    message: 'POST to train ML model with full dataset',
    currentModel: stats ? {
      version: stats.version,
      accuracy: `${(stats.accuracy * 100).toFixed(1)}%`,
      matches: stats.matchesCount,
      trainedAt: stats.trainedAt,
    } : 'No model trained yet',
  });
}
