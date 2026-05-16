/**
 * message.service.js
 *
 * CHANGES:
 *   ✅ sendMessage     — removed Ollama (port 11434) entirely
 *                        replaced with Gemma-4 via LM Studio (port 1234)
 *                        removed hardcoded "يا سيف" from fallback message
 *                        improved prompt quality + language detection
 *   ✔️  getChatHistory  — UNCHANGED
 *   ✔️  getUserConversations — UNCHANGED
 */

import mongoose       from "mongoose";
import { messageModel } from "../../DB/Models/message.model.js";
import * as dbServices  from "../../DB/dbService.js";
import { successResponse } from "../../utils/successResponse.js";
import axios            from "axios";

// ── Config ──────────────────────────────────────────────────────────────────
const GEMMA_BASE_URL = process.env.GEMMA_BASE_URL || "http://localhost:1234/v1";
const GEMMA_MODEL    = process.env.GEMMA_MODEL    || "gemma-3-4b-it";

// ── Language detection helper ────────────────────────────────────────────────
function detectLanguage(text) {
    if (!text) return "en";
    const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const en = (text.match(/[a-zA-Z]/g) || []).length;
    return ar / (ar + en + 1) > 0.35 ? "ar" : "en";
}

// ══════════════════════════════════════════════════════════════
// MODIFIED — sendMessage
// ══════════════════════════════════════════════════════════════
export const sendMessage = async (req, res, next) => {
    const { content, conversationId } = req.body;

    // Save user message first
    const userMessage = await dbServices.create({
        model: messageModel,
        data: [{
            content,
            senderId:       req.user._id,
            senderType:     "USER",
            conversationId: conversationId || new mongoose.Types.ObjectId()
        }]
    });

    const lang = detectLanguage(content);

    // ── Build prompt ─────────────────────────────────────────
    const systemRole = lang === "ar"
        ? `أنت "فلورا" خبيرة زراعية مصرية ذكية. ردودك بالعربية المصرية العامية فقط — ممنوع الفصحى أو الإنجليزي.`
        : `You are "Flora", a smart agricultural AI expert. Reply in natural English only — no Arabic.`;

    try {
        const gemmaResponse = await axios.post(
            `${GEMMA_BASE_URL}/chat/completions`,
            {
                model:    GEMMA_MODEL,
                messages: [
                    { role: "system", content: systemRole },
                    { role: "user",   content }
                ],
                temperature: 0.6,
                max_tokens:  300,
                stream:      false
            },
            { timeout: 45000 }
        );

        const botReplyText = gemmaResponse.data?.choices?.[0]?.message?.content?.trim()
            || (lang === "ar" ? "معلش، مفيش رد من الذكاء الاصطناعي دلوقتي." : "Sorry, no response from AI at the moment.");

        const botMessage = await dbServices.create({
            model: messageModel,
            data: [{
                content:        botReplyText,
                senderId:       req.user._id,
                senderType:     "BOT",
                conversationId: userMessage[0].conversationId
            }]
        });

        return successResponse({
            res,
            status:  201,
            message: "Success",
            data: {
                userMessage: userMessage[0],
                botReply:    botMessage[0]
            }
        });

    } catch (error) {
        console.error("[message] Gemma error:", error.message);

        // Fallback — clean message, no hardcoded name
        const fallbackText = lang === "ar"
            ? "عذرًا، الذكاء الاصطناعي مش شغال دلوقتي. تأكد إن LM Studio شغال وفيه موديل محمّل."
            : "Sorry, the AI is currently unavailable. Make sure LM Studio is running with a loaded model.";

        return res.status(201).json({
            status: "Success",
            data: {
                userMessage: userMessage[0],
                botReply: {
                    content:    fallbackText,
                    senderType: "BOT"
                }
            }
        });
    }
};

// ══════════════════════════════════════════════════════════════
// UNCHANGED — getChatHistory
// ══════════════════════════════════════════════════════════════
export const getChatHistory = async (req, res) => {
    const { conversationId } = req.params;
    const messages = await dbServices.find({
        model:  messageModel,
        filter: { conversationId }
    });
    return successResponse({ res, data: { messages } });
};

// ══════════════════════════════════════════════════════════════
// UNCHANGED — getUserConversations
// ══════════════════════════════════════════════════════════════
export const getUserConversations = async (req, res) => {
    const userId = req.user._id;
    const conversations = await messageModel.aggregate([
        { $match:  { senderId: userId } },
        { $sort:   { createdAt: -1 } },
        { $group:  { _id: "$conversationId", lastMessage: { $first: "$content" }, updatedAt: { $first: "$createdAt" } } },
        { $sort:   { updatedAt: -1 } }
    ]);
    return successResponse({ res, data: { conversations } });
};
