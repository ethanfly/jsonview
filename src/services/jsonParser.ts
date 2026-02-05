import type { JsonNode, JsonObject, JsonArray, JsonValue, JsonValidationResult } from '../types/json';

function createIdGenerator() {
  let counter = 0;
  return () => `node-${counter++}`;
}

const nextId = createIdGenerator();

export function parseJson(text: string): { root: JsonNode; value: JsonValue } {
  try {
    const value = JSON.parse(text) as JsonValue;
    const root: JsonNode = buildNode('root', value, 'root');
    return { root, value };
  } catch (e: any) {
    const { line, column } = inferPosition(text, e);
    const error: JsonValidationResult = {
      valid: false,
      message: e?.message || 'JSON 解析失败',
      line,
      column,
    };
    throw error;
  }
}

export function validateJson(text: string): JsonValidationResult {
  try {
    JSON.parse(text);
    return { valid: true };
  } catch (e: any) {
    const { line, column } = inferPosition(text, e);
    return {
      valid: false,
      message: e?.message || 'JSON 解析失败',
      line,
      column,
    };
  }
}

export function validateJsonValueFragment(input: string): JsonValidationResult {
  // 用数组包装单值，保证像 true / 123 / "abc" 这样的都能被 JSON.parse 接受
  const wrapped = `[${input}]`;
  try {
    const arr = JSON.parse(wrapped);
    if (!Array.isArray(arr)) {
      return { valid: false, message: '无效的 JSON 片段' };
    }
    return { valid: true };
  } catch (e: any) {
    const { line, column } = inferPosition(wrapped, e);
    return {
      valid: false,
      message: e?.message || 'JSON 值无效',
      line,
      column,
    };
  }
}

export function parseJsonValueFragment<T = JsonValue>(input: string): T {
  const wrapped = `[${input}]`;
  const arr = JSON.parse(wrapped);
  return arr[0] as T;
}

/** 将 JsonNode 树转回 JsonValue，用于编辑后同步数据 */
export function nodeToValue(node: JsonNode): JsonValue {
  if (node.type === 'array') {
    return (node.children || []).map(nodeToValue) as JsonArray;
  }
  if (node.type === 'object') {
    const obj: JsonObject = {};
    for (const child of node.children || []) {
      if (child.key !== undefined) {
        obj[child.key] = nodeToValue(child);
      }
    }
    return obj;
  }
  return node.value as JsonValue;
}

function buildNode(key: string | undefined, value: JsonValue, path: string): JsonNode {
  if (Array.isArray(value)) {
    const children: JsonNode[] = value.map((item, index) =>
      buildNode(undefined, item, `${path}[${index}]`),
    );
    return {
      id: nextId(),
      type: 'array',
      key,
      path,
      children,
      childrenCount: children.length,
      collapsed: false,
    };
  }

  if (value !== null && typeof value === 'object') {
    const obj = value as JsonObject;
    const entries = Object.entries(obj);
    const children: JsonNode[] = entries.map(([k, v]) =>
      buildNode(k, v, `${path}.${k}`),
    );
    return {
      id: nextId(),
      type: 'object',
      key,
      path,
      children,
      childrenCount: children.length,
      collapsed: false,
    };
  }

  const type =
    value === null
      ? 'null'
      : typeof value === 'string'
        ? 'string'
        : typeof value === 'number'
          ? 'number'
          : typeof value === 'boolean'
            ? 'boolean'
            : 'null';

  return {
    id: nextId(),
    type,
    key,
    value,
    path,
    collapsed: false,
  };
}

function inferPosition(text: string, error: any): { line?: number; column?: number } {
  // 某些运行环境会在错误消息中包含 position 信息，这里尝试简单解析
  const message: string = error?.message || '';
  const match = message.match(/position\s+(\d+)/i);
  if (match) {
    const index = Number(match[1]);
    if (!isNaN(index)) {
      let line = 1;
      let lastLineBreak = -1;
      for (let i = 0; i < index && i < text.length; i++) {
        if (text[i] === '\n') {
          line++;
          lastLineBreak = i;
        }
      }
      const column = index - lastLineBreak;
      return { line, column };
    }
  }

  return {};
}

