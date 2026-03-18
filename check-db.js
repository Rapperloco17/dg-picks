const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  console.log('Rango:', start.toISOString(), 'a', end.toISOString());
  
  const count = await prisma.match.count({
    where: { date: { gte: start, lte: end } }
  });
  
  console.log('Partidos hoy:', count);
  
  const all = await prisma.match.count();
  console.log('Total partidos:', all);
  
  // Ver algunos partidos
  if (all > 0) {
    const some = await prisma.match.findMany({ 
      take: 3, 
      select: { homeTeamName: true, awayTeamName: true, date: true } 
    });
    console.log('Ejemplo:', JSON.stringify(some, null, 2));
  } else {
    console.log('No hay partidos en la base de datos');
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
