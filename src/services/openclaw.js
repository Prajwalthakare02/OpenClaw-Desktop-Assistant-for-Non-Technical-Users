/**
 * @file openclaw.js
 * @description OpenClaw backend service layer.
 *
 * Provides two categories of operations:
 *   1. Shell commands — executes CLI programs via Tauri's shell plugin.
 *   2. Database ops  — invokes Rust IPC commands for SQLite CRUD.
 */

import { invoke } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";

/* ═══════════════════════════════════════════════════════════
   Shell Execution
   ═══════════════════════════════════════════════════════════ */

/**
 * Run a shell command and return its result.
 * @param {string} program - Executable name (must be in PATH or allowlist).
 * @param {string[]} [args=[]] - Command-line arguments.
 * @returns {Promise<{success:boolean, stdout:string, stderr:string, code:number}>}
 */
export async function executeCommand(program, args = []) {
    try {
        const output = await Command.create(program, args).execute();
        return {
            success: output.code === 0,
            stdout: output.stdout,
            stderr: output.stderr,
            code: output.code,
        };
    } catch (err) {
        return { success: false, stdout: "", stderr: err.toString(), code: -1 };
    }
}

/** @returns {Promise<boolean>} Whether the `openclaw` CLI is reachable. */
export const checkOpenClawInstalled = async () =>
    (await executeCommand("openclaw", ["--version"])).success;

/** @returns {Promise<boolean>} Whether Node.js is reachable. */
export const checkNodeInstalled = async () =>
    (await executeCommand("node", ["--version"])).success;

/** Install latest OpenClaw globally via npm. */
export const installOpenClaw = () =>
    executeCommand("npm", ["install", "-g", "openclaw@latest"]);

/** Run the OpenClaw on-boarding wizard (non-interactive). */
export const runOpenClawOnboard = () =>
    executeCommand("openclaw", ["onboard", "--non-interactive"]);

/** Run `openclaw doctor` for diagnostics. */
export const openClawDoctor = () =>
    executeCommand("openclaw", ["doctor"]);

/**
 * Start the OpenClaw gateway as a background process.
 * @param {number} [port=18789] - Gateway listen port.
 */
export async function startGateway(port = 18789) {
    try {
        Command.create("openclaw", ["gateway", "--port", String(port)]).spawn();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.toString() };
    }
}

/**
 * Add a cron job via `openclaw cron add`.
 * @param {string} name - Job name.
 * @param {string} cronExpr - Cron expression.
 * @param {string} message - Agent message to run.
 * @param {Object} [opts] - Optional flags.
 * @param {string} [opts.session] - Session name.
 * @param {boolean} [opts.announce] - Announce flag.
 */
export function openClawCronAdd(name, cronExpr, message, opts = {}) {
    const args = ["cron", "add", "--name", name, "--cron", cronExpr, "--message", message];
    if (opts.session) args.push("--session", opts.session);
    if (opts.announce) args.push("--announce");
    return executeCommand("openclaw", args);
}

/** List all cron jobs. */
export const openClawCronList = () =>
    executeCommand("openclaw", ["cron", "list"]);

/** Send a one-shot message to an agent session. */
export const openClawAgentMessage = (message) =>
    executeCommand("openclaw", ["agent", "--message", message]);

/**
 * Detect the host operating system from the user-agent string.
 * @returns {"windows"|"macos"|"linux"|"unknown"}
 */
export function detectOS() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) return "windows";
    if (ua.includes("mac")) return "macos";
    if (ua.includes("linux")) return "linux";
    return "unknown";
}

/* ═══════════════════════════════════════════════════════════
   Database Operations  (Rust IPC via Tauri `invoke`)
   ═══════════════════════════════════════════════════════════ */

// ── Agents ──
export const createAgent = (data) =>
    invoke("create_agent", {
        name: data.name,
        role: data.role || "",
        goal: data.goal || "",
        tools: data.tools || "[]",
        schedule: data.schedule || "",
        sandbox: data.sandbox || false,
    });

export const listAgents = () => invoke("list_agents");
export const deleteAgent = (id) => invoke("delete_agent", { id });

// ── Logs ──
export const addLog = (agentId, action, status, output, error) =>
    invoke("add_log", { agentId, action, status, output, error: error || "" });

export const getLogs = (limit = 100) => invoke("get_logs", { limit });

// ── Settings ──
export const getSetting = (key) => invoke("get_setting", { key });
export const setSetting = (key, value) => invoke("set_setting", { key, value });
export const deleteSetting = (key) => invoke("delete_setting", { key });

// ── Approvals ──
export const addApproval = (agentId, actionType, contentPreview) =>
    invoke("add_approval", { agentId, actionType, contentPreview });

export const updateApproval = (id, status) =>
    invoke("update_approval", { id, status });

export const getApprovals = () => invoke("get_approvals");
