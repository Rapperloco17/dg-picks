import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true,
        country: true,
        logo: true,
        season: true,
        tier: true,
      },
      orderBy: [
        { tier: 'asc' },  // Tier 1 primero
        { country: 'asc' },
        { name: 'asc' },
      ],
    });

    // Agrupar por tier
    const byTier = {
      tier1: leagues.filter(l => l.tier === 1),
      tier2: leagues.filter(l => l.tier === 2),
      tier3: leagues.filter(l => l.tier === 3),
    };

    // Agrupar por país
    const byCountry = leagues.reduce((acc: any, league) => {
      const country = league.country || 'Other';
      if (!acc[country]) acc[country] = [];
      acc[country].push(league);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      leagues,
      byTier,
      byCountry,
      count: leagues.length,
      tierCounts: {
        tier1: byTier.tier1.length,
        tier2: byTier.tier2.length,
        tier3: byTier.tier3.length,
      },
    });

  } catch (error: any) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
