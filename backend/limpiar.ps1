# === LIMPIEZA COMPLETA Y REINICIO DE NVM/Node ===

Write-Host "=== INICIANDO LIMPIEZA Y REINICIO ===" -ForegroundColor Cyan

# 1) Eliminar NVM de Windows
Write-Host "`nEliminando NVM..."
choco uninstall nvm -y

# Eliminar directorios de NVM si quedan
Remove-Item -Recurse -Force "C:\ProgramData\nvm" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "C:\Program Files\nvm" -ErrorAction SilentlyContinue

# 2) Eliminar Node.js de Program Files (si está presente)
Write-Host "`nEliminando Node.js..."
Remove-Item -Recurse -Force "C:\Program Files\nodejs" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "C:\Users\Jose-Firebat\AppData\Roaming\npm" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "C:\Users\Jose-Firebat\AppData\Roaming\npm-cache" -ErrorAction SilentlyContinue

# 3) Limpiar PATH
Write-Host "`nLimpiando el PATH..."
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
[System.Environment]::SetEnvironmentVariable('Path', $env:Path, 'Machine')

# 4) Instalar NVM de nuevo
Write-Host "`nInstalando NVM..."
choco install nvm -y

# 5) Configurar las rutas de NVM correctamente
Write-Host "`nConfigurando las variables de entorno de NVM..."
[System.Environment]::SetEnvironmentVariable('NVM_HOME', 'C:\ProgramData\nvm', 'Machine')
[System.Environment]::SetEnvironmentVariable('NVM_SYMLINK', 'C:\Program Files\nodejs', 'Machine')

$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

# 6) Reiniciar PowerShell para aplicar cambios
Write-Host "`nReiniciando PowerShell para aplicar cambios..."
Exit

# 7) Instalar Node 18 con NVM
Write-Host "`nInstalando Node.js 18..."
nvm install 18.20.5
nvm use 18.20.5

# Verificar la instalación de Node.js y NPM
Write-Host "`nNode y NPM instalados correctamente:"
node -v
npm -v

# 8) Reinstalar dependencias del proyecto
Write-Host "`nInstalando dependencias del proyecto..."
cd "C:\Users\Jose-Firebat\proyectos\museo-ferrocarril\backend"
npm install

Write-Host "`nTodo listo. Proyecto listo para arrancar."
