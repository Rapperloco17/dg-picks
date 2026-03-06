// Script de backup de la base de datos
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('💾 Iniciando backup...\n');

  // Backup de partidos (últimos 1000 para no saturar)
  const matches = await prisma.match.findMany({
    take: 1000,
    orderBy: { date: 'desc' },
    select: {
      fixtureId: true,
      leagueId: true,
      leagueName: true,
      season: true,
      date: true,
      status: true,
      homeTeamName: true,
      awayTeamName: true,
      homeGoals: true,
      awayGoals: true,
      homeCorners: true,
      awayCorners: true,
      homeYellowCards: true,
      awayYellowCards: true,
      rawData: true,
    }
  });

  const backupData = {
    timestamp: new Date().toISOString(),
    totalMatches: await prisma.match.count(),
    matches: matches,
    modelStats: await prisma.modelStats.findMany(),
    syncLogs: await prisma.syncLog.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' }
    }),
  };

  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
  
  const stats = fs.statSync(filepath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log('✅ Backup completado:');
  console.log(`   Archivo: ${filename}`);
  console.log(`   Tamaño: ${sizeMB} MB`);
  console.log(`   Partidos: ${matches.length}`);
  console.log(`   Total en DB: ${backupData.totalMatches}`);

  // Limpiar backups viejos (mantener últimos 5)
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 5) {
    files.slice(5).forEach(f => {
      fs.unlinkSync(f.path);
      console.log(`🗑️  Borrado backup viejo: ${f.name}`);
    });
  }

  await prisma.$disconnect();
}

backup().catch(console.error);
