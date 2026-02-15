/**
 * @file LogsPanel.jsx
 * @description Execution logs & approval queue with expand/collapse output.
 */

import { useState, useEffect } from "react";
import {
    FileText, RefreshCw, CheckCircle, AlertCircle, Info,
    Shield, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { getLogs, getApprovals, updateApproval, addLog } from "../services/openclaw";
import { formatDate } from "../utils/formatters";
import {
    buildTrendingOutput, buildHashtagOutput, buildGenericOutput,
    detectAgentType,
} from "../utils/executionOutput";

/* ── Component ── */

function LogsPanel() {
    const [logs, setLogs] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("logs");
    const [expandedLogId, setExpandedLogId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    /* ─ Data ─ */

    const loadData = async () => {
        setLoading(true);
        try {
            const [logData, approvalData] = await Promise.all([
                getLogs(200),
                getApprovals(),
            ]);
            setLogs(logData);
            setApprovals(approvalData);
        } catch (err) {
            console.error("Failed to load data:", err);
        } finally {
            setLoading(false);
        }
    };

    /* ─ Approval Handling ─ */

    const handleApproval = async (id, status) => {
        try {
            await updateApproval(id, status);

            const item = approvals.find((a) => a.id === id);
            const preview = item?.content_preview || "";
            const agentId = item?.agent_id || "system";

            if (status === "approved") {
                const type = detectAgentType(preview);
                const output =
                    type === "trending" ? buildTrendingOutput() :
                        type === "hashtag" ? buildHashtagOutput() :
                            buildGenericOutput(preview);

                await addLog(agentId, "Approved & Executed", "success", output, "");
            } else {
                await addLog(
                    agentId,
                    "Approval rejected — action skipped",
                    "info",
                    `Action was reviewed and rejected by user.\nOriginal request: ${preview}`,
                    ""
                );
            }

            loadData();
        } catch (err) {
            console.error("Failed to update approval:", err);
        }
    };

    /* ─ Derived state ─ */

    const filtered = filter === "all" ? logs : logs.filter((l) => l.status === filter);
    const pendingCount = approvals.filter((a) => a.status === "pending").length;

    /* ─ Render helpers ─ */

    const StatusIcon = ({ status }) => {
        const props = { size: 14 };
        if (status === "success") return <CheckCircle {...props} style={{ color: "var(--success)" }} />;
        if (status === "error") return <AlertCircle {...props} style={{ color: "var(--danger)" }} />;
        return <Info {...props} style={{ color: "var(--info)" }} />;
    };

    const statusBadgeClass = (status) =>
        `badge badge-${status === "success" ? "success" : status === "error" ? "danger" : "info"}`;

    const toggleExpand = (id) =>
        setExpandedLogId((prev) => (prev === id ? null : id));

    /* ─ Render ─ */

    return (
        <>
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h2>Logs & Approvals</h2>
                        <p>Execution logs, approval queue, and system events</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className={`btn btn-sm ${tab === "logs" ? "btn-primary" : "btn-secondary"}`}
                            onClick={() => setTab("logs")}
                        >
                            <FileText size={14} /> Logs
                        </button>
                        <button
                            className={`btn btn-sm ${tab === "approvals" ? "btn-primary" : "btn-secondary"}`}
                            onClick={() => setTab("approvals")}
                            style={{ position: "relative" }}
                        >
                            <Shield size={14} /> Approvals
                            {pendingCount > 0 && (
                                <span className="approval-badge">{pendingCount}</span>
                            )}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={loadData}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="page-body">
                {loading ? (
                    <div className="empty-state">
                        <RefreshCw size={32} className="icon" style={{ animation: "spin 1s linear infinite" }} />
                        <p>Loading...</p>
                    </div>
                ) : tab === "approvals" ? (
                    <ApprovalQueue
                        approvals={approvals}
                        formatDate={formatDate}
                        onApproval={handleApproval}
                    />
                ) : (
                    <LogTable
                        logs={filtered}
                        filter={filter}
                        setFilter={setFilter}
                        expandedId={expandedLogId}
                        onToggle={toggleExpand}
                        formatDate={formatDate}
                        StatusIcon={StatusIcon}
                        statusBadgeClass={statusBadgeClass}
                    />
                )}
            </div>
        </>
    );
}

/* ── Sub-Components ── */

/** Approval queue cards. */
function ApprovalQueue({ approvals, formatDate, onApproval }) {
    if (approvals.length === 0) {
        return (
            <div className="empty-state">
                <Shield size={48} />
                <h3>No approvals</h3>
                <p>When agents request approval before posting, they'll appear here for your review.</p>
            </div>
        );
    }

    return (
        <div className="card-grid">
            {approvals.map((item) => (
                <div key={item.id} className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">{item.action_type.replace(/_/g, " ")}</div>
                            <div className="card-subtitle">{formatDate(item.created_at)}</div>
                        </div>
                        <span className={`badge ${item.status === "pending" ? "badge-warning" :
                                item.status === "approved" ? "badge-success" : "badge-danger"
                            }`}>
                            {item.status}
                        </span>
                    </div>

                    <p className="text-sm text-muted" style={{ lineHeight: 1.5, marginBottom: 12 }}>
                        {item.content_preview}
                    </p>

                    {item.status === "pending" && (
                        <div className="flex gap-2">
                            <button className="btn btn-success btn-sm" onClick={() => onApproval(item.id, "approved")}>
                                <ThumbsUp size={12} /> Approve
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => onApproval(item.id, "rejected")}>
                                <ThumbsDown size={12} /> Reject
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

/** Execution logs table. */
function LogTable({ logs, filter, setFilter, expandedId, onToggle, formatDate, StatusIcon, statusBadgeClass }) {
    return (
        <>
            <div className="flex gap-2 mb-4">
                <select
                    className="form-select"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ width: 140, padding: "6px 12px", fontSize: 12 }}
                >
                    <option value="all">All Status</option>
                    <option value="success">Success</option>
                    <option value="error">Errors</option>
                    <option value="info">Info</option>
                </select>
            </div>

            {logs.length === 0 ? (
                <div className="empty-state">
                    <FileText size={48} />
                    <h3>No logs yet</h3>
                    <p>Logs will appear here as agents execute, schedule runs, and process events.</p>
                </div>
            ) : (
                <table className="log-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Agent</th>
                            <th>Action</th>
                            <th>Output</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => {
                            const isExpanded = expandedId === log.id;
                            const hasOutput = !!(log.output || log.error);
                            return (
                                <tr key={log.id}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <StatusIcon status={log.status} />
                                            <span className={statusBadgeClass(log.status)}>{log.status}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{log.agent_id || "—"}</td>
                                    <td>{log.action}</td>
                                    <td
                                        className={`text-muted text-sm log-output-cell ${isExpanded ? "expanded" : ""}`}
                                        onClick={() => hasOutput && onToggle(log.id)}
                                        title={hasOutput ? "Click to expand" : ""}
                                        style={{ cursor: hasOutput ? "pointer" : "default" }}
                                    >
                                        {log.output || log.error || "—"}
                                    </td>
                                    <td className="text-muted text-sm">{formatDate(log.created_at)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </>
    );
}

export default LogsPanel;
