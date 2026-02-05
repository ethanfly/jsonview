<template>
  <div class="theme-switcher" title="切换主题">
    <span class="theme-switcher-label">主题</span>
    <button
      v-for="t in themes"
      :key="t.id"
      type="button"
      class="theme-btn"
      :class="{ active: store.theme === t.id }"
      :data-theme="t.id"
      :title="t.name"
      @click="store.setTheme(t.id)"
    >
      <span aria-hidden="true"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore, type ThemeId } from '../store/useThemeStore';

const store = useThemeStore();

const themes: { id: ThemeId; name: string }[] = [
  { id: 'dark', name: '深色科技' },
  { id: 'light', name: '浅色简约' },
  { id: 'ocean', name: '蔚蓝' },
  { id: 'forest', name: '森林' },
  { id: 'violet', name: '紫罗兰' },
];
</script>
