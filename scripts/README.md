# Scripts de Descarga de Datos

Estos scripts descargan datos históricos de partidos de fútbol de la API Football API.

## Temporadas a Descargar
- **2024** (Temporada 2024-2025)
- **2025** (Temporada 2025-2026) 
- **2026** (Temporada 2026-2027)

## Opciones de Scripts

### Opción disponibles:

1. **Ligas principales (rápido)** - 8 ligas, ~12 minutos
   ```bash
   python scripts/download_top_leagues.py
   ```

2. **Todas las ligas (completo)** - 58 ligas, ~90 minutos
   ```bash
   python scripts/download_seasons.py
   ```

3. **PowerShell (Windows)** - 58 ligas, ~90 minutos
   ```powershell
   .\scripts\download-seasons.ps1
   ```

4. **Node.js** - 58 ligas, ~90 minutos
   ```bash
   node scripts/download-seasons.js
   ```

## Requisitos

### Python
```bash
pip install requests
```

### PowerShell
- PowerShell 5.1 o superior (incluido en Windows 10/11)

### Node.js
- Node.js 18+ (fetch API nativo)

## Estructura de Archivos Generados

Los archivos se guardan en `data/` con el formato:
```
data/
├── 39_2024.json      # Premier League 2024-2025
├── 39_2025.json      # Premier League 2025-2026
├── 39_2026.json      # Premier League 2026-2027
├── 140_2024.json     # La Liga 2024-2025
├── ...
└── download-summary.json  # Resumen de la descarga
```

## Rate Limiting

La API tiene un límite de **10 llamadas por minuto** en el plan gratuito.
Los scripts esperan **6.5 segundos** entre cada llamada para respetar este límite.

## API Key

Por defecto se usa la API key: `178b66e41ba9d4d3b8549f096ef1e377`

Para usar otra API key:
```bash
# Python
set NEXT_PUBLIC_API_FOOTBALL_KEY=tu_api_key
python scripts/download_seasons.py

# PowerShell
$env:NEXT_PUBLIC_API_FOOTBALL_KEY="tu_api_key"
.\scripts\download-seasons.ps1
```

## Notas

- Solo se descargan partidos **terminados** (status: FT)
- Cada archivo contiene un array de partidos en formato JSON
- Si una liga/temporada no tiene datos, se omite silenciosamente
- Los archivos existentes se sobrescriben
