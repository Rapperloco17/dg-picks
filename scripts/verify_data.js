const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

console.log('========================================');
console.log('VERIFICACIÓN DE DATOS DISPONIBLES');
console.log('========================================\n');

const seasons = [2024, 2025];
const leagues = [
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78, name: 'Bundesliga' },
  { id: 61, name: 'Ligue 1' },
];

let totalFiles = 0;
let totalMatches = 0;
let dateRanges = [];

for (const league of leagues) {
  console.log(`\n${league.name} (ID: ${league.id}):`);
  console.log('-'.repeat(40));
  
  for (const season of seasons) {
    const filename = path.join(dataDir, `${league.id}_${season}_enriched.json`);
    
    if (fs.existsSync(filename)) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
      const count = data.length;
      
      if (count > 0) {
        const dates = data.map(p => p.fixture.date).sort();
        const firstDate = dates[0].substring(0, 10);
        const lastDate = dates[dates.length - 1].substring(0, 10);
        
        console.log(`  Temporada ${season}: ${count} partidos`);
        console.log(`    Desde: ${firstDate}`);
        console.log(`    Hasta: ${lastDate}`);
        
        totalFiles++;
        totalMatches += count;
        dateRanges.push({ season, firstDate, lastDate });
      }
    } else {
      console.log(`  Temporada ${season}: ❌ No encontrado`);
    }
  }
}

console.log('\n' + '='.repeat(50));
console.log('RESUMEN:');
console.log('='.repeat(50));
console.log(`Total archivos enriquecidos: ${totalFiles}`);
console.log(`Total partidos: ${totalMatches.toLocaleString()}`);

if (dateRanges.length > 0) {
  const allFirstDates = dateRanges.map(d => d.firstDate).sort();
  const allLastDates = dateRanges.map(d => d.lastDate).sort();
  
  console.log(`\nRango total de fechas:`);
  console.log(`  Primera fecha: ${allFirstDates[0]}`);
  console.log(`  Última fecha: ${allLastDates[allLastDates.length - 1]}`);
  
  const now = new Date();
  const lastDate = new Date(allLastDates[allLastDates.length - 1]);
  const monthsAgo = (now - lastDate) / (1000 * 60 * 60 * 24 * 30);
  
  console.log(`\n⚠️  Los datos tienen ${monthsAgo.toFixed(1)} meses de antigüedad`);
  
  if (monthsAgo < 1) {
    console.log('✅ Datos actualizados (menos de 1 mes)');
  } else if (monthsAgo < 3) {
    console.log('⚠️  Datos razonablemente actualizados (1-3 meses)');
  } else {
    console.log('❌ Datos desactualizados (más de 3 meses)');
  }
}

console.log('\n========================================');
console.log('Para cargar estos datos en la app:');
console.log('1. Ve a Admin → ML Training');
console.log('2. Haz clic en "Cargar Todos los Datos"');
console.log('========================================');
