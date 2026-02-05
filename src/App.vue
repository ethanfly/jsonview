<template>
  <div class="app-root">
    <TitleBar />
    <header class="app-header">
      <Toolbar />
    </header>
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
import JsonTreeView from './components/JsonTreeView.vue';
import JsonEditorPanel from './components/JsonEditorPanel.vue';
import StatusBar from './components/StatusBar.vue';
import { useJsonStore } from './store/useJsonStore';
import { useThemeStore } from './store/useThemeStore';

const store = useJsonStore();
const themeStore = useThemeStore();

let unlisten: (() => void) | null = null;

onMounted(async () => {
  themeStore.initTheme();
  const win = getCurrentWindow();
  // 安装后默认关联 .json：从“打开方式”启动时传入的路径（Windows/Linux）
  try {
    const path = await invoke<string | null>('get_launch_file_path');
    if (path) store.openFileByPath(path);
  } catch (_) {}
  // macOS 或已运行状态下“打开方式”打开 .json
  const unOpenFile = await win.listen<string>('open-file', (e) => {
    if (e.payload) store.openFileByPath(e.payload);
  });
  const unDropFn = await win.listen<any>('tauri://file-drop', (event) => {
    const payload: any = event.payload;
    if (payload?.type === 'drop' && Array.isArray(payload.paths) && payload.paths.length > 0) {
      const path = payload.paths[0] as string;
      store.openFileByPath(path);
    }
  });
  unlisten = () => {
    unOpenFile();
    unDropFn();
  };
});

onBeforeUnmount(() => {
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
});
</script>

