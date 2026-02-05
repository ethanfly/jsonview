# Pre-download NSIS for Tauri Windows installer (avoids build timeout)
# Run from project root: powershell -ExecutionPolicy Bypass -File scripts/ensure-nsis-windows.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$TauriTarget = Join-Path $ProjectRoot "src-tauri\target"
$TauriToolsDir = Join-Path $TauriTarget ".tauri"
$NsisDir = Join-Path $TauriToolsDir "NSIS"
$Makensis = Join-Path $NsisDir "makensis.exe"

$NsisUrls = @(
    "https://github.com/tauri-apps/binary-releases/releases/download/nsis-3.11/nsis-3.11.zip",
    "https://github.com/tauri-apps/binary-releases/releases/download/nsis-3/nsis-3.zip"
)
$NsisUtilsUrl = "https://github.com/tauri-apps/nsis-tauri-utils/releases/download/nsis_tauri_utils-v0.5.3/nsis_tauri_utils.dll"
$TimeoutSec = 600
$Retries = 3

function Invoke-DownloadWithRetry {
    param([string]$Url, [string]$OutPath, [string]$Description)
    $attempt = 0
    while ($true) {
        $attempt++
        try {
            Write-Host "Downloading $Description (attempt $attempt/$Retries)..."
            Invoke-WebRequest -Uri $Url -OutFile $OutPath -UseBasicParsing -TimeoutSec $TimeoutSec
            return
        }
        catch {
            if ($attempt -ge $Retries) {
                throw "Download failed: $Description - $_"
            }
            Write-Host "Download failed, retry in 5s..."
            Start-Sleep -Seconds 5
        }
    }
}

if (Test-Path $Makensis) {
    Write-Host "NSIS already present, skip download."
    exit 0
}

foreach ($name in @("nsis-3.11", "nsis-3")) {
    $dir = Join-Path $TauriToolsDir $name
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir
    }
}

if (-not (Test-Path $TauriToolsDir)) {
    New-Item -ItemType Directory -Path $TauriToolsDir -Force | Out-Null
}

$ZipPath = Join-Path $TauriToolsDir "nsis.zip"
$NsisZipUrl = $null
foreach ($url in $NsisUrls) {
    try {
        Invoke-DownloadWithRetry -Url $url -OutPath $ZipPath -Description "NSIS"
        $NsisZipUrl = $url
        break
    }
    catch {
        Write-Host "URL not available, try next: $url"
    }
}
if (-not $NsisZipUrl) {
    Write-Error "All NSIS download URLs failed."
}

Write-Host "Extracting NSIS..."
Expand-Archive -Path $ZipPath -DestinationPath $TauriToolsDir -Force
Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue

$ExtractedFolder = $null
foreach ($name in @("nsis-3.11", "nsis-3")) {
    $dir = Join-Path $TauriToolsDir $name
    if (Test-Path $dir) {
        $ExtractedFolder = $dir
        break
    }
}
if (-not $ExtractedFolder) {
    Write-Error "Extracted folder nsis-3.11 or nsis-3 not found."
}
if (Test-Path $NsisDir) {
    Remove-Item -Recurse -Force $NsisDir
}
Rename-Item -Path $ExtractedFolder -NewName "NSIS"

$PluginDir = Join-Path $NsisDir "Plugins\x86-unicode\additional"
if (-not (Test-Path $PluginDir)) {
    New-Item -ItemType Directory -Path $PluginDir -Force | Out-Null
}

$DllPath = Join-Path $PluginDir "nsis_tauri_utils.dll"
Invoke-DownloadWithRetry -Url $NsisUtilsUrl -OutPath $DllPath -Description "nsis_tauri_utils.dll"

Write-Host "NSIS ready. Run npm run build to create installer."
exit 0
