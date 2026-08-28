# Daydock

Daydock is a simple productivity system that turns weekly goals into focused daily action. It combines daily plans, weekly direction, and reusable documents in a desktop app that stores everything as plain Markdown files.

No account. No required cloud. No proprietary file format.

> Daydock is in an early `v0.1` release. It has been used daily by its creator, but bugs and rough edges should be expected. Back up your notebook and report anything surprising.

## Why Daydock exists

Most productivity systems grow into another thing to maintain. Daydock is built around a smaller idea: today is the only day you can act in.

A day is a useful unit for choosing a realistic amount of work and getting into flow. A week is long enough to provide direction without turning planning into prediction. Broader ambitions can live in your documents, but the working loop stays close to the present:

1. Decide what matters this week.
2. Choose what matters today.
3. Work, take notes, and adapt.
4. Plan tomorrow when tomorrow is close enough to understand.

The system is intentionally personal and forgiving. Unfinished work is information, not a moral failure. Plans can change. Weekly structure reduces the effort of planning each day, while daily focus keeps distant goals from becoming an excuse to procrastinate.

## The main flow

### 1. Anchor the week

Open **This week** and use four lightweight sections:

- **Goals** for outcomes you want by the end of the week
- **Recurring** for habits or responsibilities that repeat during the week
- **Upcoming** for events and time-sensitive items
- **Backlog** for useful work that is not yet a commitment

The week is an anchor, not a contract. It gives each day context while leaving room for real life.

### 2. Plan today

Every daily page starts with:

- **Win** for the one result that would make the day feel meaningful
- **Tasks** for the supporting work
- **Limits** for boundaries that protect attention, energy, or time
- **Notes** for information captured during the day
- **Journal** for reflection

Daydock opens today's page automatically and saves as you type.

### 3. Use Plan mode for tomorrow

Plan mode places tomorrow beside this week's plan. You can switch the reference panel between the weekly page and today's page. This makes it easy to carry context forward without turning the whole notebook into a calendar.

Tomorrow is planned in service of tomorrow's today.

### 4. Build reusable artifacts

Documents are Daydock's durable artifacts. Use them for routines, project plans, protocols, checklists, personal principles, reference notes, or any strategy that should outlive a single day or week.

Create a document from the sidebar, then link to it from any page with `[[Document Name]]`. Clicking the rendered link opens the document. Standard Markdown links to `.md` files are also supported. Documents remain ordinary files in `Docs/`, so they are readable and editable outside Daydock.

The `Assets/` folder is created for notebook resources, but attachment management is not yet built into the app.

## Features

- Local-first storage in a folder you choose
- Plain Markdown as the source of truth
- Automatic daily and weekly pages
- Weekly goals, recurring items, upcoming items, and backlog
- Focused daily pages with a win, tasks, limits, notes, and journal
- Side-by-side planning for tomorrow
- Reusable documents and wiki-style links
- Interactive Markdown checkboxes and live formatting
- Full-text search across daily pages, weekly pages, and documents
- Automatic saving with external-change detection
- Optional GitHub sync using your existing Git installation and credentials
- Adjustable zoom and collapsible navigation
- No account, database service, or required cloud provider

Daydock has used roughly 4 MB of RAM in my everyday use. Actual memory use varies by operating system, WebView, notebook size, and workload.

## Keyboard shortcuts

Use `Ctrl` on Windows and Linux. Use `Cmd` where the shortcut uses the platform modifier on macOS.

| Shortcut | Action |
| --- | --- |
| `Alt+T` | Open today |
| `Alt+Y` | Open yesterday |
| `Alt+O` | Open tomorrow |
| `Alt+W` | Open this week |
| `Alt+L` | Open last week |
| `Alt+N` | Open next week |
| `Alt+P` | Open or close Plan mode |
| `Alt+D` | In Plan mode, switch between the week and today |
| `Ctrl/Cmd+K` | Search the notebook |
| `Ctrl/Cmd+S` | Save now |
| `Ctrl/Cmd+Shift+S` | Sync the notebook with GitHub |
| `Ctrl/Cmd+.` | Show or hide the sidebar |
| `Ctrl/Cmd+Shift++` | Zoom in |
| `Ctrl/Cmd+Shift+-` | Zoom out |
| `Ctrl/Cmd+0` | Reset zoom |
| `Ctrl/Cmd+Enter` | Toggle the task on the current line |
| `Ctrl+Alt+R` | Mark all tasks on the page incomplete |
| `Ctrl+Alt+F` | Mark all tasks on the page complete |
| `Tab` | Indent a list item |

## Your notebook stays yours

```text
Your Notebook/
├── Daily/
├── Weekly/
├── Docs/
├── Assets/
└── .daydock/
```

Daily, weekly, and document pages are Markdown files. Daydock's derived SQLite search cache lives at `.daydock/search.sqlite`. It contains no authoritative data and can be safely deleted while Daydock is closed. Daydock rebuilds it automatically.

GitHub sync is optional. When connected, Daydock initializes or uses a Git repository in the notebook folder, commits saved changes, pulls remote changes, and pushes local changes. The search cache is excluded from Daydock-managed commits. Authentication is handled by Git or your SSH key.

## Download

Download the latest installer from the repository's **Releases** page:

You can also download Daydock from [daydock.vercel.app](https://daydock.vercel.app). The site was quickly generated with AI to save you from digging through the GitHub Releases page; it will be properly de-AI-slopified in the future.

- Windows: NSIS installer
- macOS: universal DMG for Apple Silicon and Intel Macs
- Linux, including Arch Linux: AppImage

The `v0.1` builds are unsigned. Windows SmartScreen and macOS Gatekeeper may warn before opening them. Packaging for the Arch User Repository is not available yet, but the AppImage can run on Arch Linux without installing a distro-specific package.

## Run locally

Requirements:

- Node.js LTS
- Rust stable
- Platform dependencies required by Tauri 2
- WebView2 on Windows

```powershell
npm install
npm run tauri dev
```

On Linux, install the [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/) for your distribution first.

## Test and build

```powershell
npm test
npm run build
npm run tauri build
```

Desktop bundles are written beneath `src-tauri/target/release/bundle`. Pushing a version tag such as `v0.1` runs the release workflow and creates a GitHub prerelease with builds for Windows, macOS, and Linux.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. The project maintainer reviews changes for quality and fit with Daydock's vision.

Possible future directions and explicit non-goals are documented in [ROADMAP.md](ROADMAP.md).

## License

Daydock is available under the [GNU General Public License v3.0](LICENSE). You may use, study, modify, and distribute the software. Distributed modified versions must remain available under the same license.
