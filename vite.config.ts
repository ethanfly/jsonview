import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173
  },
  build: {
    // 优化构建性能
    target: 'esnext',
    minify: 'esbuild', // 使用 esbuild 压缩，更快
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'pinia'],
          'tauri-vendor': ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-global-shortcut']
        }
      }
    },
    // 减小 chunk 大小警告阈值
    chunkSizeWarningLimit: 1000
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['vue', 'pinia', '@tauri-apps/api/core', '@tauri-apps/api/window']
  }
});
