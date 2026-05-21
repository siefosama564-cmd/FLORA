// ══════════════════════════════════════════════════════════
// FLORA — login.js  (Session Persistence + Google Mock)
// ══════════════════════════════════════════════════════════

const API_BASE = "http://127.0.0.1:3000/api/v1";

// ── JWT expiry check (no library needed) ─────────────────────────
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return (payload.exp * 1000) < Date.now();
    } catch { return true; }
}

// ════════════════════════════════════════════════════════════════
// AUTO-REDIRECT if already logged in with a valid token
// ════════════════════════════════════════════════════════════════
(function checkExistingSession() {
    const token = localStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
        window.location.replace('../../chat.html');
    }
})();

// ════════════════════════════════════════════════════════════════
// 1. THEME
// ════════════════════════════════════════════════════════════════
const html = document.documentElement;
const saved = localStorage.getItem('flora-theme') || 'dark';
html.setAttribute('data-theme', saved);

document.getElementById('themeToggle')?.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('flora-theme', next);
});

// ════════════════════════════════════════════════════════════════
// 2. LANGUAGE
// ════════════════════════════════════════════════════════════════
let lang = localStorage.getItem('flora-lang') || 'en';
applyLang(lang);

document.getElementById('langToggle')?.addEventListener('click', () => {
    lang = lang === 'en' ? 'ar' : 'en';
    applyLang(lang);
    localStorage.setItem('flora-lang', lang);
});

function applyLang(l) {
    html.setAttribute('data-lang', l);
    html.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    const label = document.getElementById('langLabel');
    if (label) label.textContent = l === 'ar' ? 'EN' : 'AR';
    document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = l === 'ar' ? (el.dataset.ar || el.dataset.en) : el.dataset.en;
    });
}

// ════════════════════════════════════════════════════════════════
// 3. PASSWORD EYE TOGGLE
// ════════════════════════════════════════════════════════════════
document.getElementById('eyeBtn')?.addEventListener('click', () => {
    const p = document.getElementById('passInput');
    if (p) p.type = p.type === 'password' ? 'text' : 'password';
});

// ════════════════════════════════════════════════════════════════
// 3b. REMEMBER ME — restore saved credentials on page load
// ════════════════════════════════════════════════════════════════
(function restoreRemembered() {
    const savedEmail = localStorage.getItem('flora-remember-email');
    const savedPass  = localStorage.getItem('flora-remember-pass');
    const rememberCb = document.querySelector('#loginForm .check-label input[type="checkbox"]');
    if (savedEmail && savedPass && rememberCb) {
        document.getElementById('emailInput').value = savedEmail;
        document.getElementById('passInput').value  = savedPass;
        rememberCb.checked = true;
    }
})();

// ════════════════════════════════════════════════════════════════
// 4. INLINE FEEDBACK HELPERS  (no alert() anywhere)
// ════════════════════════════════════════════════════════════════
function showFormError(msg) { setFormMsg(msg, false); }
function showFormSuccess(msg) { setFormMsg(msg, true); }

function setFormMsg(msg, isSuccess) {
    let el = document.getElementById('loginMsg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'loginMsg';
        el.style.cssText = `
            padding: 11px 14px; border-radius: 10px; font-size: 0.88rem;
            margin-bottom: 14px; font-weight: 500; text-align: center;
            transition: opacity 0.3s;
        `;
        const form = document.getElementById('loginForm');
        form?.insertBefore(el, form.firstChild);
    }
    el.style.background = isSuccess ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)';
    el.style.border      = isSuccess ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(244,67,54,0.3)';
    el.style.color       = isSuccess ? '#a5d6a7' : '#ef9a9a';
    el.textContent = msg;
    el.style.display = 'block';
}

function setSubmitLoading(loading) {
    const btn = document.querySelector('#loginForm .submit-btn');
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.65' : '1';
    const span = btn.querySelector('span[data-en]');
    if (span) span.textContent = loading
        ? (lang === 'ar' ? 'جاري الدخول...' : 'Signing in...')
        : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In');
}

// ════════════════════════════════════════════════════════════════
// 5. LOGIN FORM
// ════════════════════════════════════════════════════════════════
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('emailInput')?.value?.trim();
    const password = document.getElementById('passInput')?.value;

    if (!email || !password) {
        showFormError(lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill in all fields');
        return;
    }

    setSubmitLoading(true);

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            const accessToken  = result.data?.accessToken;
            const refreshToken = result.data?.refreshToken;
            const userName     = result.data?.userName;

            if (!accessToken) {
                showFormError(lang === 'ar' ? 'لم يُرسَل التوكن من السيرفر' : 'Server did not return a token');
                return;
            }

            // ✅ Store both tokens + user info for session persistence
            localStorage.setItem('token',        accessToken);
            localStorage.setItem('refreshToken', refreshToken || '');
            localStorage.setItem('userName',     userName     || 'User');

            // ✅ Remember Me — save or clear credentials
            const rememberCb = document.querySelector('#loginForm .check-label input[type="checkbox"]');
            if (rememberCb && rememberCb.checked) {
                localStorage.setItem('flora-remember-email', email);
                localStorage.setItem('flora-remember-pass',  password);
            } else {
                localStorage.removeItem('flora-remember-email');
                localStorage.removeItem('flora-remember-pass');
            }

            showFormSuccess(lang === 'ar'
                ? `✅ أهلاً ${userName || ''}! جاري التحويل...`
                : `✅ Welcome ${userName || ''}! Redirecting...`);

            setTimeout(() => window.location.href = '../../chat.html', 700);

        } else {
            const msg = result.message || '';
            const friendly = lang === 'ar'
                ? (msg.includes('not found') ? 'البريد الإلكتروني غير مسجل'
                    : msg.includes('wrong') ? 'كلمة المرور خاطئة'
                    : msg.includes('confirm') ? 'يرجى تأكيد بريدك الإلكتروني أولاً'
                    : msg || 'بيانات غير صحيحة')
                : (msg.includes('not found') ? 'Email not registered'
                    : msg.includes('wrong') ? 'Wrong password'
                    : msg.includes('confirm') ? 'Please confirm your email first'
                    : msg || 'Invalid credentials');
            showFormError(friendly);
        }

    } catch {
        showFormError(lang === 'ar'
            ? 'فشل الاتصال بالسيرفر. تأكد من تشغيل الباك إند على بورت 3000.'
            : 'Cannot connect to server. Make sure the backend is running on port 3000.');
    } finally {
        setSubmitLoading(false);
    }
});

// ════════════════════════════════════════════════════════════════
// 6. GOOGLE LOGIN — mock (clearly explained)
// ════════════════════════════════════════════════════════════════
// Google OAuth requires a registered OAuth app with Google Cloud Console,
// a backend callback route, and client credentials — not included in this
// project yet. The button shows a clear notice instead of doing nothing.
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        showFormError(
            lang === 'ar'
                ? '🔧 تسجيل الدخول عبر Google يحتاج إعداد OAuth على السيرفر. استخدم البريد الإلكتروني في الوقت الحالي.'
                : '🔧 Google login requires OAuth server setup. Please use email login for now.'
        );
    });
});
