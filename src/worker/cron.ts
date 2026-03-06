import { runDailySync } from '@/services/railway-sync';
import { trainAndSaveModel } from '@/services/ml-trainer';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Worker Premium para Railway - corre 24/7
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     🚀 DG Picks Premium Worker v2.0            ║');
  console.log('║     Running on Railway with dedicated resources ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log();
  console.log('⏰ Schedule: Daily sync at 06:00 UTC');
  console.log('🧠 Auto ML retraining enabled');
  console.log('💾 Auto backup at 04:00 UTC');
  console.log();

  // Verificar conexión a base de datos
  try {
    await prisma.$connect();
    const count = await prisma.match.count();
    console.log(`✅ Database connected: ${count.toLocaleString()} matches`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Hacer sync inmediatamente al iniciar (solo si no hay datos recientes)
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { startedAt: 'desc' }
  });

  const hoursSinceLastSync = lastSync 
    ? (Date.now() - new Date(lastSync.startedAt).getTime()) / (1000 * 60 * 60)
    : 999;

  if (hoursSinceLastSync > 12) {
    console.log('📊 Running initial sync (last sync > 12 hours ago)...');
    try {
      await runDailyAndRetrain();
    } catch (error) {
      console.error('❌ Initial sync failed:', error);
    }
  } else {
    console.log(`✅ Recent sync found (${Math.round(hoursSinceLastSync)}h ago), skipping initial`);
  }

  // Programar tareas
  scheduleTasks();
  
  console.log('\n✨ Worker is running. Press Ctrl+C to stop.\n');
}

function scheduleTasks() {
  const now = new Date();
  
  // Sync diario a las 6 AM UTC
  const syncTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0));
  if (syncTime <= now) syncTime.setUTCDate(syncTime.getUTCDate() + 1);
  
  const msUntilSync = syncTime.getTime() - now.getTime();
  
  console.log(`📅 Next tasks scheduled:`);
  console.log(`   • Daily sync: ${syncTime.toISOString()} (in ${Math.round(msUntilSync / 1000 / 60)} min)`);
  
  setTimeout(async () => {
    await runDailyAndRetrain();
    // Repetir cada 24 horas
    setInterval(runDailyAndRetrain, 24 * 60 * 60 * 1000);
  }, msUntilSync);

  // Backup diario a las 4 AM UTC
  const backupTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 0, 0));
  if (backupTime <= now) backupTime.setUTCDate(backupTime.getUTCDate() + 1);
  
  const msUntilBackup = backupTime.getTime() - now.getTime();
  
  console.log(`   • Daily backup: ${backupTime.toISOString()} (in ${Math.round(msUntilBackup / 1000 / 60)} min)`);
  
  setTimeout(async () => {
    await runBackup();
    // Repetir cada 24 horas
    setInterval(runBackup, 24 * 60 * 60 * 1000);
  }, msUntilBackup);

  // Limpieza semanal (domingos a las 3 AM UTC)
  const cleanupTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0));
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  cleanupTime.setUTCDate(cleanupTime.getUTCDate() + daysUntilSunday);
  
  const msUntilCleanup = cleanupTime.getTime() - now.getTime();
  
  console.log(`   • Weekly cleanup: ${cleanupTime.toISOString()} (in ${Math.round(msUntilCleanup / 1000 / 60 / 60)}h)`);
  
  setTimeout(async () => {
    await runCleanup();
    // Repetir cada 7 días
    setInterval(runCleanup, 7 * 24 * 60 * 60 * 1000);
  }, msUntilCleanup);
}

async function runDailyAndRetrain() {
  const startTime = Date.now();
  console.log(`\n🕐 [${new Date().toISOString()}] Starting daily sync...`);
  
  try {
    const result = await runDailySync();
    console.log(`   ✅ Sync completed: ${result.newMatches} new matches`);
    
    // Re-entrenar solo si hay datos nuevos o no hay modelo
    if (result.newMatches > 0 || !(await hasRecentModel())) {
      console.log('   🤖 Retraining ML model...');
      await trainAndSaveModel();
      console.log('   ✅ Model retrained successfully');
    } else {
      console.log('   ⏭️  Skipping retrain (no new data)');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ⏱️  Total time: ${duration}s\n`);
    
  } catch (error) {
    console.error(`   ❌ Daily sync failed:`, error);
  }
}

async function runBackup() {
  console.log(`\n💾 [${new Date().toISOString()}] Starting backup...`);
  
  try {
    await execAsync('npm run db:backup');
    console.log('   ✅ Backup completed\n');
  } catch (error) {
    console.error('   ❌ Backup failed:', error);
  }
}

async function runCleanup() {
  console.log(`\n🧹 [${new Date().toISOString()}] Starting cleanup...`);
  
  try {
    await execAsync('npm run db:cleanup');
    console.log('   ✅ Cleanup completed\n');
  } catch (error) {
    console.error('   ❌ Cleanup failed:', error);
  }
}

async function hasRecentModel(): Promise<boolean> {
  const recentModel = await prisma.modelStats.findFirst({
    orderBy: { trainedAt: 'desc' }
  });
  
  if (!recentModel) return false;
  
  const hoursSinceTrain = (Date.now() - new Date(recentModel.trainedAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceTrain < 24; // Modelo de menos de 24h
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(console.error);
