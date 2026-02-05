<template>
  <div
    class="json-node"
    :style="{ paddingLeft: `${level * 16}px` }"
    :data-node-id="node.id"
  >
    <span class="json-node-toggle" @click="onToggleClick">
      <span v-if="isComposite">{{ node.collapsed ? '+' : '-' }}</span>
    </span>
    <span
      v-if="node.key !== undefined"
      class="json-node-key"
      :style="keyStyle"
      @click="onSelectClick"
      @dblclick.stop="onKeyEditStart"
    >
      <input
        v-if="isKeyEditing"
        class="input json-node-key-edit"
        v-model="editKey"
        @keydown.enter.prevent="onKeyEditConfirm"
        @blur="onKeyEditConfirm"
      />
      <template v-else>
        "{{ node.key }}"
      </template>
    </span>
    <template v-if="isComposite">
      <span @click="onSelectClick">
        {{ openSymbol }}{{ closeSymbol }}
      </span>
      <span v-if="node.collapsed && node.childrenCount != null" class="json-node-collapsed-hint">
        ({{ node.childrenCount }} 项)
      </span>
    </template>
    <template v-else>
      <input
        v-if="isEditing"
        class="input json-node-edit"
        v-model="editValue"
        @keydown.enter.prevent="onEditConfirm"
        @blur="onEditConfirm"
      />
      <span
        v-else
        :class="valueClass"
        @dblclick="onEditStart"
        @click="onSelectClick"
      >
        {{ displayValue }}
      </span>
    </template>
    <span class="json-node-actions">
      <button
        v-if="canAddChild"
        class="json-node-action-btn"
        title="新增子项"
        type="button"
        @click.stop="onAddChild"
      >
        +
      </button>
      <button
        v-if="canDelete"
        class="json-node-action-btn"
        title="删除此项"
        type="button"
        @click.stop="onDelete"
      >
        ×
      </button>
    </span>
  </div>
  <template v-if="!node.collapsed && node.children">
    <JsonNode
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :level="level + 1"
      :selected-id="selectedId"
      :current-match-id="currentMatchId"
      @toggle="$emit('toggle', $event)"
      @select="$emit('select', $event)"
    />
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { JsonNode as Node } from '../types/json';
import { useJsonStore } from '../store/useJsonStore';

const props = defineProps<{
  node: Node;
  level: number;
  selectedId: string | null;
  currentMatchId: string | null;
}>();

const emit = defineEmits<{
  (e: 'toggle', id: string): void;
  (e: 'select', id: string): void;
}>();

const store = useJsonStore();

const isComposite = computed(() => props.node.type === 'object' || props.node.type === 'array');

const openSymbol = computed(() => (props.node.type === 'object' ? '{' : '['));
const closeSymbol = computed(() => (props.node.type === 'object' ? '}' : ']'));

const isEditing = ref(false);
const editValue = ref('');

const isKeyEditing = ref(false);
const editKey = ref('');

const valueClass = computed(() => {
  switch (props.node.type) {
    case 'string':
      return 'json-node-value-string';
    case 'number':
      return 'json-node-value-number';
    case 'boolean':
      return 'json-node-value-boolean';
    case 'null':
      return 'json-node-value-null';
    default:
      return '';
  }
});

const displayValue = computed(() => {
  if (props.node.type === 'string') {
    return `"${props.node.value}"`;
  }
  if (props.node.type === 'null') {
    return 'null';
  }
  return String(props.node.value);
});

const keyStyle = computed(() => {
  const isSelected = props.selectedId === props.node.id;
  const isMatch = props.currentMatchId === props.node.id;
  if (isMatch) {
    return { backgroundColor: '#f97316', color: '#ffffff', borderRadius: '3px', padding: '0 2px' };
  }
  if (isSelected) {
    return { backgroundColor: '#e5e7eb', borderRadius: '3px', padding: '0 2px' };
  }
  return {};
});

const onToggleClick = () => {
  if (!isComposite.value) return;
  emit('toggle', props.node.id);
};

const onSelectClick = () => {
  emit('select', props.node.id);
};

const onEditStart = () => {
  if (isComposite.value) return;
  isEditing.value = true;
  editValue.value = props.node.type === 'string' ? JSON.stringify(props.node.value) : String(props.node.value);
};

const onEditConfirm = () => {
  if (!isEditing.value) return;
  isEditing.value = false;
  try {
    store.updateNodeValue(props.node.id, editValue.value);
  } catch (e: any) {
    alert(e?.message || '更新值失败');
  }
};

const onKeyEditStart = () => {
  // 根节点（level === 0）一般只是一个容器，不允许改名，避免路径混乱
  if (props.level === 0 || props.node.key === undefined) return;
  isKeyEditing.value = true;
  editKey.value = props.node.key;
};

const onKeyEditConfirm = () => {
  if (!isKeyEditing.value) return;
  isKeyEditing.value = false;
  const newKey = editKey.value;
  if (!newKey || newKey === props.node.key) return;
  try {
    store.updateNodeKey(props.node.id, newKey);
  } catch (e: any) {
    alert(e?.message || '更新键名失败');
  }
};

const canAddChild = computed(() => isComposite.value);
const canDelete = computed(() => props.level > 0);

const onAddChild = () => {
  if (!isComposite.value) return;
  try {
    if (props.node.type === 'object') {
      // 对象：直接在左侧新增一个占位键名，用户再通过双击键名进行编辑
      const defaultKey = 'newKey';
      store.addChildNode(props.node.id, defaultKey);
    } else if (props.node.type === 'array') {
      // 数组：新增一个 null 元素，用户双击值即可编辑
      store.addChildNode(props.node.id);
    }
  } catch (e) {
    // 不再弹出 alert，只在控制台打印，保持界面干净
    console.error(e);
  }
};

const onDelete = () => {
  if (props.level === 0) return;
  if (!window.confirm('确定要删除该节点吗？')) return;
  try {
    store.deleteNode(props.node.id);
  } catch (e: any) {
    alert(e?.message || '删除节点失败');
  }
};
</script>

