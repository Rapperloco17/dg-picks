import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PoissonModel } from '@/lib/poisson';

const prisma = new PrismaClient();
const CONFIG = { THRESHOLD: 0.05 };

/**
 * POST /api/sharbet/analyze
 * Analiza partidos y detecta valor
 * Body: { matchId?: string, date?: string, leagueId?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, date, leagueId, analyzeAll = false } = body;

    // Si se especifica un matchId específico
    if (matchId) {
      const result = await analyzeSingleMatch(matchId);
      return NextResponse.json({ 
        success: true, 
        analyzed: 1, 
        picks: result.picks.length,
        data: result 
      });
    }

    // Analizar múltiples partidos
    const where: any = {
      date: {
        gte: date ? new Date(date) : new Date(),
        lte: date 
          ? new Date(new Date(date).setDate(new Date(date).getDate() + 1))
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    };

    if (leagueId) where.leagueId = leagueId;

    const matches = await prisma.match.findMany({
      where,
      take: analyzeAll ? 100 : 20
    });

    const results = [];
    let totalPicks = 0;

    for (const match of matches) {
      try {
        const result = await analyzeSingleMatch(match.id);
        results.push({
          matchId: match.id,
          fixtureId: match.fixtureId,
          homeTeam: match.homeTeamName,
          awayTeam: match.awayTeamName,
          picksFound: result.picks.length
        });
        totalPicks += result.picks.length;
      } catch (error) {
        console.error(`Error analyzing match ${match.id}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      analyzed: matches.length, 
      picks: totalPicks,
      results 
    });

  } catch (error) {
    console.error('Error in analyze:', error);
    return NextResponse.json(
      { error: 'Failed to analyze matches' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sharbet/analyze
 * Obtiene estadísticas de análisis
 */
export async function GET() {
  try {
    const [totalPicks, sharpPicks, totalAnalyses] = await prisma.$transaction([
      prisma.sharpBetPick.count({ where: { status: 'ACTIVE' } }),
      prisma.sharpBetPick.count({ where: { isSharp: true, status: 'ACTIVE' } }),
      prisma.sharpBetAnalysis.count()
    ]);

    return NextResponse.json({
      totalPicks,
      sharpPicks,
      totalAnalyses
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}

// Función auxiliar para analizar un solo partido
async function analyzeSingleMatch(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error('Match not found');

  // Obtener estadísticas del equipo (mock por ahora)
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

  // Guardar análisis
  const analysis = await prisma.sharpBetAnalysis.upsert({
    where: { matchId },
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
      matchId,
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

  // Mock odds (en producción vendrían de API)
  const marketOdds = [
    { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Home', odds: 1.85 },
    { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Draw', odds: 3.40 },
    { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Away', odds: 4.20 },
    { bookmaker: 'Bet365', market: 'Over/Under', selection: 'Over 2.5', odds: 1.75 },
    { bookmaker: 'Bet365', market: 'Under 2.5', odds: 2.05 },
    { bookmaker: 'Bet365', market: 'BTTS', selection: 'Yes', odds: 1.65 },
    { bookmaker: 'Bet365', market: 'BTTS', selection: 'No', odds: 2.20 },
  ];

  // Detectar valor
  const picks = detectValue(analysis, marketOdds, match);
  
  // Guardar picks
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
