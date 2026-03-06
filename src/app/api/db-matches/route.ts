import { NextRequest } from 'next/server';
import { getMatches, getMatchCount } from '@/services/db-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      leagueId: searchParams.get('leagueId') ? parseInt(searchParams.get('leagueId')!) : undefined,
      teamId: searchParams.get('teamId') ? parseInt(searchParams.get('teamId')!) : undefined,
      status: searchParams.get('status') || undefined,
      fromDate: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      toDate: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
    };

    const matches = await getMatches(filters);
    const count = await getMatchCount();

    return Response.json({
      success: true,
      total: count,
      filtered: matches.length,
      matches,
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
