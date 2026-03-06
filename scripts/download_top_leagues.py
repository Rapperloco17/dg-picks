#!/usr/bin/env python3
"""
Script rápido para descargar solo las ligas principales
Uso: python scripts/download_top_leagues.py
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
DELAY_SECONDS = 6.5

# Solo ligas principales (Top 5 europeas + algunas importantes)
TOP_LEAGUES = {
    39: 'Premier League (England)',
    140: 'La Liga (Spain)',
    135: 'Serie A (Italy)',
    78: 'Bundesliga (Germany)',
    61: 'Ligue 1 (France)',
    88: 'Eredivisie (Netherlands)',
    94: 'Primeira Liga (Portugal)',
    144: 'Champions League',
}

SEASONS = [2024, 2025, 2026]


def fetch_fixtures(league_id: int, season: int) -> list:
    """Descargar fixtures de una liga y temporada"""
    url = f"{API_URL}/fixtures"
    params = {
        'league': league_id,
        'season': season,
        'status': 'FT'
    }
    headers = {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': API_KEY
    }
    
    league_name = TOP_LEAGUES.get(league_id, f'Liga {league_id}')
    print(f"[API] Descargando {league_name}, temporada {season}...")
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data.get('errors'):
            print(f"[API] Errores: {data['errors']}")
        
        return data.get('response', [])
    except requests.exceptions.RequestException as e:
        print(f"[API] Error: {e}")
        return []


def save_fixtures(league_id: int, season: int, fixtures: list) -> bool:
    """Guardar fixtures en archivo JSON"""
    if not fixtures:
        print(f"[Save] No hay datos para liga {league_id}, temporada {season}")
        return False
    
    filename = DATA_DIR / f"{league_id}_{season}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(fixtures, f, indent=2, ensure_ascii=False)
    
    print(f"[Save] OK - Guardados {len(fixtures)} partidos en {filename.name}")
    return True


def main():
    print("=" * 60)
    print("Descargador Rápido - Ligas Principales 2024-2026")
    print("=" * 60)
    print(f"Ligas: {len(TOP_LEAGUES)}")
    print(f"Temporadas: {', '.join(map(str, SEASONS))}")
    print(f"Total descargas: {len(TOP_LEAGUES) * len(SEASONS)}")
    print(f"Tiempo estimado: {len(TOP_LEAGUES) * len(SEASONS) * DELAY_SECONDS / 60:.0f} minutos")
    print("=" * 60)
    print()
    
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    total_downloaded = 0
    total_matches = 0
    
    for league_id, league_name in TOP_LEAGUES.items():
        for season in SEASONS:
            fixtures = fetch_fixtures(league_id, season)
            
            if fixtures:
                if save_fixtures(league_id, season, fixtures):
                    total_downloaded += 1
                    total_matches += len(fixtures)
            else:
                print(f"[Skip] Sin datos para {league_name}, temporada {season}")
            
            print(f"[Rate Limit] Esperando {DELAY_SECONDS}s...")
            time.sleep(DELAY_SECONDS)
            print()
    
    print()
    print("=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Archivos descargados: {total_downloaded}")
    print(f"Total partidos: {total_matches}")
    print()
    print("Archivos guardados en:", DATA_DIR)
    print()
    print("Para descargar TODAS las ligas (58), ejecuta:")
    print("  python scripts/download_seasons.py")


if __name__ == '__main__':
    main()
