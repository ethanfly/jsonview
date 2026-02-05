# GitHub Actions 自动构建使用指南

## 🎯 概述

GitHub Actions 已配置为自动构建多平台安装包，支持 Windows、macOS 和 Linux。

## 🚀 触发构建的方式

### 1. 手动触发（推荐用于测试）
1. 访问 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Build and Release" 工作流
4. 点击 "Run workflow" 按钮
5. 选择分支（通常是 main）
6. 点击绿色的 "Run workflow" 按钮

### 2. 推送代码触发
```bash
git add .
git commit -m "更新说明"
git push origin main
```
推送到 `main` 或 `release` 分支会自动触发构建。

### 3. 创建标签触发（推荐用于发布）
```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```
创建 `v*` 格式的标签会触发构建并创建 GitHub Release。

## 📦 构建平台和产物

### Windows (windows-latest)
**构建产物**:
- `JSON Viewer_0.1.0_x64-setup.exe` - NSIS 安装包（推荐）
- `JSON Viewer_0.1.0_x64_en-US.msi` - MSI 安装包

**特性**:
- ✅ 中文安装界面
- ✅ 文件关联 (.json)
- ✅ 开始菜单快捷方式
- ✅ 自动安装 NSIS

### macOS (macos-latest)
**构建产物**:
- `JSON Viewer_0.1.0_aarch64.dmg` - Apple Silicon (M1/M2/M3)
- `JSON Viewer_0.1.0_x64.dmg` - Intel

**特性**:
- ✅ 通用二进制
- ✅ 代码签名（需配置）
- ✅ 拖放安装

### Linux (ubuntu-22.04)
**构建产物**:
- `json-viewer_0.1.0_amd64.deb` - Debian/Ubuntu
- `json-viewer-0.1.0-1.x86_64.rpm` - RedHat/Fedora/CentOS
- `json-viewer_0.1.0_amd64.AppImage` - 通用格式

**特性**:
- ✅ 多种包格式
- ✅ 系统集成
- ✅ 文件关联

## 🔧 构建流程说明

### 步骤 1: 环境准备
```yaml
- Checkout 代码
- 安装系统依赖（Linux: webkit2gtk, Ubuntu: libappindicator）
- 安装 NSIS（Windows）
- 设置 Node.js (LTS)
- 设置 Rust (stable)
- Rust 缓存
```

### 步骤 2: 依赖安装
```yaml
- npm ci（安装前端依赖）
```

### 步骤 3: 构建和发布
```yaml
- 使用 tauri-action 构建
- 自动创建 GitHub Release（草稿）
- 上传构建产物
```

## 📊 构建时间估算

| 平台 | 首次构建 | 缓存后 |
|------|----------|--------|
| Windows | ~15-20分钟 | ~8-10分钟 |
| macOS (2个目标) | ~20-25分钟 | ~10-12分钟 |
| Linux | ~10-15分钟 | ~5-8分钟 |

**总计**: 首次约 45-60 分钟，缓存后约 23-30 分钟

## 🎯 发布流程

### 开发版本（测试）
```bash
# 推送到 main 分支
git push origin main
```
- 构建完成后，在 Actions 页面下载产物
- Release 为草稿状态，不会公开

### 正式版本（发布）
```bash
# 1. 更新版本号
# 编辑 src-tauri/tauri.conf.json 和 package.json

# 2. 提交更改
git add .
git commit -m "Release v1.0.0"

# 3. 创建标签
git tag v1.0.0
git push origin main
git push origin v1.0.0
```
- 构建完成后，在 Releases 页面编辑草稿
- 添加更新日志
- 点击 "Publish release" 发布

## 🔐 配置说明

### 必需的 Secrets
- `GITHUB_TOKEN` - 自动提供，无需配置

### 可选的 Secrets（用于代码签名）
- `APPLE_CERTIFICATE` - macOS 代码签名证书
- `APPLE_CERTIFICATE_PASSWORD` - 证书密码
- `APPLE_ID` - Apple ID
- `APPLE_PASSWORD` - App 专用密码
- `WINDOWS_CERTIFICATE` - Windows 代码签名证书
- `WINDOWS_CERTIFICATE_PASSWORD` - 证书密码

## 🐛 故障排查

### 问题 1: NSIS 未找到（Windows）
**症状**: `makensis.exe not found`
**解决**: 已在配置中添加 NSIS 安装步骤

### 问题 2: 依赖安装失败（Linux）
**症状**: `webkit2gtk not found`
**解决**: 已在配置中添加依赖安装步骤

### 问题 3: Rust 编译失败
**症状**: `cargo build failed`
**解决**: 
1. 检查 Rust 代码语法
2. 本地运行 `cargo check`
3. 查看 Actions 日志详细错误

### 问题 4: 前端构建失败
**症状**: `vite build failed`
**解决**:
1. 本地运行 `npm run build:web`
2. 检查 TypeScript 错误
3. 查看 Actions 日志

## 📝 最佳实践

### 1. 版本号管理
保持以下文件版本号一致：
- `package.json` - `"version": "1.0.0"`
- `src-tauri/tauri.conf.json` - `"version": "1.0.0"`
- Git 标签 - `v1.0.0`

### 2. 提交信息
使用清晰的提交信息：
```bash
git commit -m "feat: 添加新功能"
git commit -m "fix: 修复 bug"
git commit -m "chore: 更新依赖"
```

### 3. 测试流程
1. 本地开发测试: `npm run tauri:dev`
2. 本地构建测试: `npm run build`
3. 推送到 GitHub 触发 CI
4. 下载产物测试
5. 创建标签发布

### 4. Release 说明
编写清晰的 Release Notes：
```markdown
## 新功能
- 添加了 XXX 功能

## 改进
- 优化了 XXX 性能

## 修复
- 修复了 XXX 问题

## 下载
选择适合您系统的安装包下载
```

## 🎉 快速开始

### 第一次发布
```bash
# 1. 确保代码已提交
git add .
git commit -m "准备发布 v1.0.0"

# 2. 创建标签
git tag v1.0.0

# 3. 推送
git push origin main
git push origin v1.0.0

# 4. 等待构建完成（约 30 分钟）

# 5. 访问 GitHub Releases 页面
# 6. 编辑草稿，添加说明
# 7. 点击 "Publish release"
```

## 📚 相关资源

- [Tauri Actions 文档](https://github.com/tauri-apps/tauri-action)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [NSIS 文档](https://nsis.sourceforge.io/Docs/)
