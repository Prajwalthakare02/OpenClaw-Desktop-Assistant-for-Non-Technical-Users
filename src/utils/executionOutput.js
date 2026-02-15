/**
 * @file executionOutput.js
 * @description Agent execution output generators.
 * Centralizes the simulated execution output strings used by
 * both AgentPanel (Run button) and LogsPanel (Approval handler).
 */

/**
 * Build detailed execution output for a trending‐topics workflow.
 * @returns {string} Multi-line report.
 */
export function buildTrendingOutput() {
    return [
        "✅ EXECUTION COMPLETE",
        "━━━━━━━━━━━━━━━━━━━━",
        '🔍 Step 1: Searched trending topics on OpenClaw',
        '   → Found: "OpenClaw v2.0 Desktop App Launch"',
        "   → Engagement score: 87/100",
        "",
        "✍️ Step 2: Generated LinkedIn post",
        '   → Title: "The Future of No-Code Automation is Here 🦞"',
        "   → Length: 247 words",
        "   → Hashtags: #openclaw #automation #opensource",
        "",
        "🌐 Step 3: Browser automation — Posted to LinkedIn",
        "   → Status: Published successfully",
        "   → URL: linkedin.com/posts/openclaw-desktop-launch",
        `   → Timestamp: ${new Date().toLocaleString()}`,
        "",
        "🔄 Next scheduled run: Tomorrow at 9:00 AM",
    ].join("\n");
}

/**
 * Build detailed execution output for a hashtag‐promoter workflow.
 * @returns {string} Multi-line report.
 */
export function buildHashtagOutput() {
    return [
        "✅ EXECUTION COMPLETE",
        "━━━━━━━━━━━━━━━━━━━━",
        "🔎 Step 1: Searched LinkedIn for #openclaw posts",
        "   → Found 3 matching posts",
        "",
        "💬 Step 2: Commented on posts via browser automation",
        '   → Post 1: "Check out github.com/openclaw — 🦞 automate tasks without CLI!"',
        '   → Post 2: "Try the OpenClaw Desktop App for no-code automation! 🚀"',
        '   → Post 3: "New to automation? OpenClaw Desktop makes it easy 🎯"',
        "",
        "📊 Step 3: Results logged",
        "   → Comments posted: 3",
        `   → Timestamp: ${new Date().toLocaleString()}`,
        "",
        "🔄 Next scheduled run: In 1 hour",
    ].join("\n");
}

/**
 * Build a generic execution output.
 * @param {string} action - Description of what was done.
 * @returns {string} Multi-line report.
 */
export function buildGenericOutput(action) {
    return [
        "✅ EXECUTION COMPLETE",
        "━━━━━━━━━━━━━━━━━━━━",
        "🌐 Browser automation executed successfully",
        `   → Action: ${action}`,
        `   → Timestamp: ${new Date().toLocaleString()}`,
    ].join("\n");
}

/**
 * Build sandbox dry-run output.
 * @param {string} name  - Agent name.
 * @param {string} goal  - Agent goal.
 * @returns {string} Multi-line report.
 */
export function buildSandboxOutput(name, goal) {
    return [
        "🧪 SANDBOX DRY-RUN",
        "━━━━━━━━━━━━━━━━━━",
        `Agent: ${name}`,
        `Goal: ${goal}`,
        "",
        "🔍 Simulated Step 1: Analyzed task requirements",
        "✍️ Simulated Step 2: Would execute browser actions",
        "⏭️ Simulated Step 3: Would post/comment",
        "",
        "⚠️ No real actions taken — sandbox mode active",
        `Timestamp: ${new Date().toLocaleString()}`,
    ].join("\n");
}

/**
 * Build auto-execute output for non-browser agents.
 * @param {Object} agent - Agent record.
 * @returns {string} Multi-line report.
 */
export function buildAutoExecuteOutput(agent) {
    return [
        "✅ AUTO-EXECUTED",
        "━━━━━━━━━━━━━━━━",
        `Agent: ${agent.name}`,
        `Role: ${agent.role}`,
        "",
        `🔍 Step 1: Processed task — ${agent.goal}`,
        "⚡ Step 2: Executed successfully",
        "📊 Step 3: Results logged",
        "",
        `Timestamp: ${new Date().toLocaleString()}`,
    ].join("\n");
}

/**
 * Detect agent type from a string (name or preview text).
 * @param {string} text - String to test.
 * @returns {"trending"|"hashtag"|"generic"} Detected type.
 */
export function detectAgentType(text) {
    const lower = (text || "").toLowerCase();
    if (lower.includes("trending")) return "trending";
    if (lower.includes("hashtag") || lower.includes("#openclaw")) return "hashtag";
    return "generic";
}
