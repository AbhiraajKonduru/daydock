import { Download, FolderOpen, Keyboard, LayoutTemplate, MessageSquare, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import type { DesktopPlatform } from "../lib/platform";
import { shortcutsForPlatform } from "../lib/shortcuts";

export type SettingsSection = "templates" | "shortcuts" | "updates";

type Props = {
  section: SettingsSection;
  platform: DesktopPlatform;
  notebookName: string;
  notebookRoot: string;
  templates: ReactNode;
  updates: ReactNode;
  updateAvailable: boolean;
  onSectionChange: (section: SettingsSection) => void;
  onFeedback: () => void;
  onChooseFolder: () => void;
};

function ShortcutSettings({ platform }: { platform: DesktopPlatform }) {
  const shortcuts = shortcutsForPlatform(platform);
  const sections = [...new Set(shortcuts.map((shortcut) => shortcut.section))];

  return (
    <section className="shortcut-settings" aria-labelledby="shortcut-settings-title">
      <header className="settings-content-heading">
        <p className="eyebrow">Settings</p>
        <h1 id="shortcut-settings-title">Keyboard shortcuts</h1>
        <p>Showing the shortcuts currently active on {platform === "macos" ? "macOS" : platform === "linux" ? "Linux" : "Windows"}.</p>
      </header>
      <div className="shortcut-groups">
        {sections.map((section) => (
          <section className="shortcut-group" key={section}>
            <h2>{section}</h2>
            <div className="shortcut-list">
              {shortcuts.filter((shortcut) => shortcut.section === section).map((shortcut) => (
                <div className="shortcut-row" key={shortcut.command}>
                  <span>{shortcut.title}</span>
                  <kbd>{shortcut.label}</kbd>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function SettingsPage({
  section,
  platform,
  notebookName,
  notebookRoot,
  templates,
  updates,
  updateAvailable,
  onSectionChange,
  onFeedback,
  onChooseFolder,
}: Props) {
  return (
    <div className="settings-page">
      <aside className="settings-navigation" aria-label="Settings sections">
        <div className="settings-title"><Settings2 size={18} /><h1>Settings</h1></div>
        <button className={section === "templates" ? "active" : ""} onClick={() => onSectionChange("templates")}>
          <LayoutTemplate size={16} /><span>Templates</span>
        </button>
        <button className={section === "shortcuts" ? "active" : ""} onClick={() => onSectionChange("shortcuts")}>
          <Keyboard size={16} /><span>Keyboard shortcuts</span>
        </button>
        <button className={section === "updates" ? "active" : ""} onClick={() => onSectionChange("updates")}>
          <Download size={16} /><span>Updates</span>
          {updateAvailable && <span className="settings-badge" title="An update is available" />}
        </button>
        <button onClick={onFeedback}>
          <MessageSquare size={16} /><span>Share feedback</span>
        </button>
        <button className="settings-notebook" onClick={onChooseFolder} title={notebookRoot}>
          <FolderOpen size={16} />
          <span><small>Notebook folder</small>{notebookName}</span>
        </button>
      </aside>
      <div className="settings-content">
        {section === "templates" ? templates : section === "updates" ? updates : <ShortcutSettings platform={platform} />}
      </div>
    </div>
  );
}
