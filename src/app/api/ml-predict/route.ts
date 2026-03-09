import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { homeTeam, awayTeam, leagueId } = body;

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'homeTeam and awayTeam required' }, { status: 400 });
    }

    // Get matches separados por local/visitante
    const homeMatchesHome = await prisma.match.findMany({
      where: { homeTeamName: { contains: homeTeam, mode: 'insensitive' }, status: 'FT' },
      orderBy: { date: 'desc' }, take: 10,
    });
    const homeMatchesAway = await prisma.match.findMany({
      where: { awayTeamName: { contains: homeTeam, mode: 'insensitive' }, status: 'FT' },
      orderBy: { date: 'desc' }, take: 10,
    });
    const awayMatchesAway = await prisma.match.findMany({
      where: { awayTeamName: { contains: awayTeam, mode: 'insensitive' }, status: 'FT' },
      orderBy: { date: 'desc' }, take: 10,
    });
    const awayMatchesHome = await prisma.match.findMany({
      where: { homeTeamName: { contains: awayTeam, mode: 'insensitive' }, status: 'FT' },
      orderBy: { date: 'desc' }, take: 10,
    });

    // Stats detalladas
    const homeStatsHome = calcStatsDetailed(homeMatchesHome, 'home');
    const homeStatsAway = calcStatsDetailed(homeMatchesAway, 'away');
    const awayStatsAway = calcStatsDetailed(awayMatchesAway, 'away');
    const awayStatsHome = calcStatsDetailed(awayMatchesHome, 'home');

    // Combinadas
    const homeAll = combineStats([homeStatsHome, homeStatsAway]);
    const awayAll = combineStats([awayStatsAway, awayStatsHome]);

    // H2H
    const h2h = await calcH2HDetailed(homeTeam, awayTeam);

    // PREDICCIONES COMPLETAS
    const prediction = {
      match: `${homeTeam} vs ${awayTeam}`,
      
      // === 1X2 ===
      matchResult: calc1X2Detailed(homeAll, awayAll, h2h),
      
      // === GOLES TOTALES ===
      goals: {
        over15: calcOU(homeAll, awayAll, 1.5),
        over25: calcOU(homeAll, awayAll, 2.5),
        over35: calcOU(homeAll, awayAll, 3.5),
        over45: calcOU(homeAll, awayAll, 4.5),
        under15: calcUnder(homeAll, awayAll, 1.5),
        under25: calcUnder(homeAll, awayAll, 2.5),
        under35: calcUnder(homeAll, awayAll, 3.5),
        under45: calcUnder(homeAll, awayAll, 4.5),
        exact: calcExactGoals(homeAll, awayAll),
      },
      
      // === GOLES POR EQUIPO ===
      teamGoals: {
        home: {
          over05: calcTeamOU(homeStatsHome, 0.5),
          over15: calcTeamOU(homeStatsHome, 1.5),
          over25: calcTeamOU(homeStatsHome, 2.5),
          under05: calcTeamUnder(homeStatsHome, 0.5),
          under15: calcTeamUnder(homeStatsHome, 1.5),
          under25: calcTeamUnder(homeStatsHome, 2.5),
          expected: round((homeStatsHome.avgGoals + homeStatsAway.avgGoals) / 2),
        },
        away: {
          over05: calcTeamOU(awayStatsAway, 0.5),
          over15: calcTeamOU(awayStatsAway, 1.5),
          over25: calcTeamOU(awayStatsAway, 2.5),
          under05: calcTeamUnder(awayStatsAway, 0.5),
          under15: calcTeamUnder(awayStatsAway, 1.5),
          under25: calcTeamUnder(awayStatsAway, 2.5),
          expected: round((awayStatsAway.avgGoals + awayStatsHome.avgGoals) / 2),
        }
      },
      
      // === BTTS ===
      btts: calcBTTS(homeAll, awayAll),
      
      // === HALF TIME ===
      halfTime: {
        over05: calcHTOU(homeAll, awayAll, 0.5),
        over15: calcHTOU(homeAll, awayAll, 1.5),
        btts: calcHTBTTS(homeAll, awayAll),
        result: calcHTResult(homeAll, awayAll),
      },
      
      // === CORNERS TOTALES ===
      corners: {
        over85: calcCornersOU(homeAll, awayAll, 8.5),
        over95: calcCornersOU(homeAll, awayAll, 9.5),
        over105: calcCornersOU(homeAll, awayAll, 10.5),
        over115: calcCornersOU(homeAll, awayAll, 11.5),
        over125: calcCornersOU(homeAll, awayAll, 12.5),
        under85: calcCornersUnder(homeAll, awayAll, 8.5),
        under95: calcCornersUnder(homeAll, awayAll, 9.5),
        under105: calcCornersUnder(homeAll, awayAll, 10.5),
        expected: round(homeAll.avgCorners + awayAll.avgCorners),
      },
      
      // === CORNERS POR EQUIPO ===
      teamCorners: {
        home: {
          over35: calcTeamCornersOU(homeStatsHome, 3.5),
          over45: calcTeamCornersOU(homeStatsHome, 4.5),
          over55: calcTeamCornersOU(homeStatsHome, 5.5),
          expected: round(homeStatsHome.avgCorners),
        },
        away: {
          over35: calcTeamCornersOU(awayStatsAway, 3.5),
          over45: calcTeamCornersOU(awayStatsAway, 4.5),
          over55: calcTeamCornersOU(awayStatsAway, 5.5),
          expected: round(awayStatsAway.avgCorners),
        }
      },
      
      // === CORNERS HANDICAP ===
      cornersHandicap: calcCornersHandicap(homeStatsHome, awayStatsAway),
      
      // === TARJETAS TOTALES ===
      cards: {
        over25: calcCardsOU(homeAll, awayAll, 2.5),
        over35: calcCardsOU(homeAll, awayAll, 3.5),
        over45: calcCardsOU(homeAll, awayAll, 4.5),
        over55: calcCardsOU(homeAll, awayAll, 5.5),
        over65: calcCardsOU(homeAll, awayAll, 6.5),
        under25: calcCardsUnder(homeAll, awayAll, 2.5),
        under35: calcCardsUnder(homeAll, awayAll, 3.5),
        under45: calcCardsUnder(homeAll, awayAll, 4.5),
        expected: round(homeAll.avgCards + awayAll.avgCards),
      },
      
      // === TARJETAS POR EQUIPO ===
      teamCards: {
        home: {
          over15: calcTeamCardsOU(homeStatsHome, 1.5),
          over25: calcTeamCardsOU(homeStatsHome, 2.5),
          over35: calcTeamCardsOU(homeStatsHome, 3.5),
          expected: round(homeStatsHome.avgCards),
        },
        away: {
          over15: calcTeamCardsOU(awayStatsAway, 1.5),
          over25: calcTeamCardsOU(awayStatsAway, 2.5),
          over35: calcTeamCardsOU(awayStatsAway, 3.5),
          expected: round(awayStatsAway.avgCards),
        }
      },
      
      // === TIROS ===
      shots: {
        home: { expected: round(homeStatsHome.avgShots) },
        away: { expected: round(awayStatsAway.avgShots) },
        total: { expected: round(homeStatsHome.avgShots + awayStatsAway.avgShots) },
      },
      
      // === POSESIÓN ===
      possession: {
        home: round(homeStatsHome.avgPossession),
        away: round(100 - homeStatsHome.avgPossession),
      },
      
      // === FORMA RECIENTE ===
      form: {
        home: getForm(homeMatchesHome.slice(0, 5)),
        away: getForm(awayMatchesAway.slice(0, 5)),
      },
      
      // === VALORES ESPERADOS ===
      expected: {
        homeGoals: round((homeStatsHome.avgGoals + awayStatsAway.avgConceded) / 2),
        awayGoals: round((awayStatsAway.avgGoals + homeStatsHome.avgConceded) / 2),
        totalGoals: round((homeStatsHome.avgGoals + awayStatsAway.avgGoals + homeStatsHome.avgConceded + awayStatsAway.avgConceded) / 2),
        homeCorners: round(homeStatsHome.avgCorners),
        awayCorners: round(awayStatsAway.avgCorners),
        totalCorners: round(homeStatsHome.avgCorners + awayStatsAway.avgCorners),
        homeCards: round(homeStatsHome.avgCards),
        awayCards: round(awayStatsAway.avgCards),
        totalCards: round(homeStatsHome.avgCards + awayStatsAway.avgCards),
        homeShots: round(homeStatsHome.avgShots),
        awayShots: round(awayStatsAway.avgShots),
      },
      
      // === MEJORES PICKS ===
      bestPicks: [] as string[],
      
      // === STATS CRUDAS ===
      stats: {
        home: { home: homeStatsHome, away: homeStatsAway, combined: homeAll },
        away: { home: awayStatsHome, away: awayStatsAway, combined: awayAll },
        h2h,
      }
    };

    // Generar mejores picks
    prediction.bestPicks = generateBestPicks(prediction);

    return NextResponse.json({ success: true, prediction });

  } catch (error: any) {
    console.error('[ML-PREDICT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === FUNCIONES DE CÁLCULO DETALLADAS ===

function calcStatsDetailed(matches: any[], type: 'home' | 'away') {
  const s = {
    matches: matches.length,
    wins: 0, draws: 0, losses: 0,
    avgGoals: 0, avgConceded: 0,
    avgCorners: 0, avgCards: 0,
    avgShots: 0, avgShotsOnTarget: 0,
    avgPossession: 0,
    bttsRate: 0, over25Rate: 0,
    cleanSheets: 0, failedToScore: 0,
    htOver05: 0,
  };

  if (matches.length === 0) return s;

  let goals = 0, conc = 0, corners = 0, cards = 0;
  let shots = 0, sot = 0, poss = 0;
  let btts = 0, over25 = 0, cs = 0, fts = 0, htGoals = 0;

  matches.forEach(m => {
    const isHome = type === 'home';
    const g = isHome ? m.homeGoals : m.awayGoals;
    const c = isHome ? m.awayGoals : m.homeGoals;
    
    goals += g; conc += c;
    corners += isHome ? (m.homeCorners || 0) : (m.awayCorners || 0);
    cards += isHome ? ((m.homeYellowCards || 0) + (m.homeRedCards || 0)) : ((m.awayYellowCards || 0) + (m.awayRedCards || 0));
    shots += isHome ? (m.homeShots || 0) : (m.awayShots || 0);
    sot += isHome ? (m.homeShotsOnTarget || 0) : (m.awayShotsOnTarget || 0);
    poss += isHome ? (m.homePossession || 50) : (m.awayPossession || 50);

    if (g > 0 && c > 0) btts++;
    if (g + c > 2.5) over25++;
    if (c === 0) cs++;
    if (g === 0) fts++;
    if ((m.homeScoreHT || 0) + (m.awayScoreHT || 0) > 0) htGoals++;

    if (g > c) s.wins++;
    else if (g === c) s.draws++;
    else s.losses++;
  });

  const n = matches.length;
  s.avgGoals = goals / n; s.avgConceded = conc / n;
  s.avgCorners = corners / n; s.avgCards = cards / n;
  s.avgShots = shots / n; s.avgShotsOnTarget = sot / n;
  s.avgPossession = poss / n;
  s.bttsRate = (btts / n) * 100; s.over25Rate = (over25 / n) * 100;
  s.cleanSheets = (cs / n) * 100; s.failedToScore = (fts / n) * 100;
  s.htOver05 = (htGoals / n) * 100;

  return s;
}

function combineStats(statsArray: any[]) {
  const valid = statsArray.filter(s => s.matches > 0);
  if (valid.length === 0) return statsArray[0];
  
  const combined = { ...valid[0] };
  const fields = ['avgGoals', 'avgConceded', 'avgCorners', 'avgCards', 'avgShots', 'avgPossession', 'bttsRate', 'over25Rate'];
  
  fields.forEach(f => {
    combined[f] = valid.reduce((sum, s) => sum + s[f], 0) / valid.length;
  });
  
  combined.matches = valid.reduce((sum, s) => sum + s.matches, 0);
  return combined;
}

async function calcH2HDetailed(home: string, away: string) {
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { homeTeamName: { contains: home, mode: 'insensitive' }, awayTeamName: { contains: away, mode: 'insensitive' } },
        { homeTeamName: { contains: away, mode: 'insensitive' }, awayTeamName: { contains: home, mode: 'insensitive' } }
      ],
      status: 'FT'
    },
    take: 10,
  });

  if (matches.length === 0) return null;

  let hw = 0, d = 0, aw = 0, btts = 0, over25 = 0, avgGoals = 0;
  matches.forEach(m => {
    if (m.homeGoals > m.awayGoals) hw++;
    else if (m.awayGoals > m.homeGoals) aw++;
    else d++;
    if (m.homeGoals > 0 && m.awayGoals > 0) btts++;
    if (m.homeGoals + m.awayGoals > 2.5) over25++;
    avgGoals += m.homeGoals + m.awayGoals;
  });

  return {
    matches: matches.length,
    homeWins: hw, draws: d, awayWins: aw,
    bttsRate: (btts / matches.length) * 100,
    over25Rate: (over25 / matches.length) * 100,
    avgGoals: avgGoals / matches.length,
  };
}

// === MERCADOS ===

function calc1X2Detailed(home: any, away: any, h2h: any) {
  let hp = 45, ap = 30;
  hp += (home.avgGoals - away.avgConceded) * 5;
  ap += (away.avgGoals - home.avgConceded) * 5;
  
  if (h2h) {
    hp = (hp + (h2h.homeWins / h2h.matches) * 100) / 2;
    ap = (ap + (h2h.awayWins / h2h.matches) * 100) / 2;
  }

  const dp = 100 - hp - ap;
  return {
    home: round(hp), draw: round(dp), away: round(ap),
    recommendation: hp > ap + 15 ? '1 (HOME)' : ap > hp + 15 ? '2 (AWAY)' : dp > 28 ? 'X (DRAW)' : '1X'
  };
}

function calcOU(h: any, a: any, line: number) {
  const avg = (h.avgGoals + a.avgGoals + h.avgConceded + a.avgConceded) / 2;
  let prob = 50;
  if (line === 1.5) prob = avg > 2 ? 72 : avg > 1.5 ? 58 : 42;
  else if (line === 2.5) prob = avg > 2.5 ? 62 : avg > 2 ? 52 : 38;
  else if (line === 3.5) prob = avg > 3 ? 52 : avg > 2.5 ? 38 : 25;
  else if (line === 4.5) prob = avg > 3.5 ? 35 : 20;
  return { probability: round(prob), recommendation: prob > 58 ? `OVER ${line}` : 'SKIP' };
}

function calcUnder(h: any, a: any, line: number) {
  const ou = calcOU(h, a, line);
  return { probability: round(100 - ou.probability), recommendation: ou.probability < 42 ? `UNDER ${line}` : 'SKIP' };
}

function calcTeamOU(stats: any, line: number) {
  const avg = stats.avgGoals;
  let prob = 50;
  if (line === 0.5) prob = avg > 1 ? 80 : avg > 0.7 ? 65 : 45;
  else if (line === 1.5) prob = avg > 1.5 ? 65 : avg > 1 ? 48 : 30;
  else if (line === 2.5) prob = avg > 2 ? 45 : 25;
  return { probability: round(prob), recommendation: prob > 55 ? `OVER ${line}` : 'SKIP' };
}

function calcTeamUnder(stats: any, line: number) {
  const ou = calcTeamOU(stats, line);
  return { probability: round(100 - ou.probability), recommendation: ou.probability < 40 ? `UNDER ${line}` : 'SKIP' };
}

function calcBTTS(h: any, a: any) {
  const prob = round((h.bttsRate + a.bttsRate) / 2);
  return {
    yes: { probability: prob, recommendation: prob > 55 ? 'BTTS YES' : 'SKIP' },
    no: { probability: round(100 - prob), recommendation: prob < 45 ? 'BTTS NO' : 'SKIP' }
  };
}

function calcHTOU(h: any, a: any, line: number) {
  const rate = (h.htOver05 + a.htOver05) / 2;
  const prob = line === 0.5 ? rate : rate * 0.6;
  return { probability: round(prob), recommendation: prob > 60 ? `HT OVER ${line}` : 'SKIP' };
}

function calcHTBTTS(h: any, a: any) {
  const prob = round((h.bttsRate + a.bttsRate) / 2 * 0.7);
  return { probability: prob, recommendation: prob > 45 ? 'HT BTTS' : 'SKIP' };
}

function calcHTResult(h: any, a: any) {
  return {
    home: { probability: 35, recommendation: 'HT 1' },
    draw: { probability: 40, recommendation: 'HT X' },
    away: { probability: 25, recommendation: 'HT 2' },
  };
}

function calcExactGoals(h: any, a: any) {
  const avg = (h.avgGoals + a.avgGoals) / 2;
  return {
    '0-0': { probability: avg < 2 ? 12 : 5 },
    '1-0': { probability: avg < 2.5 ? 11 : 7 },
    '0-1': { probability: avg < 2.5 ? 9 : 6 },
    '1-1': { probability: 11 },
    '2-1': { probability: avg > 2.2 ? 10 : 7 },
    '1-2': { probability: avg > 2.2 ? 8 : 6 },
    '2-0': { probability: avg > 2 ? 9 : 6 },
    '0-2': { probability: avg > 2 ? 7 : 5 },
    '2-2': { probability: avg > 2.8 ? 8 : 5 },
    '3+': { probability: avg > 3 ? 25 : 15 },
  };
}

function calcCornersOU(h: any, a: any, line: number) {
  const total = h.avgCorners + a.avgCorners;
  let prob = 50;
  if (line === 8.5) prob = total > 9 ? 62 : total > 8 ? 52 : 42;
  else if (line === 9.5) prob = total > 10 ? 58 : total > 9 ? 48 : 38;
  else if (line === 10.5) prob = total > 11 ? 55 : total > 10 ? 45 : 35;
  else if (line === 11.5) prob = total > 12 ? 50 : total > 11 ? 40 : 30;
  else if (line === 12.5) prob = total > 13 ? 45 : 35;
  return { probability: round(prob), recommendation: prob > 55 ? `CORNERS OVER ${line}` : 'SKIP' };
}

function calcCornersUnder(h: any, a: any, line: number) {
  const ou = calcCornersOU(h, a, line);
  return { probability: round(100 - ou.probability), recommendation: ou.probability < 42 ? `CORNERS UNDER ${line}` : 'SKIP' };
}

function calcTeamCornersOU(stats: any, line: number) {
  const prob = stats.avgCorners > line + 1 ? 60 : stats.avgCorners > line ? 50 : 38;
  return { probability: round(prob), recommendation: prob > 55 ? `OVER ${line}` : 'SKIP' };
}

function calcCornersHandicap(home: any, away: any) {
  const diff = home.avgCorners - away.avgCorners;
  return {
    homeMinus1: { probability: diff > 1 ? 55 : 40, recommendation: diff > 1 ? 'HOME -1 CORNERS' : 'SKIP' },
    homePlus1: { probability: diff > -1 ? 65 : 50, recommendation: diff > -1 ? 'HOME +1 CORNERS' : 'SKIP' },
  };
}

function calcCardsOU(h: any, a: any, line: number) {
  const total = h.avgCards + a.avgCards;
  let prob = 50;
  if (line === 2.5) prob = total > 3 ? 70 : total > 2.5 ? 58 : 45;
  else if (line === 3.5) prob = total > 4 ? 65 : total > 3.5 ? 55 : 40;
  else if (line === 4.5) prob = total > 5 ? 60 : total > 4.5 ? 48 : 35;
  else if (line === 5.5) prob = total > 6 ? 50 : total > 5.5 ? 40 : 28;
  else if (line === 6.5) prob = total > 7 ? 40 : 30;
  return { probability: round(prob), recommendation: prob > 55 ? `CARDS OVER ${line}` : 'SKIP' };
}

function calcCardsUnder(h: any, a: any, line: number) {
  const ou = calcCardsOU(h, a, line);
  return { probability: round(100 - ou.probability), recommendation: ou.probability < 42 ? `CARDS UNDER ${line}` : 'SKIP' };
}

function calcTeamCardsOU(stats: any, line: number) {
  const prob = stats.avgCards > line + 0.5 ? 60 : stats.avgCards > line ? 48 : 35;
  return { probability: round(prob), recommendation: prob > 52 ? `OVER ${line}` : 'SKIP' };
}

function getForm(matches: any[]) {
  return matches.map(m => {
    if (m.homeGoals > m.awayGoals) return 'W';
    if (m.homeGoals < m.awayGoals) return 'L';
    return 'D';
  }).join('');
}

function generateBestPicks(p: any) {
  const picks = [];
  if (p.matchResult.home > 58) picks.push(`1 (${p.matchResult.home}%)`);
  if (p.goals.over25.probability > 60) picks.push(`OVER 2.5 (${p.goals.over25.probability}%)`);
  if (p.btts.yes.probability > 58) picks.push(`BTTS (${p.btts.yes.probability}%)`);
  if (p.teamGoals.home.over15.probability > 60) picks.push(`HOME OVER 1.5 (${p.teamGoals.home.over15.probability}%)`);
  if (p.corners.over95.probability > 58) picks.push(`CORNERS O9.5 (${p.corners.over95.probability}%)`);
  if (p.cards.over35.probability > 60) picks.push(`CARDS O3.5 (${p.cards.over35.probability}%)`);
  if (p.teamCards.home.over15.probability > 55) picks.push(`HOME CARDS O1.5 (${p.teamCards.home.over15.probability}%)`);
  return picks.length > 0 ? picks : ['No strong picks'];
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'ML Predict API Ultra Complete',
    markets: ['1X2', 'OU 1.5/2.5/3.5/4.5', 'Team Goals', 'BTTS', 'HT', 'Corners 8.5-12.5', 'Team Corners', 'Cards 2.5-6.5', 'Team Cards', 'Handicaps'],
    example: { homeTeam: 'Manchester City', awayTeam: 'Liverpool', leagueId: 39 }
  });
}
