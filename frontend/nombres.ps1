# --- CONFIGURACIÓN: Rutas Proporcionadas ---
$rutaBase = "C:\Users\jsmce\.cursor\guideitor_PROD\paquete_final_feedback\backend\public\audio"
$jsonPath = "C:\Users\jsmce\.cursor\guideitor_PROD\paquete_final_feedback\backend\embeddings\dataset_embeddings.json"
# --- FIN CONFIGURACIÓN ---

# --- Configuraciones Adicionales ---
$OutputEncoding = [System.Text.Encoding]::UTF8 # Intentar mejorar salida en consola
# $VerbosePreference = "Continue" # Descomenta esta línea para ver TODOS los mensajes detallados

# --- Función de Normalización para Búsqueda ---
function Normalize-StringForMatch ($strIn) {
    if ($null -eq $strIn) { return $null }
    # Convertir a minúsculas
    $temp = $strIn.ToLower()
    # Reemplazos básicos de acentos/caracteres comunes (añadir más si es necesario)
    $temp = $temp -replace '[áäâà]', 'a' -replace '[éëêè]', 'e' -replace '[íïîì]', 'i' -replace '[óöôò]', 'o' -replace '[úüûù]', 'u' -replace 'ñ', 'n' -replace 'ç', 'c'
    # Mantener solo letras a-z y números 0-9 (elimina espacios, guiones, símbolos, etc.)
    $temp = $temp -replace '[^a-z0-9]', ''
    return $temp
}

# --- MAPEADOS MANUALES DEFINIDOS (VERSIÓN FINAL) ---
# Clave = Nombre normalizado del archivo/carpeta problemático
# Valor = Label EXACTO que debe tener del JSON
$manualLabelMap = @{
    "locomotoraelectricano3" = "trifasica";      # Mapeo para "Locomotora eléctrica nº 3"
    "serie4000"              = "4020";          # Mapeo para "Serie 4000"
    "automotordiesel9522"    = "taf";           # Mapeo para "Automotor diésel 9522" -> taf
    # "mastodonte"             = "pacific";       # --- ELIMINADO: Mastodonte se ignora ---
    # --- Añadir más mapeos manuales aquí si es estrictamente necesario ---
}
Write-Host "Mapa manual definido con $($manualLabelMap.Count) entradas." -ForegroundColor Magenta


# Validar que la ruta base existe
if (-not (Test-Path $rutaBase -PathType Container)) {
    Write-Error "La ruta base '$rutaBase' no existe o no es un directorio. Verifica la ruta."
    exit
}
# Validar que el JSON existe
if (-not (Test-Path $jsonPath -PathType Leaf)) {
    Write-Error "El archivo JSON '$jsonPath' no existe o no es un archivo. Verifica la ruta."
    exit
}


# --- 1. Leer y Procesar Labels del JSON (Automático) ---
Write-Host "Leyendo archivo JSON: $jsonPath" -ForegroundColor Cyan
try {
    # Leer como UTF8 por si acaso
    $jsonContent = Get-Content -Path $jsonPath -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $labelNames = $jsonContent.label_names
    if ($null -eq $labelNames -or $labelNames.Count -eq 0) {
        Write-Error "No se encontraron 'label_names' en el archivo JSON o el archivo está vacío."
        exit
    }
} catch {
    Write-Error "Error al leer o procesar el archivo JSON en '$jsonPath'. Verifica la ruta y el formato del JSON."
    Write-Error $_.Exception.Message
    exit
}

# Crear diccionario para mapeo automático: Clave Normalizada -> Nombre Exacto JSON
$labelMap = @{}
Write-Host "Creando mapa de etiquetas automático..."
foreach ($label in $labelNames) {
    $normalizedKey = Normalize-StringForMatch -strIn $label
    if ($normalizedKey -eq "" -or $null -eq $normalizedKey) {
        Write-Warning "Label '$label' se normaliza a vacío. Se ignora."
        continue
    }

    if (-not $labelMap.ContainsKey($normalizedKey)) {
        $labelMap[$normalizedKey] = $label # Guardamos el nombre exacto
         Write-Verbose "  Mapa Auto: '$normalizedKey' -> '$label'"
    } else {
        Write-Warning "Label normalizado duplicado (Auto) para clave '$normalizedKey'. Originales: '$($labelMap[$normalizedKey])', '$label'. Se usará el primero ('$($labelMap[$normalizedKey])')."
    }
}
Write-Host "Mapa automático creado con $($labelMap.Count) entradas únicas." -ForegroundColor Green

# --- 2. Procesar Archivos MP3 ---
Write-Host "Buscando archivos .mp3 en '$rutaBase'..." -ForegroundColor Cyan
# Obtener archivos de forma segura
try{
    $archivosMp3 = Get-ChildItem -Path $rutaBase -Recurse -Filter *.mp3 -ErrorAction Stop
} catch {
     Write-Error "Error al buscar archivos .mp3 en '$rutaBase'."
     Write-Error $_.Exception.Message
     exit
}


Write-Host "Procesando $($archivosMp3.Count) archivos encontrados..."
$contadorProcesados = 0
$contadorErrores = 0
$contadorConflictos = 0
$contadorNoMapeados = 0

foreach ($archivoActual in $archivosMp3) {
    $rutaCompletaActual = $archivoActual.FullName
    $nombreBaseOriginal = $archivoActual.BaseName # Nombre sin extensión
    $directorioPadre = $archivoActual.Directory

    Write-Verbose "--- Procesando Archivo: $rutaCompletaActual ---"

    # --- 2a. Determinar Modo ---
    $modoDetectadoOriginal = $null
    $nombreSinModo = $nombreBaseOriginal # Nombre si le quitamos el modo detectado

    # REGEX para extraer modo al final
    $regexModo = '^(.*?)(?:_|-)(EXPERTO|INFANTIL|NORMAL|SERIA|CACHONDO|CACHONDA)$'
    if ($nombreBaseOriginal -match $regexModo) {
        $nombreSinModo = $matches[1].Trim() # Nombre base sin el modo
        $modoDetectadoOriginal = $matches[2].ToUpper() # Modo detectado
         Write-Verbose "  Modo detectado del nombre: $modoDetectadoOriginal (Base sin modo: '$nombreSinModo')"
    } else {
        Write-Verbose "  No se detectó modo explícito en el nombre '$nombreBaseOriginal'."
        $nombreSinModo = $nombreBaseOriginal
    }

    # Aplicar reglas de mapeo de modo
    $modoFinal = $null
    if ($null -ne $modoDetectadoOriginal) {
        switch ($modoDetectadoOriginal) {
            "SERIA"     { $modoFinal = "NORMAL"; break }
            "CACHONDA"  { $modoFinal = "CACHONDO"; break }
            "CACHONDO"  { $modoFinal = "CACHONDO"; break }
            "NORMAL"    { $modoFinal = "NORMAL"; break }
            "INFANTIL"  { $modoFinal = "INFANTIL"; break }
            "EXPERTO"   { $modoFinal = "EXPERTO"; break }
            default     { $modoFinal = "EXPERTO" } # Default a Experto
        }
         Write-Verbose "  Modo mapeado desde sufijo: $modoFinal"
    } else {
        $modoFinal = "EXPERTO" # Default a Experto
         Write-Verbose "  Modo asignado por defecto (sin sufijo): $modoFinal"
    }


    # --- 2b. Determinar Clase (Label Exacto JSON) - LÓGICA MEJORADA v4 ---
    $labelExactoEncontrado = $null
    $matchMethod = "Ninguno"
    $possibleMatchLabel = $null # Guardar la coincidencia parcial por si no hay nada mejor

    # Normalizar nombres para búsqueda
    $normNombreSinModo = Normalize-StringForMatch -strIn $nombreSinModo
    $normDirPadre = if ($directorioPadre.FullName -ne $rutaBase) { Normalize-StringForMatch -strIn $directorioPadre.Name } else { $null }

    Write-Verbose "  -> Buscando clase para Norm(File): '$normNombreSinModo' | Norm(Dir): '$normDirPadre'"

    # Intento 0: Mapeo Manual (MÁXIMA PRIORIDAD)
    if ($normNombreSinModo -ne "" -and $manualLabelMap.ContainsKey($normNombreSinModo)) {
        $labelExactoEncontrado = $manualLabelMap[$normNombreSinModo]
        $matchMethod = "Mapeo Manual Nombre"
        Write-Verbose "       MATCH! (Intento 0 - Manual Nombre -> '$labelExactoEncontrado')"
    } elseif (($null -ne $normDirPadre) -and ($normDirPadre -ne "") -and $manualLabelMap.ContainsKey($normDirPadre)) {
         $labelExactoEncontrado = $manualLabelMap[$normDirPadre]
         $matchMethod = "Mapeo Manual Directorio"
         Write-Verbose "       MATCH! (Intento 0 - Manual Directorio -> '$labelExactoEncontrado')"
    }

    # Si no hay mapeo manual, intentar la lógica automática
    if ($null -eq $labelExactoEncontrado) {
        # Iterar sobre el mapa de labels automático para encontrar la mejor coincidencia
        foreach ($entry in $labelMap.GetEnumerator()) {
            $normLabelKey = $entry.Key # Clave normalizada del label JSON
            $exactLabelName = $entry.Value # Label exacto del JSON
            Write-Verbose "     > Comparando con Label: '$exactLabelName' (Norm: '$normLabelKey')"

            # Intento 1: Coincidencia exacta normalizada (Nombre Archivo)
            if ($normNombreSinModo -ne "" -and $normNombreSinModo -eq $normLabelKey) {
                $labelExactoEncontrado = $exactLabelName
                $matchMethod = "Nombre Exacto Norm."
                Write-Verbose "       MATCH! (Intento 1)"
                break # Encontrado, salir del bucle de labels
            }
            # Intento 2: Coincidencia exacta normalizada (Directorio Padre)
            if ($null -ne $normDirPadre -and $normDirPadre -ne "" -and $normDirPadre -eq $normLabelKey) {
                 $labelExactoEncontrado = $exactLabelName
                 $matchMethod = "Directorio Exacto Norm."
                 Write-Verbose "       MATCH! (Intento 2)"
                 break # Encontrado
            }
            # Intento 3: Label es numérico y sufijo del Nombre Normalizado
            if (($exactLabelName -match '^\d+$') -and ($normNombreSinModo -ne "") -and $normNombreSinModo.EndsWith($exactLabelName)) {
                $labelExactoEncontrado = $exactLabelName
                $matchMethod = "Sufijo Numérico Nombre"
                 Write-Verbose "       MATCH! (Intento 3)"
                break # Encontrado
            }
            # Intento 4: Label es numérico y sufijo del Directorio Normalizado
            if (($null -ne $normDirPadre) -and ($exactLabelName -match '^\d+$') -and ($normDirPadre -ne "") -and $normDirPadre.EndsWith($exactLabelName)) {
                 $labelExactoEncontrado = $exactLabelName
                 $matchMethod = "Sufijo Numérico Dir"
                 Write-Verbose "       MATCH! (Intento 4)"
                 break # Encontrado
            }
             # Intento 5: Label Normalizado CONTENIDO EN Nombre Normalizado (menos prioritario)
             if ($null -eq $labelExactoEncontrado -and $normLabelKey.Length -gt 3 -and $normNombreSinModo -ne "" -and $normNombreSinModo.Contains($normLabelKey)) {
                 $possibleMatchLabel = $exactLabelName # Guardamos como posible coincidencia
                 $matchMethod = "Label Contenido en Nombre"
                 Write-Verbose "       POSIBLE MATCH (Intento 5) - Puede ser '$exactLabelName'. Buscando coincidencias mejores..."
             }
             # Intento 6: Label Normalizado CONTENIDO EN Directorio Normalizado (menos prioritario)
             if (($null -eq $labelExactoEncontrado) -and ($null -ne $normDirPadre) -and $normLabelKey.Length -gt 3 -and $normDirPadre -ne "" -and $normDirPadre.Contains($normLabelKey)) {
                  if ($matchMethod -ne "Label Contenido en Nombre") { # Priorizar si ya hubo posible match por nombre
                       $possibleMatchLabel = $exactLabelName # Guardamos como posible coincidencia
                       $matchMethod = "Label Contenido en Dir"
                       Write-Verbose "       POSIBLE MATCH (Intento 6) - Puede ser '$exactLabelName'. Buscando coincidencias mejores..."
                  }
             }
        } # Fin foreach label automático

        # Si no encontramos coincidencia exacta/numérica/manual, pero sí una parcial por contenido, la usamos
        if ($null -eq $labelExactoEncontrado -and $null -ne $possibleMatchLabel) {
            $labelExactoEncontrado = $possibleMatchLabel
            $matchMethod = "Usando Coincidencia Parcial ($matchMethod)" # Ajustar el método para claridad
            Write-Verbose "  >> Usando coincidencia parcial encontrada ($matchMethod): '$labelExactoEncontrado'"
        }
    } # Fin if ($null -eq $labelExactoEncontrado) -> Lógica Automática

    if ($null -ne $labelExactoEncontrado){
        Write-Verbose "  >> Clase encontrada FINAL ($matchMethod): '$labelExactoEncontrado'"
    } else {
        Write-Verbose "  >> No se encontró clase coincidente para '$nombreSinModo' o '$($directorioPadre.Name)'."
    }
    # --- Fin Lógica Mejorada v4 ---


    # --- 2c. Construir Nuevo Nombre y Mover/Renombrar ---
    if ($null -ne $labelExactoEncontrado -and $null -ne $modoFinal) {
        # Construir nombre final según formato: 'LabelExacto-MODO.mp3'
        $targetFileName = "$($labelExactoEncontrado)-$($modoFinal).mp3"
        # Reemplazar caracteres inválidos en nombres de archivo Windows (:, \, /, ?, *, ", <, >, |) con _ si aparecen en el label
        $invalidChars = '[\\/:"*?<>|]'
        $targetFileName = $targetFileName -replace $invalidChars, '_'

        $targetPath = Join-Path $rutaBase $targetFileName

        # Verificar si el destino es diferente al origen
        if ($targetPath -eq $rutaCompletaActual) {
            Write-Host "Archivo '$($archivoActual.Name)' ya está en el lugar y nombre correctos. Ignorando." -ForegroundColor DarkGray
            $contadorProcesados++
            continue
        }

        # Verificar conflictos (si el archivo destino ya existe Y NO es el mismo archivo origen)
        if ((Test-Path $targetPath) -and ($targetPath -ne $rutaCompletaActual)) {
            Write-Warning "¡Conflicto! El archivo destino '$targetPath' ya existe. No se moverá ni renombrará '$($archivoActual.Name)'."
            $contadorConflictos++
            $contadorErrores++
        } else {
            # Mover y renombrar (¡¡¡ SIN -WhatIf !!!)
            Write-Host "Moviendo/Renombrando '$($archivoActual.Name)' a '$targetFileName'" -ForegroundColor Yellow
            try {
                # ASEGÚRATE DE HABER HECHO COPIA DE SEGURIDAD
                Move-Item -Path $rutaCompletaActual -Destination $targetPath -Force -ErrorAction Stop
                $contadorProcesados++
            } catch {
                Write-Error "Error al mover/renombrar '$($archivoActual.Name)' a '$targetPath'."
                Write-Error $_.Exception.Message
                $contadorErrores++
            }
        }
    } else {
        # No se pudo mapear la clase
        Write-Warning "No se pudo determinar la clase JSON para el archivo: '$($archivoActual.Name)' (Nombre base usado para búsqueda: '$nombreSinModo', Carpeta: '$($directorioPadre.Name)'). Se ignora."
        $contadorNoMapeados++
    }
} # Fin foreach archivoActual

Write-Host "--- Resumen del Proceso ---" -ForegroundColor Cyan
Write-Host "Archivos Procesados/Movidos con éxito: $contadorProcesados" -ForegroundColor Green
Write-Host "Archivos con Conflictos (no movidos): $contadorConflictos" -ForegroundColor Red
Write-Host "Archivos No Mapeados (ignorados): $contadorNoMapeados" -ForegroundColor Yellow
Write-Host "Errores Totales: $contadorErrores" -ForegroundColor Red
Write-Host "---------------------------"

# --- 3. Opcional: Limpiar Carpetas Vacías ---
# (Sin cambios, se deja con -WhatIf por seguridad)
Write-Host "Puedes ejecutar el siguiente comando MANUALMENTE para limpiar directorios vacíos (después de verificar todo):" -ForegroundColor Cyan
Write-Host 'Get-ChildItem -Path "' + $rutaBase + '" -Directory -Recurse | Where-Object { ($_.GetFiles().Count -eq 0) -and ($_.GetDirectories().Count -eq 0) } | Select-Object -ExpandProperty FullName'
Write-Host 'Get-ChildItem -Path "' + $rutaBase + '" -Directory -Recurse | Where-Object { ($_.GetFiles().Count -eq 0) -and ($_.GetDirectories().Count -eq 0) } | Remove-Item -Recurse -Verbose -WhatIf'
Write-Host "(Copia, pega y ejecuta el comando anterior. Revisa la salida de -WhatIf y luego quítalo para borrar de verdad)"
Write-Host "¡Proceso completado!" -ForegroundColor Green