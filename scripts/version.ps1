# Version Management Tool
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("show", "set", "bump")]
    [string]$Action = "show",
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("major", "minor", "patch")]
    [string]$Type = "patch"
)

function Write-Success { param($msg) Write-Host "OK $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "ERROR $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "INFO $msg" -ForegroundColor Cyan }

function Write-JsonNoBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][object]$Object
    )

    $json = $Object | ConvertTo-Json -Depth 100
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $Path), $json, $utf8NoBom)
}

function Get-CurrentVersions {
    $packageVersion = (Get-Content package.json -Raw | ConvertFrom-Json).version
    $tauriVersion = (Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json).version
    $cargoContent = Get-Content src-tauri/Cargo.toml -Raw
    $cargoVersion = if ($cargoContent -match 'version = "([^"]+)"') { $matches[1] } else { "Not found" }
    
    return @{
        Package = $packageVersion
        Tauri = $tauriVersion
        Cargo = $cargoVersion
    }
}

function Set-Version {
    param([string]$NewVersion)
    
    Write-Info "Updating version to $NewVersion..."
    
    # Update package.json
    $packageJson = Get-Content package.json -Raw | ConvertFrom-Json
    $packageJson.version = $NewVersion
    Write-JsonNoBom -Path "package.json" -Object $packageJson
    Write-Success "Updated package.json"
    
    # Update tauri.conf.json
    $tauriConfig = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
    $tauriConfig.version = $NewVersion
    Write-JsonNoBom -Path "src-tauri/tauri.conf.json" -Object $tauriConfig
    Write-Success "Updated tauri.conf.json"
    
    # Update Cargo.toml
    $cargoContent = Get-Content src-tauri/Cargo.toml -Raw
    $cargoContent = $cargoContent -replace 'version = "[\d\.]+"', "version = `"$NewVersion`""
    $cargoContent | Set-Content src-tauri/Cargo.toml -Encoding UTF8
    Write-Success "Updated Cargo.toml"
    
    Write-Success "Version updated to $NewVersion"
}

function Show-Versions {
    $versions = Get-CurrentVersions
    
    Write-Host ""
    Write-Host "Current Versions" -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    Write-Host "  package.json:      " -NoNewline
    Write-Host $versions.Package -ForegroundColor Yellow
    Write-Host "  tauri.conf.json:   " -NoNewline
    Write-Host $versions.Tauri -ForegroundColor Yellow
    Write-Host "  Cargo.toml:        " -NoNewline
    Write-Host $versions.Cargo -ForegroundColor Yellow
    Write-Host "----------------------------------------"
    
    if ($versions.Package -eq $versions.Tauri -and $versions.Package -eq $versions.Cargo) {
        Write-Success "All versions match"
    } else {
        Write-Error "Versions do not match!"
    }
    Write-Host ""
}

function Bump-Version {
    param([string]$BumpType)
    
    $versions = Get-CurrentVersions
    $currentVersion = $versions.Package
    
    $versionParts = $currentVersion.Split('.')
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    $patch = [int]$versionParts[2]
    
    switch ($BumpType) {
        "major" {
            $major++
            $minor = 0
            $patch = 0
        }
        "minor" {
            $minor++
            $patch = 0
        }
        "patch" {
            $patch++
        }
    }
    
    $newVersion = "$major.$minor.$patch"
    
    Write-Info "Current version: $currentVersion"
    Write-Info "New version: $newVersion ($BumpType)"
    Write-Host ""
    
    $confirm = Read-Host "Confirm update? (y/N)"
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        Set-Version -NewVersion $newVersion
    } else {
        Write-Info "Cancelled"
    }
}

# Main logic
switch ($Action) {
    "show" {
        Show-Versions
    }
    "set" {
        if (-not $Version) {
            Write-Error "Please specify version: -Version x.y.z"
            exit 1
        }
        
        if ($Version -notmatch '^\d+\.\d+\.\d+$') {
            Write-Error "Invalid version format, should be x.y.z (e.g. 1.0.0)"
            exit 1
        }
        
        Set-Version -NewVersion $Version
        Write-Host ""
        Show-Versions
    }
    "bump" {
        Bump-Version -BumpType $Type
        Write-Host ""
        Show-Versions
    }
}
