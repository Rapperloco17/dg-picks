#!/usr/bin/env python3
"""
Script para descargar datos de temporadas 2024, 2025 y 2026
Uso: python scripts/download_seasons.py
"""

import json
import os
import time
import requests
from datetime import datetime
from pathlib import Path

# Configuración
API_KEY = os.getenv('NEXT_PUBLIC_API_FOOTBALL_KEY', '178b66e41ba9d4d3b8549f096ef1e377')
API_URL = 'https://v3.football.api-sports.io'
DATA_DIR = Path(__file__).parent.parent / 'data'
DELAY_SECONDS = 6.5  # 6.5 segundos entre llamadas (límite de API)

# Lista de las 58 ligas
LEAGUES = [
    1, 2, 3, 4, 9, 11, 13, 16, 39, 40, 45, 61, 62, 71, 72, 73, 78, 79, 88, 94,
    103, 106, 113, 118, 119, 128, 129, 130, 135, 136, 137, 140, 141, 143, 144,
    162, 164, 169, 172, 173, 179, 180, 181, 182, 184, 186, 188, 197, 210, 218,
    239, 242, 244, 262, 263, 265, 266, 268
]

SEASONS = [2024, 2025, 2026]


def fetch_fixtures(league_id: int, season: int) -> list:
    """Descargar fixtures de una liga y temporada"""
    url = f"{API_URL}/fixtures"
    params = {
        'league': league_id,
        'season': season,
        'status': 'FT'  # Solo partidos terminados
    }
    headers = {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': API_KEY
    }
    
    print(f"[API] Descargando liga {league_id}, temporada {season}...")
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data.get('errors'):
            print(f"[API] Errores para liga {league_id}, temporada {season}: {data['errors']}")
        
        return data.get('response', [])
    except requests.exceptions.RequestException as e:
        print(f"[API] Error descargando liga {league_id}, temporada {season}: {e}")
        return []


def save_fixtures(league_id: int, season: int, fixtures: list) -> bool:
    """Guardar fixtures en archivo JSON"""
    if not fixtures:
        print(f"[Save] No hay datos para liga {league_id}, temporada {season}")
        return False
    
    filename = DATA_DIR / f"{league_id}_{season}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(fixtures, f, indent=2, ensure_ascii=False)
    
    print(f"[Save] Guardados {len(fixtures)} partidos en {filename.name}")
    return True


def main():
    print("=" * 50)
    print("Descargador de Temporadas 2024-2026")
    print("=" * 50)
    print(f"Total ligas: {len(LEAGUES)}")
    print(f"Temporadas: {', '.join(map(str, SEASONS))}")
    print(f"Total descargas: {len(LEAGUES) * len(SEASONS)}")
    print(f"Tiempo estimado: {len(LEAGUES) * len(SEASONS) * DELAY_SECONDS / 60:.0f} minutos")
    print("=" * 50)
    print()
    
    # Crear directorio si no existe
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    total_downloaded = 0
    total_matches = 0
    errors = []
    
    # Descargar cada liga y temporada
    for league_id in LEAGUES:
        for season in SEASONS:
            try:
                fixtures = fetch_fixtures(league_id, season)
                
                if fixtures:
                    if save_fixtures(league_id, season, fixtures):
                        total_downloaded += 1
                        total_matches += len(fixtures)
                else:
                    print(f"[Skip] Liga {league_id}, temporada {season}: sin datos")
            except Exception as e:
                print(f"[Error] Liga {league_id}, temporada {season}: {e}")
                errors.append({'league_id': league_id, 'season': season, 'error': str(e)})
            
            # Rate limiting
            print(f"[Rate Limit] Esperando {DELAY_SECONDS}s...")
            time.sleep(DELAY_SECONDS)
            print()
    
    # Resumen
    print()
    print("=" * 50)
    print("RESUMEN")
    print("=" * 50)
    print(f"Archivos descargados: {total_downloaded}")
    print(f"Total partidos: {total_matches}")
    print(f"Errores: {len(errors)}")
    
    if errors:
        print()
        print("Errores:")
        for err in errors:
            print(f"  - Liga {err['league_id']}, Temporada {err['season']}: {err['error']}")
    
    # Guardar resumen
    summary = {
        'date': datetime.now().isoformat(),
        'total_downloaded': total_downloaded,
        'total_matches': total_matches,
        'errors': errors,
        'leagues': LEAGUES,
        'seasons': SEASONS
    }
    
    summary_file = DATA_DIR / 'download-summary.json'
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)
    
    print()
    print(f"Resumen guardado en: {summary_file}")


if __name__ == '__main__':
    main()
