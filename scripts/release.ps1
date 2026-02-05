# JSON Viewer Release Script
# Usage: .\scripts\release.ps1 -Patch|-Minor|-Major|-Version x.y.z

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Message = "Release new version",
    
    [Parameter(Mandatory=$false)]
    [switch]$Major,
    
    [Parameter(Mandatory=$false)]
    [switch]$Minor,
    
    [Parameter(Mandatory=$false)]
    [switch]$Patch,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

function Write-Success { param($msg) Write-Host "OK $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "ERROR $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "INFO $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "WARN $msg" -ForegroundColor Yellow }

function Write-JsonNoBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][object]$Object
    )

    $json = $Object | ConvertTo-Json -Depth 100
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $Path), $json, $utf8NoBom)
}

# Check if in Git repository
if (-not (Test-Path .git)) {
    Write-Error "Not a Git repository"
    exit 1
}

Write-Info "JSON Viewer Release Script"
Write-Host ""

# Check working directory status
Write-Info "Checking working directory..."
$status = git status --porcelain
if ($status -and -not $DryRun) {
    Write-Warning "Uncommitted changes found:"
    git status --short
    $continue = Read-Host "Continue? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Info "Cancelled"
        exit 0
    }
}

# Get current version
Write-Info "Reading current version..."
$packageJson = Get-Content package.json -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Info "Current version: $currentVersion"

# Calculate new version
if (-not $Version) {
    if ($Major -or $Minor -or $Patch) {
        $versionParts = $currentVersion.Split('.')
        $majorVer = [int]$versionParts[0]
        $minorVer = [int]$versionParts[1]
        $patchVer = [int]$versionParts[2]
        
        if ($Major) {
            $majorVer++
            $minorVer = 0
            $patchVer = 0
        } elseif ($Minor) {
            $minorVer++
            $patchVer = 0
        } elseif ($Patch) {
            $patchVer++
        }
        
        $Version = "$majorVer.$minorVer.$patchVer"
    } else {
        Write-Error "Please specify version or use -Major/-Minor/-Patch"
        Write-Info "Example: .\scripts\release.ps1 -Version 1.0.0"
        Write-Info "Or: .\scripts\release.ps1 -Patch"
        exit 1
    }
}

Write-Success "New version: $Version"

# Update version numbers
if (-not $DryRun) {
    Write-Info "Updating package.json..."
    $packageJson.version = $Version
    Write-JsonNoBom -Path "package.json" -Object $packageJson
    
    Write-Info "Updating src-tauri/tauri.conf.json..."
    $tauriConfig = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
    $tauriConfig.version = $Version
    Write-JsonNoBom -Path "src-tauri/tauri.conf.json" -Object $tauriConfig
    
    Write-Info "Updating src-tauri/Cargo.toml..."
    $cargoContent = Get-Content src-tauri/Cargo.toml -Raw
    $cargoContent = $cargoContent -replace 'version = "[\d\.]+"', "version = `"$Version`""
    $cargoContent | Set-Content src-tauri/Cargo.toml -Encoding UTF8
    
    Write-Success "Version numbers updated"
} else {
    Write-Warning "[DRY RUN] Skipping version update"
}

# Local build test
if (-not $SkipBuild) {
    Write-Info "Running local build test..."
    
    Write-Info "Building frontend..."
    npm run build:web
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed"
        exit 1
    }
    Write-Success "Frontend build successful"
    
    Write-Info "Checking Rust code..."
    cargo check --manifest-path src-tauri/Cargo.toml
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Rust check failed"
        exit 1
    }
    Write-Success "Rust check passed"
} else {
    Write-Warning "Skipping build test"
}

# Git commit
if (-not $DryRun) {
    Write-Info "Committing to Git..."
    git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
    git commit -m "chore: bump version to $Version"
    Write-Success "Committed version update"
} else {
    Write-Warning "[DRY RUN] Skipping Git commit"
}

# Create Git tag
if (-not $DryRun) {
    Write-Info "Creating Git tag v$Version..."
    git tag -a "v$Version" -m "$Message"
    Write-Success "Created tag v$Version"
} else {
    Write-Warning "[DRY RUN] Skipping tag creation"
}

# Push to GitHub
if (-not $DryRun) {
    Write-Info "Pushing to GitHub..."
    
    Write-Info "Pushing code..."
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to push code"
        exit 1
    }
    
    Write-Info "Pushing tag..."
    git push origin "v$Version"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to push tag"
        exit 1
    }
    
    Write-Success "Pushed to GitHub"
} else {
    Write-Warning "[DRY RUN] Skipping push to GitHub"
}

# Complete
Write-Host ""
Write-Success "Release process complete!"
Write-Info "Version: v$Version"
Write-Info "GitHub Actions will build and create Release"
Write-Info "Estimated time: 30-50 minutes"
Write-Host ""
Write-Info "View build progress:"
Write-Host "  https://github.com/YOUR_USERNAME/jsonview/actions" -ForegroundColor Yellow
Write-Host ""
Write-Info "After build completes, edit and publish Release:"
Write-Host "  https://github.com/YOUR_USERNAME/jsonview/releases" -ForegroundColor Yellow
Write-Host ""
