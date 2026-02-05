# 使用 GitHub CLI 创建仓库并推送（需先安装 gh 并登录: https://cli.github.com/）
# 用法: .\scripts\create-github-repo.ps1 -RepoName jsonview -IsPrivate $false

param(
  [Parameter(Mandatory = $true)]
  [string]$RepoName,
  [bool]$IsPrivate = $false,
  [string]$Description = "JSON Viewer - 跨平台 JSON 桌面阅读/编辑工具 (Tauri + Vue 3)"
)

Write-Host "Creating GitHub repo: $RepoName ..."
if ($IsPrivate) {
  gh repo create $RepoName --private --source . --remote origin --push --description $Description
} else {
  gh repo create $RepoName --public --source . --remote origin --push --description $Description
}
if ($LASTEXITCODE -eq 0) {
  Write-Host "Done. Repo: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)"
  Write-Host "Enable Actions: Settings -> Actions -> General -> Allow all actions."
}
