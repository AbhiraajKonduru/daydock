use rusqlite::{params, Connection};
use serde::Serialize;
use std::{
    fs,
    fs::OpenOptions,
    io::Write,
    path::{Component, Path, PathBuf},
    process::Command,
    sync::{Mutex, OnceLock},
    time::UNIX_EPOCH,
};
use tauri::Manager;
use walkdir::WalkDir;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NotebookFile {
    path: String,
    name: String,
    content: String,
    loaded: bool,
    modified: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GitStatus {
    configured: bool,
    remote_url: Option<String>,
    branch: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncResult {
    status: String,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResult {
    path: String,
    title: String,
    snippet: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IndexStatus {
    indexed: usize,
    warnings: Vec<String>,
}

const SEARCH_SCHEMA_VERSION: i64 = 1;
const SEARCH_DIRECTORY: &str = ".daydock";
const SEARCH_DATABASE: &str = "search.sqlite";

fn search_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn git_operation_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn git_lock_error(root: &Path, details: String) -> String {
    if details.to_ascii_lowercase().contains("index.lock") {
        let lock_path = root.join(".git").join("index.lock");
        format!(
            "Git could not update this notebook because its index is locked. Close other Git tools and try again. If no Git process is running, delete {} and retry. Notebooks stored in OneDrive can hit this more often.\n\n{details}",
            lock_path.display()
        )
    } else {
        details
    }
}

fn git(root: &Path, args: &[&str]) -> Result<String, String> {
    let mut command = Command::new("git");
    command
        .args(args)
        .current_dir(root)
        .env("GIT_TERMINAL_PROMPT", "0");
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command.output()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                "Git is not installed or is not available on PATH. Install Git for Windows, then restart Daydock.".to_string()
            } else {
                error.to_string()
            }
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let details = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(git_lock_error(
            root,
            if details.is_empty() {
                format!("Git {} failed.", args.join(" "))
            } else {
                details
            },
        ))
    }
}

fn is_github_url(url: &str) -> bool {
    let url = url.trim();
    url.starts_with("https://github.com/")
        || url.starts_with("git@github.com:")
        || url.starts_with("ssh://git@github.com/")
}

fn git_root(root: &Path) -> Result<(), String> {
    git(root, &["rev-parse", "--is-inside-work-tree"])?;
    Ok(())
}

fn commit_changes(root: &Path, message: &str) -> Result<bool, String> {
    exclude_search_cache_from_git(root)?;
    let changed = !git(root, &["status", "--porcelain"])?.is_empty();
    if !changed {
        return Ok(false);
    }
    git(root, &["add", "--all"])?;
    git(root, &["commit", "-m", message])?;
    Ok(true)
}

fn clean_root(root: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(root);
    if !path.is_absolute() {
        return Err("The notebook folder must be an absolute path.".into());
    }
    Ok(path)
}

fn safe_notebook_path(root: &str, relative: &str) -> Result<PathBuf, String> {
    let root = clean_root(root)?;
    let relative_path = Path::new(relative);

    if relative_path.is_absolute()
        || relative_path.components().any(|part| {
            matches!(
                part,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err("That file is outside the notebook.".into());
    }

    Ok(root.join(relative_path))
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("md"))
}

fn search_database_path(root: &Path) -> PathBuf {
    root.join(SEARCH_DIRECTORY).join(SEARCH_DATABASE)
}

fn stable_content_hash(content: &[u8]) -> String {
    // FNV-1a is deliberately implemented here so the persisted representation
    // does not depend on Rust's intentionally unstable DefaultHasher.
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in content {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

fn exclude_search_cache_from_git(root: &Path) -> Result<(), String> {
    let exclude = root.join(".git").join("info").join("exclude");
    let Some(parent) = exclude.parent() else {
        return Ok(());
    };
    if !parent.exists() {
        return Ok(());
    }
    let marker = "/.daydock/";
    let existing = fs::read_to_string(&exclude).unwrap_or_default();
    if existing.lines().any(|line| line.trim() == marker) {
        return Ok(());
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&exclude)
        .map_err(|error| error.to_string())?;
    if !existing.is_empty() && !existing.ends_with('\n') {
        writeln!(file).map_err(|error| error.to_string())?;
    }
    writeln!(file, "{marker}").map_err(|error| error.to_string())
}

fn title_from_content(path: &str, content: &str) -> String {
    content
        .lines()
        .find_map(|line| line.strip_prefix("# ").map(str::trim))
        .filter(|title| !title.is_empty())
        .unwrap_or_else(|| {
            path.rsplit('/')
                .next()
                .unwrap_or(path)
                .trim_end_matches(".md")
        })
        .to_string()
}

fn open_search_database(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let mut connection = Connection::open(path).map_err(|error| error.to_string())?;
    connection
        .busy_timeout(std::time::Duration::from_secs(5))
        .map_err(|error| error.to_string())?;
    connection
        .execute_batch("PRAGMA journal_mode = WAL;")
        .map_err(|error| error.to_string())?;
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if version != SEARCH_SCHEMA_VERSION {
        let transaction = connection
            .transaction()
            .map_err(|error| error.to_string())?;
        transaction
            .execute_batch(
                "DROP TABLE IF EXISTS documents_fts;
             DROP TABLE IF EXISTS documents;
             DROP TRIGGER IF EXISTS documents_ai;
             DROP TRIGGER IF EXISTS documents_ad;
             DROP TRIGGER IF EXISTS documents_au;",
            )
            .map_err(|error| error.to_string())?;
        transaction
            .pragma_update(None, "user_version", SEARCH_SCHEMA_VERSION)
            .map_err(|error| error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())?;
    }
    connection.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS documents (
              path TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              body TEXT NOT NULL,
              modified INTEGER NOT NULL,
              size INTEGER NOT NULL,
              content_hash TEXT NOT NULL
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
              path UNINDEXED,
              title,
              body,
              content='documents',
              content_rowid='rowid',
              tokenize='unicode61 remove_diacritics 2'
            );
            CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
              INSERT INTO documents_fts(rowid, path, title, body) VALUES (new.rowid, new.path, new.title, new.body);
            END;
            CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
              INSERT INTO documents_fts(documents_fts, rowid, path, title, body) VALUES ('delete', old.rowid, old.path, old.title, old.body);
            END;
            CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
              INSERT INTO documents_fts(documents_fts, rowid, path, title, body) VALUES ('delete', old.rowid, old.path, old.title, old.body);
              INSERT INTO documents_fts(rowid, path, title, body) VALUES (new.rowid, new.path, new.title, new.body);
            END;
            ",
        ).map_err(|error| error.to_string())?;
    Ok(connection)
}

fn remove_search_database_files(path: &Path) {
    for candidate in [
        path.to_path_buf(),
        PathBuf::from(format!("{}-wal", path.to_string_lossy())),
        PathBuf::from(format!("{}-shm", path.to_string_lossy())),
    ] {
        let _ = fs::remove_file(candidate);
    }
}

fn open_or_rebuild_search_database(path: &Path) -> Result<Connection, String> {
    match open_search_database(path) {
        Ok(connection) => Ok(connection),
        Err(first_error) => {
            remove_search_database_files(path);
            open_search_database(path).map_err(|second_error| {
                format!("The search index could not be rebuilt ({first_error}; {second_error}).")
            })
        }
    }
}

fn upsert_search_document(root: &Path, relative: &str, content: &str) -> Result<(), String> {
    let path = root.join(relative);
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0);
    let mut connection = open_or_rebuild_search_database(&search_database_path(root))?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    transaction.execute(
        "INSERT INTO documents(path, title, body, modified, size, content_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(path) DO UPDATE SET title=excluded.title, body=excluded.body, modified=excluded.modified, size=excluded.size, content_hash=excluded.content_hash",
        params![relative, title_from_content(relative, content), content, modified, metadata.len(), stable_content_hash(content.as_bytes())],
    ).map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
}

fn sync_search_index(root: &Path, connection: &mut Connection) -> Result<IndexStatus, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let mut indexed = std::collections::HashSet::new();
    let mut warnings = Vec::new();
    for directory in ["Daily", "Weekly", "Docs"] {
        let directory = root.join(directory);
        if !directory.exists() {
            continue;
        }
        for entry in WalkDir::new(directory).follow_links(false) {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    warnings.push(error.to_string());
                    continue;
                }
            };
            let path = entry.path();
            if !entry.file_type().is_file() || !is_markdown(path) {
                continue;
            }
            let relative = path
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .to_string_lossy()
                .replace('\\', "/");
            let metadata = match entry.metadata() {
                Ok(metadata) => metadata,
                Err(error) => {
                    warnings.push(format!("Could not inspect {relative}: {error}"));
                    continue;
                }
            };
            let modified = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(0);
            let bytes = match fs::read(path) {
                Ok(bytes) => bytes,
                Err(error) => {
                    warnings.push(format!("Could not index {relative}: {error}"));
                    continue;
                }
            };
            let body = match String::from_utf8(bytes.clone()) {
                Ok(body) => body,
                Err(_) => {
                    warnings.push(format!(
                        "Could not index {relative} because it is not valid UTF-8."
                    ));
                    continue;
                }
            };
            indexed.insert(relative.clone());
            let content_hash = stable_content_hash(&bytes);
            let existing: Option<String> = transaction
                .query_row(
                    "SELECT content_hash FROM documents WHERE path = ?1",
                    [&relative],
                    |row| row.get(0),
                )
                .ok();
            if existing.as_deref() == Some(&content_hash) {
                continue;
            }
            let title = title_from_content(&relative, &body);
            transaction.execute(
                "INSERT INTO documents(path, title, body, modified, size, content_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(path) DO UPDATE SET title=excluded.title, body=excluded.body, modified=excluded.modified, size=excluded.size, content_hash=excluded.content_hash",
                params![relative, title, body, modified, metadata.len(), content_hash],
            ).map_err(|error| error.to_string())?;
        }
    }
    let paths = transaction
        .prepare("SELECT path FROM documents")
        .map_err(|error| error.to_string())?
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    for path in paths {
        if !indexed.contains(&path) {
            transaction
                .execute("DELETE FROM documents WHERE path = ?1", [path])
                .map_err(|error| error.to_string())?;
        }
    }
    let count = indexed.len();
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(IndexStatus {
        indexed: count,
        warnings,
    })
}

fn fts_query(query: &str) -> String {
    query
        .split_whitespace()
        .filter_map(|term| {
            let term = term.trim_matches(|character: char| !character.is_alphanumeric());
            (!term.is_empty()).then(|| format!("\"{}\"*", term.replace('"', "")))
        })
        .collect::<Vec<_>>()
        .join(" AND ")
}

#[tauri::command]
fn select_notebook() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Choose a Daydock folder")
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn initialize_notebook_blocking(root: String) -> Result<(), String> {
    let root = clean_root(&root)?;
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;

    for directory in ["Daily", "Weekly", "Docs", "Assets"] {
        fs::create_dir_all(root.join(directory)).map_err(|error| error.to_string())?;
    }

    exclude_search_cache_from_git(&root)?;
    Ok(())
}

fn scan_notebook_blocking(root: String) -> Result<Vec<NotebookFile>, String> {
    let root_path = clean_root(&root)?;
    if !root_path.exists() {
        return Err("The notebook folder no longer exists.".into());
    }

    let mut files = Vec::new();
    for directory in ["Daily", "Weekly", "Docs"] {
        let directory = root_path.join(directory);
        if !directory.exists() {
            continue;
        }
        for entry in WalkDir::new(directory).follow_links(false) {
            let Ok(entry) = entry else {
                continue;
            };
            if !entry.file_type().is_file() || !is_markdown(entry.path()) {
                continue;
            }

            let path = entry.path();
            let relative = path
                .strip_prefix(&root_path)
                .map_err(|error| error.to_string())?
                .to_string_lossy()
                .replace('\\', "/");
            let Ok(metadata) = entry.metadata() else {
                continue;
            };
            let modified = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(0);
            files.push(NotebookFile {
                name: path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                content: String::new(),
                path: relative,
                loaded: false,
                modified,
            });
        }
    }

    files.sort_by_key(|file| std::cmp::Reverse(file.modified));
    Ok(files)
}

fn read_notebook_file_blocking(root: String, path: String) -> Result<NotebookFile, String> {
    let destination = safe_notebook_path(&root, &path)?;
    if !is_markdown(&destination) {
        return Err("Daydock only reads Markdown files.".into());
    }
    let metadata = fs::metadata(&destination).map_err(|error| error.to_string())?;
    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0);
    Ok(NotebookFile {
        name: destination
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        path,
        content: fs::read_to_string(destination).map_err(|error| error.to_string())?,
        loaded: true,
        modified,
    })
}

#[tauri::command]
fn write_notebook_file_blocking(
    root: String,
    path: String,
    content: String,
    expected_modified: Option<u64>,
) -> Result<NotebookFile, String> {
    let destination = safe_notebook_path(&root, &path)?;
    if !is_markdown(&destination) {
        return Err("Daydock only writes Markdown files.".into());
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    if let Some(expected) = expected_modified {
        if let Ok(metadata) = fs::metadata(&destination) {
            let actual = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(0);
            if actual != expected {
                return Err(format!("{path} changed outside Daydock. Your edit was not written; reopen the page to review both versions."));
            }
        }
    }
    fs::write(destination, &content).map_err(|error| error.to_string())?;
    let root_path = clean_root(&root)?;
    if let Ok(_guard) = search_lock().lock() {
        let _ = upsert_search_document(&root_path, &path, &content);
    }
    read_notebook_file_blocking(root, path)
}

fn materialize_notebook_file_blocking(
    root: String,
    path: String,
    initial: String,
) -> Result<NotebookFile, String> {
    let destination = safe_notebook_path(&root, &path)?;
    if !is_markdown(&destination) {
        return Err("Daydock only creates Markdown files.".into());
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&destination)
    {
        Ok(mut file) => file
            .write_all(initial.as_bytes())
            .map_err(|error| error.to_string())?,
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(error) => return Err(error.to_string()),
    }
    let file = read_notebook_file_blocking(root.clone(), path.clone())?;
    if let Ok(root_path) = clean_root(&root) {
        if let Ok(_guard) = search_lock().lock() {
            let _ = upsert_search_document(&root_path, &path, &file.content);
        }
    }
    Ok(file)
}

#[tauri::command]
fn delete_notebook_file_blocking(root: String, path: String) -> Result<(), String> {
    let destination = safe_notebook_path(&root, &path)?;
    if !is_markdown(&destination) {
        return Err("Daydock only deletes Markdown files.".into());
    }
    fs::remove_file(destination).map_err(|error| error.to_string())?;
    let root_path = clean_root(&root)?;
    if let Ok(_guard) = search_lock().lock() {
        if let Ok(connection) = open_or_rebuild_search_database(&search_database_path(&root_path)) {
            let _ = connection.execute("DELETE FROM documents WHERE path = ?1", [&path]);
        }
    }
    Ok(())
}

#[tauri::command]
fn get_git_status_blocking(root: String) -> Result<GitStatus, String> {
    let root = clean_root(&root)?;
    if git_root(&root).is_err() {
        return Ok(GitStatus {
            configured: false,
            remote_url: None,
            branch: None,
        });
    }

    let remote_url = git(&root, &["config", "--get", "remote.origin.url"]).ok();
    let configured = remote_url.as_deref().is_some_and(is_github_url);
    let branch = git(&root, &["branch", "--show-current"])
        .ok()
        .filter(|branch| !branch.is_empty());
    Ok(GitStatus {
        configured,
        remote_url,
        branch,
    })
}

#[tauri::command]
fn configure_github_sync_blocking(root: String, remote_url: String) -> Result<SyncResult, String> {
    let _guard = git_operation_lock().lock().map_err(|_| {
        "The Git sync lock is unavailable. Restart Daydock, then try again.".to_string()
    })?;
    let root = clean_root(&root)?;
    let remote_url = remote_url.trim();
    if !is_github_url(remote_url) {
        return Err("Enter a GitHub repository URL (https://github.com/owner/repo.git or git@github.com:owner/repo.git).".into());
    }

    if git_root(&root).is_err() {
        git(&root, &["init"])?;
    }
    match git(&root, &["config", "--get", "remote.origin.url"]) {
        Ok(existing) if existing != remote_url => {
            return Err("This notebook is already connected to a different remote. Change it with Git before connecting another repository.".into());
        }
        Ok(_) => {}
        Err(_) => {
            git(&root, &["remote", "add", "origin", remote_url])?;
        }
    }

    let branch = git(&root, &["branch", "--show-current"])?;
    if branch.is_empty() {
        git(&root, &["branch", "-M", "main"])?;
    }
    let branch = git(&root, &["branch", "--show-current"])?;
    commit_changes(&root, "Initial notebook sync")?;
    git(&root, &["push", "-u", "origin", &branch]).map_err(|error| {
        format!("Could not connect to GitHub. Create an empty GitHub repository, make sure you have access, then try again.\n\n{error}")
    })?;

    Ok(SyncResult {
        status: "pushed".into(),
        message: "Connected to GitHub and synced your notebook.".into(),
    })
}

#[tauri::command]
fn sync_notebook_blocking(root: String) -> Result<SyncResult, String> {
    let _guard = git_operation_lock().lock().map_err(|_| {
        "The Git sync lock is unavailable. Restart Daydock, then try again.".to_string()
    })?;
    let root = clean_root(&root)?;
    git_root(&root)?;
    let remote_url = git(&root, &["config", "--get", "remote.origin.url"])?;
    if !is_github_url(&remote_url) {
        return Err("This notebook is not connected to a GitHub repository.".into());
    }

    git(&root, &["fetch", "origin", "--prune"])?;
    let upstream = git(
        &root,
        &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    );
    if upstream.is_err() {
        commit_changes(&root, "Notebook sync")?;
        let branch = git(&root, &["branch", "--show-current"])?;
        git(&root, &["push", "-u", "origin", &branch])?;
        return Ok(SyncResult {
            status: "pushed".into(),
            message: "Synced to GitHub.".into(),
        });
    }
    let upstream = upstream?;
    let counts = git(
        &root,
        &[
            "rev-list",
            "--left-right",
            "--count",
            &format!("HEAD...{upstream}"),
        ],
    )?;
    let mut parts = counts.split_whitespace();
    let ahead = parts.next().unwrap_or("0").parse::<u32>().unwrap_or(0);
    let behind = parts.next().unwrap_or("0").parse::<u32>().unwrap_or(0);

    if ahead > 0 && behind > 0 {
        return Ok(SyncResult {
            status: "conflict".into(),
            message: "Both this notebook and GitHub have new commits. Sync stopped to protect your notes; resolve the Git history in a Git client, then try again.".into(),
        });
    }
    if behind > 0 {
        let committed = commit_changes(&root, "Notebook sync")?;
        if committed {
            if let Err(error) = git(&root, &["rebase", &upstream]) {
                let _ = git(&root, &["rebase", "--abort"]);
                return Ok(SyncResult {
                    status: "conflict".into(),
                    message: format!(
                        "GitHub and this notebook changed the same content. Sync stopped and restored your local commit; resolve the history in a Git client, then try again.\n\n{error}"
                    ),
                });
            }
            git(&root, &["push"])?;
            return Ok(SyncResult {
                status: "reconciled".into(),
                message: "Downloaded GitHub changes, replayed this notebook's changes, and synced everything.".into(),
            });
        }
        git(&root, &["merge", "--ff-only", &upstream])?;
        return Ok(SyncResult {
            status: "pulled".into(),
            message: "Downloaded the latest notebook changes from GitHub.".into(),
        });
    }
    commit_changes(&root, "Notebook sync")?;
    let ahead_after_commit = git(
        &root,
        &["rev-list", "--count", &format!("{upstream}..HEAD")],
    )?
    .parse::<u32>()
    .unwrap_or(0);
    if ahead_after_commit > 0 {
        git(&root, &["push"])?;
        return Ok(SyncResult {
            status: "pushed".into(),
            message: "Synced to GitHub.".into(),
        });
    }
    Ok(SyncResult {
        status: "upToDate".into(),
        message: "Notebook is up to date with GitHub.".into(),
    })
}

#[tauri::command]
async fn initialize_notebook(app: tauri::AppHandle, root: String) -> Result<(), String> {
    let legacy_search_dir = app
        .path()
        .app_local_data_dir()
        .ok()
        .map(|path| path.join("search"));
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(path) = legacy_search_dir {
            if path.is_dir() {
                let _ = fs::remove_dir_all(path);
            }
        }
        initialize_notebook_blocking(root)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn scan_notebook(root: String) -> Result<Vec<NotebookFile>, String> {
    tauri::async_runtime::spawn_blocking(move || scan_notebook_blocking(root))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn read_notebook_file(root: String, path: String) -> Result<NotebookFile, String> {
    tauri::async_runtime::spawn_blocking(move || read_notebook_file_blocking(root, path))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn materialize_notebook_file(
    root: String,
    path: String,
    initial: String,
) -> Result<NotebookFile, String> {
    tauri::async_runtime::spawn_blocking(move || {
        materialize_notebook_file_blocking(root, path, initial)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn write_notebook_file(
    root: String,
    path: String,
    content: String,
    expected_modified: Option<u64>,
) -> Result<NotebookFile, String> {
    tauri::async_runtime::spawn_blocking(move || {
        write_notebook_file_blocking(root, path, content, expected_modified)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn delete_notebook_file(root: String, path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || delete_notebook_file_blocking(root, path))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn get_git_status(root: String) -> Result<GitStatus, String> {
    tauri::async_runtime::spawn_blocking(move || get_git_status_blocking(root))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn configure_github_sync(root: String, remote_url: String) -> Result<SyncResult, String> {
    tauri::async_runtime::spawn_blocking(move || configure_github_sync_blocking(root, remote_url))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn sync_notebook(root: String) -> Result<SyncResult, String> {
    tauri::async_runtime::spawn_blocking(move || sync_notebook_blocking(root))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn prepare_search_index(root: String) -> Result<IndexStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root_path = clean_root(&root)?;
        let _guard = search_lock()
            .lock()
            .map_err(|_| "The search index lock is unavailable.".to_string())?;
        let mut connection = open_or_rebuild_search_database(&search_database_path(&root_path))?;
        sync_search_index(&root_path, &mut connection)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn search_notebook(root: String, query: String) -> Result<Vec<SearchResult>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root_path = clean_root(&root)?;
        let query = fts_query(&query);
        if query.is_empty() {
            return Ok(Vec::new());
        }
        let _guard = search_lock()
            .lock()
            .map_err(|_| "The search index lock is unavailable.".to_string())?;
        let connection = open_or_rebuild_search_database(&search_database_path(&root_path))?;
        let mut statement = connection
            .prepare(
                "SELECT documents.path, documents.title,
                    snippet(documents_fts, 2, '[', ']', '…', 18)
             FROM documents_fts
             JOIN documents ON documents.rowid = documents_fts.rowid
             WHERE documents_fts MATCH ?1
             ORDER BY bm25(documents_fts, 1.0, 8.0, 1.0)
             LIMIT 20",
            )
            .map_err(|error| error.to_string())?;
        let results = statement
            .query_map([query], |row| {
                Ok(SearchResult {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    snippet: row.get(2)?,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        Ok(results)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_notebook,
            initialize_notebook,
            scan_notebook,
            read_notebook_file,
            materialize_notebook_file,
            write_notebook_file,
            delete_notebook_file,
            get_git_status,
            configure_github_sync,
            sync_notebook,
            prepare_search_index,
            search_notebook
        ])
        .run(tauri::generate_context!())
        .expect("error while running Daydock");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    const TEST_REMOTE_URL: &str = "https://github.com/daydock/sync-test.git";

    fn test_root(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("daydock-{label}-{}-{nonce}", std::process::id()))
    }

    fn configure_test_identity(root: &Path) {
        git(root, &["config", "user.name", "Daydock Test"]).expect("test user name");
        git(root, &["config", "user.email", "daydock@example.test"]).expect("test user email");
    }

    fn create_sync_fixture(label: &str) -> (PathBuf, PathBuf, PathBuf) {
        let root = test_root(label);
        let remote = root.join("remote.git");
        let seed = root.join("seed");
        let notebook = root.join("notebook");
        fs::create_dir_all(&remote).expect("remote directory");
        fs::create_dir_all(&seed).expect("seed directory");
        git(&remote, &["init", "--bare", "--initial-branch=main"]).expect("bare remote");
        git(&seed, &["init", "--initial-branch=main"]).expect("seed repository");
        configure_test_identity(&seed);
        fs::create_dir_all(seed.join("Docs")).expect("seed docs");
        fs::write(seed.join("Docs/seed.md"), "# Seed\n").expect("seed note");
        git(&seed, &["add", "--all"]).expect("stage seed");
        git(&seed, &["commit", "-m", "Seed notebook"]).expect("commit seed");
        let remote_path = remote.to_string_lossy();
        git(&seed, &["remote", "add", "origin", &remote_path]).expect("seed origin");
        git(&seed, &["push", "-u", "origin", "main"]).expect("push seed");
        let notebook_path = notebook.to_string_lossy();
        git(&root, &["clone", &remote_path, &notebook_path]).expect("clone notebook");
        configure_test_identity(&notebook);

        // Keep the production GitHub URL check while redirecting network access
        // to this test's isolated local bare repository.
        git(&notebook, &["remote", "set-url", "origin", TEST_REMOTE_URL])
            .expect("GitHub-shaped origin");
        let file_url = format!("file:///{}", remote.to_string_lossy().replace('\\', "/"));
        let rewrite_key = format!("url.{file_url}.insteadOf");
        git(&notebook, &["config", &rewrite_key, TEST_REMOTE_URL]).expect("local URL rewrite");
        (root, seed, notebook)
    }

    fn add_commit(root: &Path, relative: &str, content: &str, message: &str) {
        let destination = root.join(relative);
        fs::create_dir_all(destination.parent().expect("commit parent")).expect("commit directory");
        fs::write(destination, content).expect("commit content");
        git(root, &["add", "--all"]).expect("stage commit");
        git(root, &["commit", "-m", message]).expect("create commit");
    }

    #[test]
    fn rejects_paths_outside_notebook() {
        let root = if cfg!(windows) {
            "C:\\Notebook"
        } else {
            "/Notebook"
        };
        assert!(safe_notebook_path(root, "../secret.md").is_err());
        assert!(safe_notebook_path(root, "Daily/today.md").is_ok());
    }

    #[test]
    fn initializes_writes_and_scans_a_plain_markdown_notebook() {
        let root = test_root("scan");
        let root_string = root.to_string_lossy().to_string();

        initialize_notebook_blocking(root_string.clone()).expect("initialize notebook");
        write_notebook_file_blocking(
            root_string.clone(),
            "Daily/2026-08-03.md".into(),
            "# Monday\n\n## Win\n\n- [ ] Build it\n".into(),
            None,
        )
        .expect("write daily page");

        let files = scan_notebook_blocking(root_string).expect("scan notebook");
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "Daily/2026-08-03.md");
        assert!(!files[0].loaded);
        assert!(root.join("Assets").is_dir());

        fs::remove_dir_all(&root).expect("remove isolated test notebook");
    }

    #[test]
    fn initialization_preserves_existing_user_files() {
        let root = test_root("preserve");
        fs::create_dir_all(root.join("Daily")).expect("daily directory");
        fs::write(root.join("settings.json"), "user-owned").expect("settings");
        let daily = root.join("Daily/2026-08-04.md");
        fs::write(&daily, "# Tuesday\nSystem streak: keep this\n").expect("daily");

        initialize_notebook_blocking(root.to_string_lossy().to_string()).expect("initialize");

        assert_eq!(
            fs::read_to_string(root.join("settings.json")).unwrap(),
            "user-owned"
        );
        assert!(fs::read_to_string(daily)
            .unwrap()
            .contains("System streak: keep this"));
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn materialize_never_overwrites_an_existing_file() {
        let root = test_root("materialize");
        initialize_notebook_blocking(root.to_string_lossy().to_string()).expect("initialize");
        let existing = root.join("Docs/external.md");
        fs::write(&existing, "# External\n\nOriginal\n").expect("external file");

        let file = materialize_notebook_file_blocking(
            root.to_string_lossy().to_string(),
            "Docs/external.md".into(),
            "# Replacement".into(),
        )
        .expect("materialize");

        assert_eq!(file.content, "# External\n\nOriginal\n");
        assert_eq!(fs::read_to_string(existing).unwrap(), file.content);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn index_is_notebook_local_versioned_and_rebuilds_corruption() {
        let root = test_root("index");
        initialize_notebook_blocking(root.to_string_lossy().to_string()).expect("initialize");
        fs::write(root.join("Docs/UPPER.MD"), "# Searchable\n\nneedle\n").expect("document");
        let database = search_database_path(&root);
        fs::create_dir_all(database.parent().unwrap()).expect("cache directory");
        fs::write(&database, "not a sqlite database").expect("corrupt cache");

        let mut connection = open_or_rebuild_search_database(&database).expect("rebuild cache");
        let status = sync_search_index(&root, &mut connection).expect("index");
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        let body: String = connection
            .query_row(
                "SELECT body FROM documents WHERE path = 'Docs/UPPER.MD'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(status.indexed, 1);
        assert_eq!(version, SEARCH_SCHEMA_VERSION);
        assert_eq!(body, "# Searchable\n\nneedle\n");
        assert!(database.starts_with(&root));
        drop(connection);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn conditional_write_protects_external_changes() {
        let root = test_root("conflict");
        initialize_notebook_blocking(root.to_string_lossy().to_string()).expect("initialize");
        let path = "Docs/conflict.md";
        fs::write(root.join(path), "external").expect("external file");

        let result = write_notebook_file_blocking(
            root.to_string_lossy().to_string(),
            path.into(),
            "app edit".into(),
            Some(1),
        );

        assert!(result
            .err()
            .expect("conflict error")
            .contains("changed outside Daydock"));
        assert_eq!(fs::read_to_string(root.join(path)).unwrap(), "external");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn git_index_lock_errors_include_safe_recovery_steps() {
        let root = test_root("git-lock-message");
        let message = git_lock_error(
            &root,
            "fatal: Unable to create '.git/index.lock': File exists.".into(),
        );

        assert!(message.contains("Close other Git tools"));
        assert!(message.contains(".git\\index.lock") || message.contains(".git/index.lock"));
        assert!(message.contains("OneDrive"));
    }

    #[test]
    fn sync_fetches_before_committing_and_rebases_non_conflicting_changes() {
        let (root, seed, notebook) = create_sync_fixture("sync-rebase");
        add_commit(&seed, "Docs/remote.md", "# Remote\n", "Remote change");
        git(&seed, &["push"]).expect("push remote change");
        fs::write(notebook.join("Docs/local.md"), "# Local\n").expect("local working change");

        let result = sync_notebook_blocking(notebook.to_string_lossy().to_string()).expect("sync");

        assert_eq!(result.status, "reconciled");
        assert!(notebook.join("Docs/remote.md").is_file());
        assert!(notebook.join("Docs/local.md").is_file());
        assert_eq!(git(&notebook, &["status", "--porcelain"]).unwrap(), "");
        assert_eq!(
            git(&notebook, &["rev-list", "--count", "origin/main..HEAD"]).unwrap(),
            "0"
        );
        fs::remove_dir_all(root).expect("cleanup sync fixture");
    }

    #[test]
    fn sync_does_not_create_another_commit_when_history_already_diverged() {
        let (root, seed, notebook) = create_sync_fixture("sync-diverged");
        add_commit(
            &notebook,
            "Docs/local.md",
            "# Local\n",
            "Existing local commit",
        );
        let head_before = git(&notebook, &["rev-parse", "HEAD"]).expect("local head");
        add_commit(&seed, "Docs/remote.md", "# Remote\n", "Remote change");
        git(&seed, &["push"]).expect("push remote change");

        let result = sync_notebook_blocking(notebook.to_string_lossy().to_string()).expect("sync");

        assert_eq!(result.status, "conflict");
        assert_eq!(git(&notebook, &["rev-parse", "HEAD"]).unwrap(), head_before);
        assert_eq!(git(&notebook, &["status", "--porcelain"]).unwrap(), "");
        fs::remove_dir_all(root).expect("cleanup sync fixture");
    }
}
