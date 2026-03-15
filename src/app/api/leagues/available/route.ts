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
      },
      orderBy: [
        { country: 'asc' },
        { name: 'asc' },
      ],
    });

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
      byCountry,
      count: leagues.length,
    });

  } catch (error: any) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
