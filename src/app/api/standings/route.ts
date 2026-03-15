import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json({ 
        error: 'leagueId is required' 
      }, { status: 400 });
    }

    const league = await prisma.league.findUnique({
      where: { id: parseInt(leagueId) }
    });

    if (!league) {
      return NextResponse.json({ 
        error: 'League not found' 
      }, { status: 404 });
    }

    const standings = await prisma.standing.findMany({
      where: { 
        leagueId: parseInt(leagueId),
        season: league.season
      },
      include: {
        team: true,
      },
      orderBy: {
        rank: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      standings,
      league,
      count: standings.length
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
