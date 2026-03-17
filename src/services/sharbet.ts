import { PrismaClient } from '@prisma/client';
import { PoissonModel } from '@/lib/poisson';

const prisma = new PrismaClient();

// Umbral minimo de valor para detectar picks
const CONFIG = {
  THRESHOLD: 0.05, // 5% de edge minimo
};

export class SharpBetService {
  /**
   * Analiza un partido y detecta valor en los mercados
   */
  static async analyzeMatch(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Calcular xG con datos del equipo
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

    // Guardar/actualizar analisis
    const analysis = await prisma.sharpBetAnalysis.upsert({
      where: { matchId },
      update: {
        homeXg,
        awayXg,
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
        homeXg,
        awayXg,
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

    // Obtener odds del mercado (mock por ahora)
    const marketOdds = await this.getMarketOdds(match.fixtureId);

    // Detectar valor
    const picks = this.detectValue(analysis, marketOdds, match);
    
    // Guardar picks
    await prisma.sharpBetPick.deleteMany({
      where: { analysisId: analysis.id }
    });

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

  /**
   * Obtiene los picks de hoy con filtros
   */
  static async getTodaysPicks(filters: {
    minEdge?: number;
    market?: string;
    isSharp?: boolean;
    limit?: number;
  } = {}) {
    const { 
      minEdge = 0.05, 
      market, 
      isSharp, 
      limit = 20 
    } = filters;

    return prisma.sharpBetPick.findMany({
      where: {
        status: 'ACTIVE',
        edge: { gte: minEdge },
        expiresAt: { gt: new Date() },
        ...(market && { market }),
        ...(isSharp !== undefined && { isSharp })
      },
      include: {
        analysis: {
          include: {
            match: {
              select: {
                id: true,
                homeTeamName: true,
                awayTeamName: true,
                leagueName: true,
                date: true
              }
            }
          }
        }
      },
      orderBy: [
        { isSharp: 'desc' },
        { edge: 'desc' }
      ],
      take: limit
    });
  }

  /**
   * Mock de odds - en produccion usar API-Football
   */
  private static async getMarketOdds(fixtureId: number) {
    // Mock data - reemplazar con llamada real a API
    return [
      { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Home', odds: 1.85 },
      { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Draw', odds: 3.40 },
      { bookmaker: 'Bet365', market: 'Match Winner', selection: 'Away', odds: 4.20 },
      { bookmaker: 'Bet365', market: 'Over/Under', selection: 'Over 2.5', odds: 1.75 },
      { bookmaker: 'Bet365', market: 'Over/Under', selection: 'Under 2.5', odds: 2.05 },
      { bookmaker: 'Bet365', market: 'BTTS', selection: 'Yes', odds: 1.65 },
      { bookmaker: 'Bet365', market: 'BTTS', selection: 'No', odds: 2.20 },
    ];
  }

  /**
   * Detecta valor en los mercados
   */
  private static detectValue(analysis: any, marketOdds: any[], match: any) {
    const picks: any[] = [];

    // Mercados a analizar
    const markets = [
      { name: '1X2', selection: match.homeTeamName, prob: analysis.probHome, key: 'Home' },
      { name: '1X2', selection: 'Draw', prob: analysis.probDraw, key: 'Draw' },
      { name: '1X2', selection: match.awayTeamName, prob: analysis.probAway, key: 'Away' },
      { name: 'Over/Under', selection: 'Over 1.5', prob: analysis.probOver15, key: 'Over 1.5' },
      { name: 'Over/Under', selection: 'Over 2.5', prob: analysis.probOver25, key: 'Over 2.5' },
      { name: 'Over/Under', selection: 'Over 3.5', prob: analysis.probOver35, key: 'Over 3.5' },
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
}
