const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || 'TU_API_KEY_AQUI';
const API_BASE = 'https://v3.football.api-sports.io';
const DELAY_MS = 80; // 750 req/min

async function updateMatches() {
  console.log('🔍 Buscando partidos sin nombres...');
  
  const count = await prisma.match.count({
    where: {
      OR: [
        { homeTeamName: '' },
        { homeTeamName: null },
      ]
    }
  });
  
  console.log(`📊 ${count} partidos sin nombres encontrados`);
  console.log(`⏱️  Tiempo estimado: ${Math.ceil(count * DELAY_MS / 60000)} minutos`);
  
  let processed = 0;
  let updated = 0;
  let failed = 0;
  
  while (true) {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { homeTeamName: '' },
          { homeTeamName: null },
        ]
      },
      take: 100,
      orderBy: { date: 'desc' },
    });
    
    if (matches.length === 0) {
      console.log('✅ ¡Todos los partidos han sido actualizados!');
      break;
    }
    
    for (const match of matches) {
      try {
        const res = await fetch(`${API_BASE}/fixtures?id=${match.fixtureId}`, {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io',
          },
        });
        
        if (!res.ok) {
          failed++;
          continue;
        }
        
        const data = await res.json();
        
        if (data.response && data.response.length > 0) {
          const fixture = data.response[0];
          
          await prisma.match.update({
            where: { id: match.id },
            data: {
              homeTeamName: fixture.teams.home.name,
              awayTeamName: fixture.teams.away.name,
              leagueName: fixture.league.name,
              status: fixture.fixture.status.short,
              homeGoals: fixture.goals.home,
              awayGoals: fixture.goals.away,
              date: new Date(fixture.fixture.date),
            },
          });
          updated++;
        } else {
          failed++;
        }
        
        processed++;
        
        if (processed % 10 === 0) {
          console.log(`📈 Progreso: ${processed}/${count} | ✅ ${updated} | ❌ ${failed}`);
        }
        
        await new Promise(r => setTimeout(r, DELAY_MS));
        
      } catch (err) {
        failed++;
        console.error(`Error en fixture ${match.fixtureId}:`, err.message);
      }
    }
  }
  
  console.log('\n📊 RESUMEN FINAL:');
  console.log(`✅ Actualizados: ${updated}`);
  console.log(`❌ Fallidos: ${failed}`);
  console.log(`📦 Total procesados: ${processed}`);
  
  await prisma.$disconnect();
}

updateMatches().catch(console.error);
