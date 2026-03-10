import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

// GET: Clean and sync today's matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Si viene ?sync=true, hacemos sync de partidos de hoy
    if (searchParams.get('sync') === 'true') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      const TOP_LEAGUES = [39, 140, 135, 78, 61, 88, 94, 2, 3];
      let added = 0;

      for (const leagueId of TOP_LEAGUES) {
        try {
          const res = await fetch(
            `${API_BASE}/fixtures?league=${leagueId}&season=2024&from=${today}&to=${tomorrow}`,
            {
              headers: {
                'x-rapidapi-key': API_KEY || '',
                'x-rapidapi-host': 'v3.football.api-sports.io',
              },
            }
          );

          if (!res.ok) continue;
          const data = await res.json();
          if (!data.response) continue;

          for (const f of data.response) {
            await prisma.match.upsert({
              where: { fixtureId: f.fixture.id },
              update: {
                status: f.fixture.status.short,
                homeTeamName: f.teams.home.name,
                awayTeamName: f.teams.away.name,
              },
              create: {
                fixtureId: f.fixture.id,
                leagueId: f.league.id,
                leagueName: f.league.name,
                season: f.league.season,
                date: new Date(f.fixture.date),
                timestamp: f.fixture.timestamp,
                timezone: f.fixture.timezone || 'UTC',
                status: f.fixture.status.short,
                homeTeamId: f.teams.home.id,
                homeTeamName: f.teams.home.name,
                awayTeamId: f.teams.away.id,
                awayTeamName: f.teams.away.name,
              },
            });
            added++;
          }
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {}
      }

      return NextResponse.json({ 
        success: true, 
        message: `Synced ${added} matches for today`,
        date: today 
      });
    }

    // Info normal
    return NextResponse.json({
      message: 'ML Predict API - Use ?sync=true to sync today matches',
      example: { homeTeam: 'Manchester City', awayTeam: 'Liverpool' }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Predict
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { homeTeam, awayTeam } = body;

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'homeTeam and awayTeam required' }, { status: 400 });
    }

    // Get matches
    const homeMatches = await prisma.match.findMany({
      where: { 
        OR: [
          { homeTeamName: { contains: homeTeam, mode: 'insensitive' } },
          { awayTeamName: { contains: homeTeam, mode: 'insensitive' } }
        ],
        status: 'FT'
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    const awayMatches = await prisma.match.findMany({
      where: { 
        OR: [
          { homeTeamName: { contains: awayTeam, mode: 'insensitive' } },
          { awayTeamName: { contains: awayTeam, mode: 'insensitive' } }
        ],
        status: 'FT'
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    // Calculate stats
    const home = calcStats(homeMatches, homeTeam);
    const away = calcStats(awayMatches, awayTeam);

    const prediction = {
      match: `${homeTeam} vs ${awayTeam}`,
      
      result: {
        home: 50, draw: 25, away: 25,
        pick: home.avgGoals > away.avgGoals ? 'HOME' : 'AWAY'
      },

      overUnder: {
        over25: calcOU(home, away, 2.5),
        over35: calcOU(home, away, 3.5),
        under25: calcUnder(home, away, 2.5),
      },

      btts: {
        yes: { probability: round((home.btts + away.btts) / 2), pick: (home.btts + away.btts) / 2 > 55 ? 'YES' : 'NO' }
      },

      teamGoals: {
        homeOver15: { probability: home.avgGoals > 1.5 ? 65 : 45, pick: home.avgGoals > 1.5 ? 'OVER 1.5' : 'SKIP' },
        awayOver15: { probability: away.avgGoals > 1.5 ? 65 : 45, pick: away.avgGoals > 1.5 ? 'OVER 1.5' : 'SKIP' },
      },

      corners: {
        over95: { probability: (home.corners + away.corners) > 9.5 ? 60 : 45, pick: (home.corners + away.corners) > 9.5 ? 'OVER 9.5' : 'SKIP' },
        homeOver45: { probability: home.corners > 4.5 ? 55 : 40, pick: home.corners > 4.5 ? 'HOME OVER 4.5' : 'SKIP' },
        awayOver45: { probability: away.corners > 4.5 ? 55 : 40, pick: away.corners > 4.5 ? 'AWAY OVER 4.5' : 'SKIP' },
      },

      cards: {
        over35: { probability: (home.cards + away.cards) > 3.5 ? 60 : 45, pick: (home.cards + away.cards) > 3.5 ? 'OVER 3.5' : 'SKIP' },
        homeOver25: { probability: home.cards > 2.5 ? 55 : 40, pick: home.cards > 2.5 ? 'HOME OVER 2.5' : 'SKIP' },
        awayOver25: { probability: away.cards > 2.5 ? 55 : 40, pick: away.cards > 2.5 ? 'AWAY OVER 2.5' : 'SKIP' },
      },

      expected: {
        homeGoals: round(home.avgGoals),
        awayGoals: round(away.avgGoals),
        totalGoals: round(home.avgGoals + away.avgGoals),
        homeCorners: round(home.corners),
        awayCorners: round(away.corners),
        totalCorners: round(home.corners + away.corners),
        homeCards: round(home.cards),
        awayCards: round(away.cards),
        totalCards: round(home.cards + away.cards),
      },

      form: {
        home: home.wins > home.losses ? 'Good' : 'Poor',
        away: away.wins > away.losses ? 'Good' : 'Poor',
      }
    };

    prediction.result.home = round(45 + (home.avgGoals - away.avgGoals) * 10);
    prediction.result.away = round(30 + (away.avgGoals - home.avgGoals) * 10);
    prediction.result.draw = round(100 - prediction.result.home - prediction.result.away);

    return NextResponse.json({ success: true, prediction });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calcStats(matches: any[], team: string) {
  if (matches.length === 0) {
    return { matches: 0, avgGoals: 1.3, corners: 5, cards: 2.5, btts: 50, wins: 0, losses: 0 };
  }

  let goals = 0, corners = 0, cards = 0, btts = 0, wins = 0, losses = 0;

  matches.forEach(m => {
    const isHome = m.homeTeamName?.toLowerCase().includes(team.toLowerCase());
    const g = isHome ? m.homeGoals : m.awayGoals;
    const c = isHome ? m.awayGoals : m.homeGoals;
    
    goals += g;
    corners += isHome ? (m.homeCorners || 0) : (m.awayCorners || 0);
    cards += isHome ? ((m.homeYellowCards || 0) + (m.homeRedCards || 0)) : ((m.awayYellowCards || 0) + (m.awayRedCards || 0));
    
    if (g > 0 && c > 0) btts++;
    if (g > c) wins++;
    if (g < c) losses++;
  });

  const n = matches.length;
  return {
    matches: n,
    avgGoals: round(goals / n),
    corners: round(corners / n),
    cards: round(cards / n),
    btts: round((btts / n) * 100),
    wins, losses
  };
}

function calcOU(h: any, a: any, line: number) {
  const avg = h.avgGoals + a.avgGoals;
  const prob = avg > line ? 65 : avg > line - 0.5 ? 52 : 38;
  return { probability: prob, pick: prob > 55 ? `OVER ${line}` : 'SKIP' };
}

function calcUnder(h: any, a: any, line: number) {
  const ou = calcOU(h, a, line);
  return { probability: 100 - ou.probability, pick: ou.probability < 42 ? `UNDER ${line}` : 'SKIP' };
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
