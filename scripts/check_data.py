import json

with open('data/39_2024_enriched.json', 'r') as f:
    data = json.load(f)

print(f'Total partidos: {len(data)}')

if len(data) > 0:
    match = data[0]
    print('\n' + '='*50)
    print('DATOS COMPLETOS PARA ML')
    print('='*50)
    
    home = match['teams']['home']['name']
    away = match['teams']['away']['name']
    print(f'\nPartido: {home} vs {away}')
    print(f"Marcador Final: {match['goals']['home']}-{match['goals']['away']}")
    print(f"Halftime: {match['score']['halftime']['home']}-{match['score']['halftime']['away']}")
    print(f"\nCorners: {match['corners']}")
    print(f"Tarjetas: {match['cards']}")
    print(f"Posesion: {match['possession']}")
    print(f"Tiros: {match['shots']}")
    
    print(f"\nEstadísticas completas: {'estadisticas' in match}")
    if 'estadisticas' in match:
        print(f"  - Tipos de stats: {len(match['estadisticas'][0]['statistics'])}")
        stats = [s['type'] for s in match['estadisticas'][0]['statistics']]
        print(f"  - Stats: {', '.join(stats[:10])}...")
