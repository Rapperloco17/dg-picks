import { syncMatchesToDatabase } from '@/services/railway-sync';
import { trainAndSaveModel } from '@/services/ml-trainer';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  // Verificar autorización
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await syncMatchesToDatabase();
    
    // Re-entrenar modelo con datos nuevos
    await trainAndSaveModel();

    return Response.json({
      success: true,
      ...result,
      modelRetrained: true,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// Para verificar estado (GET público)
export async function GET() {
  return Response.json({
    status: 'ok',
    message: 'Use POST with Bearer token to trigger sync',
  });
}
