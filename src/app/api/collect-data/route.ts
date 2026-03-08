import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ALL_LEAGUES } from '@/constants/leagues';
import { collectLeagueMatches, saveTrainingData } from '@/services/historical-data';

// Initialize Prisma with error handling
let prisma: PrismaClient;

try {
  prisma = new PrismaClient();
} catch (error) {
  console.error('[API] Failed to initialize Prisma:', error);
}

const AVAILABLE_SEASONS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

export async function GET(request: NextRequest) {
  try {
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const totalMatches = await prisma.match.count({
      where: { status: 'FT' }
    });

    const byLeague = await prisma.match.groupBy({
      by: ['leagueId', 'leagueName', 'season'],
      where: { status: 'FT' },
      _count: { id: true }
    });

    const leagueData: Record<string, number> = {};
    byLeague.forEach(item => {
      const key = `${item.leagueName}_${item.season}`;
      leagueData[key] = item._count.id;
    });

    return NextResponse.json({
      totalMatches,
      byLeague: leagueData,
      availableLeagues: ALL_LEAGUES.length,
      availableSeasons: AVAILABLE_SEASONS.length
    });
  } catch (error: any) {
    console.error('[API] GET Error:', error);
    return NextResponse.json(
      { error: 'Error checking database', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/collect-data started');
  
  try {
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { mode = 'hybrid' } = body;
    console.log(`[API] Mode: ${mode}`);

    const results = {
      fromDatabase: 0,
      fromAPI: 0,
      total: 0,
      byLeague: {} as Record<string, { db: number; api: number }>
    };

    // Load from database
    if (mode === 'database' || mode === 'hybrid') {
      console.log('[API] Loading from database...');
      
      try {
        const matches = await prisma.match.findMany({
          where: { status: 'FT' },
          orderBy: { date: 'desc' },
        });
        
        console.log(`[API] Found ${matches.length} matches in database`);

        for (const match of matches) {
          try {
            const processed = await processDatabaseMatch(match);
            if (processed) {
              await saveTrainingData([processed as any]);
              
              const key = match.leagueName;
              if (!results.byLeague[key]) results.byLeague[key] = { db: 0, api: 0 };
              results.byLeague[key].db++;
              results.fromDatabase++;
            }
          } catch (err: any) {
            console.error(`[API] Error processing match ${match.fixtureId}:`, err?.message || err);
          }
        }

        results.total = results.fromDatabase;
        console.log(`[API] Loaded ${results.fromDatabase} matches from database`);
      } catch (dbError: any) {
        console.error('[API] Database error:', dbError?.message || dbError);
        throw new Error(`Database error: ${dbError?.message || 'Unknown'}`);
      }
    }

    // Download missing from API (hybrid mode)
    if (mode === 'hybrid') {
      console.log('[API] Checking missing data from API...');
      
      for (const league of ALL_LEAGUES.slice(0, 10)) {
        for (const season of [2024, 2025]) {
          const count = await prisma.match.count({
            where: { leagueId: league.id, season, status: 'FT' }
          });

          if (count < 10) {
            console.log(`[API] Downloading ${league.name} ${season}...`);
            
            try {
              const apiMatches = await collectLeagueMatches(league.id, season);
              if (apiMatches.length > 0) {
                const key = league.name;
                if (!results.byLeague[key]) results.byLeague[key] = { db: 0, api: 0 };
                results.byLeague[key].api += apiMatches.length;
                results.fromAPI += apiMatches.length;
                results.total += apiMatches.length;
              }
              await new Promise(r => setTimeout(r, 2000));
            } catch (err: any) {
              console.error(`[API] Error downloading ${league.name}:`, err?.message || err);
            }
          }
        }
      }
    }

    console.log('[API] Collection complete:', results);
    return NextResponse.json({ success: true, ...results });

  } catch (error: any) {
    console.error('[API] POST Error:', error);
    return NextResponse.json(
      { error: 'Error collecting data', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

async function processDatabaseMatch(dbMatch: any) {
  try {
    const homeStats = await getTeamStats(dbMatch.homeTeamId, dbMatch.leagueId, dbMatch.season);
    const awayStats = await getTeamStats(dbMatch.awayTeamId, dbMatch.leagueId, dbMatch.season);
    const totalGoals = (dbMatch.homeGoals || 0) + (dbMatch.awayGoals || 0);

    return {
      id: dbMatch.fixtureId,
      fixture: {
        id: dbMatch.fixtureId,
        date: dbMatch.date.toISOString(),
        timestamp: dbMatch.timestamp,
        timezone: dbMatch.timezone,
        status: { short: dbMatch.status, long: dbMatch.status, elapsed: 90 },
        referee: null,
        periods: { first: 45, second: 45 },
        venue: { id: null, name: null, city: null },
      },
      league: { 
        id: dbMatch.leagueId, 
        name: dbMatch.leagueName, 
        season: dbMatch.season, 
        type: 'League', 
        logo: '', 
        country: '', 
        flag: '' 
      },
      teams: {
        home: { id: dbMatch.homeTeamId, name: dbMatch.homeTeamName, logo: '', winner: dbMatch.homeGoals > dbMatch.awayGoals },
        away: { id: dbMatch.awayTeamId, name: dbMatch.awayTeamName, logo: '', winner: dbMatch.awayGoals > dbMatch.homeGoals },
      },
      goals: { home: dbMatch.homeGoals, away: dbMatch.awayGoals },
      score: {
        halftime: { home: dbMatch.homeScoreHT, away: dbMatch.awayScoreHT },
        fulltime: { home: dbMatch.homeScoreFT, away: dbMatch.awayScoreFT },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
      features: {
        homeForm: homeStats?.recentForm || [0, 0, 0, 0, 0],
        awayForm: awayStats?.recentForm || [0, 0, 0, 0, 0],
        homeGoalsScoredAvg: homeStats?.avgGoalsScored || 0,
        homeGoalsConcededAvg: homeStats?.avgGoalsConceded || 0,
        awayGoalsScoredAvg: awayStats?.avgGoalsScored || 0,
        awayGoalsConcededAvg: awayStats?.avgGoalsConceded || 0,
        h2hHomeWins: 0, h2hDraws: 0, h2hAwayWins: 0,
        homeCleanSheets: homeStats?.cleanSheets || 0,
        awayCleanSheets: awayStats?.cleanSheets || 0,
        homeBttsRate: homeStats?.bttsRate || 0.5,
        awayBttsRate: awayStats?.bttsRate || 0.5,
        homeOver15Rate: homeStats?.over15Rate || 0.5,
        homeOver25Rate: homeStats?.over25Rate || 0.5,
        awayOver15Rate: awayStats?.over15Rate || 0.5,
        awayOver25Rate: awayStats?.over25Rate || 0.5,
      },
      target: {
        homeWin: (dbMatch.homeGoals || 0) > (dbMatch.awayGoals || 0),
        draw: (dbMatch.homeGoals || 0) === (dbMatch.awayGoals || 0),
        awayWin: (dbMatch.homeGoals || 0) < (dbMatch.awayGoals || 0),
        btts: (dbMatch.homeGoals || 0) > 0 && (dbMatch.awayGoals || 0) > 0,
        over15: totalGoals > 1.5, over25: totalGoals > 2.5, over35: totalGoals > 3.5,
        totalGoals: totalGoals,
      },
      metadata: { season: dbMatch.season, collectedAt: new Date(), hasCompleteData: true },
    };
  } catch (error: any) {
    console.error('[API] Error in processDatabaseMatch:', error?.message || error);
    throw error;
  }
}

async function getTeamStats(teamId: number, leagueId: number, season: number) {
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { homeTeamId: teamId, leagueId, season },
          { awayTeamId: teamId, leagueId, season },
        ],
        status: 'FT',
      },
      orderBy: { date: 'desc' },
      take: 10,
    });
    
    if (matches.length === 0) return null;
    
    let goalsScored = 0, goalsConceded = 0, cleanSheets = 0;
    let bttsCount = 0, over15Count = 0, over25Count = 0;
    const form: number[] = [];
    
    matches.forEach((m, i) => {
      const isHome = m.homeTeamId === teamId;
      const tg = isHome ? (m.homeGoals || 0) : (m.awayGoals || 0);
      const og = isHome ? (m.awayGoals || 0) : (m.homeGoals || 0);
      
      if (i < 5) form.push(tg > og ? 3 : tg === og ? 1 : 0);
      goalsScored += tg; goalsConceded += og;
      if (og === 0) cleanSheets++;
      if (tg > 0 && og > 0) bttsCount++;
      if (tg + og > 1.5) over15Count++;
      if (tg + og > 2.5) over25Count++;
    });
    
    return {
      recentForm: form,
      avgGoalsScored: goalsScored / matches.length,
      avgGoalsConceded: goalsConceded / matches.length,
      cleanSheets,
      bttsRate: bttsCount / matches.length,
      over15Rate: over15Count / matches.length,
      over25Rate: over25Count / matches.length,
    };
  } catch (error: any) {
    console.error('[API] Error in getTeamStats:', error?.message || error);
    return null;
  }
}
