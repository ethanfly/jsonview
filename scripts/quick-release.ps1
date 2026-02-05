# Quick Release Script
param(
    [string]$Message = "Bug fixes and improvements"
)

Write-Host "Quick Release" -ForegroundColor Cyan
Write-Host ""

$packageJson = Get-Content package.json -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Host "Current version: $currentVersion" -ForegroundColor Yellow

$versionParts = $currentVersion.Split('.')
$major = $versionParts[0]
$minor = $versionParts[1]
$patch = [int]$versionParts[2] + 1
$newVersion = "$major.$minor.$patch"

Write-Host "New version: $newVersion" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"
if ($confirm -eq "y" -or $confirm -eq "Y") {
    $scriptPath = Join-Path $PSScriptRoot "release.ps1"
    & $scriptPath -Version $newVersion -Message $Message
} else {
    Write-Host "Cancelled" -ForegroundColor Yellow
}
