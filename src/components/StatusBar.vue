<template>
  <div class="status-bar">
    <div class="status-text">
      <span v-if="filePath">文件：{{ filePath }}</span>
      <span v-else>未打开文件</span>
      <span v-if="isDirty" class="status-dirty">● 已修改</span>
    </div>
    <div class="status-text">
      <span v-if="loadingState === 'parsing'">正在解析 JSON...</span>
      <span v-else-if="loadingState === 'formatting'">正在格式化...</span>
      <span v-else-if="loadingState === 'saving'">正在保存...</span>
      <span v-else-if="validation.valid">JSON 有效</span>
      <span v-else>JSON 无效</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useJsonStore } from '../store/useJsonStore';

const store = useJsonStore();

const filePath = computed(() => store.filePath);
const isDirty = computed(() => store.isDirty);
const loadingState = computed(() => store.loadingState);
const validation = computed(() => store.validation);
</script>

