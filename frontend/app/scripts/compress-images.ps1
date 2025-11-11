[CmdletBinding()]
param(
  [string]$ImagesRoot = 'assets/monuments',
  [long]$MaxBytes = 3MB,
  [int]$MaxDimension = 2800,
  [double]$ScaleStep = 0.85,
  [double]$MinScale = 0.2
)

Add-Type -AssemblyName System.Drawing

function Get-JpegCodec {
  return [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
}

function New-ScaledBitmap {
  param(
    [System.Drawing.Image]$Source,
    [double]$Scale
  )
  $newWidth = [int][Math]::Max(1, [Math]::Round($Source.Width * $Scale))
  $newHeight = [int][Math]::Max(1, [Math]::Round($Source.Height * $Scale))
  $bitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($Source, 0, 0, $newWidth, $newHeight)
  $graphics.Dispose()
  return $bitmap
}

function Save-WithQuality {
  param(
    [System.Drawing.Image]$Image,
    [string]$Path,
    [long]$Quality,
    [System.Drawing.Imaging.ImageCodecInfo]$Codec
  )
  $encoder = [System.Drawing.Imaging.Encoder]::Quality
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, $Quality)
  $Image.Save($Path, $Codec, $encoderParams)
  $encoderParams.Dispose()
}

$rootPath = Resolve-Path $ImagesRoot
$codec = Get-JpegCodec
if (-not $codec) {
  throw 'JPEG codec not found.'
}

$qualitySteps = 85,75,70,65,60,55,50,45,40,35,30
$files = Get-ChildItem -Path $rootPath -Recurse -File -Include *.jpg,*.jpeg

foreach ($file in $files) {
  if ($file.Length -le $MaxBytes) { continue }
  Write-Host ('-> Compressing {0} ({1} MB)' -f $file.FullName, [Math]::Round($file.Length/1MB,2))
  $original = $null
  $stream = $null
  try {
    $stream = New-Object System.IO.MemoryStream ([System.IO.File]::ReadAllBytes($file.FullName), $false)
    $original = [System.Drawing.Image]::FromStream($stream)
  } catch {
    Write-Warning ('  Failed to load image: {0}' -f $_.Exception.Message)
    if ($stream) { $stream.Dispose() }
    continue
  }

  $scale = [Math]::Min(1.0, [Math]::Min($MaxDimension / $original.Width, $MaxDimension / $original.Height))
  if ($scale -le 0) { $scale = 1.0 }
  $success = $false

  while (-not $success -and $scale -ge $MinScale) {
    $resized = $null
    try {
      if ($scale -lt 0.999) {
        $resized = New-ScaledBitmap -Source $original -Scale $scale
      } else {
        $resized = New-ScaledBitmap -Source $original -Scale 1.0
      }
      foreach ($quality in $qualitySteps) {
        $tempFile = [System.IO.Path]::GetTempFileName()
        try {
          Save-WithQuality -Image $resized -Path $tempFile -Quality $quality -Codec $codec
          $tempSize = (Get-Item $tempFile).Length
          if ($tempSize -le $MaxBytes) {
            Move-Item -LiteralPath $tempFile -Destination $file.FullName -Force
            Write-Host ('   OK Saved at quality {0} (scale {1}) -> {2} MB' -f $quality, [Math]::Round($scale,2), [Math]::Round($tempSize/1MB,2))
            $success = $true
            break
          }
        } catch {
          Write-Warning ('   Failed at quality {0}: {1}' -f $quality, $_.Exception.Message)
        } finally {
          if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        }
      }
    } finally {
      if ($resized) { $resized.Dispose() }
    }

    if (-not $success) {
      $scale *= $ScaleStep
      Write-Host ('   Retry with smaller scale ({0})' -f [Math]::Round($scale,2))
    }
  }

  if (-not $success) {
    Write-Warning ('  Could not reduce {0} below target size.' -f $file.Name)
  }

  $original.Dispose()
  $stream.Dispose()
}
