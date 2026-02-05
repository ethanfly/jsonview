import { defineStore } from 'pinia';
import type { JsonNode, JsonValue } from '../types/json';
import { parseJson, validateJson, validateJsonValueFragment, parseJsonValueFragment, nodeToValue } from '../services/jsonParser';
import { formatJson, compressJson, type Indentation } from '../services/formatter';
import { searchJson, type SearchMatch } from '../services/searchService';
import { openJsonFileDialog, openJsonFileByPath, saveJsonFile, saveJsonFileAs } from '../services/fileService';

export type LoadingState = 'idle' | 'parsing' | 'formatting' | 'saving';

export interface JsonStoreState {
  filePath: string | null;
  isDirty: boolean;
  originalText: string;
  currentText: string;
  rootNode: JsonNode | null;
  value: JsonValue | null;
  indentation: Indentation;
  validation: {
    valid: boolean;
    message?: string;
  };
  loadingState: LoadingState;
  searchKeyword: string;
  searchCaseSensitive: boolean;
  searchResults: SearchMatch[];
  currentSearchIndex: number;
  selectedNodeId: string | null;
}

const INDENT_KEY = 'jsonview.indentation';

function loadIndentation(): Indentation {
  const stored = window.localStorage.getItem(INDENT_KEY) as Indentation | null;
  if (stored === '2spaces' || stored === '4spaces' || stored === 'tab') {
    return stored;
  }
  return '2spaces';
}

export const useJsonStore = defineStore('json', {
  state: (): JsonStoreState => ({
    filePath: null,
    isDirty: false,
    originalText: '',
    currentText: '',
    rootNode: null,
    value: null,
    indentation: loadIndentation(),
    validation: { valid: true },
    loadingState: 'idle',
    searchKeyword: '',
    searchCaseSensitive: false,
    searchResults: [],
    currentSearchIndex: -1,
    selectedNodeId: null,
  }),
  getters: {
    currentMatch(state): SearchMatch | null {
      if (state.currentSearchIndex < 0 || state.currentSearchIndex >= state.searchResults.length) {
        return null;
      }
      return state.searchResults[state.currentSearchIndex];
    },
  },
  actions: {
    setIndentation(indent: Indentation) {
      this.indentation = indent;
      window.localStorage.setItem(INDENT_KEY, indent);
      if (this.value != null) {
        this.currentText = formatJson(this.value, this.indentation);
      }
    },

    async openFile() {
      this.loadingState = 'parsing';
      try {
        const { content, path } = await openJsonFileDialog();
        this.applyNewContent(content, path);
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
        this.applyNewContent(content, path);
      } catch (e) {
        console.error('通过路径打开文件失败', e);
      } finally {
        this.loadingState = 'idle';
      }
    },

    applyNewContent(text: string, path: string | null) {
      try {
        const { root, value } = parseJson(text);
        this.filePath = path;
        this.originalText = text;
        this.value = value;
        this.rootNode = root;
        this.currentText = formatJson(value, this.indentation);
        this.validation = { valid: true };
        this.isDirty = false;
        this.clearSearch();
      } catch (e: any) {
        this.validation = { valid: false, message: e?.message || 'JSON 无效' };
        throw e;
      }
    },

    updateFromRawText(text: string) {
      this.currentText = text;
      const result = validateJson(text);
      this.validation = { valid: result.valid, message: result.message };
      if (result.valid) {
        try {
          const { root, value } = parseJson(text);
          this.rootNode = root;
          this.value = value;
          this.isDirty = text !== this.originalText;
        } catch (e) {
          // 解析失败时保持原状态
        }
      }
    },

    async saveCurrentFile() {
      if (!this.value) return;
      this.loadingState = 'saving';
      try {
        const content = formatJson(this.value, this.indentation);
        if (this.filePath) {
          await saveJsonFile(this.filePath, content);
        } else {
          const newPath = await saveJsonFileAs(content);
          this.filePath = newPath;
        }
        this.originalText = content;
        this.currentText = content;
        this.isDirty = false;
      } catch (e) {
        console.error('保存失败', e);
      } finally {
        this.loadingState = 'idle';
      }
    },

    markDirty() {
      this.isDirty = true;
    },

    // 节点编辑相关
    selectNode(id: string | null) {
      this.selectedNodeId = id;
    },

    updateNodeValue(nodeId: string, rawInput: string) {
      if (!this.rootNode || this.value == null) return;
      const validRes = validateJsonValueFragment(rawInput);
      if (!validRes.valid) {
        throw new Error(validRes.message || '值不是合法的 JSON 片段');
      }
      const newValue = parseJsonValueFragment(rawInput);

      const updateNodeRec = (node: JsonNode): JsonNode => {
        if (node.id === nodeId) {
          if (node.type === 'object' || node.type === 'array') {
            // 不允许直接将复合类型节点改成原始，简单起见先限制
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

      this.rootNode = updateNodeRec(this.rootNode);
      // 从更新后的树重建 value 和 currentText，保证回车后修改生效
      this.value = nodeToValue(this.rootNode);
      this.currentText = formatJson(this.value, this.indentation);
      this.isDirty = true;
    },

    /** 格式化当前 JSON：按当前缩进重新排版 */
    formatCurrent() {
      if (this.value != null) {
        this.currentText = formatJson(this.value, this.indentation);
        this.isDirty = this.currentText !== this.originalText;
        return;
      }
      if (this.currentText.trim()) {
        try {
          const { root, value } = parseJson(this.currentText);
          this.rootNode = root;
          this.value = value;
          this.validation = { valid: true };
          this.currentText = formatJson(this.value, this.indentation);
          this.isDirty = this.currentText !== this.originalText;
        } catch {
          // 无效 JSON 时不覆盖
        }
      }
    },

    compressCurrent() {
      if (this.value != null) {
        this.currentText = compressJson(this.value);
        this.isDirty = this.currentText !== this.originalText;
        return;
      }
      if (this.currentText.trim()) {
        try {
          const { root, value } = parseJson(this.currentText);
          this.rootNode = root;
          this.value = value;
          this.validation = { valid: true };
          this.currentText = compressJson(this.value);
          this.isDirty = this.currentText !== this.originalText;
        } catch {
          // 无效 JSON 时不覆盖
        }
      }
    },

    toggleNodeCollapse(nodeId: string) {
      const rec = (node: JsonNode): JsonNode => {
        if (node.id === nodeId) {
          return { ...node, collapsed: !node.collapsed };
        }
        if (node.children) {
          return { ...node, children: node.children.map(rec) };
        }
        return node;
      };
      if (this.rootNode) {
        this.rootNode = rec(this.rootNode);
      }
    },

    // 搜索
    runSearch(keyword: string) {
      this.searchKeyword = keyword;
      this.searchResults = searchJson(this.rootNode, keyword, {
        caseSensitive: this.searchCaseSensitive,
      });
      this.currentSearchIndex = this.searchResults.length > 0 ? 0 : -1;
    },

    nextMatch() {
      if (this.searchResults.length === 0) return;
      this.currentSearchIndex =
        (this.currentSearchIndex + 1) % this.searchResults.length;
    },

    prevMatch() {
      if (this.searchResults.length === 0) return;
      this.currentSearchIndex =
        (this.currentSearchIndex - 1 + this.searchResults.length) %
        this.searchResults.length;
    },

    clearSearch() {
      this.searchKeyword = '';
      this.searchResults = [];
      this.currentSearchIndex = -1;
    },
  },
});

