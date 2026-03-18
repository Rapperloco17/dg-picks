import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PoissonModel } from '@/lib/poisson';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    const matches = await prisma.match.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['NS', 'TBD', '1H', 'HT', '2H', 'LIVE']
        }
      },
      orderBy: { date: 'asc' },
      take: 20
    });

    const analyses = await prisma.sharpBetAnalysis.findMany({
      where: { matchId: { in: matches.map(m => m.id) } }
    });

    const valuePicks = await prisma.sharpBetPick.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        analysisId: { in: analyses.map(a => a.id) }
      },
      include: { analysis: { select: { matchId: true } } }
    });

    const formattedMatches = matches.map(match => {
      const analysis = analyses.find(a => a.matchId === match.id);
      const matchPicks = valuePicks.filter(p => p.analysis.matchId === match.id);

      let predictions;
      if (analysis) {
        predictions = {
          homeWin: analysis.probHome,
          draw: analysis.probDraw,
          awayWin: analysis.probAway,
          over25: analysis.probOver25,
          under25: 1 - analysis.probOver25,
          btts: analysis.probBttsYes,
          corners: analysis.probOver25 * 0.9,
          cards: 0.5
        };
      } else {
        predictions = calculatePredictions(match);
      }

      return {
        id: match.id,
        fixtureId: match.fixtureId,
        league: match.leagueName,
        country: 'Europe',
        time: new Date(match.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        status: match.status === 'LIVE' ? 'LIVE' : 'NS',
        homeTeam: match.homeTeamName,
        awayTeam: match.awayTeamName,
        homeScore: match.homeGoals || undefined,
        awayScore: match.awayGoals || undefined,
        odds: {
          home: 1.85 + Math.random() * 1.5,
          draw: 3.20 + Math.random() * 0.8,
          away: 2.50 + Math.random() * 2.0,
          over25: 1.70 + Math.random() * 0.4,
          btts: 1.75 + Math.random() * 0.3
        },
        predictions,
        valueBets: matchPicks.map(pick => ({
          id: pick.id,
          market: pick.market,
          selection: pick.selection,
          odds: pick.odds,
          modelProb: pick.trueProbability,
          edge: pick.edge,
          stake: pick.stakeRecommendation
        }))
      };
    });

    return NextResponse.json({
      matches: formattedMatches,
      total: formattedMatches.length,
      withValue: formattedMatches.filter(m => m.valueBets.length > 0).length
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    const matches = await prisma.match.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        status: { in: ['NS', 'TBD'] }
      },
      take: 50
    });

    let analyzed = 0;
    let picksFound = 0;

    for (const match of matches) {
      try {
        const matchData = {
          homeTeam: { played: 10, goalsFor: 15, goalsAgainst: 10 },
          awayTeam: { played: 10, goalsFor: 12, goalsAgainst: 13 }
        };

        const { homeXg, awayXg } = PoissonModel.calculateXg(matchData);
        const predictions = PoissonModel.simulate(homeXg, awayXg);

        const analysis = await prisma.sharpBetAnalysis.upsert({
          where: { matchId: match.id },
          update: {
            homeXg, awayXg,
            probHome: predictions['1'],
            probDraw: predictions['X'],
            probAway: predictions['2'],
            probOver25: predictions.over_25,
            probBttsYes: predictions.btts_yes,
            calculatedAt: new Date()
          },
          create: {
            matchId: match.id,
            fixtureId: match.fixtureId,
            homeXg, awayXg,
            probHome: predictions['1'],
            probDraw: predictions['X'],
            probAway: predictions['2'],
            probOver25: predictions.over_25,
            probBttsYes: predictions.btts_yes,
            expiresAt: match.date
          }
        });

        // Detectar valor
        const mockOdds = { home: 2.0, draw: 3.4, away: 3.8, over25: 1.85, btts: 1.75 };
        const valueBets = [];
        
        if (predictions['1'] > (1/mockOdds.home) + 0.05) {
          valueBets.push({ market: '1X2', selection: match.homeTeamName, odds: mockOdds.home, prob: predictions['1'] });
        }
        if (predictions.over_25 > (1/mockOdds.over25) + 0.05) {
          valueBets.push({ market: 'Over 2.5', selection: 'Over 2.5', odds: mockOdds.over25, prob: predictions.over_25 });
        }
        if (predictions.btts_yes > (1/mockOdds.btts) + 0.05) {
          valueBets.push({ market: 'BTTS', selection: 'Si', odds: mockOdds.btts, prob: predictions.btts_yes });
        }

        await prisma.sharpBetPick.deleteMany({ where: { analysisId: analysis.id } });

        for (const bet of valueBets) {
          const edge = bet.prob - (1/bet.odds);
          await prisma.sharpBetPick.create({
            data: {
              analysisId: analysis.id,
              market: bet.market,
              selection: bet.selection,
              odds: bet.odds,
              trueProbability: bet.prob,
              impliedProbability: 1/bet.odds,
              edge,
              edgePercentage: `+${(edge * 100).toFixed(1)}%`,
              confidence: edge > 0.08 ? 8 : edge > 0.05 ? 6 : 5,
              stakeRecommendation: edge > 0.08 ? '3%' : edge > 0.05 ? '2%' : '1%',
              expiresAt: match.date,
              isSharp: edge > 0.10
            }
          });
          picksFound++;
        }

        analyzed++;
      } catch (error) {
        console.error(`Error match ${match.id}:`, error);
      }
    }

    return NextResponse.json({ success: true, analyzed, picksFound });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

function calculatePredictions(match: any) {
  const matchData = {
    homeTeam: { played: 10, goalsFor: 15, goalsAgainst: 10 },
    awayTeam: { played: 10, goalsFor: 12, goalsAgainst: 13 }
  };
  const { homeXg, awayXg } = PoissonModel.calculateXg(matchData);
  const probs = PoissonModel.simulate(homeXg, awayXg);

  return {
    homeWin: probs['1'],
    draw: probs['X'],
    awayWin: probs['2'],
    over25: probs.over_25,
    under25: probs.under_25,
    btts: probs.btts_yes,
    corners: probs.over_25 * 0.9,
    cards: 0.5
  };
}
