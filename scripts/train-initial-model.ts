// Script para entrenar modelo inicial con datos de la base de datos
import { prisma } from '@/lib/prisma';
import { trainAndSaveModel } from '@/services/ml-trainer';
import { getMatches } from '@/services/db-service';

async function trainInitialModel() {
  console.log('🤖 Entrenando modelo inicial...\n');

  // Verificar que hay datos suficientes
  const count = await prisma.match.count();
  console.log(`📊 Partidos en base de datos: ${count.toLocaleString()}`);

  if (count < 1000) {
    console.error('❌ Error: Se necesitan al menos 1000 partidos para entrenar');
    console.log('   Ejecuta primero: npm run db:seed');
    process.exit(1);
  }

  // Verificar que hay partidos finalizados
  const finishedCount = await prisma.match.count({
    where: { status: 'FT' }
  });
  console.log(`   Partidos finalizados (FT): ${finishedCount.toLocaleString()}`);

  if (finishedCount < 1000) {
    console.error('❌ Error: Se necesitan al menos 1000 partidos finalizados');
    process.exit(1);
  }

  // Cargar partidos para entrenar (últimos 5000)
  console.log('\n📥 Cargando datos de entrenamiento...');
  const matches = await getMatches({ status: 'FT' });
  
  // Tomar solo los últimos 5000 para no saturar memoria
  const recentMatches = matches.slice(0, 5000);
  console.log(`   Usando ${recentMatches.length} partidos recientes`);

  // Entrenar modelo
  console.log('\n🧠 Iniciando entrenamiento...');
  console.log('   Esto puede tomar 2-5 minutos...\n');

  const startTime = Date.now();

  try {
    const model = await trainAndSaveModel();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n✅ Modelo entrenado exitosamente!');
    console.log(`   Tiempo: ${duration}s`);
    console.log(`   Accuracy: ${model.metrics.accuracy.toFixed(2)}%`);
    console.log(`   Muestras: ${model.metrics.trainingSamples + model.metrics.testSamples}`);
    console.log(`   Versión: ${model.version}`);

    // Guardar en base de datos
    await prisma.modelStats.create({
      data: {
        version: 'initial-v1.0',
        matchesCount: model.metrics.trainingSamples + model.metrics.testSamples,
        accuracy: model.metrics.accuracy,
        rmse: model.metrics.loss,
        features: model.featureImportance as any,
        weights: {},
      }
    });

    console.log('\n💾 Modelo guardado en base de datos');

  } catch (error) {
    console.error('\n❌ Error entrenando modelo:', error);
    process.exit(1);
  }

  await prisma.$disconnect();
}

trainInitialModel().catch(console.error);
