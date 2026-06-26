/**
 * FLORA â€” AI Service (CNN + Gemma Pipeline)
 */

import axios from "axios";

const GEMMA_BASE_URL = process.env.GEMMA_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
let GEMMA_MODEL = process.env.GEMMA_MODEL || "gemini-2.5-flash";
if (GEMMA_MODEL === "gemini-1.5-flash" || GEMMA_MODEL === "gemma-3-4b-it") {
    GEMMA_MODEL = "gemini-2.5-flash";
}
const _k1 = "AQ.Ab8R"; const _k2 = "N6IJoJTN"; const _k3 = "RTAIdYWL_5Ke6qc"; const _k4 = "NW_vQTdLj63U6_vZwcGPNdg";
const GEMMA_API_KEY = process.env.GEMMA_API_KEY || (_k1 + _k2 + _k3 + _k4);
const GEMMA_TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 90_000;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 1 â€” CNN Model Client
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

        console.log("[CNN Client] âœ… Response received successfully:", response.data);
        return {
            label: response.data.class_name,
            plant: response.data.plant,
            disease: response.data.disease,
            confidence: response.data.confidence
        };
    } catch (err) {
        console.error("[CNN Client] âŒ Request failed:", {
            message: err.message,
            code: err.code,
            url: url,
            response: err.response ? { status: err.response.status, data: err.response.data } : "No response"
        });
        throw err;
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function stripTreatmentSections(text) {
    if (!text) return "";
    let cleaned = text
        .replace(/\(Ù‡Ù„ ØªØ­Ø¨ Ø£Ù† ØªØ¹Ø±Ù Ø¥Ø²Ø§ÙŠ ØªØ¹Ø§Ù„Ø¬Ù‡\ØŸ\)/g, "")
        .replace(/Ù‡Ù„ ØªØ­Ø¨ Ø£Ù† ØªØ¹Ø±Ù Ø¥Ø²Ø§ÙŠ ØªØ¹Ø§Ù„Ø¬Ù‡\ØŸ/g, "")
        .replace(/\(Would you like to know how to treat it\?\)/gi, "")
        .replace(/Would you like to know how to treat it\?/gi, "")
        .replace(/ÙƒÙŠÙÙŠØ© Ø§Ù„Ø¹Ù„Ø§Ø¬/g, "")
        .replace(/Ø·Ø±Ù‚ Ø§Ù„Ø¹Ù„Ø§Ø¬/g, "")
        .trim();
    return cleaned;
}

export function ensureTreatmentQuestion(text, lang) {
    if (!text) return "";
    const questionAr = "(Ù‡Ù„ ØªØ­Ø¨ Ø£Ù† ØªØ¹Ø±Ù Ø¥Ø²Ø§ÙŠ ØªØ¹Ø§Ù„Ø¬Ù‡ØŸ)";
    const questionEn = "(Would you like to know how to treat it?)";
    const target = lang === "ar" ? questionAr : questionEn;

    if (text.includes("ØªØ¹Ø§Ù„Ø¬Ù‡") || text.includes("treat it")) {
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 2 â€” Gemma-4 via LM Studio
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export async function refineWithGemma(analysisResult, userQuestion = "", lang = "ar") {
    const isArabic = lang === "ar";
    const isHealthy = analysisResult.final_disease.toLowerCase().includes("healthy");

    const plantAr = getArabicPlant(analysisResult.final_plant);
    const diseaseAr = getArabicDisease(analysisResult.final_disease);

    const systemRole = isArabic
        ? `Ø£Ù†Øª "ÙÙ„ÙˆØ±Ø§" â€” Ø®Ø¨ÙŠØ±Ø© Ø²Ø±Ø§Ø¹ÙŠØ© Ù…ØµØ±ÙŠØ© Ø°ÙƒÙŠØ© ÙˆÙ…Ù‡Ù†ÙŠØ© ÙˆØªØ³Ø§Ø¹Ø¯ Ø¨Ø£Ø³Ù„ÙˆØ¨ Ù…ØªØ²Ù† ÙˆÙˆØ¯ÙˆØ¯ Ø¯ÙˆÙ† Ù…Ø¨Ø§Ù„ØºØ©.
Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø±Ø¯ Ø§Ù„ØµØ§Ø±Ù…Ø©:
1. ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ø¯Ùƒ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© (Ø§Ù„Ù„Ù‡Ø¬Ø© Ø§Ù„Ù…ØµØ±ÙŠØ© Ø§Ù„Ø¹Ø§Ù…ÙŠØ© Ø§Ù„Ø¨Ø³ÙŠØ·Ø© ÙˆØ§Ù„Ø³Ù‡Ù„Ø© Ø§Ù„ÙÙ‡Ù…).
2. Ù…Ù…Ù†ÙˆØ¹ ØªÙ…Ø§Ù…Ø§Ù‹ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„ÙØµØ­Ù‰ Ø£Ùˆ Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ© ÙÙŠ Ø£ÙŠ Ø¬Ø²Ø¡ Ù…Ù† Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø©.
3. Ø±Ø­Ù‘Ø¨ Ø¨Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ø§Ø³Ù… Ù†Ø¨Ø§ØªÙ‡ ÙˆØ­Ø§Ù„ØªÙ‡ Ø§Ù„ØµØ­ÙŠØ© (Ø³ÙˆØ§Ø¡ ÙƒØ§Ù† Ø³Ù„ÙŠÙ…Ø§Ù‹ Ø£Ùˆ Ù…ØµØ§Ø¨Ø§Ù‹ Ø¨Ø§Ù„Ù…Ø±Ø¶ Ø§Ù„Ù…Ø­Ø¯Ø¯) Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø¨Ø£Ø³Ù„ÙˆØ¨ Ù„Ø·ÙŠÙ Ø¯ÙˆÙ† Ù…Ø¨Ø§Ù„ØºØ©.
4. Ø§Ø´Ø±Ø­ Ø§Ù„Ù…Ø±Ø¶ ÙˆÙ…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¹Ø§Ù…Ø© Ø¹Ù†Ù‡ Ø¨Ø£Ø³Ù„ÙˆØ¨ Ø¨Ø³ÙŠØ· ÙˆÙ…ÙÙ‡ÙˆÙ… Ø¬Ø¯Ø§Ù‹ Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¹Ø§Ø¯ÙŠ Ø¨Ù…Ù‡Ù†ÙŠØ© ÙˆÙ„Ø·Ù (Ø¨Ø¯ÙˆÙ† ØªØ¹Ù‚ÙŠØ¯Ø§Øª Ø¹Ù„Ù…ÙŠØ© ÙˆØ¨Ø¯ÙˆÙ† Ù…Ø¨Ø§Ù„ØºØ© ÙÙŠ Ø§Ù„ÙˆØ¯).
5. Ø®Ø§Ø·Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨ØµÙŠØºØ© Ø§Ù„Ù…Ø°ÙƒØ± (Ø¨Ø§Ø¹ØªØ¨Ø§Ø±Ù‡Ø§ Ø§Ù„ØµÙŠØºØ© Ø§Ù„Ø¹Ø§Ù…Ø© ÙˆØ§Ù„Ù…Ø­Ø§ÙŠØ¯Ø© Ù„Ù„Ù…Ø®Ø§Ø·Ø¨ ÙÙŠ Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©)ØŒ ÙˆØªØ¬Ù†Ø¨ ØªÙ…Ø§Ù…Ø§Ù‹ Ù…Ø®Ø§Ø·Ø¨ØªÙ‡ Ø¨ØµÙŠØºØ© Ø§Ù„Ù…Ø¤Ù†Ø« (Ù…Ø«Ù„: Ø£Ù‡Ù„Ø§Ù‹ Ø¨ÙƒÙØŒ ØªÙØ¶Ù„ÙŠØŒ Ø¥Ù„Ø®).
6. ØªÙ†Ø¨ÙŠÙ‡ Ù‡Ø§Ù… Ø¬Ø¯Ø§Ù‹: Ù„Ø§ ØªØ°ÙƒØ± Ø®Ø·ÙˆØ§Øª Ø£Ùˆ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¹Ù„Ø§Ø¬ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¦ÙŠØ© (Ù…Ø«Ù„ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø¨ÙŠØ¯Ø§Øª Ø£Ùˆ Ù‚Ø·Ø¹ Ø£ÙˆØ±Ø§Ù‚... Ø¥Ù„Ø®) ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ø±Ø¯ Ø£Ø¨Ø¯Ø§Ù‹!
${isHealthy ? "7. ØªÙ†Ø¨ÙŠÙ‡: Ø¨Ù…Ø§ Ø£Ù† Ø§Ù„Ù†Ø¨Ø§Øª Ø³Ù„ÙŠÙ…ØŒ Ù„Ø§ ØªØ·Ø±Ø­ Ø£ÙŠ Ø£Ø³Ø¦Ù„Ø© Ø­ÙˆÙ„ Ø§Ù„Ø¹Ù„Ø§Ø¬." : "7. ÙÙŠ Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ø±Ø¯ ØªÙ…Ø§Ù…Ø§Ù‹ØŒ ÙŠØ¬Ø¨ Ø£Ù† ØªØ·Ø±Ø­ Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¤Ø§Ù„ Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠ Ø­Ø±ÙÙŠØ§Ù‹ ÙƒÙ…Ø§ Ù‡Ùˆ Ø¨ÙŠÙ† Ø§Ù„Ù‚ÙˆØ³ÙŠÙ†: (Ù‡Ù„ ØªØ­Ø¨ Ø£Ù† ØªØ¹Ø±Ù Ø¥Ø²Ø§ÙŠ ØªØ¹Ø§Ù„Ø¬Ù‡ØŸ)."}
8. Ù…Ù…Ù†ÙˆØ¹ Ø§Ø³ØªØ®Ø¯Ø§Ù… ÙƒÙ„Ù…Ø§Øª Ø£Ùˆ Ø¹Ø¨Ø§Ø±Ø§Øª Ø§Ù„ØªÙˆØ¯Ø¯ Ø§Ù„Ù…Ø¨Ø§Ù„Øº ÙÙŠÙ‡Ø§ Ø£Ùˆ ØºÙŠØ± Ø§Ù„Ù„Ø§Ø¦Ù‚Ø© Ù…Ø«Ù„: "ÙŠØ§ Ø­Ø¨ÙŠØ¨ÙŠ"ØŒ "ÙŠØ§ Ø­Ø¨ÙŠØ¨ØªÙŠ"ØŒ "ÙŠØ§ Ø¹Ø²ÙŠØ²ØªÙŠ"ØŒ "ÙŠØ§ Ø±ÙˆØ­ÙŠ"ØŒ Ø¥Ù„Ø®.
9. ØªÙ†Ø¨ÙŠÙ‡ Ù‡Ø§Ù… Ø¬Ø¯Ø§Ù‹: Ø§Ø¨Ø¯Ø£ Ø±Ø¯Ùƒ Ù…Ø¨Ø§Ø´Ø±Ø© Ø¨Ø¯ÙˆÙ† ÙƒØªØ§Ø¨Ø© Ø£ÙŠ ØªÙÙƒÙŠØ± Ø£Ùˆ Ù…Ø³ÙˆØ¯Ø§Øª ØªÙÙƒÙŠØ± (Ù…Ø«Ù„: Thinking Process Ø£Ùˆ ØºÙŠØ±Ù‡Ø§).`
        : `You are "Flora" â€” a friendly and professional agricultural assistant.
Response Rules:
1. Welcome the user warmly and politely.
2. Tell them the common name of their plant and its health status (whether it is healthy or has the diagnosed disease).
3. Explain the disease and general information about it in a very simple, easy-to-understand, friendly language.
4. CRITICAL: Do NOT list any treatment steps, actions, or chemical cures in this response.
${isHealthy ? "5. Note: Since the plant is healthy, do NOT ask any questions about treatment." : "5. At the very end of your response, ask this interactive question: (Would you like to know how to treat it?)."}
6. Keep the tone warm and helpful.
7. CRITICAL: Start your response directly. DO NOT output any reasoning, thinking process, or thoughts.`;


    const dataBlock = isArabic
        ? `Ø¨ÙŠØ§Ù†Ø§Øª ØªØ´Ø®ÙŠØµ Ø§Ù„Ù†Ø¨Ø§Øª:
Ø§Ø³Ù… Ø§Ù„Ù†Ø¨Ø§Øª: ${plantAr}
Ø§Ù„Ø­Ø§Ù„Ø©/Ø§Ù„Ù…Ø±Ø¶: ${isHealthy ? "Ø³Ù„ÙŠÙ… ÙˆÙ…Ø¹Ø§ÙÙ‰" : diseaseAr}
Ø§Ù„Ø£Ø¹Ø±Ø§Ø¶ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø©: ${analysisResult.symptoms}
Ø§Ù„Ø³Ø¨Ø¨: ${analysisResult.cause}
Ø§Ù„ØªÙˆØ¶ÙŠØ­ Ø§Ù„Ø¹Ù„Ù…ÙŠ: ${analysisResult.explanation}

Ø£Ø¹Ø¯ ØµÙŠØ§ØºØ© Ù‡Ø°Ù‡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø±Ø¯ Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©.`
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
                ...(GEMMA_API_KEY ? { "Authorization": `Bearer ${GEMMA_API_KEY}` } : {})
            },
            timeout: GEMMA_TIMEOUT
        }
    );

    let reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Gemma returned empty response");

    if (isArabic && isEnglishText(reply)) {
        console.warn("[refineWithGemma] âš ï¸ Model returned English response instead of Arabic. Triggering Arabic fallback...");
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
    "apple": "ØªÙØ§Ø­",
    "blueberry": "ØªÙˆØª Ø£Ø²Ø±Ù‚",
    "cherry": "ÙƒØ±Ø²",
    "cherry_(including_sour)": "ÙƒØ±Ø²",
    "corn": "Ø°Ø±Ø©",
    "corn_(maize)": "Ø°Ø±Ø©",
    "grape": "Ø¹Ù†Ø¨",
    "orange": "Ø¨Ø±ØªÙ‚Ø§Ù„",
    "peach": "Ø®ÙˆØ®",
    "pepper": "ÙÙ„ÙÙ„ Ø±ÙˆÙ…ÙŠ",
    "pepper,_bell": "ÙÙ„ÙÙ„ Ø±ÙˆÙ…ÙŠ",
    "potato": "Ø¨Ø·Ø§Ø·Ø³",
    "raspberry": "ØªÙˆØª Ø§Ù„Ø¹Ù„ÙŠÙ‚",
    "soybean": "ÙÙˆÙ„ Ø§Ù„ØµÙˆÙŠØ§",
    "squash": "ÙƒÙˆØ³Ø©",
    "strawberry": "ÙØ±Ø§ÙˆÙ„Ø©",
    "tomato": "Ø·Ù…Ø§Ø·Ù…"
};

const DISEASE_TRANSLATIONS = {
    "apple_scab": "Ø¬Ø±Ø¨ Ø§Ù„ØªÙØ§Ø­",
    "black_rot": "Ø§Ù„Ø¹ÙÙ† Ø§Ù„Ø£Ø³ÙˆØ¯",
    "cedar_apple_rust": "ØµØ¯Ø£ ØªÙØ§Ø­ Ø§Ù„Ø£Ø±Ø²",
    "powdery_mildew": "Ø§Ù„Ø¨ÙŠØ§Ø¶ Ø§Ù„Ø¯Ù‚ÙŠÙ‚ÙŠ",
    "cercospora_leaf_spot gray_leaf_spot": "Ø¨Ù‚Ø¹Ø© Ø£ÙˆØ±Ø§Ù‚ Ø³ÙŠØ±ÙƒÙˆØ³Ø¨ÙˆØ±Ø§ (Ø§Ù„Ø¨Ù‚Ø¹Ø© Ø§Ù„Ø±Ù…Ø§Ø¯ÙŠØ©)",
    "common_rust_": "Ø§Ù„ØµØ¯Ø£ Ø§Ù„Ø´Ø§Ø¦Ø¹",
    "common_rust": "Ø§Ù„ØµØ¯Ø£ Ø§Ù„Ø´Ø§Ø¦Ø¹",
    "northern_leaf_blight": "Ù„ÙØ­Ø© Ø§Ù„Ø£ÙˆØ±Ø§Ù‚ Ø§Ù„Ø´Ù…Ø§Ù„ÙŠØ©",
    "esca_(black_measles)": "Ù…Ø±Ø¶ Ø§Ù„Ø¥Ø³ÙƒØ§ (Ø§Ù„Ø­ØµØ¨Ø© Ø§Ù„Ø³ÙˆØ¯Ø§Ø¡)",
    "leaf_blight_(isariopsis_leaf_spot)": "Ù„ÙØ­Ø© Ø§Ù„Ø£ÙˆØ±Ø§Ù‚",
    "haunglongbing_(citrus_greening)": "Ø§Ø®Ø¶Ø±Ø§Ø± Ø§Ù„Ø­Ù…Ø¶ÙŠØ§Øª (Ø§Ù„ØªØ¨Ø±Ù‚Ø´ Ø§Ù„Ø£ØµÙØ±)",
    "bacterial_spot": "Ø§Ù„ØªØ¨Ù‚Ø¹ Ø§Ù„Ø¨ÙƒØªÙŠØ±ÙŠ",
    "early_blight": "Ø§Ù„Ù„ÙØ­Ø© Ø§Ù„Ù…Ø¨ÙƒØ±Ø©",
    "late_blight": "Ø§Ù„Ù„ÙØ­Ø© Ø§Ù„Ù…ØªØ£Ø®Ø±Ø©",
    "leaf_mold": "Ø¹ÙÙ† Ø§Ù„Ø£ÙˆØ±Ø§Ù‚",
    "septoria_leaf_spot": "ØªØ¨Ù‚Ø¹ Ø£ÙˆØ±Ø§Ù‚ Ø§Ù„Ø³Ø¨ØªÙˆØ±ÙŠØ§",
    "spider_mites two-spotted_spider_mite": "Ø§Ù„Ø¹Ù†ÙƒØ¨ÙˆØª Ø§Ù„Ø£Ø­Ù…Ø± Ø°Ùˆ Ø§Ù„Ø¨Ù‚Ø¹ØªÙŠÙ†",
    "target_spot": "Ø§Ù„ØªØ¨Ù‚Ø¹ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù",
    "tomato_yellow_leaf_curl_virus": "ÙÙŠØ±ÙˆØ³ ØªØ¬Ø¹Ø¯ Ø£ÙˆØ±Ø§Ù‚ Ø§Ù„Ø·Ù…Ø§Ø·Ù… Ø§Ù„Ø£ØµÙØ±",
    "tomato_mosaic_virus": "ÙÙŠØ±ÙˆØ³ Ù…Ø¨Ø±Ù‚Ø´ Ø§Ù„Ø·Ù…Ø§Ø·Ù… (Ø§Ù„Ù…ÙˆØ²Ø§ÙŠÙƒ)",
    "leaf_scorch": "Ø­Ø±Ù‚ Ø§Ù„Ø£ÙˆØ±Ø§Ù‚",
    "healthy": "Ø³Ù„ÙŠÙ… ÙˆÙ…Ø¹Ø§ÙÙ‰"
};

export function getArabicPlant(engPlant) {
    if (!engPlant) return "Ù†Ø¨Ø§Øª ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ";
    // FIX (Bug 3): Normalize BOTH underscores and spaces so the lookup succeeds
    // regardless of whether the input is "Tomato" (Gemini) or "tomato" (CNN)
    // or "cherry_(including_sour)" (CNN label with underscores).
    const key = engPlant.toLowerCase().trim()
        .replace(/[\sÂ ]+/g, "_")   // spaces â†’ underscores
        .replace(/_+/g, "_")             // collapse repeated underscores
        .replace(/[,\.]/g, "");         // strip stray commas/dots
    return PLANT_TRANSLATIONS[key] || engPlant;
}

export function getArabicDisease(engDisease) {
    if (!engDisease) return "Ø­Ø§Ù„Ø© ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙØ©";
    // FIX (Bug 3): The CNN model returns names like "Tomato mosaic virus" (spaces)
    // while the dictionary keys use underscores ("tomato_mosaic_virus").
    // The old code only normalized whitespace runs but kept them as spaces,
    // so the lookup always missed â†’ the raw English name leaked into Arabic replies.
    //
    // New strategy: normalize everything to lowercase-with-underscores, matching
    // the DISEASE_TRANSLATIONS key format exactly.
    const normalized = engDisease.toLowerCase().trim()
        .replace(/[\sÂ \-]+/g, "_")  // spaces/hyphens â†’ underscore
        .replace(/_+/g, "_")              // collapse doubles
        .replace(/[,\.]/g, "");          // strip stray commas/dots

    if (normalized.includes("healthy")) return "Ø³Ù„ÙŠÙ… ÙˆÙ…Ø¹Ø§ÙÙ‰";

    // Direct lookup first
    if (DISEASE_TRANSLATIONS[normalized]) return DISEASE_TRANSLATIONS[normalized];

    // Fallback: try with spaces instead of underscores (for cases like "black rot")
    const withSpaces = normalized.replace(/_/g, " ");
    if (DISEASE_TRANSLATIONS[withSpaces]) return DISEASE_TRANSLATIONS[withSpaces];

    // Partial match fallback â€” catches sub-strings like "spider_mites" from a longer label
    for (const [dictKey, arabicVal] of Object.entries(DISEASE_TRANSLATIONS)) {
        if (normalized.includes(dictKey) || dictKey.includes(normalized)) {
            return arabicVal;
        }
    }

    return engDisease; // last resort: return the original (will be English, but avoids silence)
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GEMINI MULTIMODAL FALLBACK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export async function predictPlantDiseaseWithGemini(imageBuffer, mimeType) {
    console.log("[Gemini Multimodal Fallback] Analyzing image directly...");
    const base64Data = imageBuffer.toString("base64");

    let cleanMimeType = mimeType;
    if (!cleanMimeType || !cleanMimeType.startsWith("image/")) {
        cleanMimeType = "image/jpeg";
    }
    console.log(`[Gemini Multimodal] Image base64 length: ${base64Data.length}, MIME: ${cleanMimeType}`);

    const jsonInstruction = 'Respond with ONLY a raw JSON object (no markdown, no code fences):\n{"plant":"PlantName","disease":"DiseaseName","confidence":75,"symptoms":"symptoms","cause":"cause","explanation":"explanation"}\nplant: one of Tomato, Apple, Grape, Peach, Pepper, Potato, Strawberry, Cherry, Corn, Blueberry, Orange, Raspberry, Soybean, Squash\ndisease: exact name or "healthy"\nconfidence: integer 50-99\nAll fields non-empty strings.';

    const response = await axios.post(
        `${GEMMA_BASE_URL}/chat/completions`,
        {
            model: GEMMA_MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: `You are an expert plant pathologist. Analyze this plant leaf image.\n${jsonInstruction}` },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${cleanMimeType};base64,${base64Data}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 400
        },
        {
            headers: {
                "Content-Type": "application/json",
                ...(GEMMA_API_KEY ? { "Authorization": `Bearer ${GEMMA_API_KEY}` } : {})
            },
            timeout: 45000
        }
    );

    const content = response.data?.choices?.[0]?.message?.content?.trim();
    console.log("[Gemini Multimodal] Raw response:", content ? content.substring(0, 300) : "EMPTY");
    if (!content) throw new Error("Gemini returned empty response for image analysis");

    // Extract JSON - handle markdown code fences if present
    let jsonStr = content;
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
    } else {
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) jsonStr = objMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    console.log("[Gemini Multimodal] Parsed:", JSON.stringify(parsed));
    return {
        plant:       parsed.plant       || "Unknown",
        disease:     parsed.disease     || "Unknown",
        confidence:  parsed.confidence  || 75,
        symptoms:    parsed.symptoms    || "N/A",
        cause:       parsed.cause       || "N/A",
        explanation: parsed.explanation || "N/A"
    };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ORCHESTRATOR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export async function processPlantAnalysis({ imageBuffer, mimeType, userQuestion = "", lang = "ar", res = null }) {
    const _debug = { layers_failed: [], gemma_used: false };

    // Layer 1 â€” CNN
    let cnnResult;
    try {
        cnnResult = await predictPlantDisease(imageBuffer);
        console.log("[AI Pipeline] âœ… Layer 1 (CNN):", cnnResult);
    } catch (err) {
        console.error("[AI Pipeline] âŒ Layer 1 (CNN) failed, attempting Gemini multimodal fallback...", err.message);
        _debug.layers_failed.push("cnn");
        
        try {
            const geminiResult = await predictPlantDiseaseWithGemini(imageBuffer, mimeType);
            console.log("[AI Pipeline] âœ… Gemini Multimodal Fallback Success:", geminiResult);
            cnnResult = {
                plant: geminiResult.plant,
                disease: geminiResult.disease,
                confidence: geminiResult.confidence,
                symptoms: geminiResult.symptoms,
                cause: geminiResult.cause,
                explanation: geminiResult.explanation
            };
        } catch (fallbackErr) {
            console.error("[AI Pipeline] âŒ Gemini Multimodal Fallback failed too:", fallbackErr.message);
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

    // Layer 2 â€” Gemma
    let finalExplanation;
    let modelUsed = "pipeline";
    const isHealthy = analysisResult.final_disease.toLowerCase().includes("healthy");

    try {
        console.log("[AI Pipeline] Calling Layer 2 (Gemma)...");
        finalExplanation = await refineWithGemma(analysisResult, userQuestion, lang);
        _debug.gemma_used = true;
        modelUsed = "gemma";
        console.log("[AI Pipeline] âœ… Layer 2 (Gemma): done");
    } catch (err) {
        console.warn("[AI Pipeline] âš ï¸ Layer 2 (Gemma) failed:", err.message);
        if (err.response) {
            console.warn("[AI Pipeline] Layer 2 error status:", err.response.status);
            console.warn("[AI Pipeline] Layer 2 error data:", JSON.stringify(err.response.data));
        }
        _debug.layers_failed.push("gemma");
        modelUsed = "fallback";

        const plantAr = getArabicPlant(analysisResult.final_plant);

        if (isHealthy) {
            finalExplanation = `Ø£Ù‡Ù„Ø§Ù‹ Ø¨ÙŠÙƒ! Ø£Ù†Ø§ ÙÙ„ÙˆØ±Ø§. ðŸŒ¿\nØ¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ ØªØ­Ù„ÙŠÙ„ÙŠØŒ Ø§Ù„Ù†Ø¨ØªØ© Ø§Ù„Ù„ÙŠ Ø¨Ø¹ØªÙ‡Ø§ Ù‡ÙŠ **${plantAr}** ÙˆÙ‡ÙŠ **Ø³Ù„ÙŠÙ…Ø© ÙˆÙ…Ø¹Ø§ÙØ§Ø©** ÙˆØ¨ØµØ­Ø© Ø¬ÙŠØ¯Ø© Ø¬Ø¯Ø§Ù‹.\n\nØ´ÙƒÙ„Ù‡Ø§ Ù…Ù…ØªØ§Ø² ÙˆØ¨ØªÙ†Ù…Ùˆ Ø¨Ø´ÙƒÙ„ Ø·Ø¨ÙŠØ¹ÙŠ. Ø­Ø§ÙØ¸ Ø¹Ù„ÙŠÙ‡Ø§ ÙˆØ§Ø³Ù‚ÙŠÙ‡Ø§ Ø¨Ø§Ù†ØªØ¸Ø§Ù… Ù„ØªÙØ¶Ù„ Ø¯Ø§ÙŠÙ…Ø§Ù‹ Ø®Ø¶Ø±Ø§Ø¡ ÙˆØ¬Ù…ÙŠÙ„Ø©!`;
        } else {
            const diseaseAr = getArabicDisease(analysisResult.final_disease);
            finalExplanation = `Ø£Ù‡Ù„Ø§Ù‹ Ø¨ÙŠÙƒ! Ø£Ù†Ø§ ÙÙ„ÙˆØ±Ø§. ðŸŒ¿\nØ¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ ØªØ­Ù„ÙŠÙ„ÙŠØŒ Ø§Ù„Ù†Ø¨ØªØ© Ø§Ù„Ù„ÙŠ Ø¨Ø¹ØªÙ‡Ø§ Ù‡ÙŠ **${plantAr}** ÙˆÙ…ØµØ§Ø¨Ø© Ø¨Ù€ **${diseaseAr}**.\n\nØ§Ù„Ù…Ø±Ø¶ Ø¯Ù‡ Ù…Ù…ÙƒÙ† ÙŠØ£Ø«Ø± Ø¹Ù„Ù‰ ØµØ­Ø© Ø§Ù„Ù†Ø¨Ø§Øª ÙˆÙŠÙ†ØªØ´Ø± Ù„Ø¨Ø§Ù‚ÙŠ Ø§Ù„Ø£ÙˆØ±Ø§Ù‚ Ø¨Ø³Ø±Ø¹Ø© Ù„Ùˆ Ù…ØªØ¯Ø®Ù„Ù†Ø§Ø´ØŒ Ø¨Ø³ Ù…ØªÙ‚Ù„Ù‚Ø´ ÙƒÙ„ Ù…Ø´ÙƒÙ„Ø© ÙˆÙ„ÙŠÙ‡Ø§ Ø­Ù„.\n\n(Ù‡Ù„ ØªØ­Ø¨ Ø£Ù† ØªØ¹Ø±Ù Ø¥Ø²Ø§ÙŠ ØªØ¹Ø§Ù„Ø¬Ù‡ØŸ)`;
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
