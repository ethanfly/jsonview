<template>
  <div class="search-panel">
    <input
      ref="searchInputRef"
      class="input"
      v-model="keyword"
      placeholder="搜索键或值 (Ctrl+F)"
      @keyup.enter="onSearch"
    />
    <button class="btn" :disabled="!hasResults" @click="onPrev">上一条</button>
    <button class="btn" :disabled="!hasResults" @click="onNext">下一条</button>
    <label class="search-label">
      <input type="checkbox" v-model="caseSensitive" />
      区分大小写
    </label>
    <span class="search-results-count" v-if="total > 0">
      {{ currentIndex + 1 }} / {{ total }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useJsonStore } from '../store/useJsonStore';

const store = useJsonStore();

const searchInputRef = ref<HTMLInputElement | null>(null);
const keyword = computed({
  get: () => store.searchKeyword,
  set: (v: string) => store.setSearchKeyword(v),
});
const caseSensitive = computed({
  get: () => store.searchCaseSensitive,
  set: (v: boolean) => store.setSearchCaseSensitive(v),
});

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    searchInputRef.value?.focus();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

watch(
  () => caseSensitive.value,
  () => {
    if (keyword.value) {
      store.runSearch(keyword.value);
    }
  },
);

const total = computed(() => store.searchResults.length);
const currentIndex = computed(() => store.currentSearchIndex);
const hasResults = computed(() => total.value > 0);

const onSearch = () => {
  store.runSearch(keyword.value);
};

const onPrev = () => {
  store.prevMatch();
};

const onNext = () => {
  store.nextMatch();
};
</script>

