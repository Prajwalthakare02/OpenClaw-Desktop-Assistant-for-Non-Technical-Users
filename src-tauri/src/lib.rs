use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub role: String,
    pub goal: String,
    pub tools: String,
    pub schedule: String,
    pub config_json: String,
    pub sandbox: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExecutionLog {
    pub id: i64,
    pub agent_id: String,
    pub action: String,
    pub status: String,
    pub output: String,
    pub error: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApprovalItem {
    pub id: String,
    pub agent_id: String,
    pub action_type: String,
    pub content_preview: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

fn init_db(conn: &Connection) {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT DEFAULT '',
            goal TEXT DEFAULT '',
            tools TEXT DEFAULT '[]',
            schedule TEXT DEFAULT '',
            config_json TEXT DEFAULT '{}',
            sandbox INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS execution_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT DEFAULT '',
            action TEXT NOT NULL,
            status TEXT NOT NULL,
            output TEXT DEFAULT '',
            error TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS approval_queue (
            id TEXT PRIMARY KEY,
            agent_id TEXT DEFAULT '',
            action_type TEXT NOT NULL,
            content_preview TEXT DEFAULT '',
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS schedules (
            id TEXT PRIMARY KEY,
            agent_id TEXT DEFAULT '',
            cron_expr TEXT NOT NULL,
            description TEXT DEFAULT '',
            enabled INTEGER DEFAULT 1,
            last_run TEXT DEFAULT '',
            next_run TEXT DEFAULT ''
        );
    ").expect("Failed to initialize database");
}

// ─── Agent CRUD ───

#[tauri::command]
fn create_agent(
    db: State<DbState>,
    name: String,
    role: String,
    goal: String,
    tools: String,
    schedule: String,
    sandbox: bool,
) -> Result<Agent, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let config = serde_json::json!({
        "name": name,
        "role": role,
        "goal": goal,
        "tools": tools,
        "schedule": schedule,
        "sandbox": sandbox
    }).to_string();

    conn.execute(
        "INSERT INTO agents (id, name, role, goal, tools, schedule, config_json, sandbox, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, name, role, goal, tools, schedule, config, sandbox as i32, now],
    ).map_err(|e| e.to_string())?;

    Ok(Agent { id, name, role, goal, tools, schedule, config_json: config, sandbox, created_at: now })
}

#[tauri::command]
fn list_agents(db: State<DbState>) -> Result<Vec<Agent>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, role, goal, tools, schedule, config_json, sandbox, created_at FROM agents ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Agent {
            id: row.get(0)?,
            name: row.get(1)?,
            role: row.get(2)?,
            goal: row.get(3)?,
            tools: row.get(4)?,
            schedule: row.get(5)?,
            config_json: row.get(6)?,
            sandbox: row.get::<_, i32>(7)? != 0,
            created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut agents = Vec::new();
    for row in rows {
        agents.push(row.map_err(|e| e.to_string())?);
    }
    Ok(agents)
}

#[tauri::command]
fn delete_agent(db: State<DbState>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM agents WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Execution Logs ───

#[tauri::command]
fn add_log(
    db: State<DbState>,
    agent_id: String,
    action: String,
    status: String,
    output: String,
    error: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO execution_logs (agent_id, action, status, output, error, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![agent_id, action, status, output, error, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_logs(db: State<DbState>, limit: Option<i64>) -> Result<Vec<ExecutionLog>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(100);
    let mut stmt = conn.prepare("SELECT id, agent_id, action, status, output, error, created_at FROM execution_logs ORDER BY created_at DESC LIMIT ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![lim], |row| {
        Ok(ExecutionLog {
            id: row.get(0)?,
            agent_id: row.get(1)?,
            action: row.get(2)?,
            status: row.get(3)?,
            output: row.get(4)?,
            error: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for row in rows {
        logs.push(row.map_err(|e| e.to_string())?);
    }
    Ok(logs)
}

// ─── Settings ───

#[tauri::command]
fn get_setting(db: State<DbState>, key: String) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_setting(db: State<DbState>, key: String, value: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_setting(db: State<DbState>, key: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM settings WHERE key = ?1", params![key])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Approval Queue ───

#[tauri::command]
fn add_approval(
    db: State<DbState>,
    agent_id: String,
    action_type: String,
    content_preview: String,
) -> Result<ApprovalItem, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO approval_queue (id, agent_id, action_type, content_preview, status, created_at) VALUES (?1, ?2, ?3, ?4, 'pending', ?5)",
        params![id, agent_id, action_type, content_preview, now],
    ).map_err(|e| e.to_string())?;
    Ok(ApprovalItem { id, agent_id, action_type, content_preview, status: "pending".into(), created_at: now })
}

#[tauri::command]
fn update_approval(db: State<DbState>, id: String, status: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE approval_queue SET status = ?1 WHERE id = ?2",
        params![status, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_approvals(db: State<DbState>) -> Result<Vec<ApprovalItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, agent_id, action_type, content_preview, status, created_at FROM approval_queue ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(ApprovalItem {
            id: row.get(0)?,
            agent_id: row.get(1)?,
            action_type: row.get(2)?,
            content_preview: row.get(3)?,
            status: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

// ─── App Entry ───

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_dir = dirs_next::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("openclaw-desktop");
    std::fs::create_dir_all(&app_dir).ok();
    let db_path = app_dir.join("openclaw.db");

    let conn = Connection::open(&db_path).expect("Failed to open database");
    init_db(&conn);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            create_agent,
            list_agents,
            delete_agent,
            add_log,
            get_logs,
            get_setting,
            set_setting,
            delete_setting,
            add_approval,
            update_approval,
            get_approvals,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
