/**
 * chat.controller.js — FLORA Hybrid AI Chat (Final Stability Fix)
 */

import { Router }               from "express";
import multer                   from "multer";
import axios                    from "axios";
import { authentication }       from "../../Middlewares/auth.middleware.js";
import { messageModel }         from "../../DB/Models/message.model.js";
import * as dbServices          from "../../DB/dbService.js";
import { processPlantAnalysis } from "../../services/aiService.js";

const router = Router();

const GEMMA_BASE_URL = process.env.GEMMA_BASE_URL || "http://localhost:1234/v1";
const GEMMA_MODEL    = process.env.GEMMA_MODEL    || "google/gemma-4-e4b";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMMA_TIMEOUT  = parseInt(process.env.AI_TIMEOUT) || 90_000;

const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize:  10 * 1024 * 1024,
        fieldSize: 25 * 1024 * 1024 // حل إيرور Field value too long
    }
});

function detectLanguage(text) {
    if (!text) return "en";
    const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const latinChars  = (text.match(/[a-zA-Z]/g) || []).length;
    const total       = arabicChars + latinChars;
    return (arabicChars / (total || 1)) > 0.35 ? "ar" : "en";
}

function buildSystemPrompt(lang, diagnosisCtx) {
    const diagnosisBlock = diagnosisCtx ? (
        lang === "ar"
            ? `\n\n[نتيجة تحليل الصورة]\nالنبات: ${diagnosisCtx.plantName || ""}\nالمرض: ${diagnosisCtx.diseaseName || ""}\nالعلاج: ${diagnosisCtx.treatment || ""}`
            : `\n\n[Previous Diagnosis]\nPlant: ${diagnosisCtx.plantName}\nDisease: ${diagnosisCtx.diseaseName}`
    ) : "";
    return lang === "ar" 
        ? `أنت "فلورا" — خبير زراعي مصري. رد بلهجة مصرية مهنية ومختصرة.${diagnosisBlock}`
        : `You are "Flora" — a professional agronomist.${diagnosisBlock}`;
}

async function fetchConversationHistory(conversationId, userId) {
    if (!conversationId) return [];
    try {
        const messages = await messageModel.find({ conversationId, senderId: userId }).sort({ createdAt: 1 }).limit(10).lean();
        return messages.map(m => ({ role: m.senderType === "USER" ? "user" : "assistant", content: String(m.content || "") }));
    } catch (e) { return []; }
}

async function saveMessages(userId, conversationId, userContent, botContent) {
    if (!conversationId || !userId) return;
    try {
        await dbServices.create({ model: messageModel, data: { content: userContent, senderId: userId, senderType: "USER", conversationId } });
        await dbServices.create({ model: messageModel, data: { content: botContent,  senderId: userId, senderType: "BOT",  conversationId } });
    } catch (e) { console.error("[chat] Save Error:", e.message); }
}

function commitSSEHeaders(res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
}

function sseChunk(res, chunk) {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
}

function sseDone(res) {
    if (!res.writableEnded) { res.write("data: [DONE]\n\n"); res.end(); }
}

function streamTextAsSSE(res, text, onDone) {
    const words = text.split(/(\s+)/);
    let i = 0;
    const interval = setInterval(() => {
        if (res.writableEnded) { clearInterval(interval); return; }
        if (i >= words.length) {
            clearInterval(interval);
            if (!res.writableEnded) res.write(`data: ${JSON.stringify({ type: "model_info", model: "gemini" })}\n\n`);
            sseDone(res);
            if (onDone) onDone();
            return;
        }
        const chunk = words[i++];
        if (chunk) sseChunk(res, chunk);
    }, 10);
    return interval;
}

router.post("/ask", authentication(), chatUpload.single("image"), async (req, res) => {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { message, conversationId } = req.body;
    const lang = detectLanguage(message);
    const plantContext = req.body.plantContext ? (typeof req.body.plantContext === "string" ? JSON.parse(req.body.plantContext) : req.body.plantContext) : null;
    const dbHistory = await fetchConversationHistory(conversationId, userId);

    if (req.file) {
        commitSSEHeaders(res);
        try {
            const result = await processPlantAnalysis({ imageBuffer: req.file.buffer, mimeType: req.file.mimetype, userQuestion: message, lang, res });
            const fullRes = `🌿 **${result.plant || result.final_plant}** — ${result.disease || result.final_disease}\n\n${result.explanation}`;
            streamTextAsSSE(res, fullRes, () => {
                saveMessages(userId, conversationId, message, fullRes);
            });
        } catch (err) { sseDone(res); }
        return;
    }

    const systemPrompt = buildSystemPrompt(lang, plantContext);
    const messages = [{ role: "system", content: systemPrompt }, ...dbHistory, { role: "user", content: message }];
    
    commitSSEHeaders(res);
    try {
        const response = await axios.post(`${GEMMA_BASE_URL}/chat/completions`, 
            { model: GEMMA_MODEL, messages, stream: true },
            { responseType: 'stream', timeout: GEMMA_TIMEOUT }
        );

        let fullText = "";
        response.data.on('data', chunk => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const content = JSON.parse(line.slice(6)).choices[0].delta.content;
                        if (content) { fullText += content; sseChunk(res, content); }
                    } catch (e) {}
                }
            }
        });
        response.data.on('end', () => {
            res.write(`data: ${JSON.stringify({ type: "model_info", model: "gemma" })}\n\n`);
            sseDone(res);
            saveMessages(userId, conversationId, message, fullText);
        });
    } catch (e) { sseDone(res); }
});

export default router;