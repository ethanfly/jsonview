import { defineStore } from 'pinia';
import type { JsonNode, JsonValue } from '../types/json';
import { parseJson, validateJson, validateJsonValueFragment, parseJsonValueFragment, nodeToValue } from '../services/jsonParser';
import { formatJson, compressJson, type Indentation } from '../services/formatter';
import { searchJson, type SearchMatch } from '../services/searchService';
import { openJsonFileDialog, openJsonFileByPath, saveJsonFile, saveJsonFileAs } from '../services/fileService';

export type LoadingState = 'idle' | 'parsing' | 'formatting' | 'saving';

export interface JsonTab {
  id: string;
  filePath: string | null;
  isDirty: boolean;
  originalText: string;
  currentText: string;
  rootNode: JsonNode | null;
  value: JsonValue | null;
  validation: { valid: boolean; message?: string };
  searchKeyword: string;
  searchCaseSensitive: boolean;
  searchResults: SearchMatch[];
  currentSearchIndex: number;
  selectedNodeId: string | null;
}

function createEmptyTab(id: string): JsonTab {
  return {
    id,
    filePath: null,
    isDirty: false,
    originalText: '',
    currentText: '',
    rootNode: null,
    value: null,
    validation: { valid: true },
    searchKeyword: '',
    searchCaseSensitive: false,
    searchResults: [],
    currentSearchIndex: -1,
    selectedNodeId: null,
  };
}

export interface JsonStoreState {
  tabs: JsonTab[];
  activeTabId: string | null;
  indentation: Indentation;
  loadingState: LoadingState;
  /** 诊断信息（点击工具栏「诊断」后显示在状态栏） */
  diagnosticMessage: string | null;
}

const INDENT_KEY = 'jsonview.indentation';

function loadIndentation(): Indentation {
  const stored = window.localStorage.getItem(INDENT_KEY) as Indentation | null;
  if (stored === '2spaces' || stored === '4spaces' || stored === 'tab') {
    return stored;
  }
  return '2spaces';
}

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useJsonStore = defineStore('json', {
  state: (): JsonStoreState => ({
    tabs: [],
    activeTabId: null,
    indentation: loadIndentation(),
    loadingState: 'idle',
    diagnosticMessage: null,
  }),
  getters: {
    activeTab(state): JsonTab | null {
      if (!state.activeTabId) return null;
      return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
    },
    filePath(state): string | null {
      return this.activeTab?.filePath ?? null;
    },
    isDirty(): boolean {
      return this.activeTab?.isDirty ?? false;
    },
    originalText(): string {
      return this.activeTab?.originalText ?? '';
    },
    currentText(): string {
      return this.activeTab?.currentText ?? '';
    },
    rootNode(): JsonNode | null {
      return this.activeTab?.rootNode ?? null;
    },
    value(): JsonValue | null {
      return this.activeTab?.value ?? null;
    },
    validation(): { valid: boolean; message?: string } {
      return this.activeTab?.validation ?? { valid: true };
    },
    searchKeyword(): string {
      return this.activeTab?.searchKeyword ?? '';
    },
    searchCaseSensitive(): boolean {
      return this.activeTab?.searchCaseSensitive ?? false;
    },
    searchResults(): SearchMatch[] {
      return this.activeTab?.searchResults ?? [];
    },
    currentSearchIndex(): number {
      return this.activeTab?.currentSearchIndex ?? -1;
    },
    selectedNodeId(): string | null {
      return this.activeTab?.selectedNodeId ?? null;
    },
    currentMatch(): SearchMatch | null {
      const tab = this.activeTab;
      if (!tab || tab.currentSearchIndex < 0 || tab.currentSearchIndex >= tab.searchResults.length) {
        return null;
      }
      return tab.searchResults[tab.currentSearchIndex];
    },
  },
  actions: {
    addTab(content: { text: string; path: string | null }) {
      const existing = content.path
        ? this.tabs.find((t) => t.filePath && t.filePath === content.path)
        : null;
      if (existing) {
        this.activeTabId = existing.id;
        return;
      }
      const id = generateTabId();
      const tab = createEmptyTab(id);
      this.applyNewContentToTab(tab, content.text, content.path);
      this.tabs.push(tab);
      this.activeTabId = id;
    },

    closeTab(id: string) {
      const idx = this.tabs.findIndex((t) => t.id === id);
      if (idx < 0) return;
      this.tabs.splice(idx, 1);
      if (this.activeTabId === id) {
        if (this.tabs.length > 0) {
          this.activeTabId = this.tabs[Math.min(idx, this.tabs.length - 1)].id;
        } else {
          this.activeTabId = null;
        }
      }
    },

    setActiveTab(id: string) {
      if (this.tabs.some((t) => t.id === id)) {
        this.activeTabId = id;
      }
    },

    applyNewContentToTab(
      tab: JsonTab,
      text: string,
      path: string | null,
    ) {
      try {
        const { root, value } = parseJson(text);
        tab.filePath = path;
        tab.originalText = text;
        tab.value = value;
        tab.rootNode = root;
        tab.currentText = formatJson(value, this.indentation);
        tab.validation = { valid: true };
        tab.isDirty = false;
        tab.searchKeyword = '';
        tab.searchResults = [];
        tab.currentSearchIndex = -1;
      } catch (e: any) {
        tab.validation = { valid: false, message: e?.message || 'JSON 无效' };
        throw e;
      }
    },

    setIndentation(indent: Indentation) {
      this.indentation = indent;
      window.localStorage.setItem(INDENT_KEY, indent);
      const tab = this.activeTab;
      if (tab?.value != null) {
        tab.currentText = formatJson(tab.value, indent);
      }
    },

    async openFile() {
      this.loadingState = 'parsing';
      try {
        const { content, path } = await openJsonFileDialog();
        this.addTab({ text: content, path });
      } catch (e: any) {
        console.error('打开文件失败', e);
      } finally {
        this.loadingState = 'idle';
      }
    },

    async openFileByPath(path: string) {
      this.loadingState = 'parsing';
      try {
        const { content } = await openJsonFileByPath(path);
        this.addTab({ text: content, path });
      } catch (e) {
        console.error('通过路径打开文件失败', e);
        this.setDiagnosticMessage(`通过路径打开失败：${path}（${String(e)}）`);
      } finally {
        this.loadingState = 'idle';
      }
    },

    applyNewContent(text: string, path: string | null) {
      const tab = this.activeTab;
      if (!tab) return;
      this.applyNewContentToTab(tab, text, path);
    },

    updateFromRawText(text: string) {
      const tab = this.activeTab;
      if (!tab) return;
      tab.currentText = text;
      const result = validateJson(text);
      tab.validation = { valid: result.valid, message: result.message };
      if (result.valid) {
        try {
          const { root, value } = parseJson(text);
          tab.rootNode = root;
          tab.value = value;
          tab.isDirty = text !== tab.originalText;
        } catch (e) {
          // ignore
        }
      }
    },

    async saveCurrentFile() {
      const tab = this.activeTab;
      if (!tab?.value) return;
      this.loadingState = 'saving';
      try {
        const content = formatJson(tab.value, this.indentation);
        if (tab.filePath) {
          await saveJsonFile(tab.filePath, content);
        } else {
          const newPath = await saveJsonFileAs(content);
          tab.filePath = newPath;
        }
        tab.originalText = content;
        tab.currentText = content;
        tab.isDirty = false;
      } catch (e) {
        console.error('保存失败', e);
      } finally {
        this.loadingState = 'idle';
      }
    },

    markDirty() {
      const tab = this.activeTab;
      if (tab) tab.isDirty = true;
    },

    selectNode(id: string | null) {
      const tab = this.activeTab;
      if (tab) tab.selectedNodeId = id;
    },

    updateNodeValue(nodeId: string, rawInput: string) {
      const tab = this.activeTab;
      if (!tab?.rootNode || tab.value == null) return;
      const validRes = validateJsonValueFragment(rawInput);
      if (!validRes.valid) {
        throw new Error(validRes.message || '值不是合法的 JSON 片段');
      }
      const newValue = parseJsonValueFragment(rawInput);

      const updateNodeRec = (node: JsonNode): JsonNode => {
        if (node.id === nodeId) {
          if (node.type === 'object' || node.type === 'array') {
            throw new Error('暂不支持直接将对象/数组节点改为原始值');
          }
          const type =
            newValue === null
              ? 'null'
              : typeof newValue === 'string'
                ? 'string'
                : typeof newValue === 'number'
                  ? 'number'
                  : typeof newValue === 'boolean'
                    ? 'boolean'
                    : node.type;
          return {
            ...node,
            type,
            value: newValue as any,
          };
        }
        if (node.children) {
          return {
            ...node,
            children: node.children.map(updateNodeRec),
          };
        }
        return node;
      };

      tab.rootNode = updateNodeRec(tab.rootNode);
      tab.value = nodeToValue(tab.rootNode);
      tab.currentText = formatJson(tab.value, this.indentation);
      tab.isDirty = true;
    },

    formatCurrent() {
      const tab = this.activeTab;
      if (!tab) return;
      if (tab.value != null) {
        tab.currentText = formatJson(tab.value, this.indentation);
        tab.isDirty = tab.currentText !== tab.originalText;
        return;
      }
      if (tab.currentText.trim()) {
        try {
          const { root, value } = parseJson(tab.currentText);
          tab.rootNode = root;
          tab.value = value;
          tab.validation = { valid: true };
          tab.currentText = formatJson(value, this.indentation);
          tab.isDirty = tab.currentText !== tab.originalText;
        } catch {
          // ignore
        }
      }
    },

    compressCurrent() {
      const tab = this.activeTab;
      if (!tab) return;
      if (tab.value != null) {
        tab.currentText = compressJson(tab.value);
        tab.isDirty = tab.currentText !== tab.originalText;
        return;
      }
      if (tab.currentText.trim()) {
        try {
          const { root, value } = parseJson(tab.currentText);
          tab.rootNode = root;
          tab.value = value;
          tab.validation = { valid: true };
          tab.currentText = compressJson(value);
          tab.isDirty = tab.currentText !== tab.originalText;
        } catch {
          // ignore
        }
      }
    },

    toggleNodeCollapse(nodeId: string) {
      const tab = this.activeTab;
      if (!tab?.rootNode) return;
      const rec = (node: JsonNode): JsonNode => {
        if (node.id === nodeId) {
          return { ...node, collapsed: !node.collapsed };
        }
        if (node.children) {
          return { ...node, children: node.children.map(rec) };
        }
        return node;
      };
      tab.rootNode = rec(tab.rootNode);
    },

    runSearch(keyword: string) {
      const tab = this.activeTab;
      if (!tab) return;
      tab.searchKeyword = keyword;
      tab.searchResults = searchJson(tab.rootNode, keyword, {
        caseSensitive: tab.searchCaseSensitive,
      });
      tab.currentSearchIndex = tab.searchResults.length > 0 ? 0 : -1;
    },

    nextMatch() {
      const tab = this.activeTab;
      if (!tab || tab.searchResults.length === 0) return;
      tab.currentSearchIndex =
        (tab.currentSearchIndex + 1) % tab.searchResults.length;
    },

    prevMatch() {
      const tab = this.activeTab;
      if (!tab || tab.searchResults.length === 0) return;
      tab.currentSearchIndex =
        (tab.currentSearchIndex - 1 + tab.searchResults.length) %
        tab.searchResults.length;
    },

    setSearchCaseSensitive(v: boolean) {
      const tab = this.activeTab;
      if (tab) tab.searchCaseSensitive = v;
    },

    setSearchKeyword(keyword: string) {
      const tab = this.activeTab;
      if (tab) tab.searchKeyword = keyword;
    },

    clearSearch() {
      const tab = this.activeTab;
      if (tab) {
        tab.searchKeyword = '';
        tab.searchResults = [];
        tab.currentSearchIndex = -1;
      }
    },

    setDiagnosticMessage(msg: string | null) {
      this.diagnosticMessage = msg;
    },
  },
});
