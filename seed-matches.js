// Seed data para probar el dashboard
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mockMatches = [
  {
    fixtureId: 100001,
    leagueId: 39,
    leagueName: 'Premier League',
    season: 2024,
    date: new Date(), // Hoy
    timestamp: Math.floor(Date.now() / 1000),
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 33,
    homeTeamName: 'Manchester United',
    awayTeamId: 34,
    awayTeamName: 'Newcastle',
    homeGoals: null,
    awayGoals: null,
    rawData: {}
  },
  {
    fixtureId: 100002,
    leagueId: 140,
    leagueName: 'La Liga',
    season: 2024,
    date: new Date(Date.now() + 2 * 60 * 60 * 1000), // En 2 horas
    timestamp: Math.floor(Date.now() / 1000) + 7200,
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 529,
    homeTeamName: 'Barcelona',
    awayTeamId: 530,
    awayTeamName: 'Atletico Madrid',
    homeGoals: null,
    awayGoals: null,
    rawData: {}
  },
  {
    fixtureId: 100003,
    leagueId: 135,
    leagueName: 'Serie A',
    season: 2024,
    date: new Date(Date.now() + 4 * 60 * 60 * 1000), // En 4 horas
    timestamp: Math.floor(Date.now() / 1000) + 14400,
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 489,
    homeTeamName: 'AC Milan',
    awayTeamId: 492,
    awayTeamName: 'Napoli',
    homeGoals: null,
    awayGoals: null,
    rawData: {}
  },
  {
    fixtureId: 100004,
    leagueId: 78,
    leagueName: 'Bundesliga',
    season: 2024,
    date: new Date(Date.now() + 6 * 60 * 60 * 1000), // En 6 horas
    timestamp: Math.floor(Date.now() / 1000) + 21600,
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 157,
    homeTeamName: 'Bayern Munich',
    awayTeamId: 165,
    awayTeamName: 'Borussia Dortmund',
    homeGoals: null,
    awayGoals: null,
    rawData: {}
  },
  {
    fixtureId: 100005,
    leagueId: 262,
    leagueName: 'Liga MX',
    season: 2024,
    date: new Date(Date.now() + 8 * 60 * 60 * 1000), // En 8 horas
    timestamp: Math.floor(Date.now() / 1000) + 28800,
    timezone: 'UTC',
    status: 'SCHEDULED',
    homeTeamId: 2282,
    homeTeamName: 'Club America',
    awayTeamId: 2283,
    awayTeamName: 'Chivas',
    homeGoals: null,
    awayGoals: null,
    rawData: {}
  }
];

async function seed() {
  console.log('Creando partidos de prueba...\n');
  
  for (const match of mockMatches) {
    try {
      const created = await prisma.match.upsert({
        where: { fixtureId: match.fixtureId },
        update: match,
        create: match
      });
      console.log(`✅ ${created.homeTeamName} vs ${created.awayTeamName}`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
  
  const count = await prisma.match.count();
  console.log(`\nTotal partidos en BD: ${count}`);
  
  await prisma.$disconnect();
}

seed();
