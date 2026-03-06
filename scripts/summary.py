import json
from pathlib import Path
import os

data_dir = Path(__file__).parent.parent / 'data'
files = list(data_dir.glob('*_enriched.json'))

total_matches = 0
total_corners = 0
total_cards = 0
seasons = {}

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        count = len(data)
        total_matches += count
        
        # Extraer temporada del nombre
        parts = f.stem.split('_')
        if len(parts) >= 2:
            season = parts[1]
            if season not in seasons:
                seasons[season] = 0
            seasons[season] += count
        
        # Sumar corners y tarjetas
        for match in data:
            if 'corners' in match:
                total_corners += match['corners'].get('home', 0) + match['corners'].get('away', 0)
            if 'cards' in match:
                total_cards += match['cards'].get('yellow', {}).get('home', 0)
                total_cards += match['cards'].get('yellow', {}).get('away', 0)
                
    except Exception as e:
        print(f"Error en {f}: {e}")

print("=" * 60)
print("RESUMEN FINAL - DATOS ENRIQUECIDOS PARA ML")
print("=" * 60)
print(f"Total archivos: {len(files)}")
print(f"Total partidos: {total_matches:,}")
print(f"Total corners: {total_corners:,}")
print(f"Total tarjetas: {total_cards:,}")
print()
print("Por temporada:")
for season, count in sorted(seasons.items()):
    print(f"  {season}: {count:,} partidos")
print("=" * 60)
