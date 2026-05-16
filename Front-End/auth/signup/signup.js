const html = document.documentElement;

// --- 1. Theme Logic ---
const savedTheme = localStorage.getItem('flora-theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle')?.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('flora-theme', next);
});

// --- 2. Language Logic ---
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
  document.getElementById('langLabel').textContent = l === 'ar' ? 'EN' : 'AR';

  // ✅ بنفصل بين الـ labels والـ inputs عشان منبدلش الـ placeholder بالغلط
  document.querySelectorAll('[data-en]').forEach(el => {
    // لو الـ element هو input أو placeholder - متلمسوش
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
    el.textContent = l === 'ar' ? (el.dataset.ar || el.dataset.en) : el.dataset.en;
  });
}

// --- 3. Show/Hide Password ---
document.getElementById('eyeBtn')?.addEventListener('click', function () {
  const p = document.getElementById('passInput');
  p.type = p.type === 'password' ? 'text' : 'password';
});

// --- 4. Password Strength Checker ---
window.checkStrength = function (val) {
  const segs = ['s1', 's2', 's3', 's4'].map(id => document.getElementById(id));
  segs.forEach(s => { s.className = 'strength-seg'; });
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const cls = score <= 1 ? 'weak' : score <= 2 ? 'medium' : 'strong';
  for (let i = 0; i < score; i++) segs[i].classList.add(cls);
};

// --- 5. Toast Notification System ---
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  // ✅ Styling inline عشان يشتغل من غير ما يحتاج CSS إضافي
  const bg = type === "success" ? "#1D9E75" : "#E24B4A";
  toast.style.cssText = `
    background: ${bg};
    color: #fff;
    padding: 12px 18px;
    border-radius: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 240px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transition: opacity 0.4s;
  `;

  const icon = type === "success" ? "✅" : "❌";
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// --- 6. Google Button (Fix #4: Recommended option) ---
document.getElementById('googleSignupBtn')?.addEventListener('click', () => {
  showToast(
    lang === 'ar'
      ? '🔧 تسجيل الدخول عبر Google يحتاج إعداد OAuth على السيرفر. استخدم البريد الإلكتروني في الوقت الحالي.'
      : '🔧 Google signup requires OAuth server setup. Please use email for now.',
    'error'
  );
});

// --- 7. Form Submit & API Connection ---
const signUpForm = document.getElementById("signUpForm");
signUpForm.onsubmit = async (e) => {
  e.preventDefault();

  const password = document.getElementById("passInput").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // ✅ Client-side password match check قبل ما نبعت للسيرفر
  if (password !== confirmPassword) {
    showToast(
      lang === 'ar' ? "كلمتا المرور غير متطابقتين!" : "Passwords do not match!",
      "error"
    );
    return;
  }

  const formData = {
    firstname: document.getElementById("firstname").value.trim(),
    lastname: document.getElementById("lastname").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    password,
    confirmPassword,
  };

  // ✅ Disable button أثناء الـ request عشان نمنع double submit
  const submitBtn = signUpForm.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.style.opacity = "0.7";

  try {
    const response = await fetch("http://localhost:3000/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok) {
      // ✅ بنحفظ الـ email عشان نستخدمه في صفحة الـ confirm email
      localStorage.setItem("userEmailForVerification", formData.email);

      showToast(
        lang === 'ar' ? "تم إنشاء الحساب بنجاح! تحقق من بريدك" : result.message || "Account created! Check your email.",
        "success"
      );

      // ✅ صحّحنا اسم الملف (كان فيه نقطتين confirm.email..html)
      setTimeout(() => {
        window.location.href = "../confirm-email/confirm-email.html";
      }, 2000);

    } else {
      showToast(
        lang === 'ar'
          ? (result.message === "user already exists" ? "البريد الإلكتروني مسجل بالفعل!" : result.message)
          : result.message || "Signup failed. Please try again.",
        "error"
      );
    }

  } catch (err) {
    showToast(
      lang === 'ar' ? "خطأ في الاتصال بالسيرفر!" : "Connection error. Is the server running?",
      "error"
    );
  } finally {
    // ✅ نرجّع الـ button زي ما كان
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
  }
};