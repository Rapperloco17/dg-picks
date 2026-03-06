import { prisma } from '@/lib/prisma';
import { getMatchCount, getLastSyncDate } from '@/services/db-service';

export async function GET() {
  try {
    const [totalMatches, lastSync, recentLogs] = await Promise.all([
      getMatchCount(),
      getLastSyncDate(),
      prisma.syncLog.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    const daysSinceSync = lastSync 
      ? Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return Response.json({
      success: true,
      totalMatches,
      lastSync: lastSync?.toISOString(),
      daysSinceSync,
      recentLogs: recentLogs.map(log => ({
        ...log,
        startedAt: log.startedAt.toISOString(),
        endedAt: log.endedAt?.toISOString(),
      })),
    });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
