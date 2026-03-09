import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

// Import ALL local JSON files to PostgreSQL
export async function POST(request: NextRequest) {
  console.log('[IMPORT-LOCAL] Starting mass import...');
  
  const results = {
    processed: 0,
    errors: 0,
    skipped: 0,
    files: [] as {file: string, count: number}[],
  };

  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = await fs.readdir(dataDir);
    
    // Get ALL JSON files (not just _enriched)
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    console.log(`[IMPORT-LOCAL] Found ${jsonFiles.length} JSON files`);

    for (const filename of jsonFiles) {
      try {
        // Parse leagueId from filename (e.g., "2.json" or "2_2024.json" or "2_2024_enriched.json")
        const match = filename.match(/^(\d+)(?:_(\d+))?(?:_enriched)?\.json$/);
        if (!match) {
          console.log(`[${filename}] Skipped: doesn't match pattern`);
          continue;
        }
        
        const leagueId = parseInt(match[1]);
        const season = match[2] ? parseInt(match[2]) : 2024; // Default to 2024 if no season
        
        console.log(`[${filename}] Processing league ${leagueId}, season ${season}...`);
        
        // Read file
        const filePath = path.join(dataDir, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const matches = JSON.parse(content);
        
        if (!Array.isArray(matches)) {
          console.log(`[${filename}] Skipped: not an array`);
          continue;
        }

        // Check existing matches in DB for this league/season
        const existing = await prisma.match.findMany({
          where: { leagueId, season },
          select: { fixtureId: true }
        });
        const existingIds = new Set(existing.map(m => m.fixtureId));
        
        let fileCount = 0;
        let fileSkipped = 0;
        
        // Process matches
        for (const match of matches) {
          const fixtureId = match.fixture?.id;
          if (!fixtureId) {
            results.skipped++;
            continue;
          }
          
          if (existingIds.has(fixtureId)) {
            fileSkipped++;
            continue;
          }

          try {
            // Extract enriched data if available
            const corners = match.corners || {};
            const possession = match.possession || {};
            const shots = match.shots || { home: {}, away: {} };
            
            // Get stats from statistics array
            const stats = match.statistics || [];
            const homeStats = stats[0]?.statistics || [];
            const awayStats = stats[1]?.statistics || [];
            
            const getStat = (s: any[], type: string) => {
              const item = s.find((x: any) => x.type === type);
              const val = item?.value;
              if (!val) return 0;
              if (typeof val === 'string') {
                const num = parseInt(val.replace('%', '').trim());
                return isNaN(num) ? 0 : num;
              }
              return val;
            };

            await prisma.match.create({
              data: {
                fixtureId: match.fixture.id,
                leagueId: match.league?.id || leagueId,
                leagueName: match.league?.name || `League ${leagueId}`,
                season: match.league?.season || season,
                round: match.league?.round || '',
                date: new Date(match.fixture.date),
                timestamp: match.fixture.timestamp,
                timezone: match.fixture.timezone,
                status: match.fixture.status?.short || 'FT',
                homeTeamId: match.teams?.home?.id || 0,
                homeTeamName: match.teams?.home?.name || 'Unknown',
                awayTeamId: match.teams?.away?.id || 0,
                awayTeamName: match.teams?.away?.name || 'Unknown',
                homeGoals: match.goals?.home ?? 0,
                awayGoals: match.goals?.away ?? 0,
                homeScoreHT: match.score?.halftime?.home,
                awayScoreHT: match.score?.halftime?.away,
                homeScoreFT: match.score?.fulltime?.home,
                awayScoreFT: match.score?.fulltime?.away,
                // Enriched statistics
                homeCorners: corners.home || getStat(homeStats, 'Corner Kicks'),
                awayCorners: corners.away || getStat(awayStats, 'Corner Kicks'),
                homeYellowCards: getStat(homeStats, 'Yellow Cards'),
                awayYellowCards: getStat(awayStats, 'Yellow Cards'),
                homeRedCards: getStat(homeStats, 'Red Cards'),
                awayRedCards: getStat(awayStats, 'Red Cards'),
                homePossession: possession.home || getStat(homeStats, 'Ball Possession'),
                awayPossession: possession.away || getStat(awayStats, 'Ball Possession'),
                homeShots: shots.home?.total || getStat(homeStats, 'Total Shots'),
                awayShots: shots.away?.total || getStat(awayStats, 'Total Shots'),
                homeShotsOnTarget: shots.home?.on || getStat(homeStats, 'Shots on Goal'),
                awayShotsOnTarget: shots.away?.on || getStat(awayStats, 'Shots on Goal'),
                rawData: match as any,
              }
            });
            
            results.processed++;
            fileCount++;
            existingIds.add(fixtureId);
            
          } catch (err: any) {
            results.errors++;
            if (results.errors < 10) {
              console.error(`Error saving ${fixtureId}:`, err?.message);
            }
          }
        }
        
        if (fileCount > 0 || fileSkipped > 0) {
          results.files.push({
            file: filename,
            count: fileCount
          });
          console.log(`[${filename}] ✅ ${fileCount} imported, ${fileSkipped} skipped`);
        }
        
      } catch (err: any) {
        console.error(`[${filename}] ❌ Error:`, err?.message);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `✅ Import complete: ${results.processed} matches from local files`,
    });

  } catch (error: any) {
    console.error('[IMPORT-LOCAL] Error:', error);
    return NextResponse.json({
      error: 'Import failed',
      details: error?.message,
      ...results
    }, { status: 500 });
  }
}

// GET: Check how many files are available
export async function GET(request: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const dbCount = await prisma.match.count();
    
    return NextResponse.json({
      localFiles: jsonFiles.length,
      localFilesList: jsonFiles.slice(0, 20), // Show first 20
      inDatabase: dbCount,
      remaining: jsonFiles.length, // Estimate
      message: `${jsonFiles.length} local files, ${dbCount} in database`,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message
    }, { status: 500 });
  }
}
