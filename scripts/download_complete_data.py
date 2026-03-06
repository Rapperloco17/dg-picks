#!/usr/bin/env python3
"""
Script para descargar datos COMPLETOS incluyendo estadísticas y eventos
Uso: python scripts/download_complete_data.py
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
DELAY_SECONDS = 6.5  # Rate limit

# Top 10 ligas más importantes para ML (prioridad)
TOP_LEAGUES = {
    39: 'Premier League (England)',
    140: 'La Liga (Spain)',
    135: 'Serie A (Italy)',
    78: 'Bundesliga (Germany)',
    61: 'Ligue 1 (France)',
    88: 'Eredivisie (Netherlands)',
    94: 'Primeira Liga (Portugal)',
    144: 'Champions League',
    71: 'Serie A (Brazil)',
    128: 'Ligue 2 (France)',
}

SEASONS = [2024, 2025]


def api_call(endpoint, params=None):
    """Llamada genérica a la API"""
    url = f"{API_URL}{endpoint}"
    headers = {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': API_KEY
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data.get('errors') and len(data['errors']) > 0:
            print(f"  [API Warning] {data['errors']}")
        
        return data.get('response', [])
    except Exception as e:
        print(f"  [API Error] {e}")
        return []


def fetch_fixtures(league_id, season):
    """Descargar fixtures básicos"""
    print(f"  [1/3] Descargando fixtures...")
    fixtures = api_call('/fixtures', {
        'league': league_id,
        'season': season,
        'status': 'FT'
    })
    print(f"        OK - {len(fixtures)} partidos")
    return fixtures


def fetch_statistics(fixture_id):
    """Descargar estadísticas de un partido"""
    stats = api_call('/fixtures/statistics', {'fixture': fixture_id})
    if stats and len(stats) > 0:
        # Extraer estadísticas relevantes
        result = {}
        for team_stats in stats:
            team_id = team_stats.get('team', {}).get('id')
            statistics = team_stats.get('statistics', [])
            result[team_id] = {}
            for stat in statistics:
                stat_type = stat.get('type')
                stat_value = stat.get('value')
                if stat_type:
                    result[team_id][stat_type] = stat_value
        return result
    return {}


def fetch_events(fixture_id):
    """Descargar eventos de un partido (goles, tarjetas)"""
    events = api_call('/fixtures/events', {'fixture': fixture_id})
    processed = {
        'goals': [],
        'cards': [],
        'substitutions': []
    }
    
    for event in events:
        event_type = event.get('type')
        event_detail = event.get('detail')
        
        if event_type == 'Goal':
            processed['goals'].append({
                'time': event.get('time', {}).get('elapsed'),
                'team': event.get('team', {}).get('id'),
                'player': event.get('player', {}).get('name'),
                'type': event_detail
            })
        elif event_type == 'Card':
            processed['cards'].append({
                'time': event.get('time', {}).get('elapsed'),
                'team': event.get('team', {}).get('id'),
                'player': event.get('player', {}).get('name'),
                'type': event_detail  # Yellow Card, Red Card
            })
    
    return processed


def enrich_fixture_data(fixture):
    """Enriquecer datos de un partido con estadísticas y eventos"""
    fixture_id = fixture['fixture']['id']
    
    # Descargar estadísticas
    stats = fetch_statistics(fixture_id)
    if stats:
        fixture['statistics'] = stats
    
    # Descargar eventos
    events = fetch_events(fixture_id)
    if events:
        fixture['events'] = events
    
    # Extraer corners y tarjetas de estadísticas si existen
    home_team_id = fixture['teams']['home']['id']
    away_team_id = fixture['teams']['away']['id']
    
    corners_home = 0
    corners_away = 0
    yellow_home = 0
    yellow_away = 0
    red_home = 0
    red_away = 0
    
    if stats:
        # Corners
        if home_team_id in stats:
            corners_home = stats[home_team_id].get('Corner Kicks', 0) or 0
            for card in stats[home_team_id].get('Yellow Cards', []):
                yellow_home = int(stats[home_team_id].get('Yellow Cards', 0) or 0)
            red_home = int(stats[home_team_id].get('Red Cards', 0) or 0)
        
        if away_team_id in stats:
            corners_away = stats[away_team_id].get('Corner Kicks', 0) or 0
            yellow_away = int(stats[away_team_id].get('Yellow Cards', 0) or 0)
            red_away = int(stats[away_team_id].get('Red Cards', 0) or 0)
    
    # Si no hay estadísticas, contar desde eventos
    if not stats and 'events' in fixture:
        for card in fixture['events'].get('cards', []):
            if card['team'] == home_team_id:
                if card['type'] == 'Yellow Card':
                    yellow_home += 1
                elif card['type'] == 'Red Card':
                    red_home += 1
            else:
                if card['type'] == 'Yellow Card':
                    yellow_away += 1
                elif card['type'] == 'Red Card':
                    red_away += 1
    
    # Agregar resumen al fixture
    fixture['summary'] = {
        'corners': {
            'home': corners_home,
            'away': corners_away,
            'total': corners_home + corners_away
        },
        'cards': {
            'yellow': {
                'home': yellow_home,
                'away': yellow_away,
                'total': yellow_home + yellow_away
            },
            'red': {
                'home': red_home,
                'away': red_away,
                'total': red_home + red_away
            }
        }
    }
    
    return fixture


def save_data(league_id, season, fixtures):
    """Guardar datos en archivo JSON"""
    if not fixtures:
        return False
    
    filename = DATA_DIR / f"{league_id}_{season}_complete.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(fixtures, f, indent=2, ensure_ascii=False)
    
    # Calcular totales
    total_corners = sum(f.get('summary', {}).get('corners', {}).get('total', 0) for f in fixtures)
    total_cards = sum(f.get('summary', {}).get('cards', {}).get('yellow', {}).get('total', 0) for f in fixtures)
    
    print(f"        Guardado: {len(fixtures)} partidos, {total_corners} corners, {total_cards} tarjetas")
    return True


def main():
    print("=" * 70)
    print("Descargador de Datos COMPLETOS para ML")
    print("Incluye: Fixtures + Estadísticas + Eventos")
    print("=" * 70)
    print(f"Ligas: {len(TOP_LEAGUES)}")
    print(f"Temporadas: {', '.join(map(str, SEASONS))}")
    print(f"Tiempo estimado: ~{len(TOP_LEAGUES) * len(SEASONS) * 15} minutos (3 llamadas por partido)")
    print("=" * 70)
    print()
    
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    total_downloaded = 0
    total_matches = 0
    
    for league_id, league_name in TOP_LEAGUES.items():
        for season in SEASONS:
            print(f"\n[{league_name} - Temporada {season}]")
            
            # 1. Descargar fixtures
            fixtures = fetch_fixtures(league_id, season)
            if not fixtures:
                print("  [Skip] Sin datos")
                continue
            
            # 2. Enriquecer cada partido con estadísticas y eventos
            print(f"  [2/3] Descargando estadísticas y eventos para {len(fixtures)} partidos...")
            enriched_fixtures = []
            
            for i, fixture in enumerate(fixtures):
                if i % 10 == 0:
                    print(f"        Progreso: {i}/{len(fixtures)} partidos...")
                
                enriched = enrich_fixture_data(fixture)
                enriched_fixtures.append(enriched)
                
                # Rate limiting entre partidos
                time.sleep(0.5)
            
            # 3. Guardar
            print(f"  [3/3] Guardando datos...")
            if save_data(league_id, season, enriched_fixtures):
                total_downloaded += 1
                total_matches += len(enriched_fixtures)
            
            # Rate limiting entre ligas/temporadas
            print(f"  [Rate Limit] Esperando {DELAY_SECONDS}s...")
            time.sleep(DELAY_SECONDS)
    
    # Resumen
    print()
    print("=" * 70)
    print("RESUMEN")
    print("=" * 70)
    print(f"Archivos descargados: {total_downloaded}")
    print(f"Total partidos: {total_matches}")
    print()
    print("Archivos guardados en:", DATA_DIR)
    print("Formato: {liga}_{temporada}_complete.json")


if __name__ == '__main__':
    main()
