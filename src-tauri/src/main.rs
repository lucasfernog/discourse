#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};

mod menu;

fn main() {
  tauri::Builder::default()
    .menu(menu::get())
    .system_tray(
      SystemTray::new()
        .with_menu(SystemTrayMenu::new().add_item(CustomMenuItem::new("quit", "Quit"))),
    )
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::LeftClick {
        position: _,
        size: _,
        ..
      } => {
        let window = app.get_window("main").unwrap();
        window.unminimize().unwrap();
        window.set_focus().unwrap();
      }
      #[allow(clippy::single_match)]
      SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
        "quit" => {
          std::process::exit(0);
        }
        _ => {}
      },
      _ => {}
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
