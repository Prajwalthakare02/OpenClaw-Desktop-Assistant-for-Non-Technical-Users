/**
 * @file App.jsx
 * @description Root layout — sidebar navigation, chat history, and page routing.
 */

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Bot, CalendarClock, FileText, Settings,
  PanelLeftClose, PanelLeftOpen, MessageSquarePlus,
  Trash2, Clock, MessagesSquare,
} from "lucide-react";
import ChatPanel from "./components/ChatPanel";
import AgentPanel from "./components/AgentPanel";
import SchedulePanel from "./components/SchedulePanel";
import LogsPanel from "./components/LogsPanel";
import SettingsPanel from "./components/SettingsPanel";
import { loadSessions, saveSessions } from "./utils/storage";
import { formatTimeAgo } from "./utils/formatters";

/* ── Constants ── */

const NAV_ITEMS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const TAB_COMPONENTS = {
  chat: ChatPanel,
  agents: AgentPanel,
  schedules: SchedulePanel,
  logs: LogsPanel,
  settings: SettingsPanel,
};

/* ── App Component ── */

function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [gatewayStatus] = useState("offline");

  // Chat sessions — lifted here so the sidebar can render history
  const [sessions, setSessions] = useState(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Persist to localStorage on every change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Listen for session broadcasts from ChatPanel
  useEffect(() => {
    const onUpdate = (e) => {
      setSessions(e.detail.sessions);
      setActiveSessionId(e.detail.activeId);
    };
    window.addEventListener("openclaw:sessionsupdate", onUpdate);
    return () => window.removeEventListener("openclaw:sessionsupdate", onUpdate);
  }, []);

  /* ── Session Actions ── */

  const startNewChat = useCallback(() => {
    setActiveTab("chat");
    window.dispatchEvent(new CustomEvent("openclaw:newchat"));
  }, []);

  const switchToSession = useCallback((session) => {
    setActiveTab("chat");
    window.dispatchEvent(new CustomEvent("openclaw:switchchat", { detail: session }));
  }, []);

  const deleteSession = useCallback(
    (e, sessionId) => {
      e.stopPropagation();
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      window.dispatchEvent(new CustomEvent("openclaw:deletechat", { detail: sessionId }));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        window.dispatchEvent(new CustomEvent("openclaw:newchat"));
      }
    },
    [activeSessionId]
  );

  /* ── Helpers ── */

  const userMsgCount = (msgs) => msgs.filter((m) => m.role === "user").length;

  const ActivePage = TAB_COMPONENTS[activeTab] || ChatPanel;

  /* ── Render ── */

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        {/* Brand */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">🦞</div>
            {sidebarOpen && (
              <div>
                <h1>OpenClaw</h1>
                <p>Desktop Assistant</p>
              </div>
            )}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="icon" />
              {sidebarOpen && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Chat History (visible when sidebar is open + on chat tab) */}
        {sidebarOpen && activeTab === "chat" && (
          <div className="sidebar-chats">
            <div className="sidebar-chats-header">
              <span className="sidebar-chats-label">Recent Chats</span>
              <button
                className="new-chat-btn-sm"
                onClick={startNewChat}
                title="New Chat"
              >
                <MessageSquarePlus size={15} />
              </button>
            </div>

            <div className="sidebar-chats-list">
              {sessions.length === 0 ? (
                <div className="sidebar-chats-empty">
                  <MessagesSquare size={20} strokeWidth={1.2} />
                  <span>No chats yet</span>
                </div>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    className={`sidebar-chat-item${activeSessionId === s.id ? " active" : ""}`}
                    onClick={() => switchToSession(s)}
                  >
                    <div className="sidebar-chat-body">
                      <span className="sidebar-chat-title">{s.title}</span>
                      <span className="sidebar-chat-meta">
                        <Clock size={9} />
                        {formatTimeAgo(s.updatedAt)}
                        <span style={{ opacity: 0.4 }}>·</span>
                        {userMsgCount(s.messages)} msg
                        {userMsgCount(s.messages) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span
                      className="sidebar-chat-delete"
                      onClick={(e) => deleteSession(e, s.id)}
                    >
                      <Trash2 size={12} />
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="status-indicator">
            <div className={`status-dot ${gatewayStatus === "online" ? "" : "offline"}`} />
            {sidebarOpen && <span>Gateway: {gatewayStatus}</span>}
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="main-content">
        <ActivePage />
      </main>
    </div>
  );
}

export default App;
