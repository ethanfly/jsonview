<template>
  <div class="titlebar" data-tauri-drag-region>
    <div class="titlebar-left">
      <span class="titlebar-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="titlebar-icon-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#2563EB"/>
              <stop offset="100%" stop-color="#38BDF8"/>
            </linearGradient>
          </defs>
          <rect x="96" y="96" width="832" height="832" rx="200" ry="200" fill="url(#titlebar-icon-gradient)"/>
          <path d="M380 280C330 280 320 320 320 360L320 412C320 448 304 472 280 488C304 504 320 528 320 564L320 616C320 656 330 696 380 696" stroke="#fff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M644 280C694 280 704 320 704 360L704 412C704 448 720 472 744 488C720 504 704 528 704 564L704 616C704 656 694 696 644 696" stroke="#fff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
      <span class="titlebar-title">JSON Viewer</span>
    </div>
    <div class="titlebar-right" data-tauri-drag-region="false">
      <button class="titlebar-button" @click="minimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path fill="currentColor" d="M0 6h12v1H0z"/>
        </svg>
      </button>
      <button class="titlebar-button" @click="toggleMaximize" title="最大化/还原">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path fill="none" stroke="currentColor" stroke-width="1" d="M1 1h10v10H1z"/>
        </svg>
      </button>
      <button class="titlebar-button titlebar-button-close" @click="close" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M1 1l10 10M11 1L1 11"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window';

const win = getCurrentWindow();

const minimize = async () => {
  try {
    await win.minimize();
  } catch (e) {
    console.error('最小化失败', e);
  }
};

const toggleMaximize = async () => {
  try {
    const isMaximized = await win.isMaximized();
    if (isMaximized) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  } catch (e) {
    console.error('最大化/还原失败', e);
  }
};

const close = async () => {
  try {
    await win.close();
  } catch (e) {
    console.error('关闭失败', e);
  }
};
</script>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 0 0 8px;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border);
  user-select: none;
  -webkit-app-region: drag;
  app-region: drag;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 8px;
}

.titlebar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.titlebar-icon svg {
  display: block;
  width: 18px;
  height: 18px;
}

.titlebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.titlebar-right {
  display: flex;
  align-items: center;
  gap: 0;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.titlebar-button {
  width: 46px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  padding: 0;
}

.titlebar-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.titlebar-button-close:hover {
  background: #e81123;
  color: #ffffff;
}

.titlebar-button svg {
  display: block;
}
</style>
