import { Menu, type MenuItemOptions, type PredefinedMenuItemOptions } from "@tauri-apps/api/menu";
import type { AppCommand } from "./shortcuts";

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
          commandItem("quit-app", "Quit Daydock", "CmdOrCtrl+Q"),
        ],
      },
      {
        id: "file-menu",
        text: "File",
        items: [
          commandItem("save", "Save", "CmdOrCtrl+S"),
          commandItem("sync", "Sync Notebook", "CmdOrCtrl+Shift+S"),
          separator(),
          commandItem("close-window", "Close Window", "CmdOrCtrl+W"),
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
          commandItem("toggle-current-task", "Toggle Current Task", "CmdOrCtrl+Enter"),
          commandItem("reset-page-tasks", "Mark All Tasks Incomplete", "CmdOrCtrl+Alt+R"),
          commandItem("complete-page-tasks", "Mark All Tasks Complete", "CmdOrCtrl+Alt+F"),
        ],
      },
      {
        id: "view-menu",
        text: "View",
        items: [
          commandItem("toggle-sidebar", "Toggle Sidebar", "CmdOrCtrl+Alt+S"),
          commandItem("toggle-plan", "Toggle Plan", "CmdOrCtrl+Shift+P"),
          commandItem("toggle-plan-reference", "Switch Plan Reference", "CmdOrCtrl+Shift+D"),
          commandItem("apply-template", "Apply Template", "CmdOrCtrl+Shift+E"),
          separator(),
          commandItem("zoom-in", "Zoom In", "CmdOrCtrl++"),
          commandItem("zoom-out", "Zoom Out", "CmdOrCtrl+Minus"),
          commandItem("zoom-reset", "Actual Size", "CmdOrCtrl+0"),
          separator(),
          predefined("Fullscreen", "Enter Full Screen"),
        ],
      },
      {
        id: "go-menu",
        text: "Go",
        items: [
          commandItem("open-today", "Today", "CmdOrCtrl+1"),
          commandItem("open-yesterday", "Yesterday", "CmdOrCtrl+2"),
          commandItem("open-tomorrow", "Tomorrow", "CmdOrCtrl+3"),
          commandItem("open-last-week", "Last Week", "CmdOrCtrl+4"),
          commandItem("open-this-week", "This Week", "CmdOrCtrl+5"),
          commandItem("open-next-week", "Next Week", "CmdOrCtrl+6"),
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
        commandItem("share-feedback", "Share Feedback…", "CmdOrCtrl+Shift+F"),
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
