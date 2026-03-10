import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // Borrar partidos sin nombres (basura)
    const deleted = await prisma.match.deleteMany({
      where: {
        OR: [
          { homeTeamName: '' },
          { homeTeamName: null },
          { awayTeamName: '' },
          { awayTeamName: null },
        ]
      }
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.count} matches without team names`,
      deleted: deleted.count,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Contar cuántos hay
  const count = await prisma.match.count({
    where: {
      OR: [
        { homeTeamName: '' },
        { homeTeamName: null },
        { awayTeamName: '' },
        { awayTeamName: null },
      ]
    }
  });

  return NextResponse.json({
    message: 'POST to delete matches without team names',
    matchesToDelete: count,
  });
}
