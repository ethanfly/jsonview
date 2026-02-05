# GitHub Actions 故障排查指南

## 🔍 常见错误及解决方案

### 1. 构建失败 - 所有平台

#### 可能原因 A: 依赖安装失败
**症状**: `npm ci` 或 `npm install` 失败
**解决方案**:
```yaml
# 确保 package-lock.json 已提交
git add package-lock.json
git commit -m "chore: add package-lock.json"
git push
```

#### 可能原因 B: Rust 编译错误
**症状**: `cargo build` 失败
**解决方案**:
```bash
# 本地验证 Rust 代码
cargo check --manifest-path src-tauri/Cargo.toml
cargo build --manifest-path src-tauri/Cargo.toml
```

#### 可能原因 C: 前端构建错误
**症状**: `vite build` 失败
**解决方案**:
```bash
# 本地验证前端构建
npm run build:web
```

### 2. Windows 构建失败

#### 可能原因: NSIS 未安装或路径问题
**症状**: `makensis.exe not found`
**当前配置**: 已移除 NSIS 安装步骤，使用 Tauri 内置工具

**如需手动安装 NSIS**:
```yaml
- name: Install NSIS (Windows only)
  if: matrix.platform == 'windows-latest'
  run: |
    choco install nsis -y
```

### 3. macOS 构建失败

#### 可能原因: 目标架构未安装
**症状**: `target not found: aarch64-apple-darwin`
**解决方案**: 已在配置中添加目标架构安装

### 4. Linux 构建失败

#### 可能原因: 系统依赖缺失
**症状**: `webkit2gtk not found`
**解决方案**: 已在配置中添加依赖安装步骤

## 🔧 调试步骤

### 步骤 1: 查看详细日志
1. 访问 GitHub Actions 页面
2. 点击失败的构建
3. 展开每个步骤查看详细输出
4. 查找红色错误信息

### 步骤 2: 本地复现
```bash
# 1. 清理环境
rm -rf node_modules dist src-tauri/target

# 2. 重新安装依赖
npm ci

# 3. 构建前端
npm run build:web

# 4. 检查 Rust
cd src-tauri
cargo check
cargo build

# 5. 完整构建
cd ..
npm run build
```

### 步骤 3: 检查配置文件

#### package.json
```json
{
  "scripts": {
    "build:web": "vite build"
  }
}
```

#### tauri.conf.json
```json
{
  "build": {
    "beforeBuildCommand": "npm run build:web",
    "frontendDist": "../dist"
  }
}
```

## 📋 检查清单

### 代码检查
- [ ] `npm run build:web` 本地成功
- [ ] `cargo check` 无错误
- [ ] `cargo build` 成功
- [ ] 所有文件已提交到 Git

### 配置检查
- [ ] `package.json` 版本号正确
- [ ] `tauri.conf.json` 版本号正确
- [ ] `Cargo.toml` 版本号正确
- [ ] `package-lock.json` 已提交

### GitHub 检查
- [ ] 仓库有写入权限
- [ ] Actions 已启用
- [ ] 没有语法错误在 YAML 文件中

## 🎯 简化配置（推荐）

如果持续失败，使用这个最简配置：

```yaml
name: Build

on:
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        platform: [ubuntu-22.04, windows-latest, macos-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
      
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: 'npm'
      
      - uses: dtolnay/rust-toolchain@stable
      
      - uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'
      
      - run: npm ci
      
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 🐛 常见错误信息

### 错误 1: "npm ERR! code ELIFECYCLE"
**原因**: 构建脚本失败
**解决**: 检查 `npm run build:web` 是否成功

### 错误 2: "error: target not found"
**原因**: Rust 目标架构未安装
**解决**: 添加 `targets` 到 rust-toolchain 步骤

### 错误 3: "Error: Command failed: cargo tauri build"
**原因**: Tauri 构建失败
**解决**: 
1. 检查 Rust 代码语法
2. 检查 tauri.conf.json 配置
3. 本地运行 `npm run build`

### 错误 4: "Permission denied"
**原因**: GitHub Token 权限不足
**解决**: 添加 `permissions: contents: write`

## 📝 获取帮助

### 查看日志
1. GitHub Actions 页面
2. 点击失败的 job
3. 展开每个 step
4. 复制错误信息

### 提供信息
如需帮助，请提供：
- 完整的错误日志
- 失败的步骤名称
- 运行的平台（Windows/macOS/Linux）
- 本地构建是否成功

## 🔄 重新运行

### 方式 1: 重新运行失败的 jobs
1. 访问 Actions 页面
2. 点击失败的 workflow
3. 点击 "Re-run failed jobs"

### 方式 2: 推送新的提交
```bash
git commit --allow-empty -m "chore: trigger CI"
git push
```

### 方式 3: 手动触发
1. Actions 页面
2. 选择 workflow
3. 点击 "Run workflow"

## ✅ 验证成功

构建成功的标志：
- ✅ 所有 4 个 jobs 显示绿色勾号
- ✅ Artifacts 部分有下载链接
- ✅ Release 页面有草稿（如果配置了）

## 🎉 成功后的步骤

1. 下载构建产物
2. 测试各平台安装包
3. 编辑 Release 草稿
4. 发布 Release
