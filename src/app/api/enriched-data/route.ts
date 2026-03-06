// API Route para servir datos ENRIQUECIDOS con estadísticas
// Lee los archivos *_enriched.json del directorio /data/

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Lista de ligas disponibles
const LEAGUE_FILES = [
  1, 2, 3, 4, 9, 11, 13, 16, 39, 40, 45, 61, 62, 71, 72, 73, 78, 79, 88, 94,
  103, 106, 113, 118, 119, 128, 129, 130, 135, 136, 137, 140, 141, 143, 144,
  162, 164, 169, 172, 173, 179, 180, 181, 182, 184, 186, 188, 197, 210, 218,
  239, 242, 244, 262, 263, 265, 266, 268
];

const SEASONS = [2024, 2025];

// GET /api/enriched-data - Obtener lista de ligas disponibles
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('league');
  const season = searchParams.get('season');
  
  if (leagueId && season) {
    // Devolver datos de una liga/temporada específica
    return getEnrichedData(parseInt(leagueId), parseInt(season));
  }
  
  // Devolver lista de archivos disponibles
  const availableFiles: { leagueId: number; season: number; filename: string }[] = [];
  
  for (const leagueId of LEAGUE_FILES) {
    for (const season of SEASONS) {
      const filename = path.join(process.cwd(), 'data', `${leagueId}_${season}_enriched.json`);
      if (fs.existsSync(filename)) {
        availableFiles.push({ leagueId, season, filename: `${leagueId}_${season}_enriched.json` });
      }
    }
  }
  
  return NextResponse.json({
    leagues: LEAGUE_FILES,
    seasons: SEASONS,
    availableFiles: availableFiles.length,
    files: availableFiles,
    endpoint: '/api/enriched-data?league={id}&season={year}',
  });
}

// POST /api/enriched-data - Cargar múltiples ligas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leagues, seasons = SEASONS } = body;
    
    if (!Array.isArray(leagues)) {
      return NextResponse.json(
        { error: 'leagues must be an array' },
        { status: 400 }
      );
    }
    
    const results: { leagueId: number; season: number; data: any[]; count: number }[] = [];
    let totalMatches = 0;
    
    for (const leagueId of leagues) {
      for (const season of seasons) {
        const filePath = path.join(process.cwd(), 'data', `${leagueId}_${season}_enriched.json`);
        
        if (fs.existsSync(filePath)) {
          try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            
            if (Array.isArray(data)) {
              results.push({
                leagueId,
                season,
                data,
                count: data.length,
              });
              totalMatches += data.length;
            }
          } catch (error) {
            console.error(`Error reading league ${leagueId} season ${season}:`, error);
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      loaded: results.length,
      totalMatches,
      data: results,
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load data', details: String(error) },
      { status: 500 }
    );
  }
}

// Helper para obtener datos de una liga específica
async function getEnrichedData(leagueId: number, season: number) {
  const filePath = path.join(process.cwd(), 'data', `${leagueId}_${season}_enriched.json`);
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: `Data for league ${leagueId} season ${season} not found` },
      { status: 404 }
    );
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return NextResponse.json({
      leagueId,
      season,
      count: Array.isArray(data) ? data.length : 0,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse data', details: String(error) },
      { status: 500 }
    );
  }
}
