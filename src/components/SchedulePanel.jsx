/**
 * @file SchedulePanel.jsx
 * @description Cron schedule viewer derived from agent configurations.
 */

import { useState, useEffect } from "react";
import { CalendarClock, Play, Pause, RefreshCw } from "lucide-react";
import { listAgents } from "../services/openclaw";

/* ── Constants ── */

const PRESET_SCHEDULES = [
    { label: "Every minute", cron: "* * * * *" },
    { label: "Every 5 minutes", cron: "*/5 * * * *" },
    { label: "Every 30 minutes", cron: "*/30 * * * *" },
    { label: "Every hour", cron: "0 */1 * * *" },
    { label: "Every 6 hours", cron: "0 */6 * * *" },
    { label: "Daily at 9am", cron: "0 9 * * *" },
    { label: "Daily at midnight", cron: "0 0 * * *" },
    { label: "Monday at 8am", cron: "0 8 * * 1" },
    { label: "Weekdays at 9am", cron: "0 9 * * 1-5" },
];

/** Map for well-known cron → next-run description. */
const NEXT_RUN_MAP = {
    "0 9 * * *": "Tomorrow at 9:00 AM",
    "0 */1 * * *": "Next hour",
    "*/30 * * * *": "In 30 minutes",
    "* * * * *": "In 1 minute",
};

/* ── Helpers ── */

/**
 * Estimate next run from a cron expression.
 * @param {string} cron
 * @returns {string} Human-readable description.
 */
function calculateNextRun(cron) {
    if (cron.split(" ").length !== 5) return "Invalid cron";
    return NEXT_RUN_MAP[cron] || `Cron: ${cron}`;
}

/**
 * Convert cron to human label if preset, else return raw cron.
 * @param {string} cron
 * @returns {string}
 */
function cronToText(cron) {
    const preset = PRESET_SCHEDULES.find((p) => p.cron === cron);
    return preset ? preset.label : cron;
}

/* ── Component ── */

function SchedulePanel() {
    const [schedules, setSchedules] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const agents = await listAgents();
            const derived = agents
                .filter((a) => a.schedule && a.schedule.trim())
                .map((a) => ({
                    id: a.id,
                    agentName: a.name,
                    cron: a.schedule,
                    enabled: true,
                    nextRun: calculateNextRun(a.schedule),
                }));
            setSchedules(derived);
        } catch (err) {
            console.error("Failed to load schedules:", err);
        }
    };

    return (
        <>
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h2>Schedule Manager</h2>
                        <p>View and manage cron-based schedules for your agents</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={loadData}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Cron Quick Reference */}
                <div className="card mb-4">
                    <div className="card-header">
                        <div className="card-title">⏰ Cron Quick Reference</div>
                    </div>
                    <div className="cron-reference-grid">
                        {PRESET_SCHEDULES.map((p) => (
                            <span key={p.cron} className="badge badge-muted" title={p.cron} style={{ cursor: "help" }}>
                                {p.label}: <code className="cron-code">{p.cron}</code>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Schedule Table */}
                {schedules.length === 0 ? (
                    <div className="empty-state">
                        <CalendarClock size={48} />
                        <h3>No scheduled jobs</h3>
                        <p>Create an agent with a schedule to see it here. Go to the Agents tab and set a cron expression.</p>
                    </div>
                ) : (
                    <table className="log-table">
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Schedule</th>
                                <th>Cron</th>
                                <th>Next Run</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600 }}>{s.agentName}</td>
                                    <td>{cronToText(s.cron)}</td>
                                    <td><code className="cron-code">{s.cron}</code></td>
                                    <td className="text-muted">{s.nextRun}</td>
                                    <td>
                                        <span className={`badge ${s.enabled ? "badge-success" : "badge-muted"}`}>
                                            {s.enabled ? "Active" : "Paused"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-secondary btn-sm btn-icon" title="Run now">
                                                <Play size={12} />
                                            </button>
                                            <button className="btn btn-secondary btn-sm btn-icon" title={s.enabled ? "Pause" : "Resume"}>
                                                <Pause size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}

export default SchedulePanel;
