#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Serialize)]
struct OpenResult {
  content: String,
  path: String,
}

/// 启动时通过文件关联传入的文件路径（Windows/Linux 从 args 写入，供前端拉取一次）
static LAUNCH_FILE: Mutex<Option<String>> = Mutex::new(None);

/// 通过给定路径读取 JSON 文件内容
#[tauri::command]
fn open_json_file_by_path(path: String) -> Result<OpenResult, String> {
  let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
  Ok(OpenResult { content, path })
}

/// 将 JSON 内容写入指定路径
#[tauri::command]
fn save_json_file(path: String, content: String) -> Result<(), String> {
  fs::write(path, content).map_err(|e| e.to_string())
}

/// 获取安装后通过“打开方式”启动时传入的 .json 文件路径（只返回一次）
#[tauri::command]
fn get_launch_file_path() -> Option<String> {
  if let Ok(mut guard) = LAUNCH_FILE.lock() {
    guard.take()
  } else {
    None
  }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      open_json_file_by_path,
      save_json_file,
      get_launch_file_path,
    ])
    .setup(|_app| {
      // Windows/Linux: 通过文件关联双击 .json 时，路径在命令行参数中
      #[cfg(any(windows, target_os = "linux"))]
      {
        let mut path: Option<String> = None;
        for arg in std::env::args().skip(1) {
          if arg.starts_with('-') {
            continue;
          }
          if let Ok(url) = url::Url::parse(&arg) {
            if let Ok(p) = url.to_file_path() {
              if p.extension().map(|e| e == "json").unwrap_or(false) {
                path = Some(p.to_string_lossy().into_owned());
                break;
              }
            }
          } else {
            let p = PathBuf::from(&arg);
            if p.extension().map(|e| e == "json").unwrap_or(false) {
              path = Some(arg);
              break;
            }
          }
        }
        if let Some(s) = path {
          if let Ok(mut guard) = LAUNCH_FILE.lock() {
            *guard = Some(s);
          }
        }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

