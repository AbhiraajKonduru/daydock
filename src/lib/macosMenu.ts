import { Menu, type MenuItemOptions, type PredefinedMenuItemOptions } from "@tauri-apps/api/menu";
import { shortcutAccelerator, type AppCommand } from "./shortcuts";

type CommandHandler = (command: AppCommand) => void;

let commandHandler: CommandHandler = () => {};
let menuInstallation: Promise<void> | null = null;

const separator = (): PredefinedMenuItemOptions => ({ item: "Separator" });
const predefined = (item: PredefinedMenuItemOptions["item"], text?: string): PredefinedMenuItemOptions => ({ item, text });
const commandItem = (
  id: AppCommand,
  text: string,
  accelerator?: string,
): MenuItemOptions => ({ id, text, accelerator, action: () => commandHandler(id) });

async function createMacosMenu(): Promise<void> {
  const menu = await Menu.new({
    items: [
      {
        id: "daydock-menu",
        text: "Daydock",
        items: [
          predefined({ About: null }, "About Daydock"),
          separator(),
          predefined("Services"),
          separator(),
          predefined("Hide", "Hide Daydock"),
          predefined("HideOthers"),
          predefined("ShowAll"),
          separator(),
          commandItem("quit-app", "Quit Daydock", shortcutAccelerator("quit-app")),
        ],
      },
      {
        id: "file-menu",
        text: "File",
        items: [
          commandItem("save", "Save", shortcutAccelerator("save")),
          commandItem("sync", "Sync Notebook", shortcutAccelerator("sync")),
          separator(),
          commandItem("close-window", "Close Window", shortcutAccelerator("close-window")),
        ],
      },
      {
        id: "edit-menu",
        text: "Edit",
        items: [
          predefined("Undo"),
          predefined("Redo"),
          separator(),
          predefined("Cut"),
          predefined("Copy"),
          predefined("Paste"),
          predefined("SelectAll"),
          separator(),
          commandItem("toggle-current-task", "Toggle Current Task", shortcutAccelerator("toggle-current-task")),
          commandItem("reset-page-tasks", "Mark All Tasks Incomplete", shortcutAccelerator("reset-page-tasks")),
          commandItem("complete-page-tasks", "Mark All Tasks Complete", shortcutAccelerator("complete-page-tasks")),
        ],
      },
      {
        id: "view-menu",
        text: "View",
        items: [
          commandItem("toggle-sidebar", "Toggle Sidebar", shortcutAccelerator("toggle-sidebar")),
          commandItem("toggle-plan", "Toggle Plan", shortcutAccelerator("toggle-plan")),
          commandItem("toggle-plan-reference", "Switch Plan Reference", shortcutAccelerator("toggle-plan-reference")),
          commandItem("apply-template", "Apply Template", shortcutAccelerator("apply-template")),
          separator(),
          commandItem("zoom-in", "Zoom In", shortcutAccelerator("zoom-in")),
          commandItem("zoom-out", "Zoom Out", shortcutAccelerator("zoom-out")),
          commandItem("zoom-reset", "Actual Size", shortcutAccelerator("zoom-reset")),
          separator(),
          predefined("Fullscreen", "Enter Full Screen"),
        ],
      },
      {
        id: "go-menu",
        text: "Go",
        items: [
          commandItem("open-today", "Today", shortcutAccelerator("open-today")),
          commandItem("open-yesterday", "Yesterday", shortcutAccelerator("open-yesterday")),
          commandItem("open-tomorrow", "Tomorrow", shortcutAccelerator("open-tomorrow")),
          commandItem("open-last-week", "Last Week", shortcutAccelerator("open-last-week")),
          commandItem("open-this-week", "This Week", shortcutAccelerator("open-this-week")),
          commandItem("open-next-week", "Next Week", shortcutAccelerator("open-next-week")),
        ],
      },
      {
        id: "window-menu",
        text: "Window",
        items: [
          predefined("Minimize"),
          predefined("Maximize", "Zoom"),
          separator(),
          predefined("BringAllToFront"),
        ],
      },
      { id: "help-menu", text: "Help", items: [
        commandItem("share-feedback", "Share Feedback…", shortcutAccelerator("share-feedback")),
      ] },
    ],
  });
  await menu.setAsAppMenu();
}

export function installMacosMenu(handler: CommandHandler): Promise<void> {
  commandHandler = handler;
  menuInstallation ??= createMacosMenu();
  return menuInstallation;
}
