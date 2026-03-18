const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const now = new Date();
  
  // Actualizar todas las fechas a hoy con horas diferentes
  const matches = await prisma.match.findMany();
  
  for (let i = 0; i < matches.length; i++) {
    const newDate = new Date(now);
    newDate.setHours(12 + i * 2, 0, 0, 0); // 12:00, 14:00, 16:00, 18:00, 20:00
    
    await prisma.match.update({
      where: { id: matches[i].id },
      data: { 
        date: newDate,
        timestamp: Math.floor(newDate.getTime() / 1000)
      }
    });
    
    console.log(`✅ ${matches[i].homeTeamName} vs ${matches[i].awayTeamName} -> ${newDate.toLocaleString()}`);
  }
  
  await prisma.$disconnect();
}

fix();
