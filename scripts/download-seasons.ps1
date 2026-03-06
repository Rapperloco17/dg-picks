# Script para descargar datos de temporadas 2024, 2025 y 2026
# Uso: .\scripts\download-seasons.ps1

param(
    [string]$ApiKey = "178b66e41ba9d4d3b8549f096ef1e377",
    [int]$DelayMs = 6500
)

$API_URL = "https://v3.football.api-sports.io"
$DATA_DIR = Join-Path $PSScriptRoot ".." "data"

# Lista de las 58 ligas
$LEAGUES = @(1, 2, 3, 4, 9, 11, 13, 16, 39, 40, 45, 61, 62, 71, 72, 73, 78, 79, 88, 94,
    103, 106, 113, 118, 119, 128, 129, 130, 135, 136, 137, 140, 141, 143, 144,
    162, 164, 169, 172, 173, 179, 180, 181, 182, 184, 186, 188, 197, 210, 218,
    239, 242, 244, 262, 263, 265, 266, 268)

$SEASONS = @(2024, 2025, 2026)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Descargador de Temporadas 2024-2026" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total ligas: $($LEAGUES.Count)"
Write-Host "Temporadas: $($SEASONS -join ', ')"
Write-Host "Total descargas: $($LEAGUES.Count * $SEASONS.Count)"
Write-Host "Tiempo estimado: $([Math]::Ceiling(($LEAGUES.Count * $SEASONS.Count * $DelayMs) / 60000)) minutos"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Crear directorio si no existe
if (-not (Test-Path $DATA_DIR)) {
    New-Item -ItemType Directory -Path $DATA_DIR -Force | Out-Null
}

$totalDownloaded = 0
$totalMatches = 0
$errors = @()

# Función para descargar fixtures
function Fetch-Fixtures($LeagueId, $Season) {
    $url = "$API_URL/fixtures?league=$LeagueId&season=$Season&status=FT"
    Write-Host "[API] Descargando liga $LeagueId, temporada $Season..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "x-rapidapi-host" = "v3.football.api-sports.io"
            "x-rapidapi-key" = $ApiKey
        }
        
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET -TimeoutSec 30
        
        if ($response.errors -and $response.errors.Count -gt 0) {
            Write-Warning "[API] Errores para liga $LeagueId, temporada ${Season}: $($response.errors | ConvertTo-Json)"
        }
        
        return $response.response
    }
    catch {
        Write-Error "[API] Error descargando liga $LeagueId, temporada ${Season}: $($_.Exception.Message)"
        return @()
    }
}

# Descargar cada liga y temporada
foreach ($leagueId in $LEAGUES) {
    foreach ($season in $SEASONS) {
        try {
            $fixtures = Fetch-Fixtures -LeagueId $leagueId -Season $season
            
            if ($fixtures -and $fixtures.Count -gt 0) {
                $filename = Join-Path $DATA_DIR "${leagueId}_${season}.json"
                $fixtures | ConvertTo-Json -Depth 10 | Set-Content $filename
                Write-Host "[Save] Guardados $($fixtures.Count) partidos en ${leagueId}_${season}.json" -ForegroundColor Green
                $totalDownloaded++
                $totalMatches += $fixtures.Count
            }
            else {
                Write-Host "[Skip] Liga $leagueId, temporada $season`: sin datos" -ForegroundColor Gray
            }
        }
        catch {
            Write-Error "[Error] Liga $leagueId, temporada $season`: $($_.Exception.Message)"
            $errors += @{ LeagueId = $leagueId; Season = $season; Error = $_.Exception.Message }
        }
        
        # Rate limiting
        Write-Host "[Rate Limit] Esperando ${DelayMs}ms..." -ForegroundColor DarkGray
        Start-Sleep -Milliseconds $DelayMs
    }
}

# Resumen
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Archivos descargados: $totalDownloaded"
Write-Host "Total partidos: $totalMatches"
Write-Host "Errores: $($errors.Count)"

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Errores:" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "  - Liga $($err.LeagueId), Temporada $($err.Season): $($err.Error)" -ForegroundColor Red
    }
}

# Guardar resumen
$summary = @{
    date = (Get-Date).ToString("o")
    totalDownloaded = $totalDownloaded
    totalMatches = $totalMatches
    errors = $errors
    leagues = $LEAGUES
    seasons = $SEASONS
} | ConvertTo-Json

$summaryFile = Join-Path $DATA_DIR "download-summary.json"
$summary | Set-Content $summaryFile
Write-Host ""
Write-Host "Resumen guardado en: $summaryFile" -ForegroundColor Green
