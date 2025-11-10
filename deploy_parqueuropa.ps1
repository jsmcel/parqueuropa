param(
    [ValidateSet('development', 'production')]
    [string]$Environment = 'production',

    [string[]]$TenantIds = @('museo_ferrocarril', 'parque_europa'),

    [string]$DefaultTenant = 'parque_europa',

    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$SkipFrontendExport,
    [switch]$SkipInstall,

    [int]$BackendPort = 3000
)

$ErrorActionPreference = 'Stop'

function Write-Info($Message) {
    Write-Host "[INFO]  $Message" -ForegroundColor Cyan
}

function Write-Warn($Message) {
    Write-Host "[WARN]  $Message" -ForegroundColor Yellow
}

function Write-Step {
    param(
        [string]$Title,
        [ScriptBlock]$Action
    )

    Write-Info $Title
    & $Action
}

function Assert-Dependency {
    param(
        [string]$Command,
        [string]$Hint
    )

    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "Dependencia '$Command' no encontrada. $Hint"
    }
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDirectory

$resolvedTenants = @()
if ($TenantIds -and $TenantIds.Count -gt 0) {
    $resolvedTenants = $TenantIds | Where-Object { $_ -and $_.Trim() -ne '' }
}
if ($resolvedTenants.Count -eq 0) {
    $resolvedTenants = @($DefaultTenant)
}

Write-Info "Entorno: $Environment"
Write-Info "Tenants: $($resolvedTenants -join ', ')"
Write-Info "Tenant por defecto backend: $DefaultTenant"

Assert-Dependency -Command node -Hint 'Instala Node.js 18+'
Assert-Dependency -Command npm -Hint 'npm viene con Node.js'
if (-not $SkipFrontend) {
    Assert-Dependency -Command npx -Hint 'npx viene con npm'
}

if (-not $SkipBackend) {
    Push-Location backend

    if (-not $SkipInstall) {
        Write-Step -Title "Instalando dependencias del backend" -Action {
            npm install
        }
    } else {
        Write-Warn "Saltando npm install en backend (SkipInstall habilitado)"
    }

    Write-Info "Servidor multi-tenant listo. Puedes lanzar:"
    Write-Host "    DEFAULT_TENANT=$DefaultTenant BACKEND_PORT=$BackendPort npm run dev" -ForegroundColor Green

    Pop-Location
}

if (-not $SkipFrontend) {
    Push-Location frontend/app

    if (-not $SkipInstall) {
        Write-Step -Title "Instalando dependencias del frontend" -Action {
            npm install
        }
    } else {
        Write-Warn "Saltando npm install en frontend (SkipInstall habilitado)"
    }

    if (-not $SkipFrontendExport) {
        foreach ($tenant in $resolvedTenants) {
            $env:EXPO_PUBLIC_TENANT = $tenant
            $env:EXPO_PUBLIC_TENANT_ID = $tenant
            $tenantDist = Join-Path (Get-Location) ("dist\" + $tenant)
            if (-not (Test-Path $tenantDist)) {
                New-Item -ItemType Directory -Path $tenantDist | Out-Null
            }

            Write-Step -Title "Exportando bundle Expo para tenant '$tenant'" -Action {
                npx expo export --platform web --output-dir $tenantDist --clear --non-interactive
            }
        }
    } else {
        Write-Warn "Saltando expo export (SkipFrontendExport habilitado)"
    }

    Write-Info "Para ejecutar Expo en modo dev (ejemplo con primer tenant):"
    $firstTenant = $resolvedTenants[0]
    Write-Host "    \$env:EXPO_PUBLIC_TENANT='$firstTenant'; npx expo start --clear" -ForegroundColor Green

    Pop-Location
}

Write-Info "Deploy script finalizado."
