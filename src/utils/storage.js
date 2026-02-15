/**
 * @file storage.js
 * @description Centralized localStorage utilities for chat session persistence.
 * Single source of truth — imported by both App.jsx and ChatPanel.jsx.
 */

const STORAGE_KEY = "openclaw_chat_sessions";

/**
 * Load chat sessions from localStorage.
 * @returns {Array} Parsed session array, or empty array if none found.
 */
export function loadSessions() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Persist chat sessions to localStorage.
 * @param {Array} sessions - Array of session objects to save.
 */
export function saveSessions(sessions) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
        /* Storage full or unavailable — fail silently */
    }
}

/**
 * Generate a short, collision-resistant identifier.
 * @returns {string} Unique ID string.
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Derive a short title from the first user message in a conversation.
 * @param {Array} messages - Array of message objects with `role` and `content`.
 * @param {number} [maxLen=35] - Maximum title length before truncation.
 * @returns {string} Chat title.
 */
export function getChatTitle(messages, maxLen = 35) {
    const first = messages.find((m) => m.role === "user");
    if (!first) return "New Chat";
    const text = first.content.trim();
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}
