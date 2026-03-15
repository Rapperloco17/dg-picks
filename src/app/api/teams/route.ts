import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: {
        name: 'asc',
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      teams,
      count: teams.length
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
