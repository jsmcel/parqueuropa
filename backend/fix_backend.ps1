Write-Host "=== FIX & START BACKEND ===" -ForegroundColor Cyan

# --- 1. Configurar rutas y NVM ---
$NvmHome     = "C:\Program Files\nvm"
$NodeSymlink = "C:\Program Files\nodejs"
New-Item -ItemType Directory -Force -Path $NvmHome,$NodeSymlink | Out-Null

@"
root: $NvmHome
path: $NodeSymlink
arch: 64
proxy: none
node_mirror: https://nodejs.org/dist/
npm_mirror: https://github.com/npm/cli/archive/
"@ | Out-File "$NvmHome\settings.txt" -Encoding ascii -Force

[System.Environment]::SetEnvironmentVariable('NVM_HOME', $NvmHome, 'Machine')
[System.Environment]::SetEnvironmentVariable('NVM_SYMLINK', $NodeSymlink, 'Machine')

$machPath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
if ($machPath -notlike "*$NvmHome*") { $machPath += ";$NvmHome" }
if ($machPath -notlike "*$NodeSymlink*") { $machPath += ";$NodeSymlink" }
[System.Environment]::SetEnvironmentVariable('Path', $machPath, 'Machine')

$env:Path = $machPath

# --- 2. Instalar Node 18 si no está ---
Write-Host "`n--- Instalando Node 18 ---"
if (-not (Test-Path "$NvmHome\v18.20.5")) {
    & "$NvmHome\nvm.exe" install 18.20.5
}
& "$NvmHome\nvm.exe" use 18.20.5
Write-Host "Node version: $(node -v)"
Write-Host "NPM version : $(npm -v)"

# --- 3. Reinstalar dependencias backend ---
$backend = "C:\Users\Jose-Firebat\proyectos\museo-ferrocarril\backend"
Set-Location $backend
Write-Host "`n--- Reinstalando dependencias ---"
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install --quiet

# --- 4. Configurar variables ---
$env:MONGODB_URI  = "mongodb://localhost:27017/guideitor"
$env:BACKEND_PORT = "3000"

# --- 5. Lanzar backend ---
Write-Host "`n--- Lanzando backend ---"
$log = "$backend\backend.log"
if (Get-Process node -ErrorAction SilentlyContinue) { Stop-Process -Name node -Force }
Start-Process node "server.js" -WorkingDirectory $backend `
  -RedirectStandardOutput $log -RedirectStandardError $log -WindowStyle Hidden

Start-Sleep -Seconds 3
if (netstat -ano | findstr ":3000") {
    Write-Host "✅ Backend escuchando en http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend no está escuchando. Revisa $log" -ForegroundColor Red
}
