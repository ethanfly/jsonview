<template>
  <div class="app-root">
    <TitleBar />
    <header class="app-header">
      <Toolbar />
    </header>
    <TabBar />
    <main class="app-main">
      <section class="tree-panel">
        <JsonTreeView />
      </section>
      <section class="editor-panel">
        <JsonEditorPanel />
      </section>
    </main>
    <footer class="app-footer">
      <StatusBar />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import TitleBar from './components/TitleBar.vue';
import Toolbar from './components/Toolbar.vue';
import TabBar from './components/TabBar.vue';
import JsonTreeView from './components/JsonTreeView.vue';
import JsonEditorPanel from './components/JsonEditorPanel.vue';
import StatusBar from './components/StatusBar.vue';
import { useJsonStore } from './store/useJsonStore';
import { useThemeStore } from './store/useThemeStore';

const store = useJsonStore();
const themeStore = useThemeStore();

let unlisten: (() => void) | null = null;

onMounted(async () => {
  // 主题已在 main.ts 中预初始化，这里只需确保同步
  themeStore.initTheme();
  
  // 键盘事件监听
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
      if (store.activeTabId) {
        e.preventDefault();
        e.stopPropagation();
        store.closeTab(store.activeTabId);
      }
    }
  };
  document.addEventListener('keydown', onKeyDown, true);
  
  // 延迟初始化 Tauri 事件监听，避免阻塞首屏渲染
  setTimeout(async () => {
    let unCloseTab = () => {};
    let unOpenFile = () => {};
    let unOpenDialog = () => {};
    let launchPollTimer: number | null = null;
    let launchPollStopTimer: number | null = null;
    
    try {
      const win = getCurrentWindow();
      unOpenFile = await win.listen<string>('open-file', (e) => {
        if (e.payload) {
          console.log('[App] 收到 open-file 事件:', e.payload);
          store.openFileByPath(e.payload);
        }
      });
      unOpenDialog = await win.listen('open-file-dialog', () => {
        store.openFile();
      });
      
      // 直接打开 .json：通过"打开方式"或双击 .json 启动时，后端会写入 get_launch_file_path
      // 这里用短轮询确保一定触发打开（直到成功打开或超时）
      const tryLaunchOnce = async () => {
        try {
          const path = await invoke<string | null>('get_launch_file_path');
          if (path && (!store.filePath || store.filePath !== path)) {
            console.log('[App] 从 get_launch_file_path 获取到路径:', path);
            store.openFileByPath(path);
          }
        } catch (e) {
          console.error('[App] get_launch_file_path 失败:', e);
        }
      };
      
      // 监听设置完成后立即尝试 + 轮询 5 秒
      await tryLaunchOnce();
      launchPollTimer = window.setInterval(tryLaunchOnce, 300);
      launchPollStopTimer = window.setTimeout(() => {
        if (launchPollTimer != null) window.clearInterval(launchPollTimer);
        launchPollTimer = null;
        launchPollStopTimer = null;
      }, 5000);
      
      unCloseTab = await win.listen('close-current-tab', () => {
        if (store.activeTabId) store.closeTab(store.activeTabId);
      });
      
      unlisten = () => {
        unOpenFile();
        unOpenDialog();
        unCloseTab();
        if (launchPollTimer != null) window.clearInterval(launchPollTimer);
        if (launchPollStopTimer != null) window.clearTimeout(launchPollStopTimer);
        document.removeEventListener('keydown', onKeyDown, true);
      };
      return;
    } catch (err) {
      console.error('Tauri 监听设置失败（请用 npm run tauri dev 或 exe 运行）:', err);
    }
    
    if (!unlisten) {
      unlisten = () => {
        unOpenFile();
        unOpenDialog();
        unCloseTab();
        document.removeEventListener('keydown', onKeyDown, true);
      };
    }
  }, 50); // 延迟 50ms，让首屏先渲染
});

onBeforeUnmount(() => {
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
});
</script>
