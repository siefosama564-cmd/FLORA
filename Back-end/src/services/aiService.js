/**
 * FLORA — Hybrid AI Service (3-Layer Pipeline)
 */

import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMMA_BASE_URL = process.env.GEMMA_BASE_URL || "http://localhost:1234/v1";
const GEMMA_MODEL    = process.env.GEMMA_MODEL    || "gemma-3-4b-it";
const GEMMA_TIMEOUT  = parseInt(process.env.AI_TIMEOUT) || 90_000;

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — CNN Model Client
// ══════════════════════════════════════════════════════════════════════════════
export async function predictPlantDisease(imageBuffer) {
    console.log("[CNN Client] Preparing FormData...");
    const formData = new FormData();
    formData.append("image", new Blob([imageBuffer]), "plant.jpg");

    const url = process.env.AI_ENGINE_URL || "http://127.0.0.1:5000/predict";
    console.log(`[CNN Client] Sending image to ${url}...`);
    
    try {
        const response = await axios.post(url, formData, {
            timeout: 25_000
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
        const endpoint = `${url}?key=${GEMINI_API_KEY}`;
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
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
export function stripTreatmentSections(text) {
    if (!text) return "";
    let cleaned = text
        .replace(/\(هل تحب أن تعرف إزاي تعالجه\؟\)/g, "")
        .replace(/هل تحب أن تعرف إزاي تعالجه\؟/g, "")
        .replace(/\(Would you like to know how to treat it\?\)/gi, "")
        .replace(/Would you like to know how to treat it\?/gi, "")
        .replace(/كيفية العلاج/g, "")
        .replace(/طرق العلاج/g, "")
        .trim();
    return cleaned;
}

export function ensureTreatmentQuestion(text, lang) {
    if (!text) return "";
    const questionAr = "(هل تحب أن تعرف إزاي تعالجه؟)";
    const questionEn = "(Would you like to know how to treat it?)";
    const target = lang === "ar" ? questionAr : questionEn;
    
    if (text.includes("تعالجه") || text.includes("treat it")) {
        return text;
    }
    return `${text}\n\n${target}`;
}

function isEnglishText(text) {
    if (!text) return false;
    const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const latinChars  = (text.match(/[a-zA-Z]/g) || []).length;
    return latinChars > arabicChars && latinChars > 15;
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — Gemma-4 via LM Studio
// ══════════════════════════════════════════════════════════════════════════════
export async function refineWithGemma(geminiResult, userQuestion = "", lang = "ar") {
    const isArabic  = lang === "ar";
    const isHealthy = geminiResult.final_disease.toLowerCase().includes("healthy");

    const plantAr = getArabicPlant(geminiResult.final_plant);
    const diseaseAr = getArabicDisease(geminiResult.final_disease);

    const systemRole = isArabic
        ? `أنت "فلورا" — خبيرة زراعية مصرية ذكية وودودة للغاية.
قواعد الرد الصارمة:
1. يجب أن يكون ردك بالكامل باللغة العربية (اللهجة المصرية العامية البسيطة والسهلة الفهم).
2. ممنوع تماماً استخدام اللغة العربية الفصحى أو الكلمات الإنجليزية في أي جزء من الإجابة.
3. رحّب بالمستخدم باسم نباته وحالته الصحية (سواء كان سليماً أو مصاباً بالمرض المحدد) باللغة العربية.
4. اشرح المرض ومعلومات عامة عنه بأسلوب بسيط، دافئ ومفهوم جداً للمستخدم العادي (بدون تعقيدات علمية).
5. تنبيه هام جداً: لا تذكر خطوات أو تفاصيل العلاج الإجرائية (مثل استخدام مبيدات أو قطع أوراق... إلخ) في هذا الرد أبداً!
${isHealthy ? "6. تنبيه: بما أن النبات سليم، لا تطرح أي أسئلة حول العلاج." : "6. في نهاية الرد تماماً، يجب أن تطرح هذا السؤال التفاعلي حرفياً كما هو بين القوسين: (هل تحب أن تعرف إزاي تعالجه؟)."}
7. ممنوع استخدام كلمات مثل "يا حبيبي"، وممنوع خلط اللغات.`
        : `You are "Flora" — a friendly and professional agricultural assistant.
Response Rules:
1. Welcome the user warmly and politely.
2. Tell them the common name of their plant and its health status (whether it is healthy or has the diagnosed disease).
3. Explain the disease and general information about it in a very simple, easy-to-understand, friendly language.
4. CRITICAL: Do NOT list any treatment steps, actions, or chemical cures in this response.
${isHealthy ? "5. Note: Since the plant is healthy, do NOT ask any questions about treatment." : "5. At the very end of your response, ask this interactive question: (Would you like to know how to treat it?)."}
6. Keep the tone warm and helpful.`;

    const dataBlock = isArabic
        ? `بيانات تشخيص النبات:
اسم النبات: ${plantAr}
الحالة/المرض: ${isHealthy ? "سليم ومعافى" : diseaseAr}
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
            max_tokens:  1200, // FIX (Image 2): 550 caused Arabic responses to truncate mid-sentence
            stream:      false
        },
        {
            headers: { "Content-Type": "application/json" },
            timeout: GEMMA_TIMEOUT
        }
    );

    let reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Gemma returned empty response");

    if (isArabic && isEnglishText(reply)) {
        console.warn("[refineWithGemma] ⚠️ Model returned English response instead of Arabic. Triggering Arabic fallback...");
        throw new Error("Model response language mismatch (English instead of Arabic)");
    }

    if (isHealthy) {
        reply = stripTreatmentSections(reply);
    } else {
        reply = ensureTreatmentQuestion(reply, lang);
    }

    return reply;
}

const PLANT_TRANSLATIONS = {
    "apple": "تفاح",
    "blueberry": "توت أزرق",
    "cherry": "كرز",
    "cherry_(including_sour)": "كرز",
    "corn": "ذرة",
    "corn_(maize)": "ذرة",
    "grape": "عنب",
    "orange": "برتقال",
    "peach": "خوخ",
    "pepper": "فلفل رومي",
    "pepper,_bell": "فلفل رومي",
    "potato": "بطاطس",
    "raspberry": "توت العليق",
    "soybean": "فول الصويا",
    "squash": "كوسة",
    "strawberry": "فراولة",
    "tomato": "طماطم"
};

const DISEASE_TRANSLATIONS = {
    "apple_scab": "جرب التفاح",
    "black_rot": "العفن الأسود",
    "cedar_apple_rust": "صدأ تفاح الأرز",
    "powdery_mildew": "البياض الدقيقي",
    "cercospora_leaf_spot gray_leaf_spot": "بقعة أوراق سيركوسبورا (البقعة الرمادية)",
    "common_rust_": "الصدأ الشائع",
    "common_rust": "الصدأ الشائع",
    "northern_leaf_blight": "لفحة الأوراق الشمالية",
    "esca_(black_measles)": "مرض الإسكا (الحصبة السوداء)",
    "leaf_blight_(isariopsis_leaf_spot)": "لفحة الأوراق",
    "haunglongbing_(citrus_greening)": "اخضرار الحمضيات (التبرقش الأصفر)",
    "bacterial_spot": "التبقع البكتيري",
    "early_blight": "اللفحة المبكرة",
    "late_blight": "اللفحة المتأخرة",
    "leaf_mold": "عفن الأوراق",
    "septoria_leaf_spot": "تبقع أوراق السبتوريا",
    "spider_mites two-spotted_spider_mite": "العنكبوت الأحمر ذو البقعتين",
    "target_spot": "التبقع المستهدف",
    "tomato_yellow_leaf_curl_virus": "فيروس تجعد أوراق الطماطم الأصفر",
    "tomato_mosaic_virus": "فيروس مبرقش الطماطم (الموزايك)",
    "leaf_scorch": "حرق الأوراق",
    "healthy": "سليم ومعافى"
};

export function getArabicPlant(engPlant) {
    if (!engPlant) return "نبات غير معروف";
    // FIX (Bug 3): Normalize BOTH underscores and spaces so the lookup succeeds
    // regardless of whether the input is "Tomato" (Gemini) or "tomato" (CNN)
    // or "cherry_(including_sour)" (CNN label with underscores).
    const key = engPlant.toLowerCase().trim()
                         .replace(/[\s ]+/g, "_")   // spaces → underscores
                         .replace(/_+/g, "_")             // collapse repeated underscores
                         .replace(/[,\.]/g, "");         // strip stray commas/dots
    return PLANT_TRANSLATIONS[key] || engPlant;
}

export function getArabicDisease(engDisease) {
    if (!engDisease) return "حالة غير معروفة";
    // FIX (Bug 3): The CNN model returns names like "Tomato mosaic virus" (spaces)
    // while the dictionary keys use underscores ("tomato_mosaic_virus").
    // The old code only normalized whitespace runs but kept them as spaces,
    // so the lookup always missed → the raw English name leaked into Arabic replies.
    //
    // New strategy: normalize everything to lowercase-with-underscores, matching
    // the DISEASE_TRANSLATIONS key format exactly.
    const normalized = engDisease.toLowerCase().trim()
                                  .replace(/[\s \-]+/g, "_")  // spaces/hyphens → underscore
                                  .replace(/_+/g, "_")              // collapse doubles
                                  .replace(/[,\.]/g, "");          // strip stray commas/dots

    if (normalized.includes("healthy")) return "سليم ومعافى";

    // Direct lookup first
    if (DISEASE_TRANSLATIONS[normalized]) return DISEASE_TRANSLATIONS[normalized];

    // Fallback: try with spaces instead of underscores (for cases like "black rot")
    const withSpaces = normalized.replace(/_/g, " ");
    if (DISEASE_TRANSLATIONS[withSpaces]) return DISEASE_TRANSLATIONS[withSpaces];

    // Partial match fallback — catches sub-strings like "spider_mites" from a longer label
    for (const [dictKey, arabicVal] of Object.entries(DISEASE_TRANSLATIONS)) {
        if (normalized.includes(dictKey) || dictKey.includes(normalized)) {
            return arabicVal;
        }
    }

    return engDisease; // last resort: return the original (will be English, but avoids silence)
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

    // Layer 3 — Gemma
    let finalExplanation;
    let modelUsed = "pipeline";
    const isHealthy = geminiResult.final_disease.toLowerCase().includes("healthy");

    try {
        finalExplanation  = await refineWithGemma(geminiResult, userQuestion, lang);
        _debug.gemma_used = true;
        modelUsed         = "gemma";
        console.log("[AI Pipeline] ✅ Layer 3 (Gemma): done");
    } catch (err) {
        console.warn("[AI Pipeline] ⚠️ Layer 3 (Gemma) failed:", err.message);
        _debug.layers_failed.push("gemma");
        modelUsed = "fallback";

        const plantAr = getArabicPlant(geminiResult.final_plant);

        if (isHealthy) {
            finalExplanation = `أهلاً بيك! أنا فلورا. 🌿\nبناءً على تحليلي، النبتة اللي بعتها هي **${plantAr}** وهي **سليمة ومعافاة** وبصحة جيدة جداً.\n\nشكلها ممتاز وبتنمو بشكل طبيعي. حافظ عليها واسقيها بانتظام لتفضل دايماً خضراء وجميلة!`;
        } else {
            const diseaseAr = getArabicDisease(geminiResult.final_disease);
            finalExplanation = `أهلاً بيك! أنا فلورا. 🌿\nبناءً على تحليلي، النبتة اللي بعتها هي **${plantAr}** ومصابة بـ **${diseaseAr}**.\n\nالمرض ده ممكن يأثر على صحة النبات وينتشر لباقي الأوراق بسرعة لو متدخلناش، بس متقلقش كل مشكلة وليها حل.\n\n(هل تحب أن تعرف إزاي تعالجه؟)`;
        }
    }

    return {
        plant: geminiResult.final_plant, disease: geminiResult.final_disease,
        isHealthy: isHealthy,
        confidence: geminiResult.confidence, symptoms: geminiResult.symptoms,
        cause: geminiResult.cause, treatment: geminiResult.treatment,
        explanation: finalExplanation, _debug, model: modelUsed
    };
}
