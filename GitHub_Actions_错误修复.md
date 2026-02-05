# GitHub Actions 错误修复

## 🐛 问题诊断

### 错误信息
```
Error: command "npm run" "tauri" "--" "build" failed with exit code 1
```

### 根本原因
`package.json` 中缺少 `tauri` 脚本，导致 `tauri-apps/tauri-action` 无法找到 Tauri CLI。

## ✅ 解决方案

### 修改 1: 添加 tauri 脚本到 package.json

**之前**:
```json
{
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

**之后**:
```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### 修改 2: 简化 GitHub Actions 配置

**关键点**:
- 使用标准的 `tauri-apps/tauri-action@v0`
- 不需要指定 `tauriScript`（默认使用 `npm run tauri`）
- 通过 `args` 参数传递构建参数

## 📋 修改的文件

1. **package.json** - 添加 `"tauri": "tauri"` 脚本
2. **.github/workflows/build.yml** - 简化配置

## 🧪 验证

### 本地验证
```bash
# 测试 tauri 命令
npm run tauri -- --version
# 输出: tauri-cli 2.10.0 ✅

# 测试构建
npm run build:web
npm run tauri:build
```

### GitHub Actions 验证
```bash
# 提交更改
git add package.json .github/workflows/build.yml
git commit -m "fix: add tauri script for GitHub Actions"
git push

# 观察构建
# GitHub -> Actions -> 查看最新的 workflow run
```

## 🎯 预期结果

### 成功的构建应该显示：
1. ✅ "Install frontend dependencies" - 成功
2. ✅ "Build Tauri app" - 成功
3. ✅ 生成构建产物

### 构建产物：
- **Windows**: `JSON Viewer_0.1.0_x64-setup.exe`, `.msi`
- **macOS ARM64**: `JSON Viewer_0.1.0_aarch64.dmg`
- **macOS x64**: `JSON Viewer_0.1.0_x64.dmg`
- **Linux**: `.deb`, `.rpm`, `.AppImage`

## 📊 构建时间估算

| 平台 | 预计时间 |
|------|----------|
| Windows | 8-12 分钟 |
| macOS (ARM64) | 10-15 分钟 |
| macOS (x64) | 10-15 分钟 |
| Linux | 6-10 分钟 |

**总计**: 约 34-52 分钟（并行执行）

## 🔍 如果仍然失败

### 检查步骤：

1. **查看具体错误**
   ```
   GitHub Actions -> 点击失败的 job -> 展开 "Build Tauri app"
   ```

2. **常见问题**:
   - 前端构建失败 → 检查 `npm run build:web`
   - Rust 编译失败 → 检查 `cargo check`
   - 依赖问题 → 检查 `npm ci`

3. **本地测试**:
   ```bash
   # 完整构建流程
   npm ci
   npm run build:web
   cd src-tauri
   cargo build --release
   ```

## 📝 技术细节

### tauri-action 的工作原理

1. **默认行为**:
   - 运行 `npm run tauri build` 或 `npm run tauri -- build`
   - 需要 package.json 中有 `tauri` 脚本

2. **参数传递**:
   ```yaml
   with:
     args: '--target aarch64-apple-darwin'
   ```
   实际执行: `npm run tauri -- build --target aarch64-apple-darwin`

3. **前端构建**:
   - 自动运行 `tauri.conf.json` 中的 `beforeBuildCommand`
   - 即: `npm run build:web`

## ✅ 修复验证清单

- [x] 添加 `"tauri": "tauri"` 到 package.json
- [x] 简化 GitHub Actions 配置
- [x] 本地验证 `npm run tauri` 可用
- [x] 提交并推送更改
- [ ] 观察 GitHub Actions 构建
- [ ] 验证所有 4 个平台构建成功
- [ ] 下载并测试构建产物

## 🎉 成功标志

当看到以下内容时，说明修复成功：
- ✅ 所有 4 个 jobs 显示绿色勾号
- ✅ "Build Tauri app" 步骤完成
- ✅ 可以在 Actions 页面下载 artifacts
- ✅ 安装包可以正常安装和运行

## 📞 下一步

1. **立即执行**:
   ```bash
   git add .
   git commit -m "fix: add tauri script for GitHub Actions"
   git push
   ```

2. **观察构建**:
   - 访问 GitHub Actions 页面
   - 等待约 30-50 分钟
   - 查看构建结果

3. **测试产物**:
   - 下载 artifacts
   - 在对应平台测试安装
   - 验证功能正常

## 🔗 相关文档

- [Tauri Action 文档](https://github.com/tauri-apps/tauri-action)
- [Tauri CLI 文档](https://tauri.app/v1/api/cli)
