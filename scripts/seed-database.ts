import { prisma } from '@/lib/prisma';
import { saveMatches } from '@/services/db-service';
import fs from 'fs';
import path from 'path';
import { HistoricalMatch } from '@/types';

const LEAGUE_FILES = [
  1, 2, 3, 4, 9, 11, 13, 16, 39, 40, 45, 61, 62, 71, 72, 73, 78, 79, 
  88, 94, 103, 106, 113, 118, 119, 128, 129, 130, 135, 136, 137, 140, 
  141, 143, 144, 162, 164, 169, 172, 173, 179, 180, 181, 182, 184, 186, 
  188, 197, 210, 218, 239, 242, 244, 262, 263, 265, 266, 268
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  const allMatches: HistoricalMatch[] = [];

  for (const leagueId of LEAGUE_FILES) {
    const file2024 = path.join(process.cwd(), 'data', `${leagueId}_2024_enriched.json`);
    const file2025 = path.join(process.cwd(), 'data', `${leagueId}_2025_enriched.json`);

    for (const file of [file2024, file2025]) {
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
          if (Array.isArray(data)) {
            allMatches.push(...data);
            console.log(`  ✅ Loaded ${data.length} matches from ${path.basename(file)}`);
          }
        } catch (error) {
          console.error(`  ❌ Error loading ${file}:`, error);
        }
      }
    }
  }

  console.log(`\n📊 Total matches to seed: ${allMatches.length}`);
  
  if (allMatches.length === 0) {
    console.log('⚠️ No matches found. Make sure data files exist.');
    process.exit(1);
  }

  // Guardar en base de datos
  console.log('💾 Saving to database...');
  await saveMatches(allMatches);

  const count = await prisma.match.count();
  console.log(`✅ Database seeded with ${count} matches`);
  
  await prisma.$disconnect();
}

seedDatabase().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
