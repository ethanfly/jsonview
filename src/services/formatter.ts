import type { JsonValue } from '../types/json';

export type Indentation = '2spaces' | '4spaces' | 'tab';

export function getIndentString(indentation: Indentation): string {
  if (indentation === '2spaces') return '  ';
  if (indentation === '4spaces') return '    ';
  return '\t';
}

export function formatJson(value: JsonValue, indentation: Indentation): string {
  const indent = getIndentString(indentation);
  return JSON.stringify(value, null, indent);
}

/** 将 JSON 压缩为单行（去除换行与多余空格） */
export function compressJson(value: JsonValue): string {
  return JSON.stringify(value);
}

