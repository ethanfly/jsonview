<template>
  <div class="status-bar" @dblclick="showStartupArgs">
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
    <div
      v-if="diagnosticMessage"
      class="status-diagnostic-wrap"
      :title="diagnosticMessage + '（点击清除）'"
      @click="store.setDiagnosticMessage(null)"
    >
      <span class="status-diagnostic-label">诊断：</span>
      <span class="status-diagnostic-text">{{ diagnosticMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useJsonStore } from '../store/useJsonStore';

const store = useJsonStore();

const filePath = computed(() => store.filePath);
const isDirty = computed(() => store.isDirty);
const loadingState = computed(() => store.loadingState);
const validation = computed(() => store.validation);
const diagnosticMessage = computed(() => store.diagnosticMessage);

async function showStartupArgs() {
  store.setDiagnosticMessage('诊断中…');
  try {
    const args = await invoke<string[]>('get_startup_args');
    store.setDiagnosticMessage('启动参数：' + args.join(' | '));
  } catch (e) {
    store.setDiagnosticMessage('诊断失败：' + String(e));
  }
}
</script>

