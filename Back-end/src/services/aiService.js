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
// LAYER 1 — CNN Model Client
// ══════════════════════════════════════════════════════════════════════════════
export async function predictPlantDisease(imageBuffer) {
    console.log("[CNN Client] Preparing FormData...");
    const formData = new FormData();
    formData.append("image", new Blob([imageBuffer]), "plant.jpg");

    // Use 127.0.0.1 to avoid Node.js 18+ IPv6 vs IPv4 localhost resolution conflicts
    const url = process.env.AI_ENGINE_URL || "http://127.0.0.1:5000/predict";
    console.log(`[CNN Client] Sending image to ${url}...`);
    
    try {
        const response = await axios.post(url, formData, {
            timeout: 25_000
            // Note: Content-Type is intentionally omitted so Axios automatically sets
            // the header along with the correct multipart boundary.
        });

        console.log("[CNN Client] ✅ Response received successfully:", response.data);
        return {
            label: response.data.class_name,
            plant: response.data.plant,
            disease: response.data.disease,
            confidence: response.data.confidence
        };
    } catch (err) {
        console.error("[CNN Client] ❌ Request failed:", {
            message: err.message,
            code: err.code,
            url: url,
            response: err.response ? { status: err.response.status, data: err.response.data } : "No response"
        });
        throw err;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — Gemini Vision (Reviewer / Verifier)
// ══════════════════════════════════════════════════════════════════════════════
export async function analyzeWithGemini(imageBuffer, mimeType, cnnResult) {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set in .env.dev");

    const safeMime = (mimeType === "image/jpg") ? "image/jpeg" : mimeType;

    // ✅ /v1/ أولاً — أكثر استقراراً وأقل 404
    const ENDPOINTS = [
        { url: "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",        label: "gemini-1.5-flash (v1)"       },
        { url: "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",        label: "gemini-2.0-flash (v1)"       },
        { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent", label: "gemini-2.0-flash-exp (v1beta)" },
        { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",       label: "gemini-1.5-pro (v1beta)"      },
    ];

    let cnnInfo = "None (No prediction available)";
    if (cnnResult && cnnResult.plant) {
        cnnInfo = `Plant: ${cnnResult.plant}, Disease/Status: ${cnnResult.disease} (Confidence: ${Number(cnnResult.confidence).toFixed(1)}%)`;
    }

    const prompt = `You are an expert Plant Pathologist and Botanist.

Our local image classification model gave this initial prediction for the plant in the image:
- Initial Prediction: ${cnnInfo}

Your task is to act as the "Reviewer and Verifier" (المُراجع المدقق). Inspect the image carefully and verify if the model's diagnosis is logical and correct.

Rules:
- If the model's diagnosis is correct, validate and confirm it.
- If the model's diagnosis is incorrect or scientifically flawed, correct it to the scientifically accurate diagnosis (correct plant name and disease name).
- If the plant is healthy, set final_disease to "Healthy".
- Base everything ONLY on what you visually observe in the actual image.

Return ONLY this JSON (no markdown, no extra text):
{
  "final_plant": "common name of the plant you see in the image",
  "final_disease": "exact disease name you observe, or Healthy",
  "confidence": 85,
  "symptoms": "describe visible symptoms in 2 sentences",
  "cause": "fungal / bacterial / viral / pest / environmental / none",
  "treatment": "Step 1: ... Step 2: ... Step 3: ...",
  "explanation": "one sentence scientific explanation",
  "is_cnn_correct": true or false (set to true if the initial prediction was correct, false if you had to correct it)
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

            const cnnWasCorrect = (parsed.is_cnn_correct === true || String(parsed.is_cnn_correct).toLowerCase() === 'true');

            return {
                final_plant:    String(parsed.final_plant   || "Unknown Plant"),
                final_disease:  String(parsed.final_disease || "Unknown"),
                is_cnn_correct: cnnWasCorrect,
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

    const systemRole = isArabic
        ? `أنت "فلورا" — مساعد زراعي متخصص وذكي.
قواعد الرد:
1. رحّب بالمستخدم بشكل لطيف وودي للغاية بلهجة مصرية بسيطة وسهلة الفهم.
2. أخبر المستخدم باسم نباته وحالته (سواء كان سليماً أو مريضاً بالمرض المحدد).
3. اشرح المرض ومعلومات عامة عنه بأسلوب بسيط، دافئ ومفهوم جداً للمستخدم العادي (بدون تعقيدات علمية).
4. تنبيه هام جداً: لا تذكر خطوات أو تفاصيل العلاج الإجرائية (مثل استخدام مبيدات أو قطع أوراق... إلخ) في هذا الرد أبداً!
5. في نهاية الرد تماماً، يجب أن تطرح هذا السؤال التفاعلي حرفياً كما هو بين القوسين: (هل تحب أن تعرف إزاي تعالجه؟).
6. ممنوع استخدام كلمات مثل "يا حبيبي"، وممنوع خلط اللغات.`
        : `You are "Flora" — a friendly and professional agricultural assistant.
Response Rules:
1. Welcome the user warmly and politely.
2. Tell them the common name of their plant and its health status (whether it is healthy or has the diagnosed disease).
3. Explain the disease and general information about it in a very simple, easy-to-understand, friendly language.
4. CRITICAL: Do NOT list any treatment steps, actions, or chemical cures in this response.
5. At the very end of your response, ask this interactive question: (Would you like to know how to treat it?).
6. Keep the tone warm and helpful.`;

    const dataBlock = isArabic
        ? `بيانات تشخيص النبات:
اسم النبات: ${geminiResult.final_plant}
الحالة/المرض: ${isHealthy ? "سليم ومعافى" : geminiResult.final_disease}
الأعراض الملاحظة: ${geminiResult.symptoms}
السبب: ${geminiResult.cause}
التوضيح العلمي: ${geminiResult.explanation}

أعد صياغة هذه البيانات للمستخدم بناءً على قواعد الرد السابقة.`
        : `Plant Diagnosis Data:
Plant Name: ${geminiResult.final_plant}
Status/Disease: ${isHealthy ? "Healthy" : geminiResult.final_disease}
Symptoms: ${geminiResult.symptoms}
Cause: ${geminiResult.cause}
Scientific Explanation: ${geminiResult.explanation}

Rewrite this diagnosis for the user according to the response rules.`;

    const response = await axios.post(
        `${GEMMA_BASE_URL}/chat/completions`,
        {
            model:    GEMMA_MODEL,
            messages: [
                { role: "system", content: systemRole },
                { role: "user",   content: dataBlock  }
            ],
            temperature: 0.6,
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

    // Layer 2 — Gemini (TEMPORARILY BYPASSED FOR TESTING)
    console.log("[AI Pipeline] ⏭️ Layer 2 (Gemini): BYPASSED (Temporary Test Mode)");
    const geminiResult = {
        final_plant: cnnResult.plant || "Unknown",
        final_disease: cnnResult.disease || "Unknown",
        is_cnn_correct: true,
        confidence: cnnResult.confidence || 0,
        symptoms: "N/A (Bypassed Gemini)",
        cause: "N/A (Bypassed Gemini)",
        treatment: "N/A (Bypassed Gemini)",
        explanation: "N/A (Bypassed Gemini)"
    };

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
        modelUsed = "fallback";

        const healthy = geminiResult.final_disease.toLowerCase().includes("healthy");
        if (lang === "ar") {
            if (healthy) {
                finalExplanation = `✅ نباتك بخير! ${geminiResult.final_plant} يبدو في حالة ممتازة.`;
            } else {
                finalExplanation = `⚠️ تم اكتشاف **${geminiResult.final_disease}** في نبات **${geminiResult.final_plant}** (نسبة الثقة: ${Number(geminiResult.confidence).toFixed(0)}%).\n\n(هل تحب أن تعرف إزاي تعالجه؟)`;
            }
        } else {
            if (healthy) {
                finalExplanation = `✅ Your ${geminiResult.final_plant} looks healthy!`;
            } else {
                finalExplanation = `⚠️ Detected **${geminiResult.final_disease}** in your **${geminiResult.final_plant}** (${Number(geminiResult.confidence).toFixed(0)}% confidence).\n\n(Would you like to know how to treat it?)`;
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
