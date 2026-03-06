// Script para descargar datos de temporadas 2024, 2025 y 2026
// Uso: node scripts/download-seasons.js

const fs = require('fs');
const path = require('path');

// Configuración
const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || '178b66e41ba9d4d3b8549f096ef1e377';
const API_URL = 'https://v3.football.api-sports.io';
const DATA_DIR = path.join(__dirname, '..', 'data');
const DELAY_MS = 6500; // 6.5 segundos entre llamadas (límite de API)

// Lista de las 58 ligas
const LEAGUES = [
  1, 2, 3, 4, 9, 11, 13, 16, 39, 40, 45, 61, 62, 71, 72, 73, 78, 79, 88, 94,
  103, 106, 113, 118, 119, 128, 129, 130, 135, 136, 137, 140, 141, 143, 144,
  162, 164, 169, 172, 173, 179, 180, 181, 182, 184, 186, 188, 197, 210, 218,
  239, 242, 244, 262, 263, 265, 266, 268
];

const SEASONS = [2024, 2025, 2026];

// Función para esperar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función para llamar a la API
async function fetchFixtures(leagueId, season) {
  const url = new URL(`${API_URL}/fixtures`);
  url.searchParams.append('league', leagueId);
  url.searchParams.append('season', season);
  url.searchParams.append('status', 'FT'); // Solo partidos terminados

  console.log(`[API] Descargando liga ${leagueId}, temporada ${season}...`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.warn(`[API] Errores para liga ${leagueId}, temporada ${season}:`, data.errors);
    }

    return data.response || [];
  } catch (error) {
    console.error(`[API] Error descargando liga ${leagueId}, temporada ${season}:`, error.message);
    return [];
  }
}

// Función para guardar datos
function saveFixtures(leagueId, season, fixtures) {
  if (!fixtures || fixtures.length === 0) {
    console.log(`[Save] No hay datos para liga ${leagueId}, temporada ${season}`);
    return false;
  }

  // Guardar con nombre: {liga}_{temporada}.json
  const filename = path.join(DATA_DIR, `${leagueId}_${season}.json`);
  
  fs.writeFileSync(filename, JSON.stringify(fixtures, null, 2));
  console.log(`[Save] Guardados ${fixtures.length} partidos en ${path.basename(filename)}`);
  return true;
}

// Función principal
async function main() {
  console.log('========================================');
  console.log('Descargador de Temporadas 2024-2026');
  console.log('========================================');
  console.log(`Total ligas: ${LEAGUES.length}`);
  console.log(`Temporadas: ${SEASONS.join(', ')}`);
  console.log(`Total descargas: ${LEAGUES.length * SEASONS.length}`);
  console.log(`Tiempo estimado: ${Math.ceil((LEAGUES.length * SEASONS.length * DELAY_MS) / 60000)} minutos`);
  console.log('========================================\n');

  // Asegurar que el directorio existe
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let totalDownloaded = 0;
  let totalMatches = 0;
  let errors = [];

  // Descargar cada liga y temporada
  for (const leagueId of LEAGUES) {
    for (const season of SEASONS) {
      try {
        const fixtures = await fetchFixtures(leagueId, season);
        
        if (fixtures.length > 0) {
          saveFixtures(leagueId, season, fixtures);
          totalDownloaded++;
          totalMatches += fixtures.length;
        } else {
          console.log(`[Skip] Liga ${leagueId}, temporada ${season}: sin datos`);
        }
      } catch (error) {
        console.error(`[Error] Liga ${leagueId}, temporada ${season}:`, error.message);
        errors.push({ leagueId, season, error: error.message });
      }

      // Esperar antes de la siguiente llamada (rate limiting)
      console.log(`[Rate Limit] Esperando ${DELAY_MS}ms...\n`);
      await sleep(DELAY_MS);
    }
  }

  // Resumen
  console.log('\n========================================');
  console.log('RESUMEN');
  console.log('========================================');
  console.log(`Archivos descargados: ${totalDownloaded}`);
  console.log(`Total partidos: ${totalMatches}`);
  console.log(`Errores: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nErrores:');
    errors.forEach(e => console.log(`  - Liga ${e.leagueId}, Temporada ${e.season}: ${e.error}`));
  }
  
  // Guardar resumen
  const summaryFile = path.join(DATA_DIR, 'download-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify({
    date: new Date().toISOString(),
    totalDownloaded,
    totalMatches,
    errors,
    leagues: LEAGUES,
    seasons: SEASONS
  }, null, 2));
  console.log(`\nResumen guardado en: ${summaryFile}`);
}

// Ejecutar
main().catch(console.error);
