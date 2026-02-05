<template>
  <div class="toolbar-group">
    <button class="btn primary" @click="onOpen">打开</button>
    <button class="btn" :disabled="!canSave" @click="onSave">保存</button>
    <button class="btn btn-format" :disabled="!hasContent" @click="onFormat" title="按当前缩进格式化 JSON">格式化</button>
    <button class="btn" :disabled="!hasContent" @click="onCompress" title="压缩为单行 JSON">压缩</button>

    <span class="toolbar-divider" aria-hidden="true"></span>
    <label class="toolbar-label">缩进</label>
    <select class="select" v-model="indentation" title="选择缩进方式">
      <option value="2spaces">2 空格</option>
      <option value="4spaces">4 空格</option>
      <option value="tab">Tab</option>
    </select>

    <span class="toolbar-divider" aria-hidden="true"></span>
    <ThemeSwitcher />

    <SearchPanel />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useJsonStore } from '../store/useJsonStore';
import SearchPanel from './SearchPanel.vue';
import ThemeSwitcher from './ThemeSwitcher.vue';

const store = useJsonStore();

const indentation = computed({
  get: () => store.indentation,
  set: (val) => store.setIndentation(val),
});

const canSave = computed(() => store.isDirty && store.validation.valid);
const hasContent = computed(() => !!store.currentText.trim() || store.value != null);

const onOpen = () => store.openFile();
const onSave = () => store.saveCurrentFile();
const onFormat = () => store.formatCurrent();
const onCompress = () => store.compressCurrent();
</script>

