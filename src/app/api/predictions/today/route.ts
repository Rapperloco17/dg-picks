import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PoissonModel } from '@/lib/poisson';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Obtener partidos del día
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const matches = await prisma.match.findMany({
      where: {
        date: { gte: start, lte: end },
        status: { in: ['SCHEDULED', 'TIMED', 'LIVE'] }
      },
      include: {
        sharpBetAnalysis: {
          include: { picks: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Si no hay partidos, devolver array vacío
    if (matches.length === 0) {
      return NextResponse.json({ matches: [], picks: [] });
    }

    // Analizar partidos sin análisis
    let analyzed = 0;
    let picksFound = 0;
    const picks: any[] = [];

    for (const match of matches) {
      try {
        // Si ya tiene análisis reciente, usarlo
        if (match.sharpBetAnalysis) {
          const analysisAge = Date.now() - match.sharpBetAnalysis.calculatedAt.getTime();
          if (analysisAge < 24 * 60 * 60 * 1000) { // Menos de 24 horas
            for (const pick of match.sharpBetAnalysis.picks) {
              picks.push({
                ...pick,
                match: {
                  id: match.id,
                  homeTeamName: match.homeTeamName,
                  awayTeamName: match.awayTeamName,
                  leagueName: match.leagueName,
                  date: match.date
                }
              });
            }
            continue;
          }
        }

        // Calcular xG y probabilidades
        const matchData = {
          homeTeam: { played: 10, goalsFor: 15, goalsAgainst: 10 },
          awayTeam: { played: 10, goalsFor: 12, goalsAgainst: 13 }
        };

        const { homeXg, awayXg } = PoissonModel.calculateXg(matchData);
        const predictions = PoissonModel.simulate(homeXg, awayXg);

        const confidence = Math.round((predictions['1'] + predictions['X'] + predictions['2']) * 3);

        const analysis = await prisma.sharpBetAnalysis.upsert({
          where: { matchId: match.id },
          update: {
            homeXg,
            awayXg,
            expectedTotal: homeXg + awayXg,
            probHome: predictions['1'],
            probDraw: predictions['X'],
            probAway: predictions['2'],
            probOver15: predictions.over_15,
            probOver25: predictions.over_25,
            probOver35: predictions.over_35,
            probBttsYes: predictions.btts_yes,
            probBttsNo: predictions.btts_no,
            confidence,
            calculatedAt: new Date()
          },
          create: {
            matchId: match.id,
            fixtureId: match.fixtureId,
            homeXg,
            awayXg,
            expectedTotal: homeXg + awayXg,
            probHome: predictions['1'],
            probDraw: predictions['X'],
            probAway: predictions['2'],
            probOver15: predictions.over_15,
            probOver25: predictions.over_25,
            probOver35: predictions.over_35,
            probBttsYes: predictions.btts_yes,
            probBttsNo: predictions.btts_no,
            confidence,
            calculatedAt: new Date(),
            expiresAt: match.date
          }
        });

        // Detectar valor usando odds de ejemplo
        const mockOdds = { home: 2.0, draw: 3.4, away: 3.8, over25: 1.85, btts: 1.75 };
        const valueBets: Array<{
          market: string;
          selection: string;
          odds: number;
          prob: number;
        }> = [];

        if (predictions['1'] > 1 / mockOdds.home + 0.05) {
          valueBets.push({
            market: '1X2',
            selection: match.homeTeamName,
            odds: mockOdds.home,
            prob: predictions['1']
          });
        }
        if (predictions.over_25 > 1 / mockOdds.over25 + 0.05) {
          valueBets.push({
            market: 'Over 2.5',
            selection: 'Over 2.5',
            odds: mockOdds.over25,
            prob: predictions.over_25
          });
        }
        if (predictions.btts_yes > 1 / mockOdds.btts + 0.05) {
          valueBets.push({
            market: 'BTTS',
            selection: 'Sí',
            odds: mockOdds.btts,
            prob: predictions.btts_yes
          });
        }

        // Eliminar picks anteriores y crear nuevos
        await prisma.sharpBetPick.deleteMany({ where: { analysisId: analysis.id } });

        for (const bet of valueBets) {
          const edge = bet.prob - 1 / bet.odds;
          const pickConfidence = edge > 0.08 ? 8 : edge > 0.05 ? 6 : 5;
          const stakeRec = edge > 0.08 ? '3%' : edge > 0.05 ? '2%' : '1%';

          const newPick = await prisma.sharpBetPick.create({
            data: {
              analysisId: analysis.id,
              market: bet.market,
              selection: bet.selection,
              odds: bet.odds,
              trueProbability: bet.prob,
              impliedProbability: 1 / bet.odds,
              edge,
              edgePercentage: `+${(edge * 100).toFixed(1)}%`,
              confidence: pickConfidence,
              stakeRecommendation: stakeRec,
              expiresAt: match.date,
              isSharp: edge > 0.1
            }
          });

          picks.push({
            ...newPick,
            match: {
              id: match.id,
              homeTeamName: match.homeTeamName,
              awayTeamName: match.awayTeamName,
              leagueName: match.leagueName,
              date: match.date
            }
          });
          picksFound++;
        }

        analyzed++;
      } catch (error) {
        console.error(`Error analyzing match ${match.id}:`, error);
      }
    }

    return NextResponse.json({
      matches: matches.map((m) => ({
        ...m,
        predictions: m.sharpBetAnalysis
          ? {
              '1': m.sharpBetAnalysis.probHome,
              X: m.sharpBetAnalysis.probDraw,
              '2': m.sharpBetAnalysis.probAway,
              over_25: m.sharpBetAnalysis.probOver25,
              btts_yes: m.sharpBetAnalysis.probBttsYes
            }
          : null
      })),
      picks,
      meta: { analyzed, picksFound, total: matches.length }
    });
  } catch (error) {
    console.error('Error in predictions API:', error);
    return NextResponse.json(
      { error: 'Error fetching predictions' },
      { status: 500 }
    );
  }
}
