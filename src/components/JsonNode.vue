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
    >
      "{{ node.key }}"
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
</script>

