import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('[RESET-DB] Iniciando borrado de todas las tablas...');
    
    // Borrar en orden correcto (dependencias)
    await prisma.$executeRaw`DELETE FROM "SyncLog"`;
    await prisma.$executeRaw`DELETE FROM "ModelStats"`;
    await prisma.$executeRaw`DELETE FROM "Match"`;
    
    console.log('[RESET-DB] ✓ Todas las tablas vaciadas');
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos reseteada. Todas las tablas están vacías.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[RESET-DB] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      hint: 'Si hay error de foreign keys, intenta reiniciar el servicio de Postgres'
    }, { status: 500 });
  }
}

export async function GET() {
  const matchCount = await prisma.match.count();
  
  return NextResponse.json({
    message: 'POST para borrar TODOS los datos y empezar de cero',
    currentData: {
      matches: matchCount
    },
    warning: '⚠️ Esto borrará TODO irreversiblemente'
  });
}
