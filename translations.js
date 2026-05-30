/* ═══════════════════════════════════════════════════════════════
   FLORA — translations.js
   Central translation dictionary for EN / AR.
   Used by chat.js via the t() helper.
   Place in: Front-End/translations.js
   Include BEFORE chat.js in chat.html:
     <script src="translations.js"></script>
   ═══════════════════════════════════════════════════════════════ */

window.FLORA_T = {
    en: {
        /* ── Input ── */
        askPlaceholder: "Ask Flora about your plants...",
        analyzeImage: "Analyze this image",
        imageLabel: "[Image]",

        /* ── Sidebar ── */
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

        /* ── Buttons / Controls ── */
        stop: "Stop",
        send: "Send",
        logout: "Logout",
        home: "Home",
        theme: "Theme",

        /* ── Status ── */
        onlineStatus: "Online · Plant Expert",

        /* ── Welcome ── */
        welcomeMsg1: "👋 Hello! I'm Flora, your AI plant health expert.",
        welcomeMsg2: "Upload a plant photo or ask me anything about plant care!",

        /* ── Loading / Processing ── */
        processing: "Processing technical report…",
        thinking: "Flora is thinking…",
        poweredByGemma: "Flora CNN & Gemma-4",
        poweredByGemini: "Flora CNN Model",
        poweredByPipeline: "Flora CNN Model",

        /* ── Errors ── */
        connectionErr: "Connection failed. Ensure the backend and AI service are running.",
        serverErr: "Server error. Is the AI service running?",
        aiUnavailable: "AI service is currently unavailable. Please try again shortly.",
        imageAnalysisFailed: "Image analysis failed. Please try again.",
        micDenied: "Microphone access denied. Allow it in browser settings.",
        micUnsupported: "Voice input not supported in this browser.",

        /* ── Time labels ── */
        justNow: "Just now",

        /* ── Diagnosis context ── */
        diagnosisPrefix: "🌿 Diagnosis Result",
        plant: "Plant",
        disease: "Disease",
        confidence: "Confidence",
        symptoms: "Symptoms",
        cause: "Cause",
        treatment: "Treatment",

        /* ── Footer ── */
        footer: "Flora may make mistakes. Always consult an agricultural expert for serious diseases."
    },

    ar: {
        /* ── Input ── */
        askPlaceholder: "اسأل فلورا عن نباتاتك...",
        analyzeImage: "حلل هذه الصورة",
        imageLabel: "[صورة]",

        /* ── Sidebar ── */
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

        /* ── Buttons / Controls ── */
        stop: "إيقاف",
        send: "إرسال",
        logout: "تسجيل الخروج",
        home: "الرئيسية",
        theme: "المظهر",

        /* ── Status ── */
        onlineStatus: "متصل · خبير نباتات",

        /* ── Welcome ── */
        welcomeMsg1: "👋 أهلاً! أنا فلورا، خبيرة نباتاتك بالذكاء الاصطناعي.",
        welcomeMsg2: "ارفع صورة نباتك أو اسألني أي سؤال عن رعاية النباتات!",

        /* ── Loading / Processing ── */
        processing: "جاري إعداد التقرير التقني…",
        thinking: "فلورا تفكر…",
        poweredByGemma: "نموذج الصور وجيما 4",
        poweredByGemini: "نموذج الصور",
        poweredByPipeline: "نموذج الصور",

        /* ── Errors ── */
        connectionErr: "تعذر الاتصال. تأكد من تشغيل الخادم وخدمة الذكاء الاصطناعي.",
        serverErr: "خطأ في الخادم. تحقق من تشغيل خدمة الذكاء الاصطناعي.",
        aiUnavailable: "خدمة الذكاء الاصطناعي غير متاحة حاليًا. حاول مجدداً بعد قليل.",
        imageAnalysisFailed: "فشل تحليل الصورة. يرجى المحاولة مرة أخرى.",
        micDenied: "لم يتم السماح بالميكروفون. افتح إعدادات المتصفح وأذن بالوصول.",
        micUnsupported: "التعرف على الصوت غير مدعوم في هذا المتصفح.",

        /* ── Time labels ── */
        justNow: "الآن",

        /* ── Diagnosis context ── */
        diagnosisPrefix: "🌿 نتيجة التشخيص",
        plant: "النبات",
        disease: "المرض",
        confidence: "نسبة الثقة",
        symptoms: "الأعراض",
        cause: "السبب",
        treatment: "العلاج",

        /* ── Footer ── */
        footer: "فلورا قد تخطئ. استشر دائماً خبيراً زراعياً للأمراض الخطيرة."
    }
};
