# 冷启动性能优化说明

## 优化措施

### 1. 骨架屏 (Skeleton Screen)
- **位置**: `index.html`
- **效果**: 在 HTML 中内联骨架屏，应用启动时立即显示，消除白屏
- **实现**: 使用内联 CSS 创建与应用布局一致的占位界面

### 2. 窗口延迟显示
- **位置**: `src-tauri/src/main.rs` + `src-tauri/tauri.conf.json`
- **效果**: 窗口初始隐藏，等待内容加载完成后再显示
- **配置**: `visible: false` + 100ms 延迟后调用 `win.show()`

### 3. 主题预初始化
- **位置**: `src/main.ts`
- **效果**: 在 Vue 挂载前就设置主题，避免主题切换闪烁
- **实现**: 直接读取 localStorage 并设置 `data-theme` 属性

### 4. 移除外部字体加载
- **位置**: `index.html` + `src/styles.css`
- **效果**: 不再加载 Google Fonts，使用系统字体栈
- **优势**: 减少网络请求，加快首屏渲染

### 5. 延迟非关键初始化
- **位置**: `src/App.vue`
- **效果**: Tauri 事件监听延迟 50ms 初始化，优先渲染界面
- **实现**: 使用 `setTimeout` 包裹事件监听逻辑

### 6. Vite 构建优化
- **位置**: `vite.config.ts`
- **优化项**:
  - 代码分割: 将 Vue/Pinia 和 Tauri API 分离到不同 chunk
  - 依赖预构建: 预构建常用依赖
  - Terser 压缩: 移除 console 和 debugger

### 7. 内联关键 CSS
- **位置**: `index.html`
- **效果**: 关键样式内联在 HTML 中，避免 FOUC (Flash of Unstyled Content)
- **内容**: 背景色、基础布局样式

## 预期效果

- ✅ **消除白屏**: 骨架屏立即显示
- ✅ **秒开体验**: 窗口在内容准备好后才显示
- ✅ **无闪烁**: 主题预加载，字体使用系统默认
- ✅ **流畅过渡**: 骨架屏平滑过渡到真实界面

## 测试方法

### 开发环境
```bash
npm run tauri:dev
```

### 生产构建
```bash
npm run build
```

### 性能指标
- **首次渲染 (FCP)**: < 200ms
- **可交互时间 (TTI)**: < 500ms
- **窗口显示延迟**: 100ms

## 进一步优化建议

1. **懒加载组件**: 对于大型组件使用 `defineAsyncComponent`
2. **虚拟滚动**: 如果 JSON 树节点过多，考虑虚拟滚动
3. **Web Worker**: 将 JSON 解析移到 Worker 线程
4. **缓存策略**: 缓存最近打开的文件列表
