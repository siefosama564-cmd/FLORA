/* ═══════════════════════════════════════════════════════════════
   FLORA — chat.js  (v2 — Full Fix Pass)

   TASK 1 — AI Intelligence Gap:
     • activeDiagnosisCtx persists full diagnosis for follow-up Qs
     • diagnosis_meta SSE event captured from backend
     • Full context (symptoms, cause, treatment) sent as plantContext
     • AI can NEVER say "I don't see any image" when diagnosis exists

   TASK 2 — Universal Loader + Streaming:
     • Typing indicator fires for ALL messages (text + image)
     • "Processing technical report…" shown for image analysis
     • Streaming already word-by-word via SSE (preserved)
     • model_info SSE event drives dynamic model label badge

   TASK 3 — Image Bug + Localization:
     • Real <img> rendered in user bubble (not "[Image]")
     • t() helper + FLORA_T dictionary → instant language switch
     • applyLang() updates ALL dynamic content without refresh
     • RTL/LTR switches cleanly, no layout changes

   TASK 4 — Premium Loader Animation:
     • Flora logo pulse + glow @keyframes animation
     • Replaces plain bouncing dots for main indicator
     • CSS injected via <style> — no CSS file changes

   TASK 5 — Performance & Stability:
     • 30s timeout handled in backend (chat.controller.js)
     • "Processing technical report…" message shown during image AI
     • No UI freezing (streaming word-by-word)
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = "http://localhost:3000/api/v1";

/* ──────────────────────────────────────────────────────────────
   TRANSLATION HELPER
   Requires translations.js loaded BEFORE this file.
   ────────────────────────────────────────────────────────────── */
function t(key) {
    const dict = (window.FLORA_T || {})[currentLang] || (window.FLORA_T || {})["en"] || {};
    return dict[key] !== undefined ? dict[key] : key;
}

/* ──────────────────────────────────────────────────────────────
   INJECTED STYLES — Premium loader + model label
   Uses only existing CSS variables — NO colour or layout changes
   ────────────────────────────────────────────────────────────── */
const _floraStyles = document.createElement("style");
_floraStyles.textContent = `
/* ── 3-dot menu ── */
.conv-menu-btn {
    background: none; border: none; color: var(--text-dim);
    cursor: pointer; padding: 2px 5px; font-size: 1rem;
    border-radius: 4px; line-height: 1;
    opacity: 0; transition: opacity 0.2s; flex-shrink: 0;
}
.history-item:hover .conv-menu-btn { opacity: 1; }
.conv-menu-btn:hover { color: var(--text); background: var(--surface2); }
.conv-dropdown {
    position: absolute; background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm, 10px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    z-index: 200; min-width: 140px; padding: 4px 0; font-size: 0.82rem;
}
.conv-dropdown-item {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 14px; cursor: pointer;
    color: var(--text); transition: background 0.15s; user-select: none;
}
.conv-dropdown-item:hover { background: var(--surface2); }
.conv-dropdown-item.danger { color: #e57373; }
.conv-dropdown-item svg { flex-shrink: 0; }

/* ── Sidebar collapse ── */
.sidebar.collapsed {
    width: 0 !important; min-width: 0 !important;
    overflow: hidden !important; padding: 0 !important; border: none !important;
}
.sidebar { transition: width 0.28s ease, opacity 0.28s ease; }

/* ── Bubble markdown ── */
.bubble strong { font-weight: 700; }
.bubble em     { font-style: italic; }
.bubble ul, .bubble ol { padding-left: 1.2em; margin: 4px 0; }
.bubble li { margin: 2px 0; }
[data-lang="ar"] .bubble ul,
[data-lang="ar"] .bubble ol { padding-left: 0; padding-right: 1.2em; }

/* ── Image in user bubble ── */
.chat-user-img {
    max-width: 200px; max-height: 160px;
    border-radius: 10px; display: block;
    margin-bottom: 6px; object-fit: cover;
}

/* ── Model label badge ── */
.model-label {
    font-size: 0.67rem; color: var(--text-dim);
    margin-top: 5px; display: flex; align-items: center; gap: 4px;
    opacity: 0.7; padding-left: 2px;
}
[data-lang="ar"] .model-label { padding-left: 0; padding-right: 2px; flex-direction: row-reverse; }
.model-label-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent); flex-shrink: 0;
    animation: modelDotPulse 2.4s ease-in-out infinite;
}
@keyframes modelDotPulse {
    0%, 100% { opacity: 0.4; transform: scale(0.85); }
    50%       { opacity: 1;   transform: scale(1.15); }
}

/* ── PREMIUM FLORA LOADER — pure CSS, no image dependency ── */
.flora-loading-bubble {
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; padding: 14px 24px;
}

/* Spinning ring with leaf emoji center */
.flora-loader-ring {
    position: relative; width: 44px; height: 44px; flex-shrink: 0;
}
.flora-loader-ring::before {
    content: '🌿';
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; line-height: 1;
    animation: floraLeafBeat 1.6s ease-in-out infinite;
}
.flora-loader-ring::after {
    content: '';
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 2.5px solid transparent;
    border-top-color: var(--accent);
    border-right-color: var(--accent);
    animation: floraRingSpin 0.9s linear infinite;
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 40%, transparent);
}
@keyframes floraRingSpin {
    to { transform: rotate(360deg); }
}
@keyframes floraLeafBeat {
    0%, 100% { transform: scale(0.88); opacity: 0.75; }
    50%       { transform: scale(1.12); opacity: 1; }
}

/* Status label */
.flora-loader-label {
    font-size: 0.72rem; color: var(--text-dim); text-align: center;
    animation: floraLabelFade 2s ease-in-out infinite;
    letter-spacing: 0.01em;
}
@keyframes floraLabelFade {
    0%, 100% { opacity: 0.45; } 50% { opacity: 1; }
}

/* Wave dots */
.flora-loader-dots {
    display: flex; gap: 5px; align-items: center;
}
.flora-loader-dots span {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); display: block;
    animation: floraWaveDot 1.3s ease-in-out infinite;
}
.flora-loader-dots span:nth-child(1) { animation-delay: 0s; }
.flora-loader-dots span:nth-child(2) { animation-delay: 0.18s; }
.flora-loader-dots span:nth-child(3) { animation-delay: 0.36s; }
@keyframes floraWaveDot {
    0%, 60%, 100% { transform: translateY(0) scale(0.7); opacity: 0.35; }
    30%            { transform: translateY(-6px) scale(1.1); opacity: 1; }
}
`;
document.head.appendChild(_floraStyles);

/* ══════════════════════════════════════════════════════════════
   0. AUTH GUARD
   ══════════════════════════════════════════════════════════════ */
function decodeTokenPayload(token) {
    try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}
function isTokenExpired(token) {
    const p = decodeTokenPayload(token);
    return !p || (p.exp * 1000) < Date.now();
}
async function initAuth() {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    if (!token) { redirectToLogin(); return false; }
    if (isTokenExpired(token)) {
        if (!refreshToken || isTokenExpired(refreshToken)) {
            clearSession(); redirectToLogin(); return false;
        }
        try {
            const res = await fetch(`${API_BASE}/auth/refresh-token`, {
                method: "POST", headers: { Authorization: `Bearer ${refreshToken}` }
            });
            if (res.ok) {
                const d = await res.json();
                localStorage.setItem("token", d.data?.accessToken || "");
            } else { clearSession(); redirectToLogin(); return false; }
        } catch { /* offline */ }
    }
    return true;
}
function clearSession() {
    ["token", "refreshToken", "userName"].forEach(k => localStorage.removeItem(k));
}
function redirectToLogin() { window.location.href = "auth/login/login.html"; }

initAuth().then(ok => { if (ok) initApp(); });

/* ══════════════════════════════════════════════════════════════
   1. THEME
   ══════════════════════════════════════════════════════════════ */
const html = document.documentElement;
function setupTheme(btnId) {
    const btn = document.getElementById(btnId);
    const saved = localStorage.getItem("flora-theme") || "dark";
    html.setAttribute("data-theme", saved);
    btn?.addEventListener("click", () => {
        const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", next);
        localStorage.setItem("flora-theme", next);
    });
}

/* ══════════════════════════════════════════════════════════════
   2. LANGUAGE  (Task 3 — instant switch, no refresh)
   ══════════════════════════════════════════════════════════════ */
let currentLang = localStorage.getItem("flora-lang") || "en";

function applyLang(lang) {
    currentLang = lang;
    html.setAttribute("data-lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

    // Toggle button labels
    document.querySelectorAll("#langLabel, #langLabel2").forEach(el => {
        el.textContent = lang === "ar" ? "EN" : "AR";
    });

    // All [data-en] elements (text nodes + placeholders)
    document.querySelectorAll("[data-en]").forEach(el => {
        const val = lang === "ar" ? (el.dataset.ar || el.dataset.en) : el.dataset.en;
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            el.placeholder = val;
        } else if (!el.querySelector("svg")) {
            // Only set textContent if element has no SVG children (preserve icons)
            el.textContent = val;
        }
    });

    // msgInput placeholder
    const msgInput = document.getElementById("msgInput");
    if (msgInput) msgInput.placeholder = t("askPlaceholder");

    // Re-render sidebar (translates "No conversations yet", times, etc.)
    renderSidebar();

    // Re-render main chat section based on state
    const messagesEl = document.getElementById("messages");
    if (messagesEl) {
        const activeId = getActiveConvId();
        const activeConv = activeId ? loadAllConversations().find(c => c.id === activeId) : null;
        
        if (activeConv && activeConv.messages && activeConv.messages.length > 0) {
            // Active conversation has messages -> re-render the conversation in the new language
            loadConversationIntoView(activeId);
        } else {
            // No active conversation or active conversation has 0 messages -> show welcome screen in new language
            showWelcomeMessages();
        }
    }
}

/* ══════════════════════════════════════════════════════════════
   3. CONVERSATION STORE
   ══════════════════════════════════════════════════════════════ */
const HISTORY_KEY = "flora_conversations";
const ACTIVE_KEY = "flora_active_conv";

function loadAllConversations() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveAllConversations(convs) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(convs));
    } catch (e) {
        console.error("Failed to save conversations to localStorage:", e);
    }
}
function getActiveConvId() { return localStorage.getItem(ACTIVE_KEY) || null; }
function setActiveConvId(id) { localStorage.setItem(ACTIVE_KEY, id); }
function getActiveConversation() {
    const id = getActiveConvId();
    if (!id) return null;
    return loadAllConversations().find(c => c.id === id) || null;
}

function createNewConversation() {
    const id = "conv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const conversationId = "mongo_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    const conv = {
        id, conversationId,
        title: t("newChat"),
        createdAt: Date.now(), updatedAt: Date.now(),
        messages: [], pinned: false, archived: false
    };
    const convs = loadAllConversations();
    convs.unshift(conv);
    saveAllConversations(convs);
    setActiveConvId(id);
    // Clear diagnosis context for new conversation
    activeDiagnosisCtx = null;
    return conv;
}

function addMessageToHistory(role, content, imageDataUrl = null, model = null) {
    const convs = loadAllConversations();
    const id = getActiveConvId();
    const conv = convs.find(c => c.id === id);
    if (!conv) return;
    const entry = { role, content, ts: Date.now() };
    if (imageDataUrl) entry.imageDataUrl = imageDataUrl;
    if (model) entry.model = model;
    conv.messages.push(entry);
    conv.updatedAt = Date.now();
    if (role === "user" && (conv.title === t("newChat") || conv.title === "New Chat" || conv.title === "محادثة جديدة")) {
        const titleText = content.replace(/^📷\s*/, "").trim();
        conv.title = titleText.length > 40 ? titleText.substring(0, 40) + "…" : (titleText || t("newChat"));
    }
    saveAllConversations(convs);
}

function getContextHistory() {
    const conv = getActiveConversation();
    if (!conv) return [];
    // ── FIX: Strip imageDataUrl before sending to backend.
    // imageDataUrl is a base64 string (~1-3MB). Including it in the JSON body
    // blows past express.json()'s default 100kb limit → connection refused instantly.
    return conv.messages.slice(-10).map(({ role, content }) => ({ role, content }));
}

function pinConversation(id) {
    const convs = loadAllConversations();
    const conv = convs.find(c => c.id === id);
    if (conv) { conv.pinned = !conv.pinned; conv.updatedAt = Date.now(); saveAllConversations(convs); renderSidebar(); }
}
function archiveConversation(id) {
    const convs = loadAllConversations();
    const conv = convs.find(c => c.id === id);
    if (conv) {
        conv.archived = !conv.archived; conv.updatedAt = Date.now(); saveAllConversations(convs); renderSidebar();
        if (getActiveConvId() === id) {
            const next = convs.find(c => !c.archived && c.id !== id);
            if (next) { setActiveConvId(next.id); loadConversationIntoView(next.id); }
            else showWelcomeMessages();
        }
    }
}
function deleteConversation(id) {
    let convs = loadAllConversations().filter(c => c.id !== id);
    saveAllConversations(convs);
    if (getActiveConvId() === id) {
        const next = convs[0];
        if (next) { setActiveConvId(next.id); loadConversationIntoView(next.id); }
        else { localStorage.removeItem(ACTIVE_KEY); showWelcomeMessages(); }
    }
    renderSidebar();
}

/* ══════════════════════════════════════════════════════════════
   4. SIDEBAR
   ══════════════════════════════════════════════════════════════ */
const sidebar = document.getElementById("sidebar");

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        const isOpen = sidebar?.classList.toggle("mobile-open");
        const backdrop = document.getElementById("sidebarBackdrop");
        if (backdrop) backdrop.classList.toggle("active", !!isOpen);
    } else {
        sidebar?.classList.toggle("collapsed");
    }
}

document.addEventListener("click", () => {
    document.querySelectorAll(".conv-dropdown").forEach(d => d.remove());
});

function showConvDropdown(convId, anchorEl, isPinned, isArchived) {
    document.querySelectorAll(".conv-dropdown").forEach(d => d.remove());

    const dropdown = document.createElement("div");
    dropdown.className = "conv-dropdown";

    const items = [
        {
            label: isPinned ? t("unpin") : t("pin"),
            icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`,
            action: () => pinConversation(convId)
        },
        {
            label: isArchived ? t("unarchive") : t("archive"),
            icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
            action: () => archiveConversation(convId)
        },
        {
            label: t("delete"),
            icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
            action: () => deleteConversation(convId), danger: true
        }
    ];

    items.forEach(item => {
        const el = document.createElement("div");
        el.className = "conv-dropdown-item" + (item.danger ? " danger" : "");
        el.innerHTML = item.icon + `<span>${item.label}</span>`;
        el.addEventListener("click", e => {
            e.stopPropagation();
            dropdown.remove();
            item.action();
        });
        dropdown.appendChild(el);
    });

    // Position below anchor, RTL-aware
    const rect = anchorEl.getBoundingClientRect();
    const isRtl = document.documentElement.getAttribute("dir") === "rtl";
    const left = isRtl
        ? Math.max(4, rect.right - 170)
        : Math.max(4, rect.left - 100);
    dropdown.style.cssText = `position:fixed;top:${rect.bottom + 6}px;left:${left}px`;
    document.body.appendChild(dropdown);

    // Close on outside click
    const close = e2 => {
        if (!dropdown.contains(e2.target)) {
            dropdown.remove();
            document.removeEventListener("click", close);
        }
    };
    setTimeout(() => document.addEventListener("click", close), 50);
}
function renderSidebar() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;
    let convs = loadAllConversations();
    const activeId = getActiveConvId();
    convs = [
        ...convs.filter(c => c.pinned && !c.archived),
        ...convs.filter(c => !c.pinned && !c.archived),
        ...convs.filter(c => c.archived)
    ];
    if (convs.length === 0) {
        historyList.innerHTML = `
            <div class="no-chats-empty">
                <div class="no-chats-icon">🌿</div>
                <span>${t("noChats")}</span>
            </div>`;
        return;
    }

    const icons = ["🌿", "🍃", "🌱", "🌾", "🌺", "🪴", "🌻", "🌵"];
    const isAr = currentLang === "ar";

    // Group by date
    const now = Date.now();
    const DAY = 86_400_000;
    const todayStr = isAr ? "اليوم" : "Today";
    const yestStr = isAr ? "أمس" : "Yesterday";
    const thisWeekStr = isAr ? "هذا الأسبوع" : "This Week";
    const olderStr = isAr ? "أقدم" : "Older";
    const pinnedStr = isAr ? "مثبّت" : "Pinned";
    const archivedStr = isAr ? "مؤرشف" : "Archived";

    let lastGroup = null;
    const rows = convs.map((conv, i) => {
        const isActive = conv.id === activeId;
        const age = now - (conv.updatedAt || 0);

        let group;
        if (conv.archived) group = archivedStr;
        else if (conv.pinned) group = pinnedStr;
        else if (age < DAY) group = todayStr;
        else if (age < 2 * DAY) group = yestStr;
        else if (age < 7 * DAY) group = thisWeekStr;
        else group = olderStr;

        let groupHeader = "";
        if (group !== lastGroup) {
            lastGroup = group;
            groupHeader = `<div class="hist-group-label">${group}</div>`;
        }

        const pinnedBadge = conv.pinned ? `<span class="hist-badge hist-badge--pin">📌</span>` : "";
        const archBadge = conv.archived ? `<span class="hist-badge hist-badge--arch">🗄</span>` : "";
        const previewText = conv.messages?.[conv.messages.length - 1]?.content?.slice(0, 50) || "";

        return `${groupHeader}
        <div class="history-item ${isActive ? "active" : ""} ${conv.archived ? "archived-item" : ""}"
             data-conv-id="${conv.id}"
             style="opacity:${conv.archived ? "0.6" : "1"}">
            <div class="hist-icon">${icons[i % icons.length]}</div>
            <div class="hist-text">
                <div class="hist-title-row">
                    <span class="hist-title">${escHtml(conv.title)}</span>
                    ${pinnedBadge}${archBadge}
                </div>
                <span class="hist-preview">${escHtml(previewText)}</span>
                <span class="hist-time">${timeAgo(conv.updatedAt)}</span>
            </div>
            <button class="conv-menu-btn" data-id="${conv.id}" title="${t("options")}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                </svg>
            </button>
        </div>`;
    });

    historyList.innerHTML = rows.join("");

    historyList.querySelectorAll(".history-item").forEach(item => {
        const convId = item.dataset.convId;
        const conv = loadAllConversations().find(c => c.id === convId);
        item.addEventListener("click", e => {
            if (e.target.closest(".conv-menu-btn")) return;
            setActiveConvId(convId);
            loadConversationIntoView(convId);
            renderSidebar();
            if (window.innerWidth <= 768) {
                sidebar?.classList.remove("mobile-open");
                document.getElementById("sidebarBackdrop")?.classList.remove("active");
            }
        });
        const menuBtn = item.querySelector(".conv-menu-btn");
        if (menuBtn) {
            menuBtn.addEventListener("click", e => {
                e.stopPropagation();
                showConvDropdown(convId, menuBtn, conv?.pinned, conv?.archived);
            });
        }
    });
}

function loadConversationIntoView(convId) {
    const messagesEl = document.getElementById("messages");
    if (!messagesEl) return;
    if (!convId) { showWelcomeMessages(); return; }
    const conv = loadAllConversations().find(c => c.id === convId);
    if (!conv || conv.messages.length === 0) { showWelcomeMessages(); return; }

    // Restore activeDiagnosisCtx from last bot diagnosis message in history
    activeDiagnosisCtx = null;
    const botMsgs = (conv.messages || []).filter(m => m.role === "bot" && m.content && m.content.startsWith("🌿 **"));
    if (botMsgs.length > 0) {
        const lastDiag = botMsgs[botMsgs.length - 1];
        const match = lastDiag.content.match(/^🌿 \*\*([^*]+)\*\* — ([^\n\r]+)/);
        if (match) {
            activeDiagnosisCtx = {
                plant: match[1].trim(),
                disease: match[2].trim()
            };
            console.log("[chat.js] 🔄 Restored activeDiagnosisCtx from history:", activeDiagnosisCtx);
        }
    }

    messagesEl.innerHTML = "";
    conv.messages.forEach(m => {
        if (m.imageDataUrl) {
            // Re-render user message that had an image attached
            appendUserImageMessage(m.imageDataUrl, m.content.replace(/^📷\s*/, "").trim(), false);
        } else {
            const botEl = appendMessage(m.role === "user" ? "user" : "bot", m.content, false);
            if (m.role === "bot") {
                const modelUsed = m.model || "gemma";
                addModelLabel(botEl, modelUsed);
            }
        }
    });
    messagesEl.scrollTo({ top: messagesEl.scrollHeight });
    const suggestions = document.getElementById("suggestions");
    if (suggestions) suggestions.style.display = "none";
}

function showWelcomeMessages() {
    const messagesEl = document.getElementById("messages");
    if (!messagesEl) return;

    const isAr = currentLang === "ar";

    messagesEl.innerHTML = `
        <div class="welcome-screen">
            <div class="welcome-logo-wrap">
                <img src="img/coppy-removebg-preview.png" alt="Flora" class="welcome-logo" />
                <div class="welcome-logo-glow"></div>
            </div>
            <h2 class="welcome-title">${isAr ? "مرحباً بك في فلورا 🌿" : "Welcome to Flora 🌿"}</h2>
            <p class="welcome-sub">${isAr
            ? "مساعدك الزراعي الذكي — ارفع صورة نبات أو اسألني أي شيء عن النباتات"
            : "Your AI plant health expert — upload a photo or ask me anything about plant care"
        }</p>
            <div class="welcome-cards">
                <div class="welcome-card" data-prompt="${isAr ? "كيف أعتني بنباتاتي في الصيف؟" : "How do I care for my plants in summer?"}">
                    <div class="wc-icon">☀️</div>
                    <span>${isAr ? "نصائح العناية الصيفية" : "Summer care tips"}</span>
                </div>
                <div class="welcome-card" data-prompt="${isAr ? "ما هي علامات الإفراط في الري؟" : "What are signs of overwatering?"}">
                    <div class="wc-icon">💧</div>
                    <span>${isAr ? "علامات زيادة الري" : "Signs of overwatering"}</span>
                </div>
                <div class="welcome-card upload-card" id="welcomeUploadCard">
                    <div class="wc-icon">📸</div>
                    <span>${isAr ? "شخّص نباتي" : "Diagnose my plant"}</span>
                </div>
                <div class="welcome-card" data-prompt="${isAr ? "أفضل سماد للطماطم؟" : "Best fertilizer for tomatoes?"}">
                    <div class="wc-icon">🌱</div>
                    <span>${isAr ? "أسمدة الطماطم" : "Tomato fertilizers"}</span>
                </div>
            </div>
        </div>`;

    // Animate cards in staggered
    const cards = messagesEl.querySelectorAll(".welcome-card");
    cards.forEach((c, i) => {
        c.style.opacity = "0";
        c.style.transform = "translateY(14px)";
        setTimeout(() => {
            c.style.transition = "opacity 0.35s ease, transform 0.35s ease";
            c.style.opacity = "1";
            c.style.transform = "translateY(0)";
        }, 120 + i * 70);
    });

    // Quick-start card clicks
    messagesEl.querySelectorAll(".welcome-card[data-prompt]").forEach(card => {
        card.addEventListener("click", () => {
            const msgInput = document.getElementById("msgInput");
            if (msgInput) {
                msgInput.value = card.dataset.prompt;
                msgInput.focus();
                const suggestions = document.getElementById("suggestions");
                if (suggestions) suggestions.style.display = "none";
            }
        });
    });

    // Upload card triggers file input
    document.getElementById("welcomeUploadCard")?.addEventListener("click", () => {
        document.getElementById("fileInput")?.click();
    });

    const suggestions = document.getElementById("suggestions");
    if (suggestions) suggestions.style.display = "flex";
}

/* ══════════════════════════════════════════════════════════════
   5. IMAGE UPLOAD + PLANT CONTEXT
   ══════════════════════════════════════════════════════════════ */
let pendingImageFile = null;
let pendingImageDataUrl = null;   // ← used to render <img> in user bubble

function compressImageDataUrl(dataUrl, maxWidth = 200, maxHeight = 160) {
    return new Promise((resolve) => {
        if (!dataUrl) { resolve(null); return; }
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.7));
            } else {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
    });
}

/* Task 1: activeDiagnosisCtx persists across messages in a conversation.
   Set after image pipeline returns (via diagnosis_meta SSE event).
   Cleared when creating a new conversation.
   Sent as plantContext on every follow-up text message. */
let activeDiagnosisCtx = null;

function setupImageUpload() {
    const fileInput = document.getElementById("fileInput");
    const imgPreviewArea = document.getElementById("imgPreviewArea");
    const imgPreviewInner = document.getElementById("imgPreviewInner");
    const dragOverlay = document.getElementById("dragOverlay");
    if (!fileInput) return;

    // Handle file selection
    fileInput.addEventListener("change", e => {
        const file = e.target.files?.[0];
        if (!file) return;
        _loadImageFile(file, imgPreviewArea, imgPreviewInner);
        fileInput.value = "";
    });

    // ── Drag & Drop ──────────────────────────────────────────────
    let dragCounter = 0;
    document.addEventListener("dragenter", e => {
        if (!e.dataTransfer?.types.includes("Files")) return;
        dragCounter++;
        dragOverlay?.classList.add("active");
    });
    document.addEventListener("dragleave", () => {
        dragCounter--;
        if (dragCounter <= 0) { dragCounter = 0; dragOverlay?.classList.remove("active"); }
    });
    document.addEventListener("dragover", e => e.preventDefault());
    document.addEventListener("drop", e => {
        e.preventDefault();
        dragCounter = 0;
        dragOverlay?.classList.remove("active");
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith("image/")) {
            _loadImageFile(file, imgPreviewArea, imgPreviewInner);
        }
    });
}

function _loadImageFile(file, imgPreviewArea, imgPreviewInner) {
    pendingImageFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
        pendingImageDataUrl = ev.target.result;
        if (imgPreviewArea) imgPreviewArea.style.display = "block";
        if (imgPreviewInner) {
            imgPreviewInner.innerHTML = `
                <div style="position:relative;display:inline-block">
                    <img src="${pendingImageDataUrl}"
                         style="max-height:80px;max-width:160px;border-radius:8px;object-fit:cover;border:2px solid var(--accent)" />
                    <button id="removeImgBtn"
                        style="position:absolute;top:-6px;right:-6px;background:#e53935;color:#fff;
                               border:none;border-radius:50%;width:20px;height:20px;font-size:12px;
                               cursor:pointer;display:flex;align-items:center;justify-content:center;
                               box-shadow:0 2px 6px rgba(0,0,0,0.3)">✕</button>
                </div>`;
            document.getElementById("removeImgBtn")?.addEventListener("click", clearImagePreview);
        }
        // Focus the textarea after image load
        document.getElementById("msgInput")?.focus();
    };
    reader.readAsDataURL(file);
}

function clearImagePreview() {
    pendingImageFile = null;
    pendingImageDataUrl = null;
    const imgPreviewArea = document.getElementById("imgPreviewArea");
    const imgPreviewInner = document.getElementById("imgPreviewInner");
    if (imgPreviewArea) imgPreviewArea.style.display = "none";
    if (imgPreviewInner) imgPreviewInner.innerHTML = "";
}

window.floraSetPlantContext = function (ctx) {
    activeDiagnosisCtx = ctx || null;
};

/* ══════════════════════════════════════════════════════════════
   6. SEND MESSAGE
   ══════════════════════════════════════════════════════════════ */
const messagesEl = document.getElementById("messages");
let currentAbortController = null;
let isGenerating = false;

function setSendBtnState(generating) {
    isGenerating = generating;
    const sendBtn = document.getElementById("sendBtn");
    if (!sendBtn) return;
    if (generating) {
        sendBtn.title = t("stop");
        sendBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;
        sendBtn.style.background = "rgba(220,50,50,0.15)";
        sendBtn.style.color = "#e53935";
    } else {
        sendBtn.title = t("send");
        sendBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
        sendBtn.style.background = "";
        sendBtn.style.color = "";
    }
}

async function sendMessage() {
    if (isGenerating) {
        currentAbortController?.abort();
        setSendBtnState(false);
        return;
    }

    const msgInput = document.getElementById("msgInput");
    const text = msgInput?.value.trim();
    const hasImg = !!pendingImageFile;

    if (!text && !hasImg) return;
    if (!getActiveConvId()) createNewConversation();

    const suggestions = document.getElementById("suggestions");
    if (suggestions) suggestions.style.display = "none";

    // ── Render user bubble (Task 3: real image) ────────────────────────
    const imageDataUrlSnapshot = pendingImageDataUrl;
    const imageFileSnapshot = pendingImageFile;

    if (hasImg) {
        appendUserImageMessage(imageDataUrlSnapshot, text);
        // Compress the image before saving to history to prevent localStorage QuotaExceededError (5MB limit)
        const compressedDataUrl = await compressImageDataUrl(imageDataUrlSnapshot);
        addMessageToHistory(
            "user",
            text ? `📷 ${text}` : `📷 ${t("imageLabel")}`,
            compressedDataUrl   // ← persist compressed dataUrl so image survives reload
        );
    } else {
        appendMessage("user", text);
        addMessageToHistory("user", text);
    }
    renderSidebar();

    if (msgInput) { msgInput.value = ""; msgInput.style.height = "auto"; }
    clearImagePreview();

    // ── Typing indicator (Task 2: universal loader) ────────────────────
    // Image analysis gets "Processing technical report…" label
    const typingId = showTyping(hasImg ? t("processing") : t("thinking"));
    const typingShownAt = Date.now(); // FIX: track when indicator appeared

    currentAbortController = new AbortController();
    setSendBtnState(true);

    const token = localStorage.getItem("token");
    const activeConv = getActiveConversation();
    const conversationId = activeConv?.conversationId || null;

    // Task 1: snapshot activeDiagnosisCtx for text follow-ups
    const plantCtxToSend = hasImg ? null : activeDiagnosisCtx;

    try {
        let response;

        if (hasImg) {
            const formData = new FormData();
            formData.append("message", text || t("analyzeImage"));
            if (conversationId) formData.append("conversationId", conversationId);
            formData.append("history", JSON.stringify(getContextHistory()));
            formData.append("image", imageFileSnapshot, imageFileSnapshot.name || "plant.jpg");

            response = await fetch(`${API_BASE}/chat/ask`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
                signal: currentAbortController.signal
            });
        } else {
            // Task 1: always send full diagnosis context for text follow-ups
            const plantContextPayload = plantCtxToSend ? {
                plantName: plantCtxToSend.plant,
                diseaseName: plantCtxToSend.disease,
                confidence: plantCtxToSend.confidence,
                symptoms: plantCtxToSend.symptoms,
                cause: plantCtxToSend.cause,
                treatment: plantCtxToSend.treatment
            } : undefined;

            response = await fetch(`${API_BASE}/chat/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    message: text,
                    conversationId,
                    history: getContextHistory(),
                    plantContext: plantContextPayload
                }),
                signal: currentAbortController.signal
            });
        }

        if (!response.ok) {
            removeTyping(typingId);
            const errData = await response.json().catch(() => ({}));
            appendMessage("bot", `⚠️ ${errData.message || t("serverErr")}`);
            setSendBtnState(false);
            return;
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream")) {
            // ── SSE Streaming ─────────────────────────────────────────
            // Keep typing indicator visible until FIRST real text chunk arrives
            // so the bubble is never empty.
            let botEl = null, bubbleEl = null;
            let firstChunkReceived = false;
            let fullText = "";
            let buffer = "";
            let currentModel = "gemma";

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        const data = line.slice(6).trim();
                        if (data === "[DONE]" || data === "[ERROR]") continue;

                        let json;
                        try { json = JSON.parse(data); } catch { continue; }

                        // Capture diagnosis metadata (image pipeline)
                        if (json.type === "diagnosis_meta") {
                            activeDiagnosisCtx = {
                                plant: json.plant,
                                disease: json.disease,
                                confidence: json.confidence,
                                symptoms: json.symptoms || "",
                                cause: json.cause || "",
                                treatment: json.treatment || "",
                                isHealthy: json.isHealthy || false
                            };
                            continue;
                        }

                        // Model label badge
                        if (json.type === "model_info") {
                            currentModel = json.model || "gemma";
                            continue;
                        }

                        if (json.chunk) {
                            // On first real chunk: ensure typing indicator was visible
                            // for at least MIN_TYPING_MS before swapping to the stream bubble.
                            if (!firstChunkReceived) {
                                firstChunkReceived = true;
                                const MIN_TYPING_MS = 650; // user needs to SEE the animation
                                const elapsed = Date.now() - typingShownAt;
                                if (elapsed < MIN_TYPING_MS) {
                                    // FIX (Image 1): typing indicator was removed <50ms after
                                    // appearing because Buffer-then-Stream sends chunks instantly.
                                    // This pause gives the user a clear "thinking" signal.
                                    await new Promise(r => setTimeout(r, MIN_TYPING_MS - elapsed));
                                }
                                removeTyping(typingId);
                                const streamed = appendStreamingMessage();
                                botEl = streamed.el;
                                bubbleEl = streamed.bubbleEl;
                            }
                            fullText += json.chunk;
                            bubbleEl.innerHTML = formatMessage(fullText);
                            messagesEl?.scrollTo({ top: messagesEl.scrollHeight });
                        }
                    }
                }
            } catch (err) {
                removeTyping(typingId);
                if (err.name === "AbortError") {
                    if (botEl) {
                        if (fullText) bubbleEl.innerHTML = formatMessage(fullText + " ⬛");
                        else botEl.remove();
                    }
                } else throw err;
            } finally {
                // Safety: remove typing indicator if no chunk ever arrived
                removeTyping(typingId);
            }

            // Add model label badge after streaming completes
            if (fullText && botEl) {
                addModelLabel(botEl, currentModel);
                _attachOptionsAfterStream(botEl, fullText);
                addMessageToHistory("bot", fullText, null, currentModel);
                renderSidebar();
            }

        } else {
            // Non-streaming fallback — animate word-by-word so the UI never
            // shows a solid block of text. Mirrors the SSE streaming UX.
            removeTyping(typingId);
            const result = await response.json();
            const reply = result.reply || `⚠️ ${t("aiUnavailable")}`;

            const { el: botEl, bubbleEl } = (() => {
                const streamed = appendStreamingMessage();
                return { el: streamed.el, bubbleEl: streamed.bubbleEl };
            })();

            await new Promise(resolve => {
                const words = reply.split(" ");
                let i = 0;
                const CHUNK = 3;   // words per tick (matches backend rhythm)
                const DELAY = 35;  // ms — same as _streamBufferedText
                const tick = () => {
                    if (i >= words.length) {
                        bubbleEl.innerHTML = formatMessage(reply); // final render (handles markdown)
                        messagesEl?.scrollTo({ top: messagesEl.scrollHeight });
                        resolve();
                        return;
                    }
                    const partial = words.slice(0, i + CHUNK).join(" ");
                    bubbleEl.textContent = partial;
                    i += CHUNK;
                    messagesEl?.scrollTo({ top: messagesEl.scrollHeight });
                    setTimeout(tick, DELAY);
                };
                tick();
            });

            addModelLabel(botEl, "fallback");
            addMessageToHistory("bot", reply, null, "fallback");
            renderSidebar();
        }

    } catch (err) {
        removeTyping(typingId);
        if (err.name !== "AbortError") {
            appendMessage("bot", `⚠️ ${t("connectionErr")}`);
        }
    } finally {
        setSendBtnState(false);
        currentAbortController = null;
    }
}

/* ══════════════════════════════════════════════════════════════
   7. MESSAGE RENDERERS
   ══════════════════════════════════════════════════════════════ */

/* Standard message (bot or user text) */
function appendMessage(type, content, scroll = true) {
    const isBot = type === "bot";
    const group = document.createElement("div");
    group.className = `msg-group ${isBot ? "bot-group" : "user-group"}`;
    const initial = (localStorage.getItem("userName") || "U").charAt(0).toUpperCase();

    // Build: avatar + bubbles (btn injected by _attachMsgOptionsBtn)
    const avatarEl = document.createElement("div");
    avatarEl.className = isBot ? "msg-avatar" : "ua-placeholder";
    if (isBot) avatarEl.innerHTML = `<img src="img/coppy-removebg-preview.png" alt="Flora">`;
    else avatarEl.textContent = initial;

    const bubblesEl = document.createElement("div");
    bubblesEl.className = "msg-bubbles";
    const bubble = document.createElement("div");
    bubble.className = `bubble ${isBot ? "bot-bubble" : "user-bubble"}`;
    bubble.innerHTML = formatMessage(content);
    bubblesEl.appendChild(bubble);

    group.appendChild(avatarEl);
    group.appendChild(bubblesEl);
    _attachMsgOptionsBtn(group, content);   // places btn after bubbles (bot) or before bubbles (user)

    messagesEl?.appendChild(group);
    requestAnimationFrame(() => requestAnimationFrame(() => group.classList.add("msg-visible")));
    if (scroll) setTimeout(() => messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" }), 60);
    return group;
}

/* appendMessage + return {el} for adding model label */
function appendMessageFull(type, content, scroll = true) {
    const el = appendMessage(type, content, scroll);
    return { el };
}

/* Task 3: User bubble with real <img> + optional text */
function appendUserImageMessage(dataUrl, text, scroll = true) {
    const group = document.createElement("div");
    group.className = "msg-group user-group";
    const initial = (localStorage.getItem("userName") || "U").charAt(0).toUpperCase();

    const avatarEl = document.createElement("div");
    avatarEl.className = "ua-placeholder";
    avatarEl.textContent = initial;

    const bubblesEl = document.createElement("div");
    bubblesEl.className = "msg-bubbles";
    const bubble = document.createElement("div");
    bubble.className = "bubble user-bubble";
    if (dataUrl) {
        const img = document.createElement("img");
        img.src = dataUrl;
        img.className = "chat-user-img";
        img.alt = "plant photo";
        bubble.appendChild(img);
    }
    if (text) {
        const span = document.createElement("span");
        span.textContent = text;
        bubble.appendChild(span);
    }
    bubblesEl.appendChild(bubble);

    group.appendChild(avatarEl);
    group.appendChild(bubblesEl);
    _attachMsgOptionsBtn(group, text || "");

    messagesEl?.appendChild(group);
    requestAnimationFrame(() => requestAnimationFrame(() => group.classList.add("msg-visible")));
    if (scroll) setTimeout(() => messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" }), 60);
    return group;
}

/* Streaming bot message — empty bubble filled incrementally */
function appendStreamingMessage() {
    const group = document.createElement("div");
    group.className = "msg-group bot-group";
    group.innerHTML = `
        <div class="msg-avatar"><img src="img/coppy-removebg-preview.png" alt="Flora"></div>
        <div class="msg-bubbles">
            <div class="bubble bot-bubble" style="min-width:2rem;min-height:1.4rem"></div>
        </div>`;
    messagesEl?.appendChild(group);
    requestAnimationFrame(() => requestAnimationFrame(() => group.classList.add("msg-visible")));
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight });
    return { el: group, bubbleEl: group.querySelector(".bubble") };
}

/* Task 2: Model label badge */
function addModelLabel(groupEl, model) {
    const bubblesEl = groupEl?.querySelector(".msg-bubbles");
    if (!bubblesEl) return;
    const div = document.createElement("div");
    div.className = "model-label";
    const labelText = (model === "gemini" || model === "fallback")
        ? t("poweredByGemini")
        : model === "pipeline"
            ? t("poweredByPipeline")
            : t("poweredByGemma");
    div.innerHTML = `<span class="model-label-dot"></span><span>${labelText}</span>`;
    bubblesEl.appendChild(div);
}

/* Premium Flora loader — pure CSS ring (no image dependency) */
function showTyping(label = "") {
    const id = "typing-" + Date.now();
    const group = document.createElement("div");
    group.className = "msg-group bot-group";
    group.id = id;
    const lbl = label ? `<div class="flora-loader-label">${escHtml(label)}</div>` : `<div class="flora-loader-label">...</div>`;
    group.innerHTML = `
        <div class="msg-avatar"><img src="img/coppy-removebg-preview.png" alt="Flora"></div>
        <div class="msg-bubbles">
            <div class="bubble bot-bubble flora-loading-bubble">
                <div class="flora-loader-ring"></div>
                ${lbl}
                <div class="flora-loader-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>`;
    messagesEl?.appendChild(group);
    // FIX (Image 1 — invisible animation): appendMessage uses double-rAF to trigger
    // the CSS fade-in via .msg-visible. showTyping was missing this, so the loading
    // bubble had opacity:0 and was completely invisible to the user.
    requestAnimationFrame(() => requestAnimationFrame(() => group.classList.add("msg-visible")));
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight });
    return id;
}

function removeTyping(id) { document.getElementById(id)?.remove(); }

/* ── Message 3-dot options button & popover (Phase 2) ── */
function _attachMsgOptionsBtn(groupEl, textContent) {
    const btn = document.createElement("button");
    btn.className = "msg-options-btn";
    btn.title = "Options";
    btn.setAttribute("aria-label", "Message options");
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5"  r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
    </svg>`;
    // Place button INLINE next to msg-bubbles (not outside group)
    // For user messages: insert BEFORE bubbles; for bot: insert AFTER
    const bubblesEl = groupEl.querySelector(".msg-bubbles");
    const isUser = groupEl.classList.contains("user-group");
    if (bubblesEl) {
        if (isUser) groupEl.insertBefore(btn, bubblesEl);
        else groupEl.appendChild(btn);
    } else {
        groupEl.appendChild(btn);
    }

    btn.addEventListener("click", e => {
        e.stopPropagation();
        // Remove any open popovers first
        document.querySelectorAll(".msg-popover").forEach(p => p.remove());

        const popover = document.createElement("div");
        popover.className = "msg-popover";

        const deleteItem = document.createElement("div");
        deleteItem.className = "msg-popover-item danger";
        deleteItem.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4h6v2"/>
            </svg>
            <span>${t("deleteMessage")}</span>`;
        deleteItem.addEventListener("click", e => {
            e.stopPropagation();
            popover.remove();
            // Fade out + remove
            groupEl.style.transition = "opacity 0.25s ease, transform 0.25s ease";
            groupEl.style.opacity = "0";
            groupEl.style.transform = "translateY(-6px)";
            setTimeout(() => groupEl.remove(), 260);
        });

        popover.appendChild(deleteItem);

        // Position popover near button
        const rect = btn.getBoundingClientRect();
        const isRtl = document.documentElement.getAttribute("dir") === "rtl";
        popover.style.top = `${rect.bottom + 6}px`;
        popover.style.left = isRtl
            ? `${Math.max(4, rect.left - 90)}px`
            : `${Math.min(window.innerWidth - 175, rect.left - 60)}px`;

        document.body.appendChild(popover);

        // Close on outside click
        const closePopover = e2 => {
            if (!popover.contains(e2.target)) { popover.remove(); document.removeEventListener("click", closePopover); }
        };
        setTimeout(() => document.addEventListener("click", closePopover), 50);
    });
}

/* When streaming finishes: attach options btn to the completed message */
function _attachOptionsAfterStream(groupEl, fullText) {
    _attachMsgOptionsBtn(groupEl, fullText);
}

/* ── Markdown renderer ── */
function formatMessage(text) {
    if (!text) return "";
    let out = escHtml(text);
    out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    out = out.replace(/^[-•]\s(.+)/gm, "<li>$1</li>");
    out = out.replace(/(<li>.*?<\/li>(\n|$))+/gs, m => `<ul>${m}</ul>`);
    out = out.replace(/\n/g, "<br>");
    return out;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function timeAgo(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return t("justNow");
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

/* ══════════════════════════════════════════════════════════════
   8. VOICE INPUT
   ══════════════════════════════════════════════════════════════ */
function setupVoice() {
    const voiceBtn = document.getElementById("voiceBtn");
    const msgInput = document.getElementById("msgInput");
    if (!voiceBtn) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        voiceBtn.style.opacity = "0.4";
        voiceBtn.title = t("micUnsupported");
        return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let isRecording = false, committedText = "";

    recognition.onstart = () => { isRecording = true; committedText = msgInput?.value || ""; voiceBtn.classList.add("recording"); };
    recognition.onresult = e => {
        let interim = "", final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const t2 = e.results[i][0].transcript;
            if (e.results[i].isFinal) final += t2 + " "; else interim += t2;
        }
        if (final) committedText += final;
        if (msgInput) {
            msgInput.value = committedText + interim;
            msgInput.style.height = "auto";
            msgInput.style.height = Math.min(msgInput.scrollHeight, 140) + "px";
        }
    };
    recognition.onerror = e => {
        isRecording = false; voiceBtn.classList.remove("recording");
        if (e.error === "not-allowed") appendMessage("bot", `⚠️ ${t("micDenied")}`);
    };
    recognition.onend = () => { isRecording = false; voiceBtn.classList.remove("recording"); };

    voiceBtn.addEventListener("click", () => {
        if (isRecording) { recognition.stop(); return; }
        recognition.lang = currentLang === "ar" ? "ar-EG" : "en-US";
        try { recognition.start(); } catch {
            recognition.stop();
            setTimeout(() => { recognition.lang = currentLang === "ar" ? "ar-EG" : "en-US"; recognition.start(); }, 350);
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   9. LOGOUT
   ══════════════════════════════════════════════════════════════ */
function injectLogoutButton() {
    const footer = document.querySelector(".sidebar-footer");
    if (!footer || document.getElementById("logoutBtn")) return;
    const btn = document.createElement("button");
    btn.className = "sf-btn";
    btn.id = "logoutBtn";
    btn.title = t("logout");
    btn.style.color = "#e57373";
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span data-en="Logout" data-ar="تسجيل الخروج">${t("logout")}</span>`;
    footer.appendChild(btn);
    btn.addEventListener("click", () => { clearSession(); redirectToLogin(); });
}

/* ══════════════════════════════════════════════════════════════
   10. INIT APP
   ══════════════════════════════════════════════════════════════ */
function initApp() {
    setupTheme("themeToggle");
    setupTheme("themeToggle2");

    applyLang(currentLang);

    // Language toggle — instant switch, no refresh (Task 3)
    ["langToggle", "langToggle2"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", () => {
            const next = currentLang === "en" ? "ar" : "en";
            localStorage.setItem("flora-lang", next);
            applyLang(next);
        });
    });

    document.getElementById("histToggle")?.addEventListener("click", toggleSidebar);
    document.getElementById("sidebarClose")?.addEventListener("click", () => {
        sidebar?.classList.remove("mobile-open");
        document.getElementById("sidebarBackdrop")?.classList.remove("active");
        if (window.innerWidth > 768) sidebar?.classList.add("collapsed");
    });
    // Mobile: close sidebar on backdrop click
    document.getElementById("sidebarBackdrop")?.addEventListener("click", () => {
        sidebar?.classList.remove("mobile-open");
        document.getElementById("sidebarBackdrop")?.classList.remove("active");
    });

    const sendBtn = document.getElementById("sendBtn");
    const msgInput = document.getElementById("msgInput");
    sendBtn?.addEventListener("click", sendMessage);

    msgInput?.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    msgInput?.addEventListener("input", () => {
        msgInput.style.height = "auto";
        msgInput.style.height = Math.min(msgInput.scrollHeight, 140) + "px";
    });

    document.querySelectorAll(".suggestion-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            // Use the correct language value from data attributes, not stale textContent
            const prompt = currentLang === "ar"
                ? (chip.dataset.ar || chip.dataset.en)
                : chip.dataset.en;
            if (msgInput) msgInput.value = prompt || chip.textContent.trim();
            const suggestions = document.getElementById("suggestions");
            if (suggestions) suggestions.style.display = "none";
            sendMessage();
        });
    });

    document.getElementById("newChatBtn")?.addEventListener("click", () => {
        createNewConversation();
        renderSidebar();
        showWelcomeMessages();
        if (window.innerWidth <= 768) sidebar?.classList.remove("mobile-open");
    });

    document.getElementById("headerLogoutBtn")?.addEventListener("click", () => {
        clearSession(); redirectToLogin();
    });

    setupImageUpload();
    setupVoice();
    injectLogoutButton();

    renderSidebar();
    const activeId = getActiveConvId();
    if (activeId) loadConversationIntoView(activeId);
    else showWelcomeMessages();
}
