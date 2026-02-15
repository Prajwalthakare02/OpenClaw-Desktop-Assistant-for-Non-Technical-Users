/**
 * @file ChatPanel.jsx
 * @description Conversational chat interface with session management.
 *
 * Sessions are persisted to localStorage and synchronised with
 * App.jsx via CustomEvent dispatches (sessionsupdate / deletechat).
 */

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, MessageSquarePlus } from "lucide-react";
import llmService from "../services/llm";
import { loadSessions, saveSessions, generateId, getChatTitle } from "../utils/storage";
import { formatMessage } from "../utils/formatters";

/* ── Constants ── */

const WELCOME_MESSAGE = {
    role: "assistant",
    content: `👋 Welcome to **OpenClaw Desktop Assistant**! 🦞

I'm here to help you automate tasks without using the command line. Here's what I can do:

- 🔧 **"Setup OpenClaw"** — Install and configure everything
- 🤖 **"Create an agent"** — Build automations via chat
- 📈 **"Create trending agent"** — LinkedIn trending topics agent
- #️⃣ **"Create hashtag agent"** — #openclaw comment agent
- ⏰ **"Schedule a task"** — Set up cron jobs
- 🧪 **"Enable sandbox mode"** — Test safely
- ❓ **"Help"** — See all commands

Just type naturally and I'll guide you through everything!`,
};

/* ── Component ── */

function ChatPanel() {
    /* ─ State ─ */
    const [sessions, setSessions] = useState(loadSessions);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    /* ─ Lifecycle ─ */

    // Initialise LLM service once
    useEffect(() => {
        llmService.initialize();
    }, []);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Persist active session whenever messages change
    useEffect(() => {
        if (!activeSessionId) return;
        setSessions((prev) => {
            const updated = prev.map((s) =>
                s.id === activeSessionId
                    ? { ...s, messages, title: getChatTitle(messages), updatedAt: Date.now() }
                    : s
            );
            saveSessions(updated);
            return updated;
        });
    }, [messages, activeSessionId]);

    // Broadcast session list to App.jsx sidebar
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("openclaw:sessionsupdate", {
                detail: { sessions, activeId: activeSessionId },
            })
        );
    }, [sessions, activeSessionId]);

    /* ─ Event listeners (sidebar actions) ─ */

    useEffect(() => {
        /** Create a brand-new chat session. */
        const onNewChat = () => {
            const hasUserMessages = messages.some((m) => m.role === "user");
            if (activeSessionId && !hasUserMessages) {
                setMessages([WELCOME_MESSAGE]);
                return;
            }

            const id = generateId();
            const newSession = {
                id,
                title: "New Chat",
                messages: [WELCOME_MESSAGE],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            setSessions((prev) => {
                const updated = [newSession, ...prev];
                saveSessions(updated);
                return updated;
            });
            setActiveSessionId(id);
            setMessages([WELCOME_MESSAGE]);
            setInput("");
            llmService.clearHistory();
            inputRef.current?.focus();
        };

        /** Switch to an existing session. */
        const onSwitch = (e) => {
            const session = e.detail;
            setActiveSessionId(session.id);
            setMessages(session.messages);
            setInput("");
            llmService.clearHistory();
        };

        /** Remove a session deleted from the sidebar. */
        const onDelete = (e) => {
            const deletedId = e.detail;
            setSessions((prev) => {
                const updated = prev.filter((s) => s.id !== deletedId);
                saveSessions(updated);
                return updated;
            });
            if (activeSessionId === deletedId) {
                setActiveSessionId(null);
                setMessages([WELCOME_MESSAGE]);
                setInput("");
                llmService.clearHistory();
            }
        };

        window.addEventListener("openclaw:newchat", onNewChat);
        window.addEventListener("openclaw:switchchat", onSwitch);
        window.addEventListener("openclaw:deletechat", onDelete);
        return () => {
            window.removeEventListener("openclaw:newchat", onNewChat);
            window.removeEventListener("openclaw:switchchat", onSwitch);
            window.removeEventListener("openclaw:deletechat", onDelete);
        };
    }, [activeSessionId, messages]);

    /* ─ Handlers ─ */

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        // Auto-create session on first message
        if (!activeSessionId) {
            const id = generateId();
            setSessions((prev) => {
                const newSession = {
                    id,
                    title: getChatTitle([{ role: "user", content: text }]),
                    messages: [...messages, { role: "user", content: text }],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                const updated = [newSession, ...prev];
                saveSessions(updated);
                return updated;
            });
            setActiveSessionId(id);
        }

        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setIsLoading(true);

        try {
            const response = await llmService.sendMessage(text);
            setMessages((prev) => [...prev, { role: "assistant", content: response }]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `❌ Error: ${err.message}\n\nPlease try again.` },
            ]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    };

    /* ─ Render ─ */

    return (
        <div className="chat-main">
            {/* Top bar */}
            <header className="chat-topbar">
                <div>
                    <h2>🦞 Assistant</h2>
                    <p>Shift+Enter for new line</p>
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => window.dispatchEvent(new CustomEvent("openclaw:newchat"))}
                    style={{ gap: 6 }}
                >
                    <MessageSquarePlus size={14} /> New Chat
                </button>
            </header>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === "assistant" ? "🦞" : <User size={16} />}
                        </div>
                        <div
                            className="message-bubble"
                            dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                        />
                    </div>
                ))}

                {isLoading && (
                    <div className="message assistant">
                        <div className="message-avatar">🦞</div>
                        <div className="message-bubble">
                            <div className="typing-indicator">
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <textarea
                        ref={inputRef}
                        rows={1}
                        placeholder="Message OpenClaw…"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        style={{ resize: "none", overflow: "auto" }}
                    />
                    <button
                        className="btn-send"
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="model-badge">
                    <span>
                        <Sparkles
                            size={10}
                            style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}
                        />
                        {llmService.getModelName()}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default ChatPanel;
