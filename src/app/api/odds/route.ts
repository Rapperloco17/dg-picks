import { NextRequest, NextResponse } from 'next/server';
import { makeRequest } from '@/services/api-football';

/**
 * GET ODDS - Live or Pre-match
 * Query params:
 * - fixture: fixture ID (required)
 * - type: 'live' | 'prematch' (default: prematch)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fixtureId = searchParams.get('fixture');
    const type = searchParams.get('type') || 'prematch';

    if (!fixtureId) {
      return NextResponse.json({ error: 'Fixture ID required' }, { status: 400 });
    }

    const endpoint = type === 'live' ? '/odds/live' : '/odds';
    const params: any = { fixture: fixtureId };
    
    // Para prematch, traer más bookmakers
    if (type === 'prematch') {
      params.bookmaker = '1,2,3,4,5,6,8,9,10'; // Bet365, Betfair, etc
    }

    const data: any = await makeRequest({ endpoint, params });

    if (!data.response || data.response.length === 0) {
      return NextResponse.json({ 
        success: true, 
        odds: null,
        message: 'No odds available for this match'
      });
    }

    // Procesar odds de diferentes bookmakers
    const oddsByBookmaker = data.response.map((bookmaker: any) => {
      const matchWinner = bookmaker.bets?.find((b: any) => 
        b.name === 'Match Winner' || b.id === 1
      );
      
      const overUnder = bookmaker.bets?.find((b: any) => 
        b.name === 'Over/Under' || b.id === 5
      );
      
      const btts = bookmaker.bets?.find((b: any) => 
        b.name === 'Both Teams Score' || b.id === 8
      );

      return {
        bookmaker: {
          id: bookmaker.bookmaker.id,
          name: bookmaker.bookmaker.name,
          logo: bookmaker.bookmaker.logo,
        },
        matchWinner: matchWinner ? {
          home: parseFloat(matchWinner.values.find((v: any) => v.value === 'Home' || v.value === '1')?.odd || '0'),
          draw: parseFloat(matchWinner.values.find((v: any) => v.value === 'Draw' || v.value === 'X')?.odd || '0'),
          away: parseFloat(matchWinner.values.find((v: any) => v.value === 'Away' || v.value === '2')?.odd || '0'),
        } : null,
        overUnder: overUnder ? overUnder.values.map((v: any) => ({
          line: v.value,
          odd: parseFloat(v.odd),
        })) : null,
        btts: btts ? {
          yes: parseFloat(btts.values.find((v: any) => v.value === 'Yes')?.odd || '0'),
          no: parseFloat(btts.values.find((v: any) => v.value === 'No')?.odd || '0'),
        } : null,
        updated: bookmaker.update,
      };
    });

    // Calcular odds promedio
    const avgOdds = calculateAverageOdds(oddsByBookmaker);

    return NextResponse.json({
      success: true,
      fixture: fixtureId,
      type,
      odds: {
        byBookmaker: oddsByBookmaker.slice(0, 5), // Top 5 bookmakers
        average: avgOdds,
      },
    });

  } catch (error: any) {
    console.error('Error fetching odds:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

function calculateAverageOdds(oddsByBookmaker: any[]) {
  const homes: number[] = [];
  const draws: number[] = [];
  const aways: number[] = [];

  oddsByBookmaker.forEach(bm => {
    if (bm.matchWinner?.home > 1) homes.push(bm.matchWinner.home);
    if (bm.matchWinner?.draw > 1) draws.push(bm.matchWinner.draw);
    if (bm.matchWinner?.away > 1) aways.push(bm.matchWinner.away);
  });

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    home: avg(homes),
    draw: avg(draws),
    away: avg(aways),
    bookmakersCount: oddsByBookmaker.length,
  };
}
