use tauri::{Menu, MenuItem, Submenu};

pub fn get() -> Menu {
  Menu::new()
    .add_submenu(Submenu::new(
      "Discourse",
      Menu::new()
        .add_native_item(MenuItem::About("Discourse".to_string()))
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Hide)
        .add_native_item(MenuItem::HideOthers)
        .add_native_item(MenuItem::ShowAll)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Quit),
    ))
    .add_submenu(Submenu::new(
      "Edit",
      Menu::new()
        .add_native_item(MenuItem::Undo)
        .add_native_item(MenuItem::Redo)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste),
    ))
    .add_native_item(MenuItem::EnterFullScreen)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Quit)
}
