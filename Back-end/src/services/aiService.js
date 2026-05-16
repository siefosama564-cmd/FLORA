/**
 * FLORA — Hybrid AI Service (3-Layer Pipeline)
 * FIXES v3:
 *   ✅ Gemini endpoint: /v1beta/ → /v1/ (fixes 404 errors)
 *   ✅ Model order: gemini-1.5-flash first (most stable free tier)
 *   ✅ Timeout: reads AI_TIMEOUT from .env (90s default)
 *   ✅ Fallback never shows empty fields
 */

import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMMA_BASE_URL = process.env.GEMMA_BASE_URL || "http://localhost:1234/v1";
const GEMMA_MODEL    = process.env.GEMMA_MODEL    || "gemma-3-4b-it";
const GEMMA_TIMEOUT  = parseInt(process.env.AI_TIMEOUT) || 90_000;

function _sseEvent(res, payload) {
    if (res && !res.writableEnded) {
        try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch (_) {}
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — CNN Placeholder (swap-ready)
// ══════════════════════════════════════════════════════════════════════════════
export async function predictPlantDisease(imageBuffer) {
    return { label: "Tomato_Late_Blight", confidence: 0.98 };
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — Gemini Vision
// ══════════════════════════════════════════════════════════════════════════════
export async function analyzeWithGemini(imageBuffer, mimeType) {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set in .env.dev");

    const safeMime = (mimeType === "image/jpg") ? "image/jpeg" : mimeType;

    // ✅ /v1/ أولاً — أكثر استقراراً وأقل 404
    const ENDPOINTS = [
        { url: "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",        label: "gemini-1.5-flash (v1)"       },
        { url: "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",        label: "gemini-2.0-flash (v1)"       },
        { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent", label: "gemini-2.0-flash-exp (v1beta)" },
        { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",       label: "gemini-1.5-pro (v1beta)"      },
    ];

    const prompt = `You are an expert Plant Pathologist and Botanist.

Analyze the plant image carefully and return a JSON diagnosis.

Rules:
- Look at the actual image — identify the real plant and any real disease
- Do NOT assume — base everything ONLY on what you visually observe
- If the plant looks healthy, set final_disease to "Healthy"

Return ONLY this JSON (no markdown, no extra text):
{
  "final_plant": "common name of the plant you see in the image",
  "final_disease": "exact disease name you observe, or Healthy",
  "confidence": 85,
  "symptoms": "describe visible symptoms in 2 sentences",
  "cause": "fungal / bacterial / viral / pest / environmental / none",
  "treatment": "Step 1: ... Step 2: ... Step 3: ...",
  "explanation": "one sentence scientific explanation"
}`;

    let lastError = null;

    for (const { url, label } of ENDPOINTS) {
        const endpoint    = `${url}?key=${GEMINI_API_KEY}`;
        const requestBody = {
            contents: [{
                parts: [
                    { inline_data: { mime_type: safeMime, data: imageBuffer.toString("base64") } },
                    { text: prompt }
                ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 700 }
        };

        try {
            console.log(`[Gemini] Trying: ${label}`);
            const response = await axios.post(endpoint, requestBody, {
                headers: { "Content-Type": "application/json" },
                timeout: 30_000
            });

            const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            console.log(`[Gemini] ✅ ${label} responded. Preview:`, rawText.slice(0, 150));

            if (!rawText) { console.warn(`[Gemini] ${label} empty — trying next`); continue; }

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const clean     = jsonMatch ? jsonMatch[0] : rawText.replace(/```json|```/gi, "").trim();

            let parsed;
            try { parsed = JSON.parse(clean); }
            catch { console.warn(`[Gemini] ${label} JSON parse failed`); parsed = _extractGeminiFields(clean); }

            if (!parsed.final_plant || parsed.final_plant.trim() === "") {
                console.warn(`[Gemini] ${label} empty plant name — trying next`); continue;
            }

            return {
                final_plant:    String(parsed.final_plant   || "Unknown Plant"),
                final_disease:  String(parsed.final_disease || "Unknown"),
                is_cnn_correct: true,
                confidence:     typeof parsed.confidence === "number" ? parsed.confidence : 80,
                symptoms:       String(parsed.symptoms    || ""),
                cause:          String(parsed.cause       || ""),
                treatment:      String(parsed.treatment   || ""),
                explanation:    String(parsed.explanation || "")
            };

        } catch (err) {
            const status = err.response?.status;
            const msg    = err.response?.data?.error?.message || err.message;
            console.warn(`[Gemini] ❌ ${label} failed (HTTP ${status ?? "timeout"}): ${msg?.slice(0, 120)}`);
            lastError = err;
        }
    }

    throw new Error(`All Gemini endpoints failed. Last: ${lastError?.message}`);
}

function _extractGeminiFields(text) {
    const get = (pattern, fallback) => { const m = text.match(pattern); return m ? m[1].trim() : fallback; };
    return {
        final_plant:   get(/"final_plant"\s*:\s*"([^"]+)"/, ""),
        final_disease: get(/"final_disease"\s*:\s*"([^"]+)"/, "Unknown"),
        is_cnn_correct: true,
        confidence:    parseFloat(get(/"confidence"\s*:\s*(\d+\.?\d*)/, "75")),
        symptoms:      get(/"symptoms"\s*:\s*"([^"]+)"/, ""),
        cause:         get(/"cause"\s*:\s*"([^"]+)"/, ""),
        treatment:     get(/"treatment"\s*:\s*"([^"]+)"/, ""),
        explanation:   get(/"explanation"\s*:\s*"([^"]+)"/, "")
    };
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — Gemma-4 via LM Studio
// ══════════════════════════════════════════════════════════════════════════════
export async function refineWithGemma(geminiResult, userQuestion = "", lang = "ar") {
    const isArabic  = lang === "ar";
    const isHealthy = geminiResult.final_disease.toLowerCase().includes("healthy");
    const pct       = Number(geminiResult.confidence).toFixed(0);

    const systemRole = isArabic
        ? `أنت "فلورا" — مساعد زراعي متخصص وذكي.
قواعد: اكتب بالعربية المصرية الواضحة، ودودة ومهنية. ممنوع الفصحى أو الإنجليزي أو الخلط.
ممنوع "يا حبيبي". كلامك مباشر زي خبير زراعي. ردودك: تشخيص، أسباب، خطوات علاج.`
        : `You are "Flora" — a professional agricultural AI assistant.
Rules: English only, professional but approachable. Sound like a certified agronomist.
Direct and practical: diagnosis → cause → treatment steps.`;

    const dataBlock = isArabic
        ? `نتيجة تحليل صورة النبات:
النبات: ${geminiResult.final_plant}
الحالة: ${isHealthy ? "سليم ✅" : `مريض — ${geminiResult.final_disease}`}
نسبة الثقة: ${pct}%
${!isHealthy ? `الأعراض: ${geminiResult.symptoms}\nالسبب: ${geminiResult.cause}\nالعلاج: ${geminiResult.treatment}` : ""}
${userQuestion ? `سؤال المستخدم: ${userQuestion}` : ""}
اشرح النتيجة بوضوح. ${!isHealthy ? "وضّح المرض وسببه و3 خطوات علاج عملية." : "اطمّن المستخدم وقدم نصيحتين عمليتين."}`
        : `Plant Analysis Result:
Plant: ${geminiResult.final_plant} | Status: ${isHealthy ? "Healthy ✅" : `Diseased — ${geminiResult.final_disease}`} | Confidence: ${pct}%
${!isHealthy ? `Symptoms: ${geminiResult.symptoms}\nCause: ${geminiResult.cause}\nTreatment: ${geminiResult.treatment}` : ""}
${userQuestion ? `User question: ${userQuestion}` : ""}
Explain clearly. ${!isHealthy ? "Cover the disease, why it happens, and 3 practical treatment steps." : "Reassure and give 2 care tips."}`;

    const response = await axios.post(
        `${GEMMA_BASE_URL}/chat/completions`,
        {
            model:    GEMMA_MODEL,
            messages: [
                { role: "system", content: systemRole },
                { role: "user",   content: dataBlock  }
            ],
            temperature: 0.55,
            max_tokens:  550,
            stream:      false
        },
        {
            headers: { "Content-Type": "application/json" },
            timeout: GEMMA_TIMEOUT   // ✅ 90s من .env
        }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Gemma returned empty response");
    return reply;
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ══════════════════════════════════════════════════════════════════════════════
export async function processPlantAnalysis({ imageBuffer, mimeType, userQuestion = "", lang = "ar", res = null }) {

    const _debug = { layers_failed: [], gemma_used: false };

    // Layer 1 — CNN
    let cnnResult;
    try {
        cnnResult = await predictPlantDisease(imageBuffer);
        console.log("[AI Pipeline] ✅ Layer 1 (CNN):", cnnResult);
    } catch (err) {
        console.error("[AI Pipeline] ❌ Layer 1 (CNN):", err.message);
        _debug.layers_failed.push("cnn");
        cnnResult = { label: "Unknown_Unknown", confidence: 0 };
    }

    // Layer 2 — Gemini
    let geminiResult;
    try {
        geminiResult = await analyzeWithGemini(imageBuffer, mimeType);
        console.log("[AI Pipeline] ✅ Layer 2 (Gemini):", { plant: geminiResult.final_plant, disease: geminiResult.final_disease, confidence: geminiResult.confidence });
    } catch (err) {
        console.warn("[AI Pipeline] ⚠️ Layer 2 (Gemini) failed:", err.message);
        _debug.layers_failed.push("gemini");
        geminiResult = {
            final_plant: "Unknown", final_disease: "Unknown", is_cnn_correct: false,
            confidence: 0, symptoms: "", cause: "", treatment: "",
            explanation: "Image analysis failed. Please check your Gemini API key and try again."
        };
    }

    // Emit diagnosis_meta → frontend يحفظه لـ follow-up questions
    _sseEvent(res, {
        type: "diagnosis_meta",
        plant: geminiResult.final_plant, disease: geminiResult.final_disease,
        confidence: geminiResult.confidence, symptoms: geminiResult.symptoms,
        cause: geminiResult.cause, treatment: geminiResult.treatment,
        isHealthy: geminiResult.final_disease.toLowerCase().includes("healthy")
    });

    // Layer 3 — Gemma
    let finalExplanation;
    let modelUsed = "pipeline";

    try {
        finalExplanation  = await refineWithGemma(geminiResult, userQuestion, lang);
        _debug.gemma_used = true;
        modelUsed         = "gemma";
        console.log("[AI Pipeline] ✅ Layer 3 (Gemma): done");
    } catch (err) {
        console.warn("[AI Pipeline] ⚠️ Layer 3 (Gemma) failed:", err.message);
        _debug.layers_failed.push("gemma");
        modelUsed = "gemini";

        const healthy = geminiResult.final_disease.toLowerCase().includes("healthy");
        const _s = geminiResult.symptoms?.trim();
        const _c = geminiResult.cause?.trim();
        const _t = geminiResult.treatment?.trim();
        const _e = geminiResult.explanation?.trim();

        if (lang === "ar") {
            if (healthy) {
                finalExplanation = `✅ نباتك بخير! ${geminiResult.final_plant} يبدو في حالة ممتازة.` + (_e ? `\n\n${_e}` : "");
            } else {
                let txt = `⚠️ تم اكتشاف **${geminiResult.final_disease}** في نبات **${geminiResult.final_plant}** (نسبة الثقة: ${Number(geminiResult.confidence).toFixed(0)}%).`;
                if (_s) txt += `\n\n**الأعراض:** ${_s}`;
                if (_c) txt += `\n**السبب:** ${_c}`;
                if (_t) txt += `\n**العلاج:** ${_t}`;
                if (!_s && !_c && !_t && _e) txt += `\n\n${_e}`;
                finalExplanation = txt;
            }
        } else {
            if (healthy) {
                finalExplanation = `✅ Your ${geminiResult.final_plant} looks healthy!` + (_e ? `\n\n${_e}` : "");
            } else {
                let txt = `⚠️ Detected **${geminiResult.final_disease}** in your **${geminiResult.final_plant}** (${Number(geminiResult.confidence).toFixed(0)}% confidence).`;
                if (_s) txt += `\n\n**Symptoms:** ${_s}`;
                if (_c) txt += `\n**Cause:** ${_c}`;
                if (_t) txt += `\n**Treatment:** ${_t}`;
                if (!_s && !_c && !_t && _e) txt += `\n\n${_e}`;
                finalExplanation = txt;
            }
        }
    }

    _sseEvent(res, { type: "model_info", model: modelUsed });

    return {
        plant: geminiResult.final_plant, disease: geminiResult.final_disease,
        isHealthy: geminiResult.final_disease.toLowerCase().includes("healthy"),
        confidence: geminiResult.confidence, symptoms: geminiResult.symptoms,
        cause: geminiResult.cause, treatment: geminiResult.treatment,
        explanation: finalExplanation, _debug
    };
}
