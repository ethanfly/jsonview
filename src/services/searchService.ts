import type { JsonNode } from '../types/json';

export type MatchType = 'key' | 'value';

export interface SearchMatch {
  nodeId: string;
  path: string;
  matchType: MatchType;
  previewText: string;
}

export interface SearchOptions {
  caseSensitive: boolean;
}

export function searchJson(
  root: JsonNode | null,
  keyword: string,
  options: SearchOptions,
): SearchMatch[] {
  if (!root || !keyword) return [];

  const results: SearchMatch[] = [];
  const needle = options.caseSensitive ? keyword : keyword.toLowerCase();

  const visit = (node: JsonNode) => {
    let keyText = node.key ?? '';
    let valueText = '';

    if (node.value !== undefined) {
      valueText = String(node.value);
    } else if (node.type === 'object') {
      valueText = '{...}';
    } else if (node.type === 'array') {
      valueText = '[...]';
    }

    const haystackKey = options.caseSensitive ? keyText : keyText.toLowerCase();
    const haystackValue = options.caseSensitive ? valueText : valueText.toLowerCase();

    if (keyText && haystackKey.includes(needle)) {
      results.push({
        nodeId: node.id,
        path: node.path,
        matchType: 'key',
        previewText: `${node.path}: "${keyText}"`,
      });
    }

    if (valueText && haystackValue.includes(needle)) {
      results.push({
        nodeId: node.id,
        path: node.path,
        matchType: 'value',
        previewText: `${node.path} = ${valueText}`,
      });
    }

    if (node.children) {
      node.children.forEach(visit);
    }
  };

  visit(root);
  return results;
}

