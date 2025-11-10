param(
    [ValidateSet('development', 'production')]
    [string]$Environment = 'production',

    [string[]]$TenantIds = @('museo_ferrocarril', 'parque_europa'),

    [string]$DefaultTenant = 'parque_europa',

    [int]$BackendPort = 3000,

    [switch]$SkipBackendInstall,
    [switch]$SkipFrontendInstall,
    [switch]$SkipFrontendBuild,
    [switch]$SkipMongoCheck,

    [string]$MongoExecutable = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe",
    [string]$MongoDbPath = "C:\data\db"
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$header = @"
========================================
      DESPLIEGUE COMPLETO PARQUEUROPA
========================================
Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Entorno: $Environment
Tenants: $([string]::Join(', ', $TenantIds))
Tenant por defecto backend: $DefaultTenant
========================================
"@
Write-Host $header -ForegroundColor Cyan

function Write-Section($title) {
    Write-Host ""
    Write-Host "=== $title ===" -ForegroundColor Magenta
}

function Write-Ok($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-WarnMsg($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Err($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Ensure-Command($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Dependencia '$name' no encontrada. $hint"
    }
    Write-Ok "Dependencia '$name' disponible."
}

Write-Section "1. Dependencias básicas"
Ensure-Command node "Instala Node.js 18 o superior."
Ensure-Command npm "npm se incluye con Node.js."
Ensure-Command git "Instala Git para gestión del repo."
Ensure-Command pwsh "Instala PowerShell 7 para ejecutar scripts modernos."
if (-not $SkipFrontendBuild) {
    Ensure-Command npx "npx se incluye con npm."
}

if (-not $SkipMongoCheck) {
    Write-Section "2. Verificando MongoDB"
    $mongoProcess = Get-Process -Name mongod -ErrorAction SilentlyContinue
    if ($null -eq $mongoProcess) {
        Write-WarnMsg "MongoDB no está en ejecución."
        if (Test-Path $MongoExecutable) {
            Write-Host "Intentando iniciar MongoDB desde: $MongoExecutable" -ForegroundColor Yellow
            if (-not (Test-Path $MongoDbPath)) {
                New-Item -ItemType Directory -Path $MongoDbPath -Force | Out-Null
            }
            Start-Process -FilePath $MongoExecutable -ArgumentList "--dbpath `"$MongoDbPath`"" -WindowStyle Minimized
            Start-Sleep -Seconds 5
            $mongoProcess = Get-Process -Name mongod -ErrorAction SilentlyContinue
            if ($null -eq $mongoProcess) {
                Write-WarnMsg "No se pudo verificar que MongoDB arrancara. Inícialo manualmente si es necesario."
            } else {
                Write-Ok "MongoDB iniciado correctamente."
            }
        } else {
            Write-WarnMsg "Ejecutable de MongoDB no encontrado en '$MongoExecutable'. Arranca tu base de datos manualmente."
        }
    } else {
        Write-Ok "MongoDB ya está en ejecución (PID: $($mongoProcess.Id))."
    }
} else {
    Write-WarnMsg "Salteando verificación de MongoDB (SkipMongoCheck)."
}

$backendDir = Join-Path $scriptDir 'backend'
$frontendDir = Join-Path $scriptDir 'frontend\app'
$tenantsConfigPath = Join-Path $backendDir 'config\tenants.json'
if (-not (Test-Path $tenantsConfigPath)) {
    throw "No se encontró backend/config/tenants.json"
}
$tenantsConfig = Get-Content $tenantsConfigPath -Raw | ConvertFrom-Json

$resolvedTenants = $TenantIds | Where-Object { $_ -and $_.Trim() -ne '' }
if ($resolvedTenants.Count -eq 0) {
    $resolvedTenants = @($DefaultTenant)
}

Write-Section "3. Validando assets por tenant"

foreach ($tenantId in $resolvedTenants) {
    $config = $tenantsConfig.$tenantId
    if (-not $config) {
        Write-Err "Tenant '$tenantId' no existe en backend/config/tenants.json"
        continue
    }

    Write-Host "`n--- Tenant: $tenantId (${($config.frontendMode ?? 'vision')}) ---" -ForegroundColor Cyan

    $tenantDir = Join-Path $backendDir "tenants\$tenantId"
    if (-not (Test-Path $tenantDir)) {
        Write-Err "Directorio $tenantDir no existe."
        continue
    }

    $audioDir = Join-Path $tenantDir 'audio'
    $textsDir = Join-Path $tenantDir 'texts'
    if (Test-Path $audioDir) { Write-Ok "Audio -> $audioDir" } else { Write-WarnMsg "Falta carpeta de audio: $audioDir" }
    if (Test-Path $textsDir) { Write-Ok "Texts -> $textsDir" } else { Write-WarnMsg "Falta carpeta de textos: $textsDir" }

    if ($config.frontendMode -eq 'gps') {
        $coordinatesPath = Join-Path $tenantDir 'coordinates.json'
        if (Test-Path $coordinatesPath) {
            Write-Ok "Coordinates encontrados ($coordinatesPath)."
        } else {
            Write-Err "Falta coordinates.json para tenant GPS."
        }
    } else {
        $modelsDir = Join-Path $tenantDir 'models'
        $embeddingsDir = Join-Path $tenantDir 'embeddings'
        $primaryModel = Join-Path $modelsDir 'swin_t_best_model.onnx'
        $secondaryModel = Join-Path $modelsDir 'efficientnet_b0_model.onnx'
        $embeddingsFile = Join-Path $embeddingsDir 'dataset_embeddings.json'

        foreach ($pathInfo in @(
            @{ Path = $modelsDir; Description = 'Carpeta de modelos' },
            @{ Path = $embeddingsDir; Description = 'Carpeta de embeddings' },
            @{ Path = $primaryModel; Description = 'Modelo principal swin_t_best_model.onnx' },
            @{ Path = $secondaryModel; Description = 'Modelo secundario efficientnet_b0_model.onnx' },
            @{ Path = $embeddingsFile; Description = 'dataset_embeddings.json' }
        )) {
            if (Test-Path $pathInfo.Path) {
                Write-Ok "$($pathInfo.Description) disponible en $($pathInfo.Path)"
            } else {
                Write-Err "Falta $($pathInfo.Description) ($($pathInfo.Path))"
            }
        }
    }
}

if (-not $SkipBackendInstall) {
    Write-Section "4. Instalando dependencias backend"
    Push-Location $backendDir
    npm install
    Pop-Location
} else {
    Write-WarnMsg "Saltando npm install en backend (SkipBackendInstall)."
}

if (-not $SkipFrontendInstall) {
    Write-Section "5. Instalando dependencias frontend"
    Push-Location $frontendDir
    npm install
    Pop-Location
} else {
    Write-WarnMsg "Saltando npm install en frontend (SkipFrontendInstall)."
}

if (-not $SkipFrontendBuild) {
    Write-Section "6. Exportando bundles Expo por tenant"
    Push-Location $frontendDir
    foreach ($tenant in $resolvedTenants) {
        $env:EXPO_PUBLIC_TENANT = $tenant
        $env:EXPO_PUBLIC_TENANT_ID = $tenant
        $outputDir = Join-Path (Get-Location) ("dist\" + $tenant)
        if (-not (Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir | Out-Null
        }
        Write-Host "Exportando tenant '$tenant' -> $outputDir" -ForegroundColor Cyan
        npx expo export --platform web --output-dir $outputDir --clear --non-interactive
    }
    Pop-Location
} else {
    Write-WarnMsg "Saltando exportación de frontend (SkipFrontendBuild)."
}

Write-Section "7. Resumen e instrucciones"
Write-Host "Backend multi-tenant:" -ForegroundColor Cyan
Write-Host "  cd $backendDir" -ForegroundColor Gray
Write-Host "  \$env:DEFAULT_TENANT='$DefaultTenant'; \$env:BACKEND_PORT='$BackendPort'; \$env:NODE_ENV='$Environment'; node server-multitenant.js" -ForegroundColor Green

Write-Host "`nFrontend Expo (modo dev) por tenant:" -ForegroundColor Cyan
foreach ($tenant in $resolvedTenants) {
    Write-Host "  cd $frontendDir" -ForegroundColor Gray
    Write-Host "  \$env:EXPO_PUBLIC_TENANT='$tenant'; npx expo start --clear" -ForegroundColor Green
}

Write-Host "`nDespliegue completo finalizado." -ForegroundColor Cyan
