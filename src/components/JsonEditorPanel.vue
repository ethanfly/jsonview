<template>
  <div class="editor-container">
    <div class="editor-header">
      <div>
        <span>原始文本视图</span>
      </div>
      <div>
        <span v-if="validation.valid" class="badge-valid">JSON 有效</span>
        <span v-else class="badge-invalid">
          JSON 无效：{{ validation.message }}
        </span>
      </div>
    </div>
    <div class="editor-body">
      <div class="editor-raw">
        <textarea
          v-model="rawText"
          spellcheck="false"
        ></textarea>
      </div>
      <div class="editor-detail">
        <div v-if="selectedNode">
          <div><strong>路径：</strong>{{ selectedNode.path }}</div>
          <div><strong>类型：</strong>{{ selectedNode.type }}</div>
          <div v-if="selectedNode.key !== undefined">
            <strong>键：</strong>{{ selectedNode.key }}
          </div>
          <div v-if="selectedNode.value !== undefined">
            <strong>值：</strong>{{ selectedNode.value }}
          </div>
          <div v-if="selectedNode.childrenCount != null">
            <strong>子节点数：</strong>{{ selectedNode.childrenCount }}
          </div>
        </div>
        <div v-else>
          选择树中的一个节点以查看详情。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useJsonStore } from '../store/useJsonStore';

const store = useJsonStore();

const rawText = computed({
  get: () => store.currentText,
  set: (v: string) => store.updateFromRawText(v),
});

const validation = computed(() => store.validation);

const selectedNode = computed(() => {
  if (!store.rootNode || !store.selectedNodeId) return null;
  const find = (node: any): any | null => {
    if (node.id === store.selectedNodeId) return node;
    if (node.children) {
      for (const c of node.children) {
        const r = find(c);
        if (r) return r;
      }
    }
    return null;
  };
  return find(store.rootNode);
});

</script>

