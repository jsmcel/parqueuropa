# Script para crear ZIPs de cada monumento
$monuments = @(
    "Atomium",
    "Barco-Vikingo", 
    "David-Miguel-Angel",
    "Fontana-Trevi",
    "La-Sirenita",
    "Las-Tres-Gracias",
    "Manneken-Pis",
    "Molinos-Holanda",
    "Muro-Berlin",
    "Plaza-Europa",
    "Plaza-Mayor",
    "Puente-Londres",
    "Puente-Van-Gogh",
    "Puerta-Alcala",
    "Puerta-Brandeburgo",
    "Teatro-Griego",
    "Torre-Belem",
    "Torre-Eiffel"
)

foreach ($monument in $monuments) {
    Write-Host "Procesando $monument..."
    
    # Verificar si existe la carpeta del monumento
    if (Test-Path $monument) {
        # Crear archivos vacíos para las carpetas que no existen
        $modes = @("normal", "infantil", "experto", "cachondo")
        
        foreach ($mode in $modes) {
            $filePath = Join-Path $monument "$mode.txt"
            if (-not (Test-Path $filePath)) {
                Write-Host "  Creando $filePath (vacío)"
                New-Item -Path $filePath -ItemType File -Force | Out-Null
            }
        }
        
        # Crear ZIP del monumento
        $zipPath = "$monument.zip"
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }
        
        Compress-Archive -Path "$monument\*" -DestinationPath $zipPath -Force
        Write-Host "  Creado $zipPath"
    } else {
        Write-Host "  ERROR: No existe la carpeta $monument"
    }
}

Write-Host "¡Proceso completado!"


