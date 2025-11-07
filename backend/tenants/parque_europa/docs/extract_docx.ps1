# Script para extraer contenido de archivos DOCX
param(
    [string]$InputFile,
    [string]$OutputFile
)

try {
    # Crear objeto de Word
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    # Abrir documento
    $doc = $word.Documents.Open((Resolve-Path $InputFile).Path)
    
    # Extraer texto completo
    $text = $doc.Content.Text
    
    # Guardar en archivo
    $text | Out-File -FilePath $OutputFile -Encoding UTF8
    
    # Cerrar documento y Word
    $doc.Close()
    $word.Quit()
    
    Write-Host "Contenido extraído exitosamente a: $OutputFile"
}
catch {
    Write-Error "Error al extraer contenido: $($_.Exception.Message)"
}
finally {
    # Limpiar objetos COM
    if ($doc) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null }
    if ($word) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
