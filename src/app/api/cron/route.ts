// Endpoint para cron externo (gratuito) - cron-job.org, easycron, etc.
import { syncMatchesToDatabase } from '@/services/railway-sync';
import { trainAndSaveModel } from '@/services/ml-trainer';

const CRON_SECRET = process.env.CRON_SECRET;

// Este endpoint es llamado por un servicio de cron externo gratuito
export async function GET(request: Request) {
  // Verificar autorización
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  if (authHeader !== `Bearer ${CRON_SECRET}` && token !== CRON_SECRET) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('🕐 Cron job iniciado:', new Date().toISOString());

  try {
    // 1. Sincronizar partidos nuevos
    console.log('📊 Sincronizando partidos...');
    const syncResult = await syncMatchesToDatabase();
    
    // 2. Re-entrenar modelo si hay datos nuevos
    if (syncResult.newMatches > 0) {
      console.log('🤖 Re-entrenando modelo...');
      await trainAndSaveModel();
    }

    console.log('✅ Cron job completado');

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      sync: syncResult,
      modelRetrained: syncResult.newMatches > 0,
    });
  } catch (error) {
    console.error('❌ Cron job falló:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
