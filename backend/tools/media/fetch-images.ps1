[CmdletBinding()]
param(
  [string]$TenantId = 'parque_europa',
  [string]$ManifestPath,
  [string]$OutputDirectory,
  [string]$AttributionFile,
  [switch]$IncludeRisky,
  [switch]$DryRun
)

$mediaRoot = Join-Path -Path (Join-Path 'backend/tenants' $TenantId) -ChildPath 'media'
if (-not $ManifestPath) {
  $ManifestPath = Join-Path $mediaRoot 'slider.manifest.json'
}
if (-not $OutputDirectory) {
  $OutputDirectory = Join-Path $mediaRoot 'monuments'
}
if (-not $AttributionFile) {
  $AttributionFile = Join-Path $mediaRoot 'ATTRIBUTIONS.json'
}

function Get-Manifest {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Manifest file '$Path' not found."
  }
  $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
  return $raw | ConvertFrom-Json
}

function Strip-Html {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $noTags = [System.Text.RegularExpressions.Regex]::Replace($Value, '<[^>]+>', '')
  return $noTags.Replace('&nbsp;', ' ').Trim()
}

function Normalize-FileName {
  param([string]$Title)
  if (-not $Title) { return 'wikimedia_asset.png' }
  $name = $Title -replace '^File:', ''
  $name = $name -replace '[^A-Za-z0-9_.-]+', '_'
  $name = $name -replace '_+', '_'
  return $name.ToLowerInvariant()
}

function Get-RelativePath {
  param([string]$AbsolutePath)
  $root = (Get-Location).ProviderPath
  $normalizedRoot = $root.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if ($AbsolutePath.StartsWith($normalizedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    $relative = $AbsolutePath.Substring($normalizedRoot.Length)
  } else {
    $relative = $AbsolutePath
  }
  return $relative -replace '\\', '/'
}

function New-QueryString {
  param([hashtable]$Parameters)
  $pairs = foreach ($key in $Parameters.Keys) {
    $escapedKey = [System.Uri]::EscapeDataString([string]$key)
    $escapedValue = [System.Uri]::EscapeDataString([string]$Parameters[$key])
    \"$escapedKey=$escapedValue\"
  }
  return [string]::Join('&', $pairs)
}

function Get-WikimediaMetadata {
  param([string]$FileTitle)
  $api = 'https://commons.wikimedia.org/w/api.php'
  $query = @{
    action    = 'query'
    format    = 'json'
    prop      = 'imageinfo'
    titles    = $FileTitle
    iiprop    = 'url|dimensions|extmetadata|size|timestamp'
    iiurlwidth = '2048'
  }
  $uri = \"$api?$(New-QueryString -Parameters $query)\"
  $response = Invoke-RestMethod -Uri $uri -Method Get -ErrorAction Stop
  $page = $response.query.pages.GetEnumerator() | Select-Object -First 1 | ForEach-Object { $_.Value }
  if (-not $page.imageinfo) {
    throw "No se encontró metadata para $FileTitle"
  }
  return $page.imageinfo[0]
}


try {
  $manifestFull = Convert-Path $ManifestPath
  $rootPath = Get-Location
  $outputFull = [System.IO.Path]::GetFullPath((Join-Path $rootPath $OutputDirectory))
  $attribFull = [System.IO.Path]::GetFullPath((Join-Path $rootPath $AttributionFile))

  $manifest = Get-Manifest -Path $manifestFull
  $monuments = @()
  if ($manifest.monuments -is [System.Collections.IEnumerable]) {
    $monuments = $manifest.monuments
  }
  if (-not $monuments.Count) {
    Write-Warning 'No monuments found in manifest.'
    return
  }

  $attributions = @{}
  if (Test-Path -LiteralPath $attribFull) {
    try {
      $existingRaw = Get-Content -LiteralPath $attribFull -Raw
      $attributions = $existingRaw | ConvertFrom-Json
    } catch {
      Write-Warning "Failed to parse existing attributions: $($_.Exception.Message)"
      $attributions = @{}
    }
  }

  $downloaded = 0
  foreach ($monument in $monuments) {
    $slug = $monument.slug
    if (-not $slug) {
      Write-Warning 'Skipping entry without slug'
      continue
    }
    if ($monument.license_note -and -not $IncludeRisky.IsPresent) {
      Write-Host "Skipping $slug ($($monument.title)) por licencia: $($monument.license_note)"
      continue
    }
    $files = $monument.wikimedia_files
    if (-not $files) {
      Write-Warning "No files listed for $slug"
      continue
    }

    $slugDir = Join-Path $outputFull $slug
    if (-not $DryRun.IsPresent) {
      New-Item -ItemType Directory -Path $slugDir -Force | Out-Null
    }

    $collected = @()
    foreach ($fileTitle in $files) {
      try {
        $meta = Get-WikimediaMetadata -FileTitle $fileTitle
        $fileName = Normalize-FileName -Title $fileTitle
        $target = Join-Path $slugDir $fileName
        $absoluteTarget = [System.IO.Path]::GetFullPath($target)
        $ext = $meta.extmetadata
        $licenseValue = $null
        if ($ext -and $ext.LicenseShortName.value) {
          $licenseValue = $ext.LicenseShortName.value
        } elseif ($ext -and $ext.License.value) {
          $licenseValue = $ext.License.value
        }

        if (-not $DryRun) {
          Invoke-WebRequest -Uri $meta.url -OutFile $absoluteTarget -ErrorAction Stop | Out-Null
        }
        $link = if ($meta.descriptionurl) { $meta.descriptionurl } else { $meta.url }
        $collected += [PSCustomObject]@{
          title      = $monument.title
          filename   = $fileName
          url        = $link
          localPath  = Get-RelativePath -AbsolutePath $absoluteTarget
          width      = $meta.width
          height     = $meta.height
          author     = Strip-Html ($ext.Artist.value)
          credit     = Strip-Html ($ext.Credit.value)
          license    = Strip-Html $licenseValue
          licenseUrl = Strip-Html ($ext.LicenseUrl.value)
          source     = $meta.url
          retrievedAt = (Get-Date).ToString('o')
        }
        $downloaded += 1
        Write-Host "[OK] $slug -> $fileName"
      } catch {
        Write-Warning "Error downloading $fileTitle ($slug): $($_.Exception.Message)"
      }
    }

    if ($collected.Count -gt 0) {
      $attributions[$slug] = $collected
    }
  }

  if (-not $DryRun.IsPresent) {
    $attribDir = Split-Path $attribFull -Parent
    if ($attribDir -and -not (Test-Path $attribDir)) {
      New-Item -ItemType Directory -Path $attribDir -Force | Out-Null
    }
    $json = ($attributions | ConvertTo-Json -Depth 6)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($attribFull, $json + [Environment]::NewLine, $utf8)
  }

  Write-Host "Descargas completadas: $downloaded"
  if ($DryRun) {
    Write-Host 'Ejecución en modo dry-run, no se escribieron archivos.'
  } else {
    Write-Host "Archivo de atribuciones actualizado en $AttributionFile"
  }
} catch {
  Write-Error $_
  exit 1
}
