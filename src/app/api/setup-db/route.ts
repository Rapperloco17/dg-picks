import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        error: 'DATABASE_URL not set',
        env: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('POSTGRES'))
      }, { status: 500 });
    }

    console.log('[SETUP-DB] Checking database connection...');
    
    // Test connection
    await prisma.$connect();
    
    // Check if Match table exists by trying to count
    let count = 0;
    try {
      count = await prisma.match.count();
      return NextResponse.json({
        success: true,
        message: 'Database already initialized',
        matchesCount: count
      });
    } catch (e: any) {
      // Table doesn't exist, need to create schema
      console.log('[SETUP-DB] Tables not found, schema needs to be created');
      return NextResponse.json({
        success: false,
        message: 'Tables not found. Run prisma db push locally or in Railway shell.',
        error: e?.message,
        databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set'
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error('[SETUP-DB] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to connect to database', 
      details: error?.message,
      databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
