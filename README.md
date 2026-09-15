# Daydock

> Ambition without execution is just a desire.

Daydock is a free, open-source daily and weekly planner for ambitious students and anyone who keeps falling off their own plans. It gives you a page for today, a page for the week, and documents for anything worth keeping. Everything is stored as plain Markdown files in a folder you own.

No account. No subscription. No required cloud. No streaks or overdue counter keeping score of what you missed.

> Daydock is in beta. It is used daily by its creator, but bugs and rough edges should be expected. Back up your notebook and [tell us](https://daydock.vercel.app/feedback) when something breaks.

## Why Daydock exists

If time blocking, paper planners, and task managers already work for you, keep using them. Daydock is for the people who get two good weeks into a system, have one bad day, and then avoid the system because returning feels worse than starting over.

That cycle is not fixed by more tags, categories, notifications, or setup. Looking for the perfect productivity app can become another convincing way to avoid uncomfortable work. The app was never the problem.

Daydock handles the boring part: somewhere to write things down, enough weekly direction to make today clear, and almost no setup. The deeper change comes from identity rather than motivation—from acting because you are the kind of person who builds, studies, or follows through, even after a bad week. [Read the full reasoning](https://daydock.vercel.app/why).

The working loop stays close to the present because today is the only day you can act in. A day is small enough for a realistic amount of work. A week provides direction without turning planning into prediction. Broader ambitions can live in your documents, but the working loop stays close to the present:

1. Decide what matters this week.
2. Choose what matters today.
3. Work, take notes, and adapt.
4. Plan tomorrow when tomorrow is close enough to understand.

The system is intentionally personal and forgiving. Unfinished work is information, not a moral failure. Plans can change. A missed day is just a missed day.

## Two branches, one idea

Daydock is one half of The Daydock Foundation, a student-led nonprofit project building free tools and free teaching for people who keep falling off their plans.

- **The tool:** Daydock stays free, open source, local first, and deliberately small. Its job is to remove setup and then get out of your way.
- **The teaching:** free virtual workshops for high school students, plus written guides for everyone, about self-sabotage, identity, and building a system that survives a bad week.

[Meet the team, volunteer, or join the advisory board](https://daydock.vercel.app/foundation).

## The main flow

### 1. Plan today

Every daily page starts with:

- **Win** for the one result that would make the day feel meaningful
- **Tasks** for the supporting work
- **Limits** for boundaries that protect attention, energy, or time
- **Notes** for information captured during the day
- **Journal** for reflection

Daydock opens today's page automatically and saves as you type.

### 2. Anchor the week

Open **This week** and use four lightweight sections:

- **Goals** for outcomes you want by the end of the week
- **Recurring** for habits or responsibilities that repeat during the week
- **Upcoming** for events and time-sensitive items
- **Backlog** for useful work that is not yet a commitment

The week is an anchor, not a contract. It gives each day context while leaving room for real life.

### 3. Use Plan mode for tomorrow

Plan mode places tomorrow beside this week's plan. You can switch the reference panel between the weekly page and today's page. This makes it easy to carry context forward without turning the whole notebook into a calendar.

Tomorrow is planned in service of tomorrow's today.

### 4. Build reusable artifacts

Documents are Daydock's durable artifacts. Use them for routines, project plans, protocols, checklists, personal principles, reference notes, or any strategy that should outlive a single day or week.

Create a document from the sidebar, then link to it from any page with `[[Document Name]]`. Clicking the rendered link opens the document. Standard Markdown links to `.md` files are also supported. Documents remain ordinary files in `Docs/`, so they are readable and editable outside Daydock. Right-click a document to rename its file and repair links to it; its Markdown heading remains independent.

The `Assets/` folder is created for notebook resources, but attachment management is not yet built into the app.

## Features

- Local-first storage in a folder you choose
- Plain Markdown as the source of truth
- Automatic daily and weekly pages
- Customizable daily and weekly Markdown templates
- Weekly goals, recurring items, upcoming items, and backlog
- Focused daily pages with a win, tasks, limits, notes, and journal
- Side-by-side planning for tomorrow
- Reusable documents and wiki-style links
- Interactive Markdown checkboxes and live formatting
- Native slash-command plugins for inline or centered time blocks and daily focus capacity
- Full-text search across daily pages, weekly pages, and documents
- Automatic saving with external-change detection
- Optional GitHub sync using your existing Git installation and credentials
- Signed in-app updates from the Daydock beta channel
- Adjustable zoom and collapsible navigation
- No account, subscription, streaks, database service, or required cloud provider

Daydock has used roughly 4 MB of RAM in my everyday use. Actual memory use varies by operating system, WebView, notebook size, and workload.

## Keyboard shortcuts

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Open today | `Alt+T` | `Cmd+1` |
| Open yesterday | `Alt+Y` | `Cmd+2` |
| Open tomorrow | `Alt+O` | `Cmd+3` |
| Open last week | `Alt+L` | `Cmd+4` |
| Open this week | `Alt+W` | `Cmd+5` |
| Open next week | `Alt+N` | `Cmd+6` |
| Open or close Plan mode | `Alt+P` | `Cmd+Shift+P` |
| Switch the Plan reference | `Alt+D` | `Cmd+Shift+D` |
| Apply a template | `Alt+E` | `Cmd+Shift+E` |
| Search the notebook | `Ctrl+K` | `Cmd+K` |
| Save now | `Ctrl+S` | `Cmd+S` |
| Sync with GitHub | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| Share feedback | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Show or hide the sidebar | `Ctrl+.` | `Cmd+Option+S` |
| Zoom in | `Ctrl+Shift++` | `Cmd++` |
| Zoom out | `Ctrl+Shift+-` | `Cmd+-` |
| Reset zoom | `Ctrl+0` | `Cmd+0` |
| Toggle the task on the current line | `Ctrl+Enter` | `Cmd+Return` |
| Mark all page tasks incomplete | `Ctrl+Alt+R` | `Cmd+Option+R` |
| Mark all page tasks complete | `Ctrl+Alt+F` | `Cmd+Option+F` |
| Indent a list item | `Tab` | `Tab` |

## Time blocks and focus capacity

Type `/block 1h` after a task to add an inline countdown, or type it on an empty
line to add a centered focus block. Type `/time 2h School` to reserve or record
focus time without creating a timer. Type `/capacity 4h` on an empty line to
compare timed blocks and static time entries with the focus time available.
Slash commands are also available in templates. A complete directive such as
`/capacity 4h` runs whenever a page is created; bare `/capacity` stays on each
new page until you supply that day's available time.

Timer transitions are saved immediately. The live countdown is derived from
saved timestamps, so the Markdown file is not rewritten every second. The task
line stays compact and detailed session history is kept in a hidden, readable
Daydock state footer at the end of the same file. See
[`docs/PLUGINS.md`](docs/PLUGINS.md) for the format and contributor API.

## Your notebook stays yours

```text
Your Notebook/
├── Daily/
├── Weekly/
├── Docs/
├── Assets/
├── Templates/
└── .daydock/
```

Daily, weekly, document, and template pages are Markdown files. Active template choices are stored in `Templates/config.json`. Daydock's derived SQLite search cache lives at `.daydock/search.sqlite`. It contains no authoritative data and can be safely deleted while Daydock is closed. Daydock rebuilds it automatically.

GitHub sync is optional. When connected, Daydock initializes or uses a Git repository in the notebook folder, commits saved changes, pulls remote changes, and pushes local changes. The search cache is excluded from Daydock-managed commits. Authentication is handled by Git or your SSH key.

## Download

Download the latest beta from [daydock.vercel.app/download](https://daydock.vercel.app/download). The site explains the first-launch security warnings and provides installers for:

- Windows: NSIS installer
- macOS: universal DMG for Apple silicon and Intel Macs
- Linux, including Arch Linux: x86_64 AppImage

The website reads its version and platform installer links from the rolling beta release channel, so its download buttons advance automatically after a successful cross-platform release.

Current beta builds are not code signed, so Windows SmartScreen and macOS Gatekeeper warn the first time you open Daydock. The download page explains what the warning means and how to proceed. The source and every release are public so you can inspect them before running the app. If that is not enough assurance for you, do not install it yet.

Packaging for the Arch User Repository is not available yet, but the AppImage can run on Arch Linux without a distribution-specific package. You can also get checksums, source archives, and every build artifact from the repository's [Releases page](https://github.com/AbhiraajKonduru/daydock/releases).

Daydock checks its signed beta channel in the background. When an update is available, you can install and restart from inside the app or choose **Later** and use the toolbar reminder when it is convenient. **Settings → Updates** shows the installed version and when Daydock last checked, and lets you check for a new beta and install it on demand. Updater signatures verify that later builds came from the Daydock release pipeline; they are separate from the operating-system code signing that removes first-launch warnings.

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

Desktop bundles are written beneath `src-tauri/target/release/bundle`. Pushing a SemVer tag such as `v0.4.0` runs the release workflow and creates a GitHub prerelease with builds for Windows, macOS, and Linux.

Maintainer release and updater-key instructions are in [`docs/RELEASING.md`](docs/RELEASING.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. The project maintainer reviews changes for quality and fit with Daydock's vision.

Possible future directions, funding-dependent commitments, and explicit non-goals are published on the [public roadmap](https://daydock.vercel.app/roadmap). You can also [send feedback](https://daydock.vercel.app/feedback) without opening a GitHub issue.

## License

Daydock is available under the [GNU General Public License v3.0](LICENSE). You may use, study, modify, and distribute the software. Distributed modified versions must remain available under the same license.
