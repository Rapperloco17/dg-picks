import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Complete betting prediction system
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { homeTeam, awayTeam, leagueId } = body;

    // Get last 15 matches for better form analysis
    const homeMatchesHome = await prisma.match.findMany({
      where: { homeTeamName: homeTeam, status: 'FT' },
      orderBy: { date: 'desc' },
      take: 15,
    });

    const homeMatchesAway = await prisma.match.findMany({
      where: { awayTeamName: homeTeam, status: 'FT' },
      orderBy: { date: 'desc' },
      take: 10,
    });

    const awayMatchesAway = await prisma.match.findMany({
      where: { awayTeamName: awayTeam, status: 'FT' },
      orderBy: { date: 'desc' },
      take: 15,
    });

    const awayMatchesHome = await prisma.match.findMany({
      where: { homeTeamName: awayTeam, status: 'FT' },
      orderBy: { date: 'desc' },
      take: 10,
    });

    // Combined stats
    const homeAllMatches = [...homeMatchesHome, ...homeMatchesAway];
    const awayAllMatches = [...awayMatchesAway, ...awayMatchesHome];

    if (homeAllMatches.length < 3 || awayAllMatches.length < 3) {
      return NextResponse.json({
        error: 'Insufficient data for teams',
        homeMatches: homeAllMatches.length,
        awayMatches: awayAllMatches.length,
      }, { status: 400 });
    }

    // Calculate comprehensive stats
    const homeStats = calculateDetailedStats(homeAllMatches, homeTeam);
    const awayStats = calculateDetailedStats(awayAllMatches, awayTeam);
    const h2h = await calculateH2H(homeTeam, awayTeam);

    // Get league averages
    const leagueAvg = await getLeagueAverages(leagueId);

    // Calculate ALL predictions
    const prediction = {
      match: `${homeTeam} vs ${awayTeam}`,
      date: new Date().toISOString(),
      
      // 1X2 - Match Result
      matchResult: calculate1X2(homeStats, awayStats, h2h, leagueAvg),
      
      // Over/Under Goals
      goals: {
        over15: calculateOverUnder(homeStats, awayStats, 1.5),
        over25: calculateOverUnder(homeStats, awayStats, 2.5),
        over35: calculateOverUnder(homeStats, awayStats, 3.5),
        under15: { probability: 0, recommendation: '' },
        under25: { probability: 0, recommendation: '' },
        under35: { probability: 0, recommendation: '' },
      },
      
      // Both Teams To Score
      btts: calculateBTTS(homeStats, awayStats),
      
      // Half-Time / Full-Time
      htFt: calculateHTFT(homeStats, awayStats),
      
      // Half-Time Goals
      htGoals: calculateHTGoals(homeStats, awayStats),
      
      // Corners
      corners: calculateCorners(homeStats, awayStats, leagueAvg),
      
      // Cards (Tarjetas)
      cards: calculateCards(homeStats, awayStats, leagueAvg),
      
      // Exact Goals
      exactGoals: calculateExactGoals(homeStats, awayStats),
      
      // Team Totals
      teamTotals: {
        homeOver15: calculateTeamTotal(homeStats, 'over', 1.5),
        homeOver25: calculateTeamTotal(homeStats, 'over', 2.5),
        awayOver15: calculateTeamTotal(awayStats, 'over', 1.5),
        awayOver25: calculateTeamTotal(awayStats, 'over', 2.5),
      },
      
      // Expected values
      expected: {
        homeGoals: (homeStats.avgGoalsScored + awayStats.avgGoalsConceded) / 2,
        awayGoals: (awayStats.avgGoalsScored + homeStats.avgGoalsConceded) / 2,
        totalGoals: (homeStats.avgGoalsScored + awayStats.avgGoalsScored + 
                     homeStats.avgGoalsConceded + awayStats.avgGoalsConceded) / 2,
        homeCorners: (homeStats.avgCorners + awayStats.avgCornersConceded) / 2,
        awayCorners: (awayStats.avgCorners + homeStats.avgCornersConceded) / 2,
        totalCorners: homeStats.avgCorners + awayStats.avgCorners,
        homeCards: (homeStats.avgYellowCards + awayStats.avgYellowCardsConceded) / 2,
        awayCards: (awayStats.avgYellowCards + homeStats.avgYellowCardsConceded) / 2,
        totalCards: homeStats.avgYellowCards + awayStats.avgYellowCards,
      },
      
      // Best picks (highest confidence)
      bestPicks: [] as string[],
      
      // Raw stats for transparency
      stats: {
        home: homeStats,
        away: awayStats,
        h2h,
        league: leagueAvg,
      },
    };

    // Calculate under probabilities
    prediction.goals.under15.probability = 100 - prediction.goals.over15.probability;
    prediction.goals.under25.probability = 100 - prediction.goals.over25.probability;
    prediction.goals.under35.probability = 100 - prediction.goals.over35.probability;

    // Generate best picks
    prediction.bestPicks = generateBestPicks(prediction);

    return NextResponse.json({
      success: true,
      prediction,
    });

  } catch (error: any) {
    console.error('[ML-PREDICT] Error:', error);
    return NextResponse.json({
      error: 'Prediction failed',
      details: error?.message,
    }, { status: 500 });
  }
}

function calculateDetailedStats(matches: any[], teamName: string) {
  const stats = {
    matches: matches.length,
    wins: 0,
    draws: 0,
    losses: 0,
    avgGoalsScored: 0,
    avgGoalsConceded: 0,
    avgCorners: 0,
    avgCornersConceded: 0,
    avgShots: 0,
    avgShotsOnTarget: 0,
    avgYellowCards: 0,
    avgYellowCardsConceded: 0,
    avgRedCards: 0,
    bttsRate: 0,
    over25Rate: 0,
    over15Rate: 0,
    over35Rate: 0,
    htGoalsRate: 0,
    cleanSheets: 0,
    failedToScore: 0,
    form: [],
  };

  let totalCorners = 0;
  let totalCornersConceded = 0;
  let totalYellowCards = 0;
  let totalYellowCardsConceded = 0;
  let totalRedCards = 0;
  let bttsCount = 0;
  let over25Count = 0;
  let over15Count = 0;
  let over35Count = 0;
  let htGoalsCount = 0;
  let cleanSheetsCount = 0;
  let failedToScoreCount = 0;

  matches.forEach(m => {
    const isHome = m.homeTeamName === teamName;
    const goalsScored = isHome ? m.homeGoals : m.awayGoals;
    const goalsConceded = isHome ? m.awayGoals : m.homeGoals;
    const corners = isHome ? m.homeCorners : m.awayCorners;
    const cornersConceded = isHome ? m.awayCorners : m.homeCorners;
    const yellowCards = isHome ? m.homeYellowCards : m.awayYellowCards;
    const yellowCardsConceded = isHome ? m.awayYellowCards : m.homeYellowCards;
    const redCards = isHome ? m.homeRedCards : m.awayRedCards;
    const htHomeGoals = m.homeScoreHT || 0;
    const htAwayGoals = m.awayScoreHT || 0;
    const htGoals = htHomeGoals + htAwayGoals;

    stats.avgGoalsScored += goalsScored;
    stats.avgGoalsConceded += goalsConceded;
    totalCorners += corners;
    totalCornersConceded += cornersConceded;
    totalYellowCards += yellowCards;
    totalYellowCardsConceded += yellowCardsConceded;
    totalRedCards += redCards;

    if (goalsScored > 0 && goalsConceded > 0) bttsCount++;
    if (goalsScored + goalsConceded > 2.5) over25Count++;
    if (goalsScored + goalsConceded > 1.5) over15Count++;
    if (goalsScored + goalsConceded > 3.5) over35Count++;
    if (htGoals > 0) htGoalsCount++;
    if (goalsConceded === 0) cleanSheetsCount++;
    if (goalsScored === 0) failedToScoreCount++;

    if (goalsScored > goalsConceded) {
      stats.wins++;
      stats.form.push('W');
    } else if (goalsScored === goalsConceded) {
      stats.draws++;
      stats.form.push('D');
    } else {
      stats.losses++;
      stats.form.push('L');
    }
  });

  const n = matches.length;
  stats.avgGoalsScored = round(stats.avgGoalsScored / n);
  stats.avgGoalsConceded = round(stats.avgGoalsConceded / n);
  stats.avgCorners = round(totalCorners / n);
  stats.avgCornersConceded = round(totalCornersConceded / n);
  stats.avgYellowCards = round(totalYellowCards / n);
  stats.avgYellowCardsConceded = round(totalYellowCardsConceded / n);
  stats.avgRedCards = round(totalRedCards / n);
  stats.bttsRate = round((bttsCount / n) * 100);
  stats.over25Rate = round((over25Count / n) * 100);
  stats.over15Rate = round((over15Count / n) * 100);
  stats.over35Rate = round((over35Count / n) * 100);
  stats.htGoalsRate = round((htGoalsCount / n) * 100);
  stats.cleanSheets = round((cleanSheetsCount / n) * 100);
  stats.failedToScore = round((failedToScoreCount / n) * 100);

  return stats;
}

async function calculateH2H(homeTeam: string, awayTeam: string) {
  const h2hMatches = await prisma.match.findMany({
    where: {
      OR: [
        { homeTeamName: homeTeam, awayTeamName: awayTeam },
        { homeTeamName: awayTeam, awayTeamName: homeTeam },
      ],
      status: 'FT',
    },
    take: 10,
  });

  if (h2hMatches.length === 0) {
    return { matches: 0, homeWins: 0, draws: 0, awayWins: 0, avgGoals: 2.5, bttsRate: 50 };
  }

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalGoals = 0;
  let bttsCount = 0;

  h2hMatches.forEach(m => {
    if (m.homeGoals > m.awayGoals) homeWins++;
    else if (m.awayGoals > m.homeGoals) awayWins++;
    else draws++;

    totalGoals += m.homeGoals + m.awayGoals;
    if (m.homeGoals > 0 && m.awayGoals > 0) bttsCount++;
  });

  return {
    matches: h2hMatches.length,
    homeWins,
    draws,
    awayWins,
    avgGoals: round(totalGoals / h2hMatches.length),
    bttsRate: round((bttsCount / h2hMatches.length) * 100),
  };
}

async function getLeagueAverages(leagueId: number) {
  const matches = await prisma.match.findMany({
    where: { leagueId, status: 'FT' },
    take: 500,
  });

  if (matches.length === 0) {
    return {
      avgGoals: 2.6,
      avgCorners: 9.5,
      avgYellowCards: 3.2,
      homeWinRate: 45,
      bttsRate: 52,
      over25Rate: 51,
    };
  }

  let totalGoals = 0;
  let totalCorners = 0;
  let totalYellowCards = 0;
  let homeWins = 0;
  let bttsCount = 0;
  let over25Count = 0;

  matches.forEach(m => {
    totalGoals += m.homeGoals + m.awayGoals;
    totalCorners += m.homeCorners + m.awayCorners;
    totalYellowCards += m.homeYellowCards + m.awayYellowCards;
    if (m.homeGoals > m.awayGoals) homeWins++;
    if (m.homeGoals > 0 && m.awayGoals > 0) bttsCount++;
    if (m.homeGoals + m.awayGoals > 2.5) over25Count++;
  });

  const n = matches.length;
  return {
    avgGoals: round(totalGoals / n),
    avgCorners: round(totalCorners / n),
    avgYellowCards: round(totalYellowCards / n),
    homeWinRate: round((homeWins / n) * 100),
    bttsRate: round((bttsCount / n) * 100),
    over25Rate: round((over25Count / n) * 100),
  };
}

function calculate1X2(home: any, away: any, h2h: any, league: any) {
  // Base probabilities from league averages
  let homeProb = league.homeWinRate;
  let drawProb = 25;
  let awayProb = 100 - homeProb - drawProb;

  // Adjust based on team form
  const homeForm = (home.wins / home.matches) * 100;
  const awayForm = (away.wins / away.matches) * 100;

  homeProb += (homeForm - 45) * 0.4;
  awayProb += (awayForm - 30) * 0.4;

  // Adjust based on goals
  homeProb += (home.avgGoalsScored - away.avgGoalsConceded) * 5;
  awayProb += (away.avgGoalsScored - home.avgGoalsConceded) * 5;

  // H2H adjustment
  if (h2h.matches > 0) {
    const h2hHomeWinRate = (h2h.homeWins / h2h.matches) * 100;
    homeProb = (homeProb + h2hHomeWinRate) / 2;
  }

  // Normalize to 100%
  const total = homeProb + drawProb + awayProb;
  homeProb = round((homeProb / total) * 100);
  awayProb = round((awayProb / total) * 100);
  drawProb = 100 - homeProb - awayProb;

  return {
    home: { probability: homeProb, odds: round(100 / homeProb, 2) },
    draw: { probability: drawProb, odds: round(100 / drawProb, 2) },
    away: { probability: awayProb, odds: round(100 / awayProb, 2) },
    recommendation: homeProb > 50 ? 'HOME' : awayProb > 40 ? 'AWAY' : drawProb > 30 ? 'DRAW' : 'SKIP',
  };
}

function calculateOverUnder(home: any, away: any, line: number) {
  const expectedGoals = (home.avgGoalsScored + away.avgGoalsScored + 
                        home.avgGoalsConceded + away.avgGoalsConceded) / 2;
  
  let probability = 50;
  
  if (line === 1.5) {
    probability = (expectedGoals > 2) ? 75 : (expectedGoals > 1.5) ? 65 : 45;
  } else if (line === 2.5) {
    probability = (expectedGoals > 2.8) ? 65 : (expectedGoals > 2.3) ? 55 : 40;
  } else if (line === 3.5) {
    probability = (expectedGoals > 3.5) ? 55 : (expectedGoals > 3) ? 40 : 25;
  }

  // Adjust based on team rates
  const overRate = (home.over25Rate + away.over25Rate) / 2;
  probability = (probability + overRate) / 2;

  probability = Math.min(85, Math.max(20, round(probability)));

  return {
    probability,
    odds: round(100 / probability, 2),
    recommendation: probability > 60 ? 'OVER' : probability < 40 ? 'UNDER' : 'SKIP',
  };
}

function calculateBTTS(home: any, away: any) {
  const prob = round((home.bttsRate + away.bttsRate) / 2);
  return {
    yes: { probability: prob, odds: round(100 / prob, 2) },
    no: { probability: 100 - prob, odds: round(100 / (100 - prob), 2) },
    recommendation: prob > 58 ? 'YES' : prob < 42 ? 'NO' : 'SKIP',
  };
}

function calculateHTFT(home: any, away: any) {
  // Simplified HT/FT calculation
  const htHomeProb = round(home.htGoalsRate * 0.6);
  const htDrawProb = round(100 - htHomeProb - 30);
  const htAwayProb = 100 - htHomeProb - htDrawProb;

  return {
    htHomeFtHome: { probability: round(htHomeProb * 0.4), desc: 'HT1/FT1' },
    htDrawFtHome: { probability: round(htDrawProb * 0.3), desc: 'HTX/FT1' },
    htHomeFtDraw: { probability: round(htHomeProb * 0.2), desc: 'HT1/FTX' },
    htDrawFtDraw: { probability: round(htDrawProb * 0.4), desc: 'HTX/FTX' },
    htAwayFtAway: { probability: round(30 * 0.4), desc: 'HT2/FT2' },
  };
}

function calculateHTGoals(home: any, away: any) {
  const htRate = (home.htGoalsRate + away.htGoalsRate) / 2;
  return {
    over05: { probability: round(htRate), recommendation: htRate > 70 ? 'OVER 0.5' : 'SKIP' },
    over15: { probability: round(htRate * 0.6), recommendation: htRate > 60 ? 'OVER 1.5' : 'SKIP' },
    btts: { probability: round(htRate * 0.5), recommendation: htRate > 55 ? 'BTTS HT' : 'SKIP' },
  };
}

function calculateCorners(home: any, away: any, league: any) {
  const expectedCorners = home.avgCorners + away.avgCorners;
  const over9 = expectedCorners > 9.5 ? 60 : 45;
  const over10 = expectedCorners > 10.5 ? 55 : 40;
  const over11 = expectedCorners > 11.5 ? 45 : 30;

  return {
    over9: { probability: round(over9), recommendation: over9 > 55 ? 'OVER 9.5' : 'SKIP' },
    over10: { probability: round(over10), recommendation: over10 > 50 ? 'OVER 10.5' : 'SKIP' },
    over11: { probability: round(over11), recommendation: over11 > 45 ? 'OVER 11.5' : 'SKIP' },
    expected: round(expectedCorners, 1),
  };
}

function calculateCards(home: any, away: any, league: any) {
  const expectedCards = home.avgYellowCards + away.avgYellowCards;
  const over3 = expectedCards > 3.5 ? 60 : 45;
  const over4 = expectedCards > 4.5 ? 50 : 35;
  const over5 = expectedCards > 5.5 ? 40 : 25;

  return {
    over3: { probability: round(over3), recommendation: over3 > 55 ? 'OVER 3.5 CARDS' : 'SKIP' },
    over4: { probability: round(over4), recommendation: over4 > 50 ? 'OVER 4.5 CARDS' : 'SKIP' },
    over5: { probability: round(over5), recommendation: over5 > 40 ? 'OVER 5.5 CARDS' : 'SKIP' },
    expected: round(expectedCards, 1),
  };
}

function calculateExactGoals(home: any, away: any) {
  const expected = (home.avgGoalsScored + away.avgGoalsScored + 
                   home.avgGoalsConceded + away.avgGoalsConceded) / 2;
  
  return {
    '0-0': { probability: expected < 2 ? 15 : 5 },
    '1-0': { probability: expected < 2.5 ? 12 : 8 },
    '0-1': { probability: expected < 2.5 ? 10 : 7 },
    '1-1': { probability: 12 },
    '2-0': { probability: expected > 2 ? 10 : 6 },
    '0-2': { probability: expected > 2 ? 8 : 5 },
    '2-1': { probability: expected > 2.5 ? 10 : 7 },
    '1-2': { probability: expected > 2.5 ? 8 : 6 },
    '2-2': { probability: expected > 2.8 ? 8 : 5 },
    '3+': { probability: expected > 3 ? 20 : 10 },
  };
}

function calculateTeamTotal(team: any, type: 'over' | 'under', line: number) {
  const avgGoals = team.avgGoalsScored;
  let probability = 50;

  if (line === 1.5) {
    probability = avgGoals > 1.8 ? 65 : avgGoals > 1.2 ? 50 : 35;
  } else if (line === 2.5) {
    probability = avgGoals > 2.5 ? 50 : avgGoals > 2 ? 35 : 20;
  }

  return {
    probability: round(probability),
    recommendation: type === 'over' && probability > 55 ? `OVER ${line}` : 
                    type === 'under' && probability < 45 ? `UNDER ${line}` : 'SKIP',
  };
}

function generateBestPicks(prediction: any) {
  const picks = [];
  const markets = [
    { name: '1X2 Home', prob: prediction.matchResult.home.probability, min: 55 },
    { name: 'Over 2.5', prob: prediction.goals.over25.probability, min: 60 },
    { name: 'BTTS Yes', prob: prediction.btts.yes.probability, min: 58 },
    { name: 'Over 1.5', prob: prediction.goals.over15.probability, min: 75 },
    { name: 'Corners Over 9.5', prob: prediction.corners.over9.probability, min: 60 },
    { name: 'Cards Over 3.5', prob: prediction.cards.over3.probability, min: 60 },
  ];

  markets.forEach(m => {
    if (m.prob >= m.min) {
      picks.push(`${m.name} (${m.prob}%)`);
    }
  });

  return picks.slice(0, 3); // Top 3 picks
}

function round(num: number, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

// GET: Get today's matches
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const matches = await prisma.match.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: 'NS',
      },
      take: 20,
    });

    return NextResponse.json({
      date: today.toISOString().split('T')[0],
      matches: matches.map(m => ({
        id: m.fixtureId,
        home: m.homeTeamName,
        away: m.awayTeamName,
        league: m.leagueName,
        leagueId: m.leagueId,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
