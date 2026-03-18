// Script para sincronizar partidos desde API-Football
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_FOOTBALL_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const TOP_LEAGUES = [
  39,   // Premier League
  140,  // La Liga
  61,   // Ligue 1
  78,   // Bundesliga
  135,  // Serie A
  262,  // Liga MX
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  531,  // Copa Sudamericana
];

async function fetchMatches(date) {
  const url = `${BASE_URL}/fixtures?date=${date}`;
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': API_FOOTBALL_KEY
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.response || [];
}

async function syncMatches(date) {
  console.log(`Sincronizando partidos para: ${date}`);
  
  try {
    const matches = await fetchMatches(date);
    console.log(`Obtenidos ${matches.length} partidos de API-Football`);
    
    // Filtrar solo ligas de interés
    const filtered = matches.filter(m => TOP_LEAGUES.includes(m.league.id));
    console.log(`${filtered.length} partidos en ligas seleccionadas`);
    
    if (filtered.length === 0) {
      return 0;
    }
    
    let created = 0;
    
    for (const match of filtered) {
      try {
        await prisma.match.upsert({
          where: { fixtureId: match.fixture.id },
          update: {
            status: match.fixture.status.short,
            homeGoals: match.goals.home,
            awayGoals: match.goals.away,
            updatedAt: new Date()
          },
          create: {
            fixtureId: match.fixture.id,
            leagueId: match.league.id,
            leagueName: match.league.name,
            season: match.league.season,
            round: match.league.round,
            date: new Date(match.fixture.date),
            timestamp: match.fixture.timestamp,
            timezone: match.fixture.timezone,
            status: match.fixture.status.short,
            homeTeamId: match.teams.home.id,
            homeTeamName: match.teams.home.name,
            awayTeamId: match.teams.away.id,
            awayTeamName: match.teams.away.name,
            homeGoals: match.goals.home,
            awayGoals: match.goals.away,
            rawData: match
          }
        });
        created++;
      } catch (e) {
        console.error(`Error guardando partido ${match.fixture.id}:`, e.message);
      }
    }
    
    console.log(`Sincronización completada: ${created} partidos guardados`);
    return created;
  } catch (error) {
    console.error('Error en sincronización:', error.message);
    return 0;
  }
}

async function main() {
  // Buscar partidos para varios días (hoy y próximos 3 días)
  const today = new Date();
  let totalCreated = 0;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const created = await syncMatches(dateStr);
    totalCreated += created;
    
    // Pequeña pausa para no saturar la API
    if (i < 6) await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\nTotal: ${totalCreated} partidos sincronizados`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
