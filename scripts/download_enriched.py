#!/usr/bin/env python3
"""
Script optimizado para descargar datos enriquecidos para ML
Primero fixtures, luego estadísticas por lotes
"""

import json
import os
import time
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

API_KEY = os.getenv('NEXT_PUBLIC_API_FOOTBALL_KEY', '178b66e41ba9d4d3b8549f096ef1e377')
API_URL = 'https://v3.football.api-sports.io'
DATA_DIR = Path(__file__).parent.parent / 'data'
DELAY = 6.5

# Todas las 58 ligas
LEAGUES = {
    1: 'World Cup',
    2: 'Champions League',
    3: 'Europa League',
    4: 'Europa Conference League',
    9: 'Copa America',
    11: 'Friendlies',
    13: 'Club Friendlies',
    16: 'UEFA Nations League',
    39: 'Premier League',
    40: 'Championship',
    45: 'FA Cup',
    61: 'Ligue 1',
    62: 'Ligue 2',
    71: 'Serie A Brazil',
    72: 'Serie B Brazil',
    73: 'Copa do Brazil',
    78: 'Bundesliga',
    79: '2. Bundesliga',
    88: 'Eredivisie',
    94: 'Primeira Liga',
    103: 'Eliteserien',
    106: 'Ekstraklasa',
    113: 'Allsvenskan',
    118: 'Premier League Russia',
    119: 'Super Liga',
    128: 'Ligue 2 France',
    129: 'Ligue 3 France',
    130: 'National',
    135: 'Serie A',
    136: 'Serie B',
    137: 'Serie C',
    140: 'La Liga',
    141: 'Segunda Division',
    143: 'Copa del Rey',
    144: 'Champions League',
    162: 'Primera Division Argentina',
    164: 'Primera B',
    169: 'Super League',
    172: 'Super Liga',
    173: 'Premiership',
    179: 'Premier League Ukraine',
    180: 'Cup Ukraine',
    181: 'Premier League Belarus',
    182: 'First League Bulgaria',
    184: 'First Division A',
    186: 'Super League Switzerland',
    188: 'Premier League Croatia',
    197: '1. Division',
    210: 'Division 1',
    218: 'Premier League',
    239: 'Major League Soccer',
    242: 'Premier League Canada',
    244: 'Primera Division',
    262: 'Liga MX',
    263: 'Ascenso MX',
    265: 'Primera A',
    266: 'Primera Division',
    268: 'Primera Division',
}

SEASONS = [2024, 2025]


def api_get(endpoint, params=None):
    """Llamada a API"""
    try:
        r = requests.get(
            f"{API_URL}{endpoint}",
            params=params,
            headers={'x-rapidapi-host': 'v3.football.api-sports.io', 'x-rapidapi-key': API_KEY},
            timeout=30
        )
        r.raise_for_status()
        return r.json().get('response', [])
    except Exception as e:
        print(f"    Error: {e}")
        return []


def process_match(fixture):
    """Procesar un partido y agregar estadísticas"""
    fixture_id = fixture['fixture']['id']
    home_id = fixture['teams']['home']['id']
    away_id = fixture['teams']['away']['id']
    
    # Descargar estadísticas
    stats = api_get('/fixtures/statistics', {'fixture': fixture_id})
    
    # Procesar estadísticas
    home_stats = {}
    away_stats = {}
    
    for team_stat in stats:
        team_id = team_stat.get('team', {}).get('id')
        stats_list = team_stat.get('statistics', [])
        
        stat_dict = {}
        for s in stats_list:
            stat_type = s.get('type')
            value = s.get('value')
            if stat_type and value is not None:
                stat_dict[stat_type] = value
        
        if team_id == home_id:
            home_stats = stat_dict
        elif team_id == away_id:
            away_stats = stat_dict
    
    # Agregar a fixture
    fixture['estadisticas'] = [
        {'team': {'id': home_id}, 'statistics': [
            {'type': k, 'value': v} for k, v in home_stats.items()
        ]},
        {'team': {'id': away_id}, 'statistics': [
            {'type': k, 'value': v} for k, v in away_stats.items()
        ]}
    ]
    
    # Extraer campos clave para ML
    fixture['corners'] = {
        'home': home_stats.get('Corner Kicks', 0) or 0,
        'away': away_stats.get('Corner Kicks', 0) or 0
    }
    fixture['cards'] = {
        'yellow': {
            'home': home_stats.get('Yellow Cards', 0) or 0,
            'away': away_stats.get('Yellow Cards', 0) or 0
        },
        'red': {
            'home': home_stats.get('Red Cards', 0) or 0,
            'away': away_stats.get('Red Cards', 0) or 0
        }
    }
    fixture['possession'] = {
        'home': home_stats.get('Ball Possession', '0%'),
        'away': away_stats.get('Ball Possession', '0%')
    }
    fixture['shots'] = {
        'home': {
            'total': home_stats.get('Total Shots', 0) or 0,
            'on': home_stats.get('Shots on Goal', 0) or 0
        },
        'away': {
            'total': away_stats.get('Total Shots', 0) or 0,
            'on': away_stats.get('Shots on Goal', 0) or 0
        }
    }
    
    return fixture


def download_league_season(league_id, season):
    """Descargar liga completa con estadísticas"""
    league_name = LEAGUES.get(league_id, f'Liga {league_id}')
    print(f"\n[{league_name} - {season}]")
    
    # 1. Fixtures
    print("  Descargando fixtures...")
    fixtures = api_get('/fixtures', {'league': league_id, 'season': season, 'status': 'FT'})
    if not fixtures:
        print("  Sin datos")
        return 0
    print(f"  OK: {len(fixtures)} partidos")
    
    # 2. Enriquecer cada partido
    print("  Descargando estadísticas...")
    enriched = []
    for i, fixture in enumerate(fixtures):
        if (i + 1) % 10 == 0:
            print(f"    {i+1}/{len(fixtures)}...")
        
        processed = process_match(fixture)
        enriched.append(processed)
        time.sleep(0.3)  # Rate limit entre estadísticas
    
    # 3. Guardar
    filename = DATA_DIR / f"{league_id}_{season}_enriched.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(enriched, f, indent=2, ensure_ascii=False)
    
    # Stats
    total_corners = sum(f['corners']['home'] + f['corners']['away'] for f in enriched)
    total_cards = sum(f['cards']['yellow']['home'] + f['cards']['yellow']['away'] for f in enriched)
    
    print(f"  Guardado: {len(enriched)} partidos, {total_corners} corners, {total_cards} tarjetas")
    return len(enriched)


def main():
    total_downloads = len(LEAGUES) * len(SEASONS)
    estimated_minutes = (total_downloads * 100 * 0.3) / 60  # ~100 partidos promedio, 0.3s cada uno + delay
    
    print("=" * 60)
    print("Descargador Enriquecido para ML - TODAS LAS LIGAS")
    print("=" * 60)
    print(f"Ligas: {len(LEAGUES)}")
    print(f"Temporadas: {', '.join(map(str, SEASONS))}")
    print(f"Total descargas: {total_downloads}")
    print(f"Tiempo estimado: {estimated_minutes:.0f} minutos")
    print("=" * 60)
    
    DATA_DIR.mkdir(exist_ok=True)
    
    total = 0
    for league_id in LEAGUES:
        for season in SEASONS:
            count = download_league_season(league_id, season)
            total += count
            time.sleep(DELAY)
    
    print(f"\n{'='*60}")
    print(f"Total ligas: {len(LEAGUES)}")
    print(f"Total partidos descargados: {total}")
    print("Archivos: data/{liga}_{temporada}_enriched.json")


if __name__ == '__main__':
    main()
