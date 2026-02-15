/**
 * @file AgentPanel.jsx
 * @description Agent management — create, run, and delete automated agents.
 *
 * Execution flow:
 *   Sandbox agents → simulated dry-run logged
 *   Browser agents → submitted to approval queue
 *   Other agents   → auto-executed with detailed log output
 */

import { useState, useEffect } from "react";
import {
    Plus, Bot, Trash2, Play, Shield, X,
    CheckCircle, Clock, Eye, Zap,
} from "lucide-react";
import { createAgent, listAgents, deleteAgent, addLog, addApproval } from "../services/openclaw";
import {
    buildSandboxOutput,
    buildAutoExecuteOutput,
    detectAgentType,
} from "../utils/executionOutput";

/* ── Constants ── */

const INITIAL_FORM = {
    name: "",
    role: "",
    goal: "",
    tools: "browser,cron",
    schedule: "0 9 * * *",
    sandbox: false,
};

const DEMO_AGENTS = {
    trending: {
        name: "Trending Topics Agent",
        role: "Content Creator",
        goal: "Search trending OpenClaw topics, write LinkedIn post, wait for approval, post via browser automation",
        tools: "browser,cron",
        schedule: "0 9 * * *",
        sandbox: false,
    },
    hashtag: {
        name: "Hashtag Promoter Agent",
        role: "Community Promoter",
        goal: "Search LinkedIn for #openclaw posts, comment promoting GitHub repo and desktop app",
        tools: "browser,cron",
        schedule: "0 */1 * * *",
        sandbox: false,
    },
};

/* ── Component ── */

function AgentPanel() {
    const [agents, setAgents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [running, setRunning] = useState({});
    const [form, setForm] = useState({ ...INITIAL_FORM });

    useEffect(() => {
        loadAgents();
    }, []);

    /* ─ Data ─ */

    const loadAgents = async () => {
        try {
            setAgents(await listAgents());
        } catch (err) {
            console.error("Failed to load agents:", err);
        }
    };

    /* ─ CRUD ─ */

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        try {
            await createAgent(form);
            await addLog("system", `Created agent: ${form.name}`, "success", JSON.stringify(form), "");
            setShowModal(false);
            setForm({ ...INITIAL_FORM });
            loadAgents();
        } catch (err) {
            console.error("Failed to create agent:", err);
        }
    };

    const handleDelete = async (id, name) => {
        try {
            await deleteAgent(id);
            await addLog("system", `Deleted agent: ${name}`, "info", "", "");
            loadAgents();
        } catch (err) {
            console.error("Failed to delete agent:", err);
        }
    };

    const createDemoAgent = async (type) => {
        const demo = DEMO_AGENTS[type];
        if (!demo) return;
        try {
            await createAgent(demo);
            await addLog("system", `Created demo agent: ${demo.name}`, "success", JSON.stringify(demo), "");
            loadAgents();
        } catch (err) {
            console.error("Failed to create demo agent:", err);
        }
    };

    /* ─ Execution ─ */

    const handleRun = async (agent) => {
        setRunning((prev) => ({ ...prev, [agent.id]: true }));
        try {
            if (agent.sandbox) {
                await addLog(
                    agent.id,
                    `[SANDBOX] Dry-run: ${agent.name}`,
                    "success",
                    buildSandboxOutput(agent.name, agent.goal),
                    ""
                );
            } else if (agent.tools.includes("browser")) {
                // Browser agents require human approval
                const type = detectAgentType(agent.name);
                const prefix = type === "trending" ? "[Trending Agent]" : type === "hashtag" ? "[Hashtag Agent]" : "[Agent]";
                const preview = `${prefix} ${agent.name}: ${agent.goal}`;

                await addApproval(agent.id, "agent_execution", preview);
                await addLog(
                    agent.id,
                    `Queued for approval: ${agent.name}`,
                    "info",
                    "Action submitted to approval queue. Go to Logs → Approvals tab to review.",
                    ""
                );
            } else {
                // Non-browser agents auto-execute
                await addLog(
                    agent.id,
                    `Executed: ${agent.name}`,
                    "success",
                    buildAutoExecuteOutput(agent),
                    ""
                );
            }
        } catch (err) {
            await addLog(agent.id, `Error running: ${agent.name}`, "error", "", err.toString());
        } finally {
            setTimeout(() => setRunning((prev) => ({ ...prev, [agent.id]: false })), 1500);
        }
    };

    /* ─ Form helpers ─ */

    const updateField = (field) => (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    /* ─ Render ─ */

    return (
        <>
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h2>Agent Manager</h2>
                        <p>Create and manage automated agents</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => createDemoAgent("trending")}>
                            📈 Demo: Trending
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => createDemoAgent("hashtag")}>
                            #️⃣ Demo: Hashtag
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                            <Plus size={14} /> New Agent
                        </button>
                    </div>
                </div>
            </div>

            {/* Agent Grid */}
            <div className="page-body">
                {agents.length === 0 ? (
                    <div className="empty-state">
                        <Bot size={48} />
                        <h3>No agents yet</h3>
                        <p>Create your first agent to automate tasks. Use the demo buttons above or click "New Agent" to get started.</p>
                    </div>
                ) : (
                    <div className="card-grid">
                        {agents.map((agent) => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                isRunning={!!running[agent.id]}
                                onRun={() => handleRun(agent)}
                                onDelete={() => handleDelete(agent.id, agent.name)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Agent</h3>
                            <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <FormField label="Agent Name *" placeholder="e.g., Trending Topics Agent" value={form.name} onChange={updateField("name")} />
                        <FormField label="Role" placeholder="e.g., Content Creator" value={form.role} onChange={updateField("role")} />
                        <FormField label="Goal" placeholder="What should this agent accomplish?" value={form.goal} onChange={updateField("goal")} textarea />
                        <FormField label="Tools (comma-separated)" placeholder="browser, cron, sessions" value={form.tools} onChange={updateField("tools")} />
                        <FormField label="Schedule (Cron Expression)" placeholder="0 9 * * * (daily at 9am)" value={form.schedule} onChange={updateField("schedule")} />

                        <div className="form-group">
                            <label className="form-checkbox">
                                <input type="checkbox" checked={form.sandbox} onChange={updateField("sandbox")} />
                                <Shield size={14} />
                                Enable Sandbox Mode (dry-run, no real actions)
                            </label>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name.trim()}>
                                <Plus size={14} /> Create Agent
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Sub-Components ── */

/** Individual agent card with status, tools, and action buttons. */
function AgentCard({ agent, isRunning, onRun, onDelete }) {
    return (
        <div className="card">
            <div className="card-header">
                <div>
                    <div className="card-title">{agent.name}</div>
                    <div className="card-subtitle">{agent.role}</div>
                </div>
                <div className="flex gap-2">
                    {agent.sandbox && <span className="badge badge-warning">🧪 Sandbox</span>}
                    <span className="badge badge-success">Active</span>
                </div>
            </div>

            <p className="text-sm text-muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>
                {agent.goal}
            </p>

            {/* Tools & schedule */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {agent.tools.split(",").map((tool) => (
                        <span key={tool} className="badge badge-info">{tool.trim()}</span>
                    ))}
                </div>
                <span className="text-sm text-muted">⏰ {agent.schedule || "Manual"}</span>
            </div>

            {/* Event handler info */}
            <div className="agent-meta-row">
                <span><Zap size={10} /> Event: Polling</span>
                <span><Clock size={10} /> Heartbeat: 60s</span>
                <span><Eye size={10} /> {agent.tools.includes("browser") ? "Approval Required" : "Auto-execute"}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
                <button
                    className={`btn btn-sm ${isRunning ? "btn-success" : "btn-secondary"}`}
                    onClick={onRun}
                    disabled={isRunning}
                >
                    {isRunning ? (
                        <><CheckCircle size={12} /> {agent.sandbox ? "Simulated" : "Queued"}</>
                    ) : (
                        <><Play size={12} /> Run</>
                    )}
                </button>
                <button className="btn btn-danger btn-sm" onClick={onDelete}>
                    <Trash2 size={12} /> Delete
                </button>
            </div>
        </div>
    );
}

/** Reusable form field for the create modal. */
function FormField({ label, placeholder, value, onChange, textarea }) {
    const Tag = textarea ? "textarea" : "input";
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <Tag
                className={textarea ? "form-textarea" : "form-input"}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
        </div>
    );
}

export default AgentPanel;
