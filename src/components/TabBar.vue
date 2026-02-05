<template>
  <div class="tab-bar" v-if="tabs.length > 0">
    <div
      v-for="tab in tabs"
      :key="tab.id"
      role="tab"
      class="tab-item"
      :class="{ active: tab.id === activeTabId }"
      tabindex="0"
      @click="store.setActiveTab(tab.id)"
    >
      <span class="tab-label">{{ tabLabel(tab) }}</span>
      <button
        type="button"
        class="tab-close"
        aria-label="关闭"
        @click.stop="store.closeTab(tab.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useJsonStore } from '../store/useJsonStore';
import type { JsonTab } from '../store/useJsonStore';

const store = useJsonStore();

const tabs = computed(() => store.tabs);
const activeTabId = computed(() => store.activeTabId);

function tabLabel(tab: JsonTab): string {
  if (tab.filePath) {
    const parts = tab.filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'JSON';
  }
  return '未命名';
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 8px;
  min-height: 36px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 6px 12px;
  margin: 0;
  border: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  max-width: 180px;
  min-width: 60px;
}

.tab-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tab-item.active {
  background: var(--bg-panel);
  color: var(--text-primary);
  border-bottom: 1px solid var(--bg-panel);
  margin-bottom: -1px;
}

.tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.tab-close:hover {
  background: var(--accent-bg);
  color: var(--accent);
}
</style>
