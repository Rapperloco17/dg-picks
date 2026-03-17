import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PoissonModel } from '@/lib/poisson';

const prisma = new PrismaClient();
const CONFIG = { THRESHOLD: 0.05 };

/**
 * GET /api/cron/sharbet
 * Endpoint para analizar automáticamente partidos del día
 * Se ejecuta cada 30 minutos via Railway Cron
 * 
 * Configuración en Railway:
 * - Cron Schedule: */30 * * * *
 * - URL: /api/cron/sharbet
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar secreto si está configurado
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`[Cron] Starting analysis at ${now.toISOString()}`);

    // Obtener partidos de hoy y mañana que no han sido analizados recientemente
    const matches = await prisma.match.findMany({
      where: {
        date: {
          gte: now,
          lte: tomorrow
        },
        status: {
          in: ['NS', 'TBD', '1H', 'HT', '2H'] // Not started or upcoming
        }
      },
      take: 50,
      orderBy: { date: 'asc' }
    });

    console.log(`[Cron] Found ${matches.length} matches to analyze`);

    let analyzed = 0;
    let totalPicks = 0;
    const errors: string[] = [];

    for (const match of matches) {
      try {
        // Verificar si ya fue analizado en la última hora
        const existingAnalysis = await prisma.sharpBetAnalysis.findUnique({
          where: { matchId: match.id }
        });

        if (existingAnalysis) {
          const lastAnalyzed = new Date(existingAnalysis.calculatedAt);
          const diffMinutes = (now.getTime() - lastAnalyzed.getTime()) / (1000 * 60);
          
          if (diffMinutes < 60) {
            console.log(`[Cron] Skipping ${match.homeTeamName} vs ${match.awayTeamName} (analyzed ${diffMinutes.toFixed(0)}m ago)`);
            continue;
          }
        }

        const result = await analyzeSingleMatch(match);
        analyzed++;
        totalPicks += result.picks.length;

        console.log(`[Cron] Analyzed: ${match.homeTeamName} vs ${match.awayTeamName} - ${result.picks.length} picks`);

      } catch (error) {
        const errorMsg = `Error analyzing ${match.id}: ${error}`;
        console.error(`[Cron] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Limpiar picks expirados
    const deleted = await prisma.sharpBetPick.deleteMany({
      where: {
        expiresAt: { lt: now },
        status: 'ACTIVE'
      }
    });

    console.log(`[Cron] Analysis complete. Analyzed: ${analyzed}, Picks: ${totalPicks}, Expired removed: ${deleted.count}`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      matchesFound: matches.length,
      analyzed,
      picksFound: totalPicks,
      expiredRemoved: deleted.count,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Función auxiliar para analizar un partido
async function analyzeSingleMatch(match: any) {
  const matchData = {
    homeTeam: {
      played: 10,
      goalsFor: match.homeGoals || 15,
      goalsAgainst: match.awayGoals || 10
    },
    awayTeam: {
      played: 10,
      goalsFor: match.awayGoals || 12,
      goalsAgainst: match.homeGoals || 13
    }
  };

  const { homeXg, awayXg } = PoissonModel.calculateXg(matchData);
  const predictions = PoissonModel.simulate(homeXg, awayXg);

  const analysis = await prisma.sharpBetAnalysis.upsert({
    where: { matchId: match.id },
    update: {
      homeXg, awayXg,
      expectedTotal: predictions.expected_total,
      probHome: predictions['1'],
      probDraw: predictions['X'],
      probAway: predictions['2'],
      probOver15: predictions.over_15,
      probOver25: predictions.over_25,
      probOver35: predictions.over_35,
      probBttsYes: predictions.btts_yes,
      probBttsNo: predictions.btts_no,
      calculatedAt: new Date()
    },
    create: {
      matchId: match.id,
      fixtureId: match.fixtureId,
      homeXg, awayXg,
      expectedTotal: predictions.expected_total,
      probHome: predictions['1'],
      probDraw: predictions['X'],
      probAway: predictions['2'],
      probOver15: predictions.over_15,
      probOver25: predictions.over_25,
      probOver35: predictions.over_35,
      probBttsYes: predictions.btts_yes,
      probBttsNo: predictions.btts_no,
      expiresAt: match.date
    }
  });

  // Mock odds - en producción usar API real
  const marketOdds = [
    { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Home', odds: 1.85 + Math.random() * 0.3 },
    { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Draw', odds: 3.40 + Math.random() * 0.4 },
    { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Away', odds: 4.20 + Math.random() * 0.5 },
    { bookmaker: 'Bet365', market: 'Over/Under', selection: 'Over 2.5', odds: 1.75 + Math.random() * 0.3 },
    { bookmaker: 'Bet365', market: 'Under 2.5', odds: 2.05 + Math.random() * 0.3 },
    { bookmaker: 'Bet365', market: 'BTTS', selection: 'Yes', odds: 1.65 + Math.random() * 0.3 },
    { bookmaker: 'Bet365', market: 'BTTS', selection: 'No', odds: 2.20 + Math.random() * 0.3 },
  ];

  const picks = detectValue(analysis, marketOdds, match);
  
  await prisma.sharpBetPick.deleteMany({ where: { analysisId: analysis.id } });
  
  for (const pick of picks) {
    await prisma.sharpBetPick.create({
      data: {
        analysisId: analysis.id,
        ...pick,
        expiresAt: match.date,
        isSharp: pick.edge > 0.10
      }
    });
  }

  return { analysis, picks };
}

function detectValue(analysis: any, marketOdds: any[], match: any) {
  const picks: any[] = [];
  const markets = [
    { name: '1X2', selection: match.homeTeamName, prob: analysis.probHome, key: 'Home' },
    { name: '1X2', selection: 'Draw', prob: analysis.probDraw, key: 'Draw' },
    { name: '1X2', selection: match.awayTeamName, prob: analysis.probAway, key: 'Away' },
    { name: 'Over/Under', selection: 'Over 1.5', prob: analysis.probOver15, key: 'Over 1.5' },
    { name: 'Over/Under', selection: 'Over 2.5', prob: analysis.probOver25, key: 'Over 2.5' },
    { name: 'Over/Under', selection: 'Under 2.5', prob: 1 - analysis.probOver25, key: 'Under 2.5' },
    { name: 'BTTS', selection: 'Yes', prob: analysis.probBttsYes, key: 'Yes' },
    { name: 'BTTS', selection: 'No', prob: analysis.probBttsNo, key: 'No' },
  ];

  for (const m of markets) {
    const oddsData = marketOdds.find(o => o.market === m.name && o.selection === m.key);
    if (!oddsData) continue;
    
    const { edge, edgePercentage, impliedProbability } = PoissonModel.calculateEdge(m.prob, oddsData.odds);
    
    if (edge >= CONFIG.THRESHOLD) {
      const confidence = PoissonModel.calculateConfidence(m.prob, edge);
      picks.push({
        market: m.name,
        selection: m.selection,
        odds: oddsData.odds,
        bookmaker: oddsData.bookmaker,
        trueProbability: m.prob,
        impliedProbability,
        edge,
        edgePercentage,
        confidence,
        stakeRecommendation: PoissonModel.recommendStake(edge, confidence)
      });
    }
  }

  return picks.sort((a, b) => b.edge - a.edge);
}
