import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('[CLEANUP] Borrando partidos sin nombres...');
    
    // Contar antes
    const antes = await prisma.match.count();
    
    // Borrar partidos sin nombres
    const deleted = await prisma.match.deleteMany({
      where: {
        OR: [
          { homeTeamName: '' },
          { homeTeamName: null },
        ]
      }
    });
    
    // Contar después
    const despues = await prisma.match.count();
    
    console.log(`[CLEANUP] ✓ ${deleted.count} partidos borrados`);
    
    return NextResponse.json({
      success: true,
      message: 'Limpieza completada',
      stats: {
        antes,
        despues,
        borrados: deleted.count
      }
    });
    
  } catch (error: any) {
    console.error('[CLEANUP] Error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  const sinNombres = await prisma.match.count({
    where: {
      OR: [
        { homeTeamName: '' },
        { homeTeamName: null },
      ]
    }
  });
  
  const conNombres = await prisma.match.count({
    where: {
      homeTeamName: { not: '', not: null }
    }
  });
  
  return NextResponse.json({
    message: 'POST para borrar partidos sin nombres',
    stats: {
      sinNombres,
      conNombres,
      total: sinNombres + conNombres
    }
  });
}
