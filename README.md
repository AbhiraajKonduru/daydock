# Daydock

A quiet, local-first desktop notebook for daily execution. The application stores every page as plain Markdown inside a normal folder you choose.

## Run locally

Requirements: Node.js, Rust, and the Windows WebView2 runtime.

```powershell
npm install
npm run tauri dev
```

## Build the desktop application

```powershell
npm run tauri build
```

The production installer is written beneath `src-tauri/target/release/bundle`.

## Notebook structure

```text
Execution/
├── Daily/
├── Weekly/
├── Docs/
├── Assets/
└── settings.json
```

Markdown is always the source of truth. The application does not require an account, server, database, or cloud provider.

## Search index

Search covers Markdown files under `Daily`, `Weekly`, and `Docs`. Its derived SQLite cache is stored at `.daydock/search.sqlite` inside the notebook, is excluded from Daydock-managed Git commits, and moves with the notebook. The cache contains no authoritative data: it is schema-versioned and is rebuilt automatically when it is missing, incompatible, or corrupt. It is always safe to delete the `.daydock` directory while Daydock is closed.
