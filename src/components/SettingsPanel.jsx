/**
 * @file SettingsPanel.jsx
 * @description LLM configuration, model switching, and system diagnostics.
 */

import { useState, useEffect } from "react";
import {
    Settings, Key, Cpu, Save, Trash2,
    CheckCircle, Zap,
} from "lucide-react";
import llmService from "../services/llm";
import { getSetting, checkOpenClawInstalled, openClawDoctor, addLog } from "../services/openclaw";

/* ── Constants ── */

const MODELS = {
    openai: [
        { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast)" },
        { value: "gpt-4o", label: "GPT-4o (Powerful)" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
    anthropic: [
        { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku (Fast)" },
        { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
        { value: "claude-3-opus-20240229", label: "Claude 3 Opus (Powerful)" },
    ],
};

const MODEL_SWITCHING_PSEUDOCODE = `if (user_llm_key exists) {
    → Use external API model (OpenAI/Claude)
} else {
    → Use local Phi-3 model (offline)
}`;

/* ── Component ── */

function SettingsPanel() {
    const [llmProvider, setLlmProvider] = useState("local");
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("");
    const [openclawInstalled, setOpenclawInstalled] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [doctorOutput, setDoctorOutput] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    /* ─ Data ─ */

    const loadSettings = async () => {
        try {
            const [provider, key, mod] = await Promise.all([
                getSetting("llm_provider"),
                getSetting("llm_api_key"),
                getSetting("llm_model"),
            ]);
            if (provider) setLlmProvider(provider);
            if (key) setApiKey(key);
            if (mod) setModel(mod);
        } catch {
            console.log("No saved LLM settings");
        }

        try {
            setOpenclawInstalled(await checkOpenClawInstalled());
        } catch {
            setOpenclawInstalled(false);
        }
    };

    /* ─ Handlers ─ */

    const handleSave = async () => {
        setSaving(true);
        try {
            if (apiKey.trim() && llmProvider !== "local") {
                await llmService.switchToAPI(llmProvider, apiKey, model);
            } else {
                await llmService.switchToLocal();
                setApiKey("");
                setModel("");
                setLlmProvider("local");
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error("Failed to save settings:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveKey = async () => {
        await llmService.switchToLocal();
        setApiKey("");
        setModel("");
        setLlmProvider("local");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleRunDoctor = async () => {
        setDoctorOutput("Running openclaw doctor...");
        try {
            const result = await openClawDoctor();
            setDoctorOutput(result.stdout || result.stderr || "No output");
            await addLog("system", "Ran openclaw doctor", result.success ? "success" : "error", result.stdout, result.stderr);
        } catch (err) {
            setDoctorOutput("Failed: " + err.toString());
        }
    };

    const handleProviderChange = (e) => {
        setLlmProvider(e.target.value);
        if (e.target.value === "local") {
            setApiKey("");
            setModel("");
        }
    };

    /* ─ Render helpers ─ */

    const SaveButton = () => (
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Settings</>}
        </button>
    );

    /* ─ Render ─ */

    return (
        <>
            <div className="page-header">
                <h2>Settings</h2>
                <p>Configure LLM provider, API keys, and system preferences</p>
            </div>

            <div className="page-body">
                {/* ── LLM Configuration ── */}
                <div className="card mb-4">
                    <div className="card-header">
                        <div className="flex items-center gap-3">
                            <Cpu size={20} style={{ color: "var(--accent-primary)" }} />
                            <div>
                                <div className="card-title">LLM Configuration</div>
                                <div className="card-subtitle">Choose between local model or external API</div>
                            </div>
                        </div>
                        <span className={`badge ${llmProvider === "local" ? "badge-info" : "badge-success"}`}>
                            {llmProvider === "local" ? "🧠 Local (Phi-3)" : `☁️ ${llmProvider}`}
                        </span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">LLM Provider</label>
                        <select className="form-select" value={llmProvider} onChange={handleProviderChange}>
                            <option value="local">🧠 Local (Phi-3 Mini — No API key needed)</option>
                            <option value="openai">☁️ OpenAI (GPT-4o)</option>
                            <option value="anthropic">☁️ Anthropic (Claude)</option>
                        </select>
                    </div>

                    {llmProvider !== "local" && (
                        <>
                            <div className="form-group">
                                <label className="form-label">
                                    <Key size={12} style={{ display: "inline", marginRight: 6 }} />
                                    API Key
                                </label>
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder={llmProvider === "openai" ? "sk-..." : "sk-ant-..."}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Model</label>
                                <select className="form-select" value={model} onChange={(e) => setModel(e.target.value)}>
                                    {(MODELS[llmProvider] || []).map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 mt-4">
                        <SaveButton />
                        {llmProvider !== "local" && apiKey && (
                            <button className="btn btn-danger btn-sm" onClick={handleRemoveKey}>
                                <Trash2 size={14} /> Remove Key
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Model Switching Info ── */}
                <div className="card mb-4">
                    <div className="card-header">
                        <div className="flex items-center gap-3">
                            <Zap size={20} style={{ color: "var(--warning)" }} />
                            <div>
                                <div className="card-title">How Model Switching Works</div>
                                <div className="card-subtitle">Automatic routing between local and cloud models</div>
                            </div>
                        </div>
                    </div>
                    <div className="settings-info-text">
                        <p>
                            <strong>Default (No API Key):</strong> The app uses a built-in <strong>Phi-3 Mini</strong> model
                            that runs entirely on your device. No data leaves your computer.
                        </p>
                        <p>
                            <strong>With API Key:</strong> When you provide an OpenAI or Anthropic API key above,
                            all future conversations automatically use that provider's model for higher quality responses.
                        </p>
                        <pre className="settings-code-block">{MODEL_SWITCHING_PSEUDOCODE}</pre>
                        <p className="mt-2 text-muted" style={{ fontSize: 12 }}>
                            You can switch back to the local model at any time by selecting "Local (Phi-3)" above.
                        </p>
                    </div>
                </div>

                {/* ── OpenClaw Status ── */}
                <div className="card mb-4">
                    <div className="card-header">
                        <div className="flex items-center gap-3">
                            <Settings size={20} style={{ color: "var(--text-muted)" }} />
                            <div>
                                <div className="card-title">OpenClaw Status</div>
                                <div className="card-subtitle">System health and diagnostics</div>
                            </div>
                        </div>
                        <span className={`badge ${openclawInstalled ? "badge-success" : "badge-danger"}`}>
                            {openclawInstalled === null ? "Checking…" : openclawInstalled ? "Installed" : "Not Found"}
                        </span>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <button className="btn btn-secondary btn-sm" onClick={handleRunDoctor}>
                            🩺 Run Doctor
                        </button>
                    </div>

                    {doctorOutput && (
                        <pre className="settings-code-block" style={{ marginTop: 12, maxHeight: 200, overflowY: "auto" }}>
                            {doctorOutput}
                        </pre>
                    )}
                </div>

                {/* ── About ── */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">About</div>
                    </div>
                    <div className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
                        <p><strong>OpenClaw Desktop Assistant</strong> v0.1.0</p>
                        <p>Built with Tauri + React • Powered by OpenClaw</p>
                        <p style={{ marginTop: 8 }}>
                            An open-source desktop wrapper that makes OpenClaw accessible to non-technical users.
                            Create agents, schedule automations, and control browser actions — all through a conversational interface.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default SettingsPanel;
