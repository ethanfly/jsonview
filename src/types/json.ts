export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface JsonArray extends Array<JsonValue> { }

export type JsonNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonNode {
  id: string;
  type: JsonNodeType;
  key?: string;
  value?: JsonPrimitive;
  children?: JsonNode[];
  path: string;
  collapsed?: boolean;
  childrenCount?: number;
}

export interface JsonValidationResult {
  valid: boolean;
  message?: string;
  line?: number;
  column?: number;
}

