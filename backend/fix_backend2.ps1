Write-Host "=== FIX & START BACKEND (v2) ===" -ForegroundColor Cyan

# --- 0) Variables de proyecto
$BackendPath = "C:\Users\Jose-Firebat\proyectos\museo-ferrocarril\backend"
$BackendLog  = Join-Path $BackendPath "backend.log"

# --- 1) Localizar/instalar NVM
$candidates = @("C:\Program Files\nvm","C:\ProgramData\nvm")
$NvmHome = $null
foreach ($c in $candidates) {
  if (Test-Path (Join-Path $c "nvm.exe")) { $NvmHome = $c; break }
}
if (-not $NvmHome) {
  Write-Host "`n--- Instalando NVM con Chocolatey ---"
  choco install nvm -y --force | Out-Null
  foreach ($c in $candidates) {
    if (Test-Path (Join-Path $c "nvm.exe")) { $NvmHome = $c; break }
  }
}
if (-not $NvmHome) { Write-Host "No se encuentra nvm.exe tras la instalación." -ForegroundColor Red; exit 1 }

$NodeSymlink = "C:\Program Files\nodejs"
New-Item -ItemType Directory -Force -Path $NvmHome,$NodeSymlink | Out-Null

# --- 2) settings.txt y PATH
@"
root: $NvmHome
path: $NodeSymlink
arch: 64
proxy: none
node_mirror: https://nodejs.org/dist/
npm_mirror: https://github.com/npm/cli/archive/
"@ | Out-File (Join-Path $NvmHome "settings.txt") -Encoding ascii -Force

[System.Environment]::SetEnvironmentVariable('NVM_HOME',   $NvmHome,   'Machine')
[System.Environment]::SetEnvironmentVariable('NVM_SYMLINK', $NodeSymlink, 'Machine')

$machPath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
if ($machPath -notlike "*$NvmHome*")    { $machPath += ";$NvmHome" }
if ($machPath -notlike "*$NodeSymlink*"){ $machPath += ";$NodeSymlink" }
[System.Environment]::SetEnvironmentVariable('Path', $machPath, 'Machine')
$env:Path = $machPath

# --- 3) Node 18
Write-Host "`n--- Configurando Node 18.20.5 ---"
if (-not (Test-Path (Join-Path $NvmHome "v18.20.5"))) {
  & (Join-Path $NvmHome "nvm.exe") install 18.20.5
}
& (Join-Path $NvmHome "nvm.exe") use 18.20.5
Write-Host "Node: $(node -v)"
Write-Host "NPM : $(npm -v)"

# --- 4) Reinstalar dependencias backend
Write-Host "`n--- Reinstalando dependencias ---"
Set-Location $BackendPath
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install --quiet

# --- 5) Variables de entorno mínimas
$env:MONGODB_URI  = "mongodb://localhost:27017/guideitor"
$env:BACKEND_PORT = "3000"

# --- 6) Lanzar backend en segundo plano con log
Write-Host "`n--- Lanzando backend ---"
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Process node "server.js" -WorkingDirectory $BackendPath `
  -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendLog -WindowStyle Hidden

Start-Sleep -Seconds 3
$listening = (netstat -ano | findstr ":3000")
if ($listening) {
  Write-Host "✅ Backend escuchando en http://localhost:3000" -ForegroundColor Green
} else {
  Write-Host "❌ Backend no está escuchando. Revisa el log:" -ForegroundColor Red
  Write-Host "   $BackendLog"
  if (Test-Path $BackendLog) { Get-Content $BackendLog -Tail 200 }
  exit 2
}
