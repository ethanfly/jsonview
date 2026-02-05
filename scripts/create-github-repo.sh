#!/usr/bin/env bash
# 使用 GitHub CLI 创建仓库并推送（需先安装 gh 并登录: https://cli.github.com/）
# 用法: ./scripts/create-github-repo.sh [repo-name] [private]
# 示例: ./scripts/create-github-repo.sh jsonview          # 公开
#       ./scripts/create-github-repo.sh jsonview private   # 私有

REPO_NAME="${1:-jsonview}"
PRIVATE="${2:-}"
DESCRIPTION="JSON Viewer - 跨平台 JSON 桌面阅读/编辑工具 (Tauri + Vue 3)"

if [[ "$PRIVATE" == "private" ]]; then
  gh repo create "$REPO_NAME" --private --source . --remote origin --push --description "$DESCRIPTION"
else
  gh repo create "$REPO_NAME" --public --source . --remote origin --push --description "$DESCRIPTION"
fi

if [[ $? -eq 0 ]]; then
  echo "Done. Repo: $(gh repo view --json url -q .url)"
  echo "Enable Actions: Settings -> Actions -> General -> Allow all actions."
fi
