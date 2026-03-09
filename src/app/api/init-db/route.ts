import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    console.log('[INIT-DB] Running prisma db push...');
    
    const result = execSync('npx prisma db push --accept-data-loss', {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      output: result
    });

  } catch (error: any) {
    console.error('[INIT-DB] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize database', 
      details: error?.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma');
    const count = await prisma.match.count();
    
    return NextResponse.json({
      initialized: true,
      matchesCount: count,
      message: `Database initialized with ${count} matches`
    });
  } catch (error: any) {
    return NextResponse.json({
      initialized: false,
      message: 'Database not initialized. Run POST to initialize.'
    }, { status: 503 });
  }
}
