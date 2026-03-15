import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const leagues = await prisma.league.findMany({
      orderBy: [
        { country: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      leagues,
      count: leagues.length
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
