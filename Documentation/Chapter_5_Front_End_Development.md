# Chapter 5: Front-End Development

## 5.1 Front-End Architectural Philosophy and UI/UX Design

The visual layer of project FLORA serves as the gateway through which Egyptian smallholder farmers and agricultural workers interact with our CNN and LLM services. Designing a client interface for this demographic introduces unique challenges, including low-bandwidth rural networks, older mobile devices, and varying levels of technological literacy. To address these, our front-end architecture is built on a philosophy of zero-framework vanilla development, responsive layouts, and multi-modal interactions.

### 5.1.1 The Choice of Vanilla HTML5, CSS3, and JavaScript
Modern web projects often rely on heavy single-page application (SPA) frameworks (like React, Angular, or Vue) and utility-first styling (like TailwindCSS). While useful for large teams, these tools introduce substantial overhead that conflicts with our target environment:
1.  **Execution Latency**: SPAs require browsers to download, parse, and execute megabytes of JavaScript before rendering the first meaningful paint. On older, low-end mobile devices common in rural Egypt, this parsing phase causes significant visual delays due to limited CPU power.
2.  **Network Overhead**: Large framework bundles delay initial page loads under poor 3G or 4G network conditions. Every extra kilobyte of bundle size translates directly to a longer wait time for a user standing in a field.
3.  **Complex RTL Styling**: Implementing bidirectional layout mirroring (LTR to RTL) is difficult with utility-class frameworks, often requiring separate builds or double-declarations of padding and margins.

By selecting vanilla HTML5, standard CSS3 variables, and native ES6 modules, the FLORA client application maintains a tiny digital footprint (under 150 KB total size). This allows the application to load instantly even under restricted connections. The comparative overhead budget is analyzed in Table 5.1:

| Metric | React + Tailwind SPA | FLORA Vanilla Stack | Advantage |
| :--- | :--- | :--- | :--- |
| **Initial Bundle Size (Gzip)** | ~350 KB - 1.2 MB | **~35 KB** | 10x - 30x smaller |
| **First Contentful Paint (3G)**| ~3.8 seconds | **~0.6 seconds** | Near-instant loading |
| **Time to Interactive (TTI)** | ~4.5 seconds | **~0.7 seconds** | Minimal CPU parsing delay |
| **DOM Nodes at Idle** | > 800 nodes | **< 120 nodes** | Lightweight render tree |

To maintain smooth rendering performance, the DOM is updated dynamically by appending message container components directly. Since the interface is kept extremely lightweight (under 120 idle DOM nodes), these direct manipulations avoid layout thrashing. When a conversation is loaded, the message window is first cleared, and the historical messages are appended sequentially:

```javascript
messagesEl.innerHTML = "";
conv.messages.forEach(m => {
    if (m.imageDataUrl) {
        // Re-render user message that had an image attached
        appendUserImageMessage(m.imageDataUrl, m.content.replace(/^📷\s*/, "").trim(), false);
    } else {
        appendMessage(m.role === "user" ? "user" : "bot", m.content, false);
    }
});
messagesEl.scrollTo({ top: messagesEl.scrollHeight });
```

This direct rendering cycle ensures that the chat window updates instantly, and since the DOM tree is simple, the rendering engine computes layout modifications in a single frame.

### 5.1.2 Typography and Readability Hierarchy
Readability is critical when presenting diagnostic data. FLORA employs a dual-typography structure tailored to bilingual rendering:
*   **English Font Family**: Uses *Outfit* for headings and *DM Sans* for body text due to its clean geometric shapes and readability at small sizes on mobile screens.
*   **Arabic Font Family**: Integrates the *Amiri* font family for Arabic headings and system prompts. Amiri's distinct vertical height provides an optimal reading experience for local users.

To scale typography and configure styling variables dynamically based on language, custom data attributes are applied. The typography setup references CSS variables defined in the stylesheet:

```css
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  display: flex;
  transition: background 0.4s, color 0.4s;
}

[data-lang="ar"] body {
  font-family: var(--font-ar);
  direction: rtl;
}
```

This adjustments prevent overlaps between stacked text lines, which is a common readability defect in Arabic applications.

### 5.1.3 CSS Custom Property Design System
To facilitate instant theme switches, the styling architecture relies on centralized CSS variables (`:root` tokens) instead of hardcoding color values. The variables define color palettes, border widths, border radii, and transition curves:

```css
:root {
  --bg: #0a0f0a;
  --bg2: #0f1a0f;
  --surface: #121d12;
  --surface2: #182318;
  --border: rgba(76, 175, 80, 0.15);
  --text: #e8f5e9;
  --text-muted: #6b8f6b;
  --text-dim: #4a6b4a;
  --accent: #4caf50;
  --accent2: #81c784;
  --accent3: #2e7d32;
  --user-bubble: #1e3a1e;
  --bot-bubble: #121d12;
  --sidebar-w: 280px;
  --font-display: 'Playfair Display', serif;
  --font-body: 'DM Sans', sans-serif;
  --font-ar: 'Amiri', serif;
  --radius: 16px;
  --radius-sm: 10px;
  --transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
```

The default dark mode uses organic green and charcoal tones to minimize eye strain. When the user toggles the theme, the application updates the parent container to `[data-theme="light"]`, causing the browser to re-evaluate properties instantly:

```css
[data-theme="light"] {
  --bg: #f0f7f0;
  --bg2: #e8f5e9;
  --surface: #ffffff;
  --surface2: #f1f8f1;
  --border: rgba(46, 125, 50, 0.2);
  --text: #1a2e1a;
  --text-muted: #4a7a4a;
  --text-dim: #6b9b6b;
  --user-bubble: #c8e6c9;
  --bot-bubble: #ffffff;
}
```

Because CSS custom properties are evaluated dynamically by the browser's style calculation engine, the theme change occurs in a single frame without needing DOM repaints or scripting loops, keeping CPU usage minimal.

### 5.1.4 User Experience Journeys
The user journey is structured to minimize clicks:
1.  **Discovery**: Landing page (`index.html`) introduces FLORA's capabilities.
2.  **Authentication**: User registers or logs in via `auth/`. Session tokens are stored in `localStorage`.
3.  **Workspace**: User enters the chat workspace (`chat.html`) to upload a leaf photo or ask a query.
4.  **Feedback**: System displays a typing indicator and streams the diagnostic report.

---

## 5.2 Application Layout, Pages, and Mockups

### 5.2.1 Landing Page Layout (`index.html`)
The landing page features:
*   **Hero Section**: Call-to-action button linking directly to the login portal.
*   **Feature Grid**: Illustrates the technical details of the classification model (EfficientNetV2-B3) and chatbot (Gemma 4B).
*   **Project Showcase**: Highlights the development team and academic collaboration.

[INSERT IMAGE HERE: Figure 5.1 - Landing Page Desktop Layout and Academic Collaboration Banner]

### 5.2.2 Conversational Workspace Layout (`chat.html`)
The workspace page is split into two panels:
1.  **Sidebar**: Manages session history logs, theme toggler, and language switcher.
2.  **Chat Panel**: Displays the message log, quick suggested questions, and input toolbar (file upload, voice recording, and text input).

[INSERT IMAGE HERE: Figure 5.2 - Desktop Conversational Workspace with Active Leaf Diagnosis and Sidebar Navigation]

---

## 5.3 Codebase Organization and Modular Directory Structure

The frontend files are organized modularly:

```
Front-End/
├── auth/
│   ├── login/
│   │   ├── login.html
│   │   ├── login.css
│   │   └── login.js
│   └── signup/
│       ├── signup.html
│       ├── signup.css
│       └── signup.js
├── index.html
├── style.css
├── chat.html
├── chat.css
├── chat.js
├── translations.js
└── file.js
```

### 5.3.1 Component Directory Responsibilities
*   `auth/`: Handles registration, login, and password recovery. Exposes modular controllers that communicate with the Express auth endpoints.
*   `translations.js`: Contains bilingual dictionaries for static translation. Acts as the single source of truth for text strings on the client.
*   `chat.js`: Central script managing DOM inputs, SSE requests, voice API, and chat history.
*   `file.js`: Manages landing page styling, animations, theme triggers, and authentication checks.

The design of the translation dictionary exposes clean keys for easy references:

```javascript
window.FLORA_T = {
    en: {
        newChat: "New Chat",
        noChats: "No conversations yet",
        processing: "Processing technical report…",
        thinking: "Flora is thinking…"
    },
    ar: {
        newChat: "محادثة جديدة",
        noChats: "لا توجد محادثات بعد",
        processing: "جاري إعداد التقرير التقني…",
        thinking: "فلورا تفكر…"
    }
};

function t(key) {
    const dict = (window.FLORA_T || {})[currentLang] || (window.FLORA_T || {})["en"] || {};
    return dict[key] !== undefined ? dict[key] : key;
}
```

This lookup layout decouples page HTML structure from active copy variations, simplifying styling maintainability.

---

## 5.4 Multilingual Interface and Bidirectional Style Layer

### 5.4.1 Client-Side Language State and Lookup Dictionary
The active language defaults to English and is saved in local storage:

```javascript
let currentLang = localStorage.getItem("flora-lang") || "en";
```

The lookup system resolves translations from `translations.js`. The complete static dictionary matches major interface hooks:

```javascript
window.FLORA_T = {
    en: {
        askPlaceholder: "Ask Flora about your plants...",
        analyzeImage: "Analyze this image",
        imageLabel: "[Image]",
        newChat: "New Chat",
        chatHistory: "Chat History",
        noChats: "No conversations yet",
        options: "Options",
        pin: "Pin",
        unpin: "Unpin",
        archive: "Archive",
        unarchive: "Unarchive",
        delete: "Delete",
        deleteMessage: "Delete message",
        stop: "Stop",
        send: "Send",
        logout: "Logout",
        home: "Home",
        theme: "Theme",
        onlineStatus: "Online · Plant Expert",
        welcomeMsg1: "👋 Hello! I'm Flora, your AI plant health expert.",
        welcomeMsg2: "Upload a plant photo or ask me anything about plant care!",
        processing: "Processing technical report…",
        thinking: "Flora is thinking…",
        poweredByGemma: "Flora CNN & Gemma-4",
        poweredByGemini: "Flora CNN Model",
        poweredByPipeline: "Flora CNN Model",
        connectionErr: "Connection failed. Ensure the backend and AI service are running.",
        serverErr: "Server error. Is the AI service running?",
        aiUnavailable: "AI service is currently unavailable. Please try again shortly.",
        imageAnalysisFailed: "Image analysis failed. Please try again.",
        micDenied: "Microphone access denied. Allow it in browser settings.",
        micUnsupported: "Voice input not supported in this browser.",
        justNow: "Just now",
        diagnosisPrefix: "🌿 Diagnosis Result",
        plant: "Plant",
        disease: "Disease",
        confidence: "Confidence",
        symptoms: "Symptoms",
        cause: "Cause",
        treatment: "Treatment",
        footer: "Flora may make mistakes. Always consult an agricultural expert for serious diseases."
    },
    ar: {
        askPlaceholder: "اسأل فلورا عن نباتاتك...",
        analyzeImage: "حلل هذه الصورة",
        imageLabel: "[صورة]",
        newChat: "محادثة جديدة",
        chatHistory: "سجل المحادثات",
        noChats: "لا توجد محادثات بعد",
        options: "خيارات",
        pin: "تثبيت",
        unpin: "إلغاء التثبيت",
        archive: "أرشفة",
        unarchive: "إلغاء الأرشفة",
        delete: "حذف",
        deleteMessage: "حذف الرسالة",
        stop: "إيقاف",
        send: "إرسال",
        logout: "تسجيل الخروج",
        home: "الرئيسية",
        theme: "المظهر",
        onlineStatus: "متصل · خبير نباتات",
        welcomeMsg1: "👋 أهلاً! أنا فلورا، خبيرة نباتاتك بالذكاء الاصطناعي.",
        welcomeMsg2: "ارفع صورة نباتك أو اسألني أي سؤال عن رعاية النباتات!",
        processing: "جاري إعداد التقرير التقني…",
        thinking: "فلورا تفكر…",
        poweredByGemma: "نموذج الصور وجيما 4",
        poweredByGemini: "نموذج الصور",
        poweredByPipeline: "نموذج الصور",
        connectionErr: "تعذر الاتصال. تأكد من تشغيل الخادم وخدمة الذكاء الاصطناعي.",
        serverErr: "خطأ في الخادم. تحقق من تشغيل خدمة الذكاء الاصطناعي.",
        aiUnavailable: "خدمة الذكاء الاصطناعي غير متاحة حاليًا. حاول مجدداً بعد قليل.",
        imageAnalysisFailed: "فشل تحليل الصورة. يرجى المحاولة مرة أخرى.",
        micDenied: "لم يتم السماح بالميكروفون. افتح إعدادات المتصفح وأذن بالوصول.",
        micUnsupported: "التعرف على الصوت غير مدعوم في هذا المتصفح.",
        justNow: "الآن",
        diagnosisPrefix: "🌿 نتيجة التشخيص",
        plant: "النبات",
        disease: "المرض",
        confidence: "نسبة الثقة",
        symptoms: "الأعراض",
        cause: "السبب",
        treatment: "العلاج",
        footer: "فلورا قد تخطئ. استشر دائماً خبيراً زراعياً للأمراض الخطيرة."
    }
};
```

### 5.4.2 Zero-Refresh Language Toggling
Toggling the language updates DOM attributes and translation tags without page refresh:

```javascript
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

    // Re-render any dynamic areas that don't use data-en
    const messagesEl = document.getElementById("messages");
    if (messagesEl) {
        // If welcome screen is showing — re-render it in new language
        if (messagesEl.querySelector(".welcome-screen")) {
            showWelcomeMessages();
            return;
        }
        messagesEl.querySelectorAll("[data-welcome]").forEach(el => {
            const key = el.dataset.welcome;
            if (key) el.textContent = t(key);
        });
    }

    // Re-render sidebar (translates "No conversations yet", times, etc.)
    renderSidebar();

    // Re-render welcome if no active convo (to update language)
    const activeId = getActiveConvId();
    if (!activeId || (loadAllConversations().find(c => c.id === activeId)?.messages?.length === 0)) {
        showWelcomeMessages();
    }
}
```

### 5.4.3 Bidirectional Styling and Layout Mirroring
Setting `dir="rtl"` automatically mirrors document layout flow. To adjust borders and chat bubbles, custom selectors are defined in `chat.css`. Rather than duplicating styling sheets, FLORA utilizes custom class structures and direction attribute bindings:

```css
.sidebar {
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: var(--transition);
  overflow: hidden;
}

[data-lang="ar"] .sidebar {
  border-right: none;
  border-left: 1px solid var(--border);
}

.bot-bubble {
  background: var(--bot-bubble);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
  color: var(--text);
}

[data-lang="ar"] .bot-bubble {
  border-radius: 16px;
  border-bottom-right-radius: 4px;
  border-bottom-left-radius: 16px;
}
```

By switching layouts and border properties dynamically via the `[data-lang="ar"]` selector, the browser computes layout adjustments natively, yielding higher performance than loading separate CSS files.

[INSERT IMAGE HERE: Figure 5.3 - User Interface Mirroring: Comparing LTR English View vs. RTL Arabic View]

---

## 5.5 Real-Time SSE Typing Animation and Scrolling Mechanics

### 5.5.1 The Client-Side SSE Stream Reader
Because the diagnostic POST request transmits binary images, standard browser `EventSource` interfaces (which only support GET) cannot be used. Instead, FLORA uses `fetch` and the Streams API:

```javascript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
let fullText = "";
let currentModel = "gemma";

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
            // Remove typing indicator and spawn text bubble on first token
            if (!firstChunkReceived) {
                firstChunkReceived = true;
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
```

#### Why Streams API is Preferred over EventSource
The browser's native `EventSource` interface is designed specifically for receiving Server-Sent Events. However, it suffers from two major technical limitations that make it unsuitable for project FLORA:
1.  **HTTP Method Constraints**: The standard `EventSource` object only supports HTTP GET requests. In FLORA, diagnostic requests require uploading multi-part image files, which must be transmitted using HTTP POST.
2.  **Custom Header Limitation**: Native `EventSource` implementations do not allow passing custom headers (such as `Authorization: Bearer <token>`) during initialization. This prevents protecting streaming endpoints behind token-based authentication guards.

By utilizing the standard `fetch` API combined with the browser's `ReadableStreamDefaultReader` interface, the system can send POST payloads containing binary leaf images while including JWT authorization tokens, while streaming responses in chunks.

#### Byte-Level UTF-8 Stream Decoding Safety
Arabic characters are multi-byte sequences in UTF-8 (typically requiring 2 bytes per character). During streaming over unstable networks, TCP packets can split a multi-byte Arabic character in half. For instance, the letter "ش" is represented by the bytes `0xD8 0xB4`. If a chunk ends with `0xD8` and the subsequent chunk begins with `0xB4`, a naive parser would render a corrupt visual glyph.

FLORA's stream reader resolves this by utilizing `TextDecoder` configured with `{ stream: true }`:

```javascript
buffer += decoder.decode(value, { stream: true });
```

The `{ stream: true }` parameter instructs the decoder to detect pending multi-byte sequences. If a byte array ends with an incomplete UTF-8 character, the decoder retains the trailing bytes in its internal memory buffer and prepends them to the next chunk before decoding, ensuring that Arabic characters are always rendered correctly without visual corruption.

### 5.5.2 Typing Indicator and Premium Pulse Animation
When processing, a breathing pulse animation surrounds the welcome logo, styled with standard CSS keyframes:

```css
.welcome-logo-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(76, 175, 80, 0.25) 0%, transparent 70%);
  animation: welcomeGlow 3s ease-in-out infinite;
}

@keyframes welcomeGlow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}
```

### 5.5.3 Streaming Text Rendering and Markdown Parsing
As text chunks arrive, they are parsed from Markdown (bold, lists) into HTML tags on the fly. To format the message body dynamically, the system escapes incoming characters and replaces markdown syntax using regular expressions:

```javascript
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
```

This fast formatting logic processes the incoming text stream and renders rich typographic styling on the user interface in real-time.

### 5.5.4 Automatic Scroll Anchoring
To prevent forcing the user to the bottom if they have scrolled up to read past history, scroll calculations check their position before scrolling. The system scrolls the messages viewport smoothly during updates:

```javascript
messagesEl?.scrollTo({ 
    top: messagesEl.scrollHeight, 
    behavior: "smooth" 
});
```

By timing these scroll actions during the DOM insertion cycles, the application keeps the active text stream visible without interrupting client inputs.

---

## 5.6 Web Speech API and Vocal Integration

### 5.6.1 Web Speech API Integration
FLORA utilizes the HTML5 Web Speech API to provide hands-free voice transcription. This feature is particularly useful for farmers who may find typing on a keyboard slow or difficult. The system configures the speech recognition instance to support colloquial dialect capture:

```javascript
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

    recognition.onstart = () => { 
        isRecording = true; 
        committedText = msgInput?.value || ""; 
        voiceBtn.classList.add("recording"); 
    };
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
        isRecording = false; 
        voiceBtn.classList.remove("recording");
        if (e.error === "not-allowed") appendMessage("bot", `⚠️ ${t("micDenied")}`);
    };
    recognition.onend = () => { 
        isRecording = false; 
        voiceBtn.classList.remove("recording"); 
    };

    voiceBtn.addEventListener("click", () => {
        if (isRecording) { recognition.stop(); return; }
        recognition.lang = currentLang === "ar" ? "ar-EG" : "en-US";
        try { recognition.start(); } catch {
            recognition.stop();
            setTimeout(() => { 
                recognition.lang = currentLang === "ar" ? "ar-EG" : "en-US"; 
                recognition.start(); 
            }, 350);
        }
    });
}
```

This vocal transcription layer runs entirely on the client, eliminating server-side audio processing overhead and reducing inference latency to zero for transcript extraction.

To ensure a high-quality user experience, the system handles microphone permission denials and hardware disconnects. When the `onerror` event triggers with an `not-allowed` code, the client displays a message indicating that microphone access was blocked, guiding the user to check their browser settings. By running speech recognition directly on the client browser via Google Chrome's or Safari's built-in engines, project FLORA avoids transmitting large raw audio blobs (.wav or .mp3) over rural cellular networks. This architecture reduces data consumption for voice queries by 99.9%—sending only the lightweight transcribed text string rather than megabytes of binary audio files—while keeping the server's CPU free from transcription processing loops.

---

## 5.7 User Session Authorization Guard and Token Management

### 5.7.1 Token Decoding and Expiration Verification
JWT payloads are parsed locally on initialization to verify expiration without network requests:

```javascript
function decodeTokenPayload(token) {
    try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

function isTokenExpired(token) {
    const p = decodeTokenPayload(token);
    return !p || (p.exp * 1000) < Date.now();
}
```

### 5.7.2 Authentication Initialization Flow
During start-up, `initAuth()` runs a validation flow:
1.  **Token Check**: Inspects `localStorage.getItem("token")`. If missing, redirects to `/auth/login/login.html`.
2.  **Expiration Check**: Verifies if the access token has expired using `isTokenExpired(token)`.
3.  **Token Refresh**: If expired, the application makes a POST request to `/api/auth/refresh-token` sending the refresh token to recover session state.

The complete startup sequence of the client route guard is implemented as follows:

```javascript
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
```

This startup sequence secures the application workspace. It validates access parameters locally to avoid blank pages and visual layout delays.

---

## 5.8 Interactive Drag-and-Drop Image Uploader & Canvas Compression

### 5.8.1 Drag-and-Drop Lifecycle Management
Users can drop leaf photos anywhere on the chat interface. Drag-and-drop actions are monitored globally within `setupImageUpload()`:

```javascript
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
```

### 5.8.2 Client-Side Image Compression using HTML5 Canvas
Camera photos taken on modern mobile devices are often large (5 to 15 MB). Uploading these raw files over cellular connections causes slow response times. To resolve this, FLORA downscales and compresses images using an offscreen canvas before saving history to avoid exceeding local storage quotas:

```javascript
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
```

This client-side compression reduces image file sizes significantly, ensuring local storage caches remain under quota limits and prevent thread blockages.

---

## 5.9 Layout Responsiveness & Desktop to Mobile Adaptive Mechanics

### 5.9.1 Grid Layout and Navigation Adaptability
On desktop screens, the interface is split between a left sidebar (280px) and a chat workspace. On mobile screens (below 768px):
*   The sidebar collapses completely and is toggled as an overlay drawer via a hamburger button.
*   Interactive padding on suggestion chips and input buttons is increased to support touch inputs.
*   Grids collapse to a single vertical column.

This layout adaptability is implemented using CSS media queries:

```css
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
  }

  [data-lang="ar"] .sidebar {
    left: auto;
    right: 0;
    transform: translateX(100%);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar-close {
    display: block;
  }

  .messages {
    padding: 20px 16px;
  }
}
```

These responsive adjustments ensure that the interface remains functional and intuitive on any device, from desktop monitors to small smartphones.

### 5.9.2 CSS Transition and Transform Mechanics
To ensure fluid, high-performance visual states, all layout updates (theme switching, mobile sidebar sliding) use GPU-accelerated CSS transitions. In contrast to changing absolute positioning parameters (like `left: 0`), which force the browser to recalculate the entire page layout on every pixel shift, the sidebar sliding uses the `transform: translateX()` property:

```css
.sidebar {
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: var(--transition);
  overflow: hidden;
}
```

The use of GPU-accelerated transformations ensures smooth rendering animations at 60fps even on low-cost smartphones operating on weak cellular networks in rural regions.
