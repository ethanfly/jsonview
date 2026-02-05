#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder};
use tauri::{Emitter, Manager};

#[derive(Serialize)]
struct OpenResult {
  content: String,
  path: String,
}

/// 启动时通过文件关联传入的文件路径（Windows/Linux 从 args 写入，供前端拉取）
/// 使用 Option<String> 存储路径，前端多次拉取时返回相同路径，直到被明确清除
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
  // 先尝试读取缓存
  if let Ok(guard) = LAUNCH_FILE.lock() {
    if guard.is_some() {
      return guard.clone();
    }
  }

  // 兜底：若 setup 阶段未成功写入（例如参数顺序/时序差异），此处再解析一次并写回
  let args = std::env::args().skip(1).collect::<Vec<_>>();
  if let Some(s) = parse_json_path_from_args(&args) {
    if let Ok(mut guard) = LAUNCH_FILE.lock() {
      *guard = Some(s.clone());
    }
    return Some(s);
  }

  None
}

/// 诊断：返回进程启动时的命令行参数（用于排查“打开方式”是否传入路径）
#[tauri::command]
fn get_startup_args() -> Vec<String> {
  std::env::args().collect()
}

/// 从参数列表中解析出第一个 .json 文件路径；Windows 下“打开方式”通常把路径作为第一个参数传入
fn parse_json_path_from_args(args: &[String]) -> Option<String> {
  let is_json_ext = |p: &PathBuf| {
    p.extension()
      .and_then(|e| e.to_str())
      .map(|s| s.eq_ignore_ascii_case("json"))
      .unwrap_or(false)
  };
  let to_abs = |p: PathBuf| {
    p.canonicalize()
      .ok()
      .unwrap_or(p)
      .to_string_lossy()
      .into_owned()
  };
  let looks_like_windows_drive_path = |s: &str| {
    // e.g. C:\foo\bar.json or D:/foo/bar.json
    let b = s.as_bytes();
    b.len() >= 3
      && b[1] == b':' 
      && (b[2] == b'\\' || b[2] == b'/')
      && (b[0] as char).is_ascii_alphabetic()
  };
  let looks_like_url = |s: &str| {
    // treat only obvious URLs as URL (file://, http://, etc.)
    // avoid mis-parsing Windows paths like D:\xxx as scheme "d"
    s.starts_with("file://") || s.contains("://")
  };
  for arg in args {
    let arg = arg.trim().trim_matches('"');
    if arg.is_empty() || arg.starts_with('-') {
      continue;
    }

    // Windows 盘符路径优先（避免被 Url::parse 误当成 scheme）
    if looks_like_windows_drive_path(arg) {
      let p = PathBuf::from(arg);
      if is_json_ext(&p) {
        return Some(to_abs(p));
      }
    }

    // 明显 URL 才按 URL 解析
    if looks_like_url(arg) {
      if let Ok(url) = url::Url::parse(arg) {
        if let Ok(p) = url.to_file_path() {
          if is_json_ext(&p) {
            return Some(to_abs(p));
          }
        }
      }
    }

    // 普通路径处理
    let p = PathBuf::from(arg);
    if is_json_ext(&p) {
      return Some(to_abs(p));
    }
    // 备用：Windows“打开方式”可能传入带空格的路径，或仅以 .json 结尾的字符串
    if arg.to_lowercase().ends_with(".json")
      && (arg.contains('\\') || arg.contains('/') || arg.contains(':'))
    {
      if let Ok(abs) = std::fs::canonicalize(arg) {
        return Some(abs.to_string_lossy().into_owned());
      }
      return Some(arg.to_string());
    }
  }
  None
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(
      |app, argv, _cwd| {
        if let Some(path) = parse_json_path_from_args(&argv) {
          // 单实例模式下，第二次启动传入的文件路径会到这里。
          // 同时写入 LAUNCH_FILE 作为兜底，让前端轮询 get_launch_file_path 也能拿到。
          if let Ok(mut guard) = LAUNCH_FILE.lock() {
            *guard = Some(path.clone());
          }
          if let Some(win) = app.get_webview_window("main") {
            let _ = win.emit("open-file", path);
            let _ = win.set_focus();
          }
        } else if let Some(win) = app.get_webview_window("main") {
          let _ = win.set_focus();
        }
      },
    ))
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      open_json_file_by_path,
      save_json_file,
      get_launch_file_path,
      get_startup_args,
    ])
    .setup(|app| {
      // 原生菜单：File -> Close Tab (Ctrl+W)，由系统处理快捷键，最可靠
      #[cfg(desktop)]
      {
        let open_file = MenuItem::with_id(app, "open-file", "Open...", true, Some("CmdOrControl+O"))?;
        let close_tab = MenuItem::with_id(
          app,
          "close-tab",
          "Close Tab",
          true,
          Some("CmdOrControl+W"),
        )?;
        let file_menu = SubmenuBuilder::new(app, "File")
          .item(&open_file)
          .item(&close_tab)
          .build()?;

        // View 菜单：允许打开 DevTools（用于发布版排查问题）
        let devtools = MenuItem::with_id(app, "open-devtools", "DevTools", true, Some("F12"))?;
        let view_menu = SubmenuBuilder::new(app, "View").item(&devtools).build()?;

        let menu = MenuBuilder::new(app).item(&file_menu).item(&view_menu).build()?;
        app.set_menu(menu)?;
        let handle = app.handle().clone();
        app.on_menu_event(move |_app, event| {
          let id = event.id().0.as_str();
          if let Some(win) = handle.get_webview_window("main") {
            if id == "close-tab" {
              let _ = win.emit("close-current-tab", ());
            } else if id == "open-file" {
              let _ = win.emit("open-file-dialog", ());
            } else if id == "open-devtools" {
              win.open_devtools();
              let _ = win.set_focus();
            }
          }
        });
      }
      
      // 显示窗口：等待前端加载完成后再显示，避免白屏
      let handle = app.handle().clone();
      std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(100));
        if let Some(win) = handle.get_webview_window("main") {
          let _ = win.show();
        }
      });
      
      // Windows/Linux: 通过文件关联双击 .json 时，路径在命令行参数中
      #[cfg(any(windows, target_os = "linux"))]
      if let Some(s) = parse_json_path_from_args(&std::env::args().skip(1).collect::<Vec<_>>()) {
        if let Ok(mut guard) = LAUNCH_FILE.lock() {
          *guard = Some(s);
        }
      }
      // 延迟向主窗口发送“打开文件”事件，避免前端尚未监听就丢失
      let handle = app.handle().clone();
      std::thread::spawn(move || {
        // 多次尝试发送，确保前端能接收到（不立即 take，保留供前端拉取）
        for delay_ms in [800, 1500, 2500] {
          std::thread::sleep(std::time::Duration::from_millis(delay_ms));
          if let Ok(guard) = LAUNCH_FILE.lock() {
            if let Some(ref p) = *guard {
              if let Some(win) = handle.get_webview_window("main") {
                let _ = win.emit("open-file", p.clone());
              }
            }
          }
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

