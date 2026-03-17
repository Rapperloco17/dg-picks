import { NextRequest, NextResponse } from 'next/server';
import { SharpBetService } from '@/services/sharbet';

/**
 * GET /api/sharbet/picks
 * Obtiene los picks de valor disponibles
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const picks = await SharpBetService.getTodaysPicks({
      minEdge: parseFloat(searchParams.get('minEdge') || '0.05'),
      market: searchParams.get('market') || undefined,
      isSharp: searchParams.get('isSharp') === 'true',
      limit: parseInt(searchParams.get('limit') || '20')
    });

    return NextResponse.json({ 
      picks,
      count: picks.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sharp picks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch picks' },
      { status: 500 }
    );
  }
}
