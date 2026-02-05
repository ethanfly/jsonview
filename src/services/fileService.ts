import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export interface OpenResult {
  content: string;
  path: string;
}

// 弹出系统文件选择器选择 JSON 文件
export async function openJsonFileDialog(): Promise<OpenResult> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
    title: '选择 JSON 文件',
  });
  if (path === null || (Array.isArray(path) && path.length === 0)) {
    throw new Error('未选择文件');
  }
  const filePath = Array.isArray(path) ? path[0] : path;
  return await invoke<OpenResult>('open_json_file_by_path', { path: filePath });
}

export async function openJsonFileByPath(path: string): Promise<OpenResult> {
  return await invoke<OpenResult>('open_json_file_by_path', { path });
}

export async function saveJsonFile(path: string, content: string): Promise<void> {
  await invoke('save_json_file', { path, content });
}

// 弹出系统另存为对话框选择保存路径
export async function saveJsonFileAs(content: string): Promise<string> {
  const target = await save({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    title: '另存为 JSON 文件',
    defaultPath: 'untitled.json',
  });
  if (target == null) {
    throw new Error('未选择保存路径');
  }
  await saveJsonFile(target, content);
  return target;
}
