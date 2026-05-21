/**
 * chat.controller.js — FLORA Hybrid AI Chat
 * Buffer-then-Stream: full AI response is fetched first, then streamed
 * word-by-word from memory — guarantees no truncation while keeping
 * the typing animation UX intact.
 */

import { Router }               from "express";
import multer                   from "multer";
import axios                    from "axios";
import { authentication }       from "../../Middlewares/auth.middleware.js";
import { messageModel }         from "../../DB/Models/message.model.js";
import * as dbServices          from "../../DB/dbService.js";
import { processPlantAnalysis, getArabicPlant, getArabicDisease } from "../../services/aiService.js";

const router = Router();

const GEMMA_BASE_URL = process.env.GEMMA_BASE_URL || "http://localhost:1234/v1";
const GEMMA_MODEL    = process.env.GEMMA_MODEL    || "gemma-3-4b-it";
const GEMMA_TIMEOUT  = parseInt(process.env.AI_TIMEOUT) || 90_000;

const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, fieldSize: 25 * 1024 * 1024 }
});

// ── SSE Helpers (Buffer-then-Stream) ─────────────────────────────────────────
function _setSseHeaders(res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
}

function _sseJson(res, obj) {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

function _sseDone(res) {
    if (!res.writableEnded) { res.write("data: [DONE]\n\n"); res.end(); }
}

/**
 * Takes a COMPLETE pre-fetched string and drips it word-by-word to the client.
 * The entire text is already in memory — the network can never cut it short.
 */
function _streamBufferedText(res, fullText, model = "gemma") {
    return new Promise(resolve => {
        _sseJson(res, { type: "model_info", model });
        const words = fullText.split(" ");
        let i = 0;
        const CHUNK = 3;   // words per tick
        const DELAY = 35;  // ms between ticks

        const tick = () => {
            if (res.writableEnded) { resolve(); return; }
            if (i >= words.length) { _sseDone(res); resolve(); return; }
            const slice = words.slice(i, i + CHUNK).join(" ") + (i + CHUNK < words.length ? " " : "");
            _sseJson(res, { chunk: slice });
            i += CHUNK;
            setTimeout(tick, DELAY);
        };
        tick();
    });
}

// ── Post-processing: strip phrases Gemma 4B produces despite the system prompt ──
// Small models (4B params) frequently ignore style rules. We strip offending
// phrases at the output level so they never reach the user.
const FORBIDDEN_PHRASES = [
    /يا حبيبي[،,]?\s*/g,
    /يا عزيزي[،,]?\s*/g,
    /يا صديقي[،,]?\s*/g,
    /يا أخي[،,]?\s*/g,
    /يا أختي[،,]?\s*/g,
    /يا سيدي[،,]?\s*/g,       // keep "بس يا سيدي" pattern below — only strip leading greeting
];

function cleanArabicResponse(text) {
    if (!text) return text;
    let cleaned = text;
    // Strip forbidden greeting phrases that appear at the very start of a sentence
    // (i.e., right after a line-break or at position 0). Mid-sentence occurrences
    // that are semantically necessary are left untouched.
    cleaned = cleaned
        .replace(/^يا حبيبي[،,]?\s*/m, "")
        .replace(/^يا عزيزي[،,]?\s*/m, "")
        .replace(/^يا صديقي[،,]?\s*/m, "")
        .replace(/^يا أخي[،,]?\s*/m,   "")
        .replace(/^يا أختي[،,]?\s*/m,  "")
        .replace(/yا حبيبي[،,]?\s*/g, "")   // mid-sentence catch-all
        .replace(/يا حبيبي[،,]?\s*/g, "");
    return cleaned.trimStart();
}

// ── Language detection ────────────────────────────────────────────────────────
function detectLanguage(text) {
    if (!text) return "ar"; // Default to Arabic for FLORA
    const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const latinChars  = (text.match(/[a-zA-Z]/g) || []).length;
    const total       = arabicChars + latinChars;
    return (arabicChars / (total || 1)) > 0.35 ? "ar" : "en";
}

function buildSystemPrompt(lang, diagnosisCtx) {
    const rawPlant   = diagnosisCtx ? (diagnosisCtx.plant   || diagnosisCtx.plantName   || "") : "";
    const rawDisease = diagnosisCtx ? (diagnosisCtx.disease || diagnosisCtx.diseaseName || "") : "";

    const plantName   = lang === "ar" ? getArabicPlant(rawPlant)   : rawPlant;
    const diseaseName = lang === "ar" ? getArabicDisease(rawDisease) : rawDisease;
    const isHealthy   = rawDisease.toLowerCase().includes("healthy");

    const diagnosisBlock = diagnosisCtx ? (
        lang === "ar"
            ? `\n\n[نتيجة تحليل الصورة]\nالنبات: ${plantName}\nالمرض/الحالة: ${isHealthy ? "سليم ومعافى" : diseaseName}`
            : `\n\n[Previous Diagnosis]\nPlant: ${plantName}\nDisease/Status: ${isHealthy ? "Healthy" : diseaseName}`
    ) : "";

    if (lang === "ar") {
        return `أنت "فلورا" — خبيرة زراعية مصرية ذكية وودودة للغاية.
قواعد الرد الصارمة:
1. ردك يجب أن يكون بالكامل باللهجة المصرية العامية البسيطة — ممنوع الفصحى أو الإنجليزي.
2. رد مباشرة على سؤال المستخدم بشكل دافئ ومفيد.
3. لا تكرر بيانات التشخيص — المستخدم يعرفها بالفعل.${diagnosisBlock}`;
    }
    return `You are "Flora" — a friendly, professional agricultural assistant. Answer the user's question clearly and helpfully.${diagnosisBlock}`;
}

async function fetchConversationHistory(conversationId, userId) {
    if (!conversationId) return [];
    try {
        const messages = await messageModel.find({ conversationId, senderId: userId })
            .sort({ createdAt: 1 }).limit(15).lean();
        return messages.map(m => ({ role: m.senderType === "USER" ? "user" : "assistant", content: String(m.content || "") }));
    } catch { return []; }
}

async function saveMessages(userId, conversationId, userContent, botContent) {
    if (!conversationId || !userId) return;
    try {
        await dbServices.create({ model: messageModel, data: { content: userContent, senderId: userId, senderType: "USER", conversationId } });
        await dbServices.create({ model: messageModel, data: { content: botContent,  senderId: userId, senderType: "BOT",  conversationId } });
    } catch (e) { console.error("[chat] Save Error:", e.message); }
}

// ── /ask Route ────────────────────────────────────────────────────────────────
router.post("/ask", authentication(), chatUpload.single("image"), async (req, res) => {
    console.log("\n[chat.controller] === New /ask Request ===");
    console.log("[chat.controller] User ID:", req.user?._id);

    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { message, conversationId } = req.body;

    // ── Language detection with history fallback ──────────────────────────
    let lang = detectLanguage(message);
    const dbHistory = await fetchConversationHistory(conversationId, userId);

    const hasArabic  = /[\u0600-\u06FF\u0750-\u077F]/.test(message || "");
    const hasEnglish = /[a-zA-Z]/.test(message || "");
    const isShortMsg = (message || "").trim().split(/\s+/).length <= 3;

    // For short or symbol-only messages, inherit language from conversation history
    if ((!hasArabic && !hasEnglish) || isShortMsg) {
        if (dbHistory.length > 0) {
            const lastMsg = [...dbHistory].reverse().find(m => m.role === "user");
            if (lastMsg) lang = detectLanguage(lastMsg.content);
        }
    }

    // ── Recover plantContext from DB if not sent by frontend ─────────────
    // FIX: Wrap JSON.parse in try-catch. A malformed plantContext string was
    // throwing an uncaught exception BEFORE _setSseHeaders() was called, which
    // caused Express to respond with a JSON error instead of an SSE stream —
    // making the frontend display the reply as one solid block (Bug 2 trigger).
    let plantContext = null;
    try {
        const raw = req.body.plantContext;
        if (raw) plantContext = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (parseErr) {
        console.warn("[chat.controller] plantContext parse error (ignored):", parseErr.message);
    }

    // FIX: Guard against undefined message. If express.json() partially parsed
    // the body (e.g., due to earlier 413 on a large request that the client
    // retried), message could be undefined — causing Gemma to receive an empty
    // messages array and the stream to fail silently.
    const safeMessage = (typeof message === "string" && message.trim()) ? message.trim() : "";

    if (!plantContext && conversationId) {
        try {
            const lastDiagnosis = await messageModel.findOne({
                conversationId, senderType: "BOT",
                content: { $regex: /^🌿 \*\*/ }
            }).sort({ createdAt: -1 }).lean();

            if (lastDiagnosis) {
                const match = lastDiagnosis.content.match(/^🌿 \*\*([^*]+)\*\* — ([^\n]+)/);
                if (match) {
                    plantContext = { plant: match[1].trim(), disease: match[2].trim() };
                    console.log("[chat.controller] 🔄 Recovered plantContext:", plantContext);
                }
            }
        } catch (dbErr) {
            console.warn("[chat.controller] plantContext recovery error:", dbErr.message);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // IMAGE REQUEST — Buffer-then-Stream
    // ══════════════════════════════════════════════════════════════════════
    if (req.file) {
        _setSseHeaders(res);
        try {
            console.log("[chat.controller] 🖼️  Running plant analysis pipeline...");
            const result = await processPlantAnalysis({
                imageBuffer:  req.file.buffer,
                mimeType:     req.file.mimetype,
                userQuestion: message,
                lang
            });

            const isHealthy = result.isHealthy;
            const fullRes   = `🌿 **${result.plant}** — ${result.disease}\n\n${result.explanation}`;

            // Send diagnosis metadata BEFORE streaming text
            _sseJson(res, {
                type:       "diagnosis_meta",
                plant:      result.plant,
                disease:    result.disease,
                confidence: result.confidence,
                symptoms:   result.symptoms,
                cause:      result.cause,
                treatment:  result.treatment,
                isHealthy:  isHealthy
            });

            // Stream the full pre-fetched text — never truncates
            await _streamBufferedText(res, fullRes, result.model || "gemma");
            await saveMessages(userId, conversationId, message, fullRes);

        } catch (err) {
            console.error("[chat.controller] ❌ Pipeline error:", err.message);
            const errMsg = lang === "ar"
                ? "عذراً، حصل خطأ أثناء تحليل الصورة. حاول تاني."
                : "Sorry, an error occurred during image analysis. Please try again.";
            await _streamBufferedText(res, errMsg, "fallback");
        }
        return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // TEXT FOLLOW-UP — Buffer-then-Stream
    // ══════════════════════════════════════════════════════════════════════
    _setSseHeaders(res);

    const plantName   = plantContext ? (plantContext.plant   || plantContext.plantName   || "") : "";
    const diseaseName = plantContext ? (plantContext.disease || plantContext.diseaseName || "") : "";
    const isHealthy   = diseaseName.toLowerCase().includes("healthy");

    const systemPrompt = buildSystemPrompt(lang, plantContext);
    const messages     = [{ role: "system", content: systemPrompt }, ...dbHistory, { role: "user", content: safeMessage }];

    // Step 1: Fetch the FULL reply from Gemma first
    let fullReply = "";
    let modelUsed = "gemma";

    try {
        console.log("[chat.controller] Fetching full reply from Gemma...");
        const gemmaRes = await axios.post(
            `${GEMMA_BASE_URL}/chat/completions`,
            { model: GEMMA_MODEL, messages, stream: false, temperature: 0.7, max_tokens: 1200 }, // FIX (Image 2): 500 was cutting Arabic responses mid-sentence
            { headers: { "Content-Type": "application/json" }, timeout: GEMMA_TIMEOUT }
        );
        fullReply = gemmaRes.data?.choices?.[0]?.message?.content?.trim();
        if (!fullReply) throw new Error("Gemma returned empty response");
        console.log("[chat.controller] ✅ Full reply fetched from Gemma. Length:", fullReply.length);

    } catch (err) {
        console.warn("[chat.controller] ⚠️ Gemma failed:", err.message, "— using fallback");
        modelUsed = "fallback";

        if (lang === "ar") {
            if (plantName) {
                const plantAr   = getArabicPlant(plantName);
                const diseaseAr = getArabicDisease(diseaseName);
                if (isHealthy) {
                    fullReply = `نبات الـ **${plantAr}** بتاعك سليم وصحي تماماً ومحتاجش علاج. بس اتأكد إنك بتسقيه وبتديه الضوء المناسب بانتظام!`;
                } else {
                    fullReply = `بالنسبة لنبات الـ **${plantAr}** المصاب بـ **${diseaseAr}**، إليك أهم الإرشادات:\n`;
                    fullReply += `1. **عزل النبات:** افصله فوراً عن النباتات التانية.\n`;
                    fullReply += `2. **تنظيم الري:** قلل المية وبلاش ترش الأوراق مباشرة.\n`;
                    fullReply += `3. **التهوية:** حطه في مكان فيه هواء وضوء طبيعي كويس.\n`;
                    fullReply += `4. **استشارة متخصص:** راجع مرشد زراعي لاختيار العلاج المناسب.`;
                }
            } else {
                fullReply = "أهلاً بك! أنا فلورا. في مشكلة بالاتصال بالخدمة الذكية دلوقتي — تأكد إن LM Studio شغال وحاول تاني.";
            }
        } else {
            fullReply = plantName
                ? (isHealthy
                    ? `Your **${plantName}** is healthy. Just ensure regular watering and proper light!`
                    : `For your **${plantName}** with **${diseaseName}**: isolate it, reduce watering, ensure ventilation, and consult a specialist.`)
                : "Hello! I'm Flora. The AI service is currently unavailable. Please make sure LM Studio is running.";
        }
    }

    // FIX: Strip forbidden phrases (يا حبيبي etc.) that Gemma 4B produces
    // despite explicit system-prompt rules — small models frequently ignore style constraints.
    fullReply = cleanArabicResponse(fullReply);

    // Step 2: Stream the fully buffered reply word-by-word
    await _streamBufferedText(res, fullReply, modelUsed);
    await saveMessages(userId, conversationId, safeMessage, fullReply);
});

export default router;
