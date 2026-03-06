import { prisma } from '@/lib/prisma';
import { HistoricalMatch } from '@/types';

export async function saveMatches(matches: HistoricalMatch[]) {
  const operations = matches.map(match => {
    const homeStats = match.estadisticas?.find((s: any) => s.team?.id === match.teams.home.id)?.statistics || [];
    const awayStats = match.estadisticas?.find((s: any) => s.team?.id === match.teams.away.id)?.statistics || [];
    
    const getStat = (stats: any[], type: string) => {
      const stat = stats.find((s: any) => s.type === type);
      return stat?.value ? parseInt(stat.value) || 0 : 0;
    };
    
    const getPossession = (stats: any[]) => {
      const stat = stats.find((s: any) => s.type === 'Ball Possession');
      return stat?.value ? parseInt(stat.value.replace('%', '')) || 50 : 50;
    };

    return prisma.match.upsert({
      where: { fixtureId: match.fixture.id },
      update: {
        status: match.fixture.status.short,
        homeGoals: match.goals.home ?? undefined,
        awayGoals: match.goals.away ?? undefined,
        homeScoreFT: match.score?.fulltime?.home ?? undefined,
        awayScoreFT: match.score?.fulltime?.away ?? undefined,
        homeCorners: match.corners?.home ?? getStat(homeStats, 'Corner Kicks'),
        awayCorners: match.corners?.away ?? getStat(awayStats, 'Corner Kicks'),
        homeYellowCards: match.cards?.home?.yellow ?? 0,
        awayYellowCards: match.cards?.away?.yellow ?? 0,
        homeRedCards: match.cards?.home?.red ?? 0,
        awayRedCards: match.cards?.away?.red ?? 0,
        homePossession: match.possession?.home ?? getPossession(homeStats),
        awayPossession: match.possession?.away ?? getPossession(awayStats),
        homeShots: match.shots?.home?.total ?? getStat(homeStats, 'Total Shots'),
        awayShots: match.shots?.away?.total ?? getStat(awayStats, 'Total Shots'),
        homeShotsOnTarget: match.shots?.home?.on ?? getStat(homeStats, 'Shots on Goal'),
        awayShotsOnTarget: match.shots?.away?.on ?? getStat(awayStats, 'Shots on Goal'),
        rawData: match as any,
      },
      create: {
        fixtureId: match.fixture.id,
        leagueId: match.league.id,
        leagueName: match.league.name,
        season: match.league.season,
        round: match.league.round,
        date: new Date(match.fixture.date),
        timestamp: match.fixture.timestamp,
        timezone: match.fixture.timezone,
        status: match.fixture.status.short,
        homeTeamId: match.teams.home.id,
        homeTeamName: match.teams.home.name,
        awayTeamId: match.teams.away.id,
        awayTeamName: match.teams.away.name,
        homeGoals: match.goals.home ?? undefined,
        awayGoals: match.goals.away ?? undefined,
        homeScoreHT: match.score?.halftime?.home ?? undefined,
        awayScoreHT: match.score?.halftime?.away ?? undefined,
        homeScoreFT: match.score?.fulltime?.home ?? undefined,
        awayScoreFT: match.score?.fulltime?.away ?? undefined,
        homeScoreET: match.score?.extratime?.home ?? undefined,
        awayScoreET: match.score?.extratime?.away ?? undefined,
        homeScoreP: match.score?.penalty?.home ?? undefined,
        awayScoreP: match.score?.penalty?.away ?? undefined,
        homeCorners: match.corners?.home ?? getStat(homeStats, 'Corner Kicks'),
        awayCorners: match.corners?.away ?? getStat(awayStats, 'Corner Kicks'),
        homeYellowCards: match.cards?.home?.yellow ?? 0,
        awayYellowCards: match.cards?.away?.yellow ?? 0,
        homeRedCards: match.cards?.home?.red ?? 0,
        awayRedCards: match.cards?.away?.red ?? 0,
        homePossession: match.possession?.home ?? getPossession(homeStats),
        awayPossession: match.possession?.away ?? getPossession(awayStats),
        homeShots: match.shots?.home?.total ?? getStat(homeStats, 'Total Shots'),
        awayShots: match.shots?.away?.total ?? getStat(awayStats, 'Total Shots'),
        homeShotsOnTarget: match.shots?.home?.on ?? getStat(homeStats, 'Shots on Goal'),
        awayShotsOnTarget: match.shots?.away?.on ?? getStat(awayStats, 'Shots on Goal'),
        rawData: match as any,
      },
    });
  });

  return await prisma.$transaction(operations, { 
    isolationLevel: 'Serializable',
    maxWait: 60000,
    timeout: 120000 
  });
}

export async function getMatches(filters?: {
  leagueId?: number;
  fromDate?: Date;
  toDate?: Date;
  status?: string;
  teamId?: number;
}): Promise<HistoricalMatch[]> {
  const where: any = {};
  
  if (filters?.leagueId) where.leagueId = filters.leagueId;
  if (filters?.status) where.status = filters.status;
  if (filters?.teamId) {
    where.OR = [
      { homeTeamId: filters.teamId },
      { awayTeamId: filters.teamId },
    ];
  }
  if (filters?.fromDate || filters?.toDate) {
    where.date = {};
    if (filters.fromDate) where.date.gte = filters.fromDate;
    if (filters.toDate) where.date.lte = filters.toDate;
  }

  const matches = await prisma.match.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  return matches.map(m => m.rawData as unknown as HistoricalMatch);
}

export async function getLastSyncDate(): Promise<Date | null> {
  const lastMatch = await prisma.match.findFirst({
    orderBy: { date: 'desc' },
  });
  return lastMatch?.date || null;
}

export async function getMatchCount(): Promise<number> {
  return await prisma.match.count();
}

export async function getExistingFixtureIds(): Promise<Set<number>> {
  const matches = await prisma.match.findMany({
    select: { fixtureId: true },
  });
  return new Set(matches.map(m => m.fixtureId));
}
