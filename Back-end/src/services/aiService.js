/**
 * FLORA — AI Service (CNN + Gemma Pipeline)
 */

import axios from "axios";

const GEMMA_BASE_URL = process.env.GEMMA_BASE_URL || "http://localhost:1234/v1";
let GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-3-4b-it";
if (GEMMA_MODEL === "gemini-1.5-flash") {
    GEMMA_MODEL = "gemini-2.5-flash";
}
const GEMMA_TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 90_000;

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
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    return latinChars > arabicChars && latinChars > 15;
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — Gemma-4 via LM Studio
// ══════════════════════════════════════════════════════════════════════════════
export async function refineWithGemma(analysisResult, userQuestion = "", lang = "ar") {
    const isArabic = lang === "ar";
    const isHealthy = analysisResult.final_disease.toLowerCase().includes("healthy");

    const plantAr = getArabicPlant(analysisResult.final_plant);
    const diseaseAr = getArabicDisease(analysisResult.final_disease);

    const systemRole = isArabic
        ? `أنت "فلورا" — خبيرة زراعية مصرية ذكية ومهنية وتساعد بأسلوب متزن وودود دون مبالغة.
قواعد الرد الصارمة:
1. يجب أن يكون ردك بالكامل باللغة العربية (اللهجة المصرية العامية البسيطة والسهلة الفهم).
2. ممنوع تماماً استخدام اللغة العربية الفصحى أو الكلمات الإنجليزية في أي جزء من الإجابة.
3. رحّب بالمستخدم باسم نباته وحالته الصحية (سواء كان سليماً أو مصاباً بالمرض المحدد) باللغة العربية بأسلوب لطيف دون مبالغة.
4. اشرح المرض ومعلومات عامة عنه بأسلوب بسيط ومفهوم جداً للمستخدم العادي بمهنية ولطف (بدون تعقيدات علمية وبدون مبالغة في الود).
5. خاطب المستخدم بصيغة المذكر (باعتبارها الصيغة العامة والمحايدة للمخاطب في اللغة العربية)، وتجنب تماماً مخاطبته بصيغة المؤنث (مثل: أهلاً بكِ، تفضلي، إلخ).
6. تنبيه هام جداً: لا تذكر خطوات أو تفاصيل العلاج الإجرائية (مثل استخدام مبيدات أو قطع أوراق... إلخ) في هذا الرد أبداً!
${isHealthy ? "7. تنبيه: بما أن النبات سليم، لا تطرح أي أسئلة حول العلاج." : "7. في نهاية الرد تماماً، يجب أن تطرح هذا السؤال التفاعلي حرفياً كما هو بين القوسين: (هل تحب أن تعرف إزاي تعالجه؟)."}
8. ممنوع استخدام كلمات أو عبارات التودد المبالغ فيها أو غير اللائقة مثل: "يا حبيبي"، "يا حبيبتي"، "يا عزيزتي"، "يا روحي"، إلخ.
9. تنبيه هام جداً: ابدأ ردك مباشرة بدون كتابة أي تفكير أو مسودات تفكير (مثل: Thinking Process أو غيرها).`
        : `You are "Flora" — a friendly and professional agricultural assistant.
Response Rules:
1. Welcome the user warmly and politely.
2. Tell them the common name of their plant and its health status (whether it is healthy or has the diagnosed disease).
3. Explain the disease and general information about it in a very simple, easy-to-understand, friendly language.
4. CRITICAL: Do NOT list any treatment steps, actions, or chemical cures in this response.
${isHealthy ? "5. Note: Since the plant is healthy, do NOT ask any questions about treatment." : "5. At the very end of your response, ask this interactive question: (Would you like to know how to treat it?)."}
6. Keep the tone warm and helpful.
7. CRITICAL: Start your response directly. DO NOT output any reasoning, thinking process, or thoughts.`;


    const dataBlock = isArabic
        ? `بيانات تشخيص النبات:
اسم النبات: ${plantAr}
الحالة/المرض: ${isHealthy ? "سليم ومعافى" : diseaseAr}
الأعراض الملاحظة: ${analysisResult.symptoms}
السبب: ${analysisResult.cause}
التوضيح العلمي: ${analysisResult.explanation}

أعد صياغة هذه البيانات للمستخدم بناءً على قواعد الرد السابقة.`
        : `Plant Diagnosis Data:
Plant Name: ${analysisResult.final_plant}
Status/Disease: ${isHealthy ? "Healthy" : analysisResult.final_disease}
Symptoms: ${analysisResult.symptoms}
Cause: ${analysisResult.cause}
Scientific Explanation: ${analysisResult.explanation}

Rewrite this diagnosis for the user according to the response rules.`;

    const response = await axios.post(
        `${GEMMA_BASE_URL}/chat/completions`,
        {
            model: GEMMA_MODEL,
            messages: [
                { role: "system", content: systemRole },
                { role: "user", content: dataBlock }
            ],
            temperature: 0.6,
            max_tokens: 1200, // FIX (Image 2): 550 caused Arabic responses to truncate mid-sentence
            stream: false
        },
        {
            headers: { 
                "Content-Type": "application/json",
                ...(process.env.GEMMA_API_KEY ? { "Authorization": `Bearer ${process.env.GEMMA_API_KEY}` } : {})
            },
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
// GEMINI MULTIMODAL FALLBACK
// ══════════════════════════════════════════════════════════════════════════════
export async function predictPlantDiseaseWithGemini(imageBuffer, mimeType) {
    console.log("[Gemini Multimodal Fallback] Analyzing image directly...");
    const base64Data = imageBuffer.toString("base64");
    
    let cleanMimeType = mimeType;
    if (!cleanMimeType || !cleanMimeType.startsWith("image/")) {
        cleanMimeType = "image/jpeg";
    }
    
    const response = await axios.post(
        `${GEMMA_BASE_URL}/chat/completions`,
        {
            model: GEMMA_MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are an expert plant disease classifier. Analyze the provided image of a plant leaf and return a JSON object with the following fields:
{
  "plant": "Plant name in English (e.g. Tomato, Apple, Grape, Peach, Pepper, Potato, Strawberry, Cherry, Corn)",
  "disease": "Disease name in English (e.g. Early blight, Late blight, Black rot, Rust, Scab, or 'healthy')",
  "confidence": integer percentage between 50 and 99,
  "symptoms": "Description of the symptoms",
  "cause": "Cause of the disease",
  "explanation": "Scientific explanation of the disease"
}
Ensure the output is valid JSON and nothing else.`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analyze this plant leaf." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${cleanMimeType};base64,${base64Data}`
                            }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
        },
        {
            headers: {
                "Content-Type": "application/json",
                ...(process.env.GEMMA_API_KEY ? { "Authorization": `Bearer ${process.env.GEMMA_API_KEY}` } : {})
            },
            timeout: 30000
        }
    );

    const content = response.data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Gemini returned empty response for image analysis");
    
    const parsed = JSON.parse(content);
    return {
        plant: parsed.plant || "Unknown",
        disease: parsed.disease || "Unknown",
        confidence: parsed.confidence || 75,
        symptoms: parsed.symptoms || "N/A",
        cause: parsed.cause || "N/A",
        explanation: parsed.explanation || "N/A"
    };
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
        console.error("[AI Pipeline] ❌ Layer 1 (CNN) failed, attempting Gemini multimodal fallback...", err.message);
        _debug.layers_failed.push("cnn");
        
        try {
            const geminiResult = await predictPlantDiseaseWithGemini(imageBuffer, mimeType);
            console.log("[AI Pipeline] ✅ Gemini Multimodal Fallback Success:", geminiResult);
            cnnResult = {
                plant: geminiResult.plant,
                disease: geminiResult.disease,
                confidence: geminiResult.confidence,
                symptoms: geminiResult.symptoms,
                cause: geminiResult.cause,
                explanation: geminiResult.explanation
            };
        } catch (fallbackErr) {
            console.error("[AI Pipeline] ❌ Gemini Multimodal Fallback failed too:", fallbackErr.message);
            if (fallbackErr.response) {
                console.error("[AI Pipeline] Fallback error status:", fallbackErr.response.status);
                console.error("[AI Pipeline] Fallback error data:", JSON.stringify(fallbackErr.response.data));
            }
            _debug.layers_failed.push("gemini_multimodal");
            cnnResult = { label: "Unknown_Unknown", plant: "Unknown", disease: "Unknown", confidence: 0 };
        }
    }

    // Prepare analysis result directly from CNN or Gemini fallback
    const analysisResult = {
        final_plant: cnnResult.plant || "Unknown",
        final_disease: cnnResult.disease || "Unknown",
        confidence: cnnResult.confidence || 0,
        symptoms: cnnResult.symptoms || "N/A",
        cause: cnnResult.cause || "N/A",
        treatment: "N/A",
        explanation: cnnResult.explanation || "N/A"
    };

    // Layer 2 — Gemma
    let finalExplanation;
    let modelUsed = "pipeline";
    const isHealthy = analysisResult.final_disease.toLowerCase().includes("healthy");

    try {
        console.log("[AI Pipeline] Calling Layer 2 (Gemma)...");
        finalExplanation = await refineWithGemma(analysisResult, userQuestion, lang);
        _debug.gemma_used = true;
        modelUsed = "gemma";
        console.log("[AI Pipeline] ✅ Layer 2 (Gemma): done");
    } catch (err) {
        console.warn("[AI Pipeline] ⚠️ Layer 2 (Gemma) failed:", err.message);
        if (err.response) {
            console.warn("[AI Pipeline] Layer 2 error status:", err.response.status);
            console.warn("[AI Pipeline] Layer 2 error data:", JSON.stringify(err.response.data));
        }
        _debug.layers_failed.push("gemma");
        modelUsed = "fallback";

        const plantAr = getArabicPlant(analysisResult.final_plant);

        if (isHealthy) {
            finalExplanation = `أهلاً بيك! أنا فلورا. 🌿\nبناءً على تحليلي، النبتة اللي بعتها هي **${plantAr}** وهي **سليمة ومعافاة** وبصحة جيدة جداً.\n\nشكلها ممتاز وبتنمو بشكل طبيعي. حافظ عليها واسقيها بانتظام لتفضل دايماً خضراء وجميلة!`;
        } else {
            const diseaseAr = getArabicDisease(analysisResult.final_disease);
            finalExplanation = `أهلاً بيك! أنا فلورا. 🌿\nبناءً على تحليلي، النبتة اللي بعتها هي **${plantAr}** ومصابة بـ **${diseaseAr}**.\n\nالمرض ده ممكن يأثر على صحة النبات وينتشر لباقي الأوراق بسرعة لو متدخلناش، بس متقلقش كل مشكلة وليها حل.\n\n(هل تحب أن تعرف إزاي تعالجه؟)`;
        }
    }

    return {
        plant: analysisResult.final_plant, disease: analysisResult.final_disease,
        isHealthy: isHealthy,
        confidence: analysisResult.confidence, symptoms: analysisResult.symptoms,
        cause: analysisResult.cause, treatment: analysisResult.treatment,
        explanation: finalExplanation, _debug, model: modelUsed
    };
}
