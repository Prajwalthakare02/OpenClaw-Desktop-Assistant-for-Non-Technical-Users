/**
 * @file formatters.js
 * @description Shared formatting helpers used across multiple components.
 */

/**
 * Human-readable relative time (e.g. "3m ago", "2h ago", "Jan 5").
 * @param {number} timestamp - Unix-style timestamp in milliseconds.
 * @returns {string} Formatted relative time string.
 */
export function formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

/**
 * Safe date string formatter with fallback.
 * @param {string} dateStr - ISO date string or any parseable date.
 * @returns {string} Locale-formatted date, or raw string on failure.
 */
export function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleString();
    } catch {
        return dateStr;
    }
}

/**
 * Convert markdown-lite syntax to HTML for chat bubbles.
 * Supports: **bold**, `inline code`, ```code blocks```, and newlines.
 * @param {string} content - Raw message content.
 * @returns {string} HTML string.
 */
export function formatMessage(content) {
    return content
        .replace(
            /```(\w+)?\n([\s\S]*?)```/g,
            '<pre class="msg-code-block"><code>$2</code></pre>'
        )
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, '<code class="msg-inline-code">$1</code>')
        .replace(/\n/g, "<br/>");
}
