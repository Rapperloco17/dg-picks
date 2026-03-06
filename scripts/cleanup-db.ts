// Script para limpiar datos viejos y optimizar espacio
import { prisma } from '@/lib/prisma';

async function cleanup() {
  console.log('🧹 Limpiando base de datos...\n');

  // 1. Borrar logs de sync antiguos (más de 30 días)
  const oldLogs = await prisma.syncLog.deleteMany({
    where: {
      startedAt: {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  });
  console.log(`🗑️  Logs borrados: ${oldLogs.count}`);

  // 2. Borrar modelos viejos (mantener solo últimos 5)
  const modelsToDelete = await prisma.modelStats.findMany({
    orderBy: { trainedAt: 'desc' },
    skip: 5,
    select: { id: true }
  });
  
  if (modelsToDelete.length > 0) {
    const deletedModels = await prisma.modelStats.deleteMany({
      where: {
        id: { in: modelsToDelete.map(m => m.id) }
      }
    });
    console.log(`🗑️  Modelos borrados: ${deletedModels.count}`);
  }

  // 3. Estadísticas
  const matchCount = await prisma.match.count();
  const logCount = await prisma.syncLog.count();
  const modelCount = await prisma.modelStats.count();

  console.log('\n📊 Estado actual:');
  console.log(`   Partidos: ${matchCount.toLocaleString()}`);
  console.log(`   Logs: ${logCount}`);
  console.log(`   Modelos: ${modelCount}`);

  await prisma.$disconnect();
  console.log('\n✅ Limpieza completada');
}

cleanup().catch(console.error);
