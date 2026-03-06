// API Route para servir datos históricos ENRIQUECIDOS
// Lee los archivos *_enriched.json del directorio /data/

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Lista de archivos de ligas disponibles
const LEAGUE_FILES = [
  1, 2, 3, 4, 9, 11, 13, 16, 39, 40, 45, 61, 62, 71, 72, 73, 78, 79, 88, 94,
  103, 106, 113, 118, 119, 128, 129, 130, 135, 136, 137, 140, 141, 143, 144,
  162, 164, 169, 172, 173, 179, 180, 181, 182, 184, 186, 188, 197, 210, 218,
  239, 242, 244, 262, 263, 265, 266, 268
];

const SEASONS = [2024, 2025];

// GET /api/local-data - Obtener lista de ligas disponibles
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('league');
  const season = searchParams.get('season');
  
  if (leagueId) {
    // Devolver datos de una liga/temporada específica
    return getLeagueData(parseInt(leagueId), season ? parseInt(season) : null);
  }
  
  // Devolver lista de ligas disponibles
  return NextResponse.json({
    leagues: LEAGUE_FILES,
    seasons: SEASONS,
    total: LEAGUE_FILES.length,
    endpoint: '/api/local-data?league={id}&season={year}',
  });
}

// POST /api/local-data - Cargar múltiples ligas y temporadas
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
    
    for (const leagueId of leagues) {
      for (const season of seasons) {
        // Intentar cargar archivo enriquecido primero
        const enrichedPath = path.join(process.cwd(), 'data', `${leagueId}_${season}_enriched.json`);
        const legacyPath = path.join(process.cwd(), 'data', `${leagueId}.json`);
        
        let filePath = null;
        if (fs.existsSync(enrichedPath)) {
          filePath = enrichedPath;
        } else if (fs.existsSync(legacyPath) && season === 2024) {
          // Fallback a archivos legacy solo para 2024
          filePath = legacyPath;
        }
        
        if (filePath) {
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
      totalMatches: results.reduce((sum, r) => sum + r.count, 0),
      data: results,
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load data', details: String(error) },
      { status: 500 }
    );
  }
}

// Helper para obtener datos de una liga/temporada
async function getLeagueData(leagueId: number, season: number | null) {
  // Si se especifica temporada, buscar archivo enriquecido
  if (season) {
    const enrichedPath = path.join(process.cwd(), 'data', `${leagueId}_${season}_enriched.json`);
    if (fs.existsSync(enrichedPath)) {
      try {
        const fileContent = fs.readFileSync(enrichedPath, 'utf-8');
        const data = JSON.parse(fileContent);
        return NextResponse.json({
          leagueId,
          season,
          count: Array.isArray(data) ? data.length : 0,
          data,
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to parse enriched data', details: String(error) },
          { status: 500 }
        );
      }
    }
  }
  
  // Fallback a archivo legacy
  const filePath = path.join(process.cwd(), 'data', `${leagueId}.json`);
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: `League ${leagueId} not found` },
      { status: 404 }
    );
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return NextResponse.json({
      leagueId,
      season: 2024, // Legacy files are 2024 season
      count: Array.isArray(data) ? data.length : 0,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse league data', details: String(error) },
      { status: 500 }
    );
  }
}
