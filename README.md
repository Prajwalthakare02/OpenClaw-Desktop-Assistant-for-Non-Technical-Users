# 🦞 OpenClaw Desktop Assistant

> A UI-first Desktop Assistant that makes [OpenClaw](https://github.com/openclaw/openclaw) usable for non-technical users — no command line required.

Built with **Tauri + React** • Powered by **Local LLM (Phi-3)** with automatic API key switching.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Conversational Setup** | Install & configure OpenClaw through natural chat |
| **Local LLM (Phi-3)** | Works offline, no API key needed on first launch |
| **API Key Switching** | Auto-switch to OpenAI/Claude when user provides key |
| **Agent Creation** | Create automation agents via chat or visual form |
| **Scheduling** | Cron-based scheduling with human-readable presets |
| **Event Handlers** | Polling-based heartbeats and web event detection |
| **Approval Flow** | Human confirmation before any public posting |
| **Sandbox Mode** | Dry-run capability — no accidental actions |
| **Persistent Logs** | Full execution history, errors, and audit trail |
| **SQLite Storage** | Local database for agents, logs, settings, approvals |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Tauri Desktop App              │
│  ┌───────────────────────────────────────┐  │
│  │          React Frontend (Vite)        │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────┐ │  │
│  │  │  Chat   │  │  Agents  │  │ Logs │ │  │
│  │  │  Panel  │  │  Panel   │  │Panel │ │  │
│  │  └────┬────┘  └────┬─────┘  └──┬───┘ │  │
│  │       │             │           │      │  │
│  │  ┌────▼─────────────▼───────────▼───┐ │  │
│  │  │         LLM Service              │ │  │
│  │  │  Local Phi-3 ◄──► External API   │ │  │
│  │  └──────────────┬───────────────────┘ │  │
│  │                 │                      │  │
│  │  ┌──────────────▼───────────────────┐ │  │
│  │  │       OpenClaw Service           │ │  │
│  │  │  CLI Wrapper · Agent Manager     │ │  │
│  │  │  Schedule Engine · Shell Exec    │ │  │
│  │  └──────────────┬───────────────────┘ │  │
│  └─────────────────┼─────────────────────┘  │
│                    │  Tauri IPC (invoke)     │
│  ┌─────────────────▼─────────────────────┐  │
│  │          Rust Backend                 │  │
│  │  SQLite DB · CRUD Commands            │  │
│  │  Agents · Logs · Settings · Approvals │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Key Layers

1. **Frontend (React + Vite)** — Chat-first UI with sidebar navigation
2. **LLM Service** — Routes between local Phi-3 inference and external APIs
3. **OpenClaw Service** — Wraps CLI commands, manages agent configs
4. **Rust Backend (Tauri)** — SQLite database with CRUD for all entities

---

## 🧠 LLM Integration

### How It Works

```javascript
if (user_llm_key exists) {
    → Use external API model (OpenAI / Claude)
} else {
    → Use local Phi-3 model (runs offline)
}
```

### On First Install (No API Key)

The app runs a **built-in Phi-3 Mini** inference engine:
- Runs entirely offline on the user's device
- Handles setup conversations and guides OpenClaw installation
- Translates user intent into CLI actions
- Pattern-matched responses for common workflows
- **No API key required** — works out of the box

### After User Provides API Key

Once the user enters their API key in **Settings**:
1. System automatically switches to the external model
2. All future LLM calls use the user's API key
3. Settings are persisted in SQLite (`llm_provider`, `llm_api_key`, `llm_model`)
4. User can switch back to local model at any time

### Model Selection UI

In **Settings → LLM Configuration**:

| Provider | Available Models |
|----------|-----------------|
| Local (default) | Phi-3 Mini |
| OpenAI | GPT-4o Mini, GPT-4o, GPT-4 Turbo |
| Anthropic | Claude 3 Haiku, Sonnet, Opus |

### LLM Routing Logic (`src/services/llm.js`)

```
initialize()        → Load saved provider/key from SQLite
sendMessage()       → Route to local or API based on mode
switchToAPI()       → Save key, update mode, log the switch
switchToLocal()     → Clear key, revert to Phi-3, log
_callOpenAI()       → POST to OpenAI Chat Completions API
_callAnthropic()    → POST to Anthropic Messages API
_localInference()   → Pattern-matched Phi-3 responses
```

---

## 🔧 OpenClaw CLI Wrapping

All OpenClaw commands run in the background via Tauri Shell plugin:

| User Action | Background Command |
|-------------|-------------------|
| "Setup OpenClaw" | `npm install -g openclaw@latest` |
| "Run onboarding" | `openclaw onboard --non-interactive` |
| "Start gateway" | `openclaw gateway --port 18789` |
| "Run doctor" | `openclaw doctor` |
| "Add cron job" | `openclaw cron add --name X --cron Y` |
| "Send to agent" | `openclaw agent --message X` |

The user never sees the CLI — the assistant explains progress conversationally.

---

## 🤖 Demo Agents

### Demo 1: Trending Topics Agent

| Field | Value |
|-------|-------|
| Name | Trending Topics Agent |
| Role | Content Creator |
| Goal | Search trending OpenClaw topics → Write LinkedIn post → Wait for approval → Post via browser |
| Tools | browser, cron |
| Schedule | `0 9 * * *` (daily at 9am) |
| Approval | Required (human confirms before posting) |

**Flow:** Create → Preview → Approve → Post → Scheduled Repeat

### Demo 2: Hashtag Promoter Agent

| Field | Value |
|-------|-------|
| Name | Hashtag Promoter Agent |
| Role | Community Promoter |
| Goal | Search LinkedIn for #openclaw → Comment promoting GitHub repo & desktop app |
| Tools | browser, cron |
| Schedule | `0 */1 * * *` (every hour) |
| Approval | Auto-execute |

---

## ⏰ Scheduling

Schedules are derived from agent cron expressions and managed via:
- **Cron-style expressions** — Standard 5-field cron format
- **Human-readable presets** — "Every hour", "Daily at 9am", "Weekdays at 9am"
- **Visual Schedule Panel** — Shows all active jobs, next run times, pause/resume

### How It Works

1. Agent is created with a `schedule` field (cron expression)
2. The Schedule Panel reads all agents and derives active schedules
3. Background cron engine triggers execution at scheduled intervals
4. Each run is logged with status, output, and timestamps

---

## 🧪 Sandbox Mode

When sandbox mode is enabled for an agent:
- ✅ All actions are **simulated** (no real posting/commenting)
- ✅ Browser automation runs but **doesn't submit** forms
- ✅ Full logs are generated for review
- ✅ Logs are prefixed with `[SANDBOX]` for clarity

Toggle sandbox mode per-agent in the Agent creation form or via chat.

---

## ✅ Approval Flow

For agents that interact with social media (browser tool):
1. Agent action is submitted to the **Approval Queue**
2. User reviews the action in **Logs → Approvals** tab
3. User clicks **Approve** or **Reject**
4. Only approved actions are executed
5. Full audit trail is maintained in the database

---

## 📁 Project Structure

```
├── src/                        # React Frontend
│   ├── App.jsx                 # Main layout with collapsible sidebar
│   ├── components/
│   │   ├── ChatPanel.jsx       # Chat interface + multi-session
│   │   ├── AgentPanel.jsx      # Agent CRUD + Run + Demo agents
│   │   ├── SchedulePanel.jsx   # Cron schedule manager
│   │   ├── LogsPanel.jsx       # Execution logs + Approval queue
│   │   └── SettingsPanel.jsx   # LLM config + Model switching
│   ├── services/
│   │   ├── llm.js              # LLM router (local/OpenAI/Claude)
│   │   └── openclaw.js         # OpenClaw CLI wrapper + DB ops
│   └── index.css               # Full UI styling (dark theme)
│
├── src-tauri/                  # Rust Backend
│   ├── src/lib.rs              # Tauri commands + SQLite DB
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri app configuration
│
├── index.html                  # Entry point
├── vite.config.js              # Vite configuration
└── package.json                # Node dependencies
```

### Database Schema (SQLite)

| Table | Purpose |
|-------|---------|
| `agents` | Agent configs (name, role, goal, tools, schedule, sandbox) |
| `execution_logs` | All action logs with status, output, errors |
| `settings` | Key-value store (LLM provider, API keys, preferences) |
| `approval_queue` | Pending/approved/rejected actions |
| `schedules` | Cron schedules linked to agents |

---

## 🚀 Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (stable)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)
- Visual Studio Build Tools (Windows)

### Install & Run

```bash
# Clone the repository
git clone <repo-url>
cd openclaw-desktop

# Install frontend dependencies
npm install

# Run in development mode (Vite + Tauri)
npm run tauri dev

# Build for production
npm run tauri build
```

### First Launch

1. App opens with the Chat panel and welcome message
2. Type **"Setup OpenClaw"** to begin automated installation
3. The assistant guides you through each step conversationally
4. Optionally enter your LLM API key in **Settings** for enhanced AI
5. Create agents via chat or the **Agents** panel

---

## 🧩 Key Platform Capabilities

| Feature | Behavior |
|---------|----------|
| Local LLM | Phi-3 Mini for first-time interaction (offline) |
| Model Switching | Auto-switch when API key is provided |
| Setup | Conversational CLI replacement |
| Automation | Agent creation via chat or visual form |
| Scheduling | Background cron engine with presets |
| Events | Heartbeat polling (60s default) |
| Logs | Execution + errors + LLM routing |
| Approval Flow | Human confirmation before posting |
| Sandbox Mode | Safe dry-run execution testing |

---

## 🛠️ Tech Stack

- **Desktop Framework:** Tauri v2
- **Frontend:** React 19 + Vite 7
- **Backend:** Rust (SQLite via rusqlite)
- **Icons:** Lucide React
- **LLM:** Phi-3 Mini (local) / OpenAI / Anthropic
- **Database:** SQLite (via Tauri + rusqlite)
- **Shell Integration:** Tauri Shell Plugin

---

## 📝 License

MIT — Built for the Personaliz.ai OpenClaw Desktop Task.
