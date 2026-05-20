/* ═══════════════════════════════════════
   FLORA — Main JavaScript
   ═══════════════════════════════════════ */

// ── Theme Toggle ──
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('flora-theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle?.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('flora-theme', next);
});

// ── Language Toggle ──
const langToggle = document.getElementById('langToggle');
const langLabel = document.getElementById('langLabel');
let currentLang = localStorage.getItem('flora-lang') || 'en';
applyLang(currentLang);

langToggle?.addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  applyLang(currentLang);
  localStorage.setItem('flora-lang', currentLang);
});

function applyLang(lang) {
  html.setAttribute('data-lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  if (langLabel) langLabel.textContent = lang === 'en' ? 'AR' : 'EN';

  document.querySelectorAll('[data-en]').forEach(el => {
    // Skip inputs, textareas, selects — they have values, not text content
    if (['INPUT','TEXTAREA','SELECT'].includes(el.tagName)) return;
    // Skip elements that contain child elements (buttons with SVG, etc.)
    // Only update if the element's direct text is the translatable content
    const hasChildElements = Array.from(el.children).some(ch =>
      !['BR','SPAN','STRONG','EM','B','I','MARK'].includes(ch.tagName)
    );
    if (hasChildElements) return;
    const translated = lang === 'ar' ? (el.dataset.ar || el.dataset.en) : el.dataset.en;
    if (translated !== undefined) el.textContent = translated;
  });

  // Sync placeholder text on inputs that have data-en-placeholder
  document.querySelectorAll('[data-en-placeholder]').forEach(el => {
    el.placeholder = lang === 'ar'
      ? (el.dataset.arPlaceholder || el.dataset.enPlaceholder)
      : el.dataset.enPlaceholder;
  });

  // Re-apply auth state text after language switch
  updateAuthUI();
}

// ── Features Dropdown ──
const featuresBtn = document.getElementById('featuresBtn');
const featuresDropdown = document.getElementById('featuresDropdown');

featuresBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  featuresDropdown?.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!featuresDropdown?.contains(e.target) && e.target !== featuresBtn) {
    featuresDropdown?.classList.remove('open');
  }
});

// ── Navbar scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar?.classList.add('scrolled');
  } else {
    navbar?.classList.remove('scrolled');
  }
});

// ── Hamburger ──
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');
hamburger?.addEventListener('click', () => {
  navLinks?.classList.toggle('mobile-open');
});

// ── Particles ──
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 8 + 's';
    p.style.animationDuration = (6 + Math.random() * 10) + 's';
    p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
    container.appendChild(p);
  }
}
createParticles();

// ── Intersection Observer for scroll animations ──
const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.feat-card, .step, .step-new, .disease-card, .feat-extra-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// ── Mobile nav links styling ──
const style = document.createElement('style');
style.textContent = `
  @media (max-width: 900px) {
    .nav-links.mobile-open {
      display: flex !important;
      position: fixed;
      top: 72px; left: 0; right: 0;
      background: var(--surface);
      flex-direction: column;
      padding: 24px;
      gap: 20px;
      border-bottom: 1px solid var(--border);
      z-index: 999;
    }
    .nav-links.mobile-open a { font-size: 1rem; color: var(--text); }
  }
`;
document.head.appendChild(style);

// ════════════════════════════════════════════════════════════════
// AUTH-AWARE UI — Fix #1 & #2: Logout + button state when logged in
// ════════════════════════════════════════════════════════════════
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp * 1000) < Date.now();
  } catch { return true; }
}

function isLoggedIn() {
  const token = localStorage.getItem('token');
  return token && !isTokenExpired(token);
}

function doLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userName');
  window.location.href = 'auth/login/login.html';
}

function updateAuthUI() {
  const loggedIn = isLoggedIn();
  const lang = localStorage.getItem('flora-lang') || 'en';

  // Nav "Get Started" → "Open Chat" or keep as is
  const navGetStarted = document.getElementById('navGetStarted');
  if (navGetStarted) {
    if (loggedIn) {
      navGetStarted.textContent = lang === 'ar' ? 'فتح المحادثة' : 'Open Chat';
      navGetStarted.href = 'chat.html';
    } else {
      navGetStarted.textContent = lang === 'ar' ? 'ابدأ الآن' : 'Get Started';
      navGetStarted.href = 'auth/login/login.html';
    }
  }

  // Hero CTA "Start Diagnosing"
  const heroPrimary = document.querySelector('.hero-ctas .btn-primary');
  if (heroPrimary) {
    if (loggedIn) {
      heroPrimary.href = 'chat.html';
    } else {
      heroPrimary.href = 'auth/login/login.html';
    }
  }

  // CTA Section: "Create Free Account" → "Go to Chat" | "Sign In" → "Logout"
  const ctaPrimary = document.getElementById('ctaPrimary');
  const ctaSecondary = document.getElementById('ctaSecondary');
  if (ctaPrimary && ctaSecondary) {
    if (loggedIn) {
      const userName = localStorage.getItem('userName') || '';
      ctaPrimary.textContent = lang === 'ar' ? 'فتح المحادثة' : 'Open Chat';
      ctaPrimary.href = 'chat.html';
      ctaSecondary.textContent = lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out';
      ctaSecondary.href = '#';
      ctaSecondary.onclick = (e) => { e.preventDefault(); doLogout(); };
    } else {
      ctaPrimary.textContent = lang === 'ar' ? 'أنشئ حساباً مجانياً' : 'Create Free Account';
      ctaPrimary.href = 'auth/signup/signup.html';
      ctaSecondary.textContent = lang === 'ar' ? 'تسجيل الدخول' : 'Sign In';
      ctaSecondary.href = 'auth/login/login.html';
      ctaSecondary.onclick = null;
    }
  }
}

// Run on load
updateAuthUI();

