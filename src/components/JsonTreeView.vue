<template>
  <div class="json-tree" v-if="root">
    <JsonNode
      :node="root"
      :level="0"
      :selected-id="selectedId"
      :current-match-id="currentMatchId"
      @toggle="onToggle"
      @select="onSelect"
    />
  </div>
  <div
    v-else
    class="json-tree json-tree-empty"
    @click="store.openFile()"
  >
    <span class="json-tree-empty-main">点击打开 JSON 文件</span>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import { useJsonStore } from '../store/useJsonStore';
import JsonNode from './JsonNode.vue';

const store = useJsonStore();

const root = computed(() => store.rootNode);
const selectedId = computed(() => store.selectedNodeId);
const currentMatchId = computed(() => store.currentMatch?.nodeId || null);

const onToggle = (id: string) => {
  store.toggleNodeCollapse(id);
};

const onSelect = (id: string) => {
  store.selectNode(id);
};

watch(
  () => currentMatchId.value,
  async (id) => {
    if (!id) return;
    await nextTick();
    const el = document.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center' });
    }
  },
);
</script>

