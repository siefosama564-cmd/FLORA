/**
 * plant.service.js
 *
 * CHANGES:
 *   ✅ diagnosePlant  — replaced with 3-layer AI pipeline (Gemini + Gemma)
 *                       removed Ollama (port 11434) entirely
 *                       fixed DB save to match plant.model.js schema exactly
 *   ✔️  getMyHistory   — UNCHANGED
 *   ✔️  getPlantDetails — UNCHANGED
 */

import { plantModel }           from "../../DB/Models/plant.model.js";
import * as dbServices          from "../../DB/dbService.js";
import { successResponse }      from "../../utils/successResponse.js";
import fs                       from "node:fs";
import { processPlantAnalysis } from "../../services/aiService.js";

// ══════════════════════════════════════════════════════════════
// UNCHANGED — getMyHistory
// ══════════════════════════════════════════════════════════════
export const getMyHistory = async (req, res, next) => {
    const history = await dbServices.find({
        model:  plantModel,
        filter: { userId: req.user._id }
    });
    return successResponse({ res, data: { history } });
};

// ══════════════════════════════════════════════════════════════
// MODIFIED — diagnosePlant  (3-Layer AI Pipeline)
// ══════════════════════════════════════════════════════════════
export const diagnosePlant = async (req, res, next) => {
    // lang is available in outer scope for error message fallback
    const lang = req.body?.lang || req.query?.lang || "ar";

    try {
        // ── 1. Validate file ───────────────────────────────────
        if (!req.file) {
            return res.status(400).json({ message: "يرجى رفع صورة النبات" });
        }

        // cloud.multer.js → diskStorage({}) → req.file.path set,
        //                                     req.file.buffer = undefined
        const imageBuffer = req.file.buffer
            || (req.file.path ? fs.readFileSync(req.file.path) : null);

        if (!imageBuffer) {
            return res.status(400).json({
                message: "Image data is missing — check multer storage configuration"
            });
        }

        // ── 2. Optional user question alongside the image ──────
        const userQuestion = req.body.question || req.body.notes || "";

        // ── 3. Run 3-layer AI pipeline ─────────────────────────
        console.log(`[plant] Pipeline starting — user=${req.user._id}, lang=${lang}`);

        const result = await processPlantAnalysis({
            imageBuffer,
            mimeType:    req.file.mimetype || "image/jpeg",
            userQuestion,
            lang
        });

        console.log(`[plant] Done — ${result.plant} / ${result.disease} @ ${result.confidence.toFixed(1)}%`);

        // ── 4. Save to MongoDB with CORRECT schema fields ──────
        // plant.model.js requires:
        //   image.secure_url, image.public_id  (both required: true)
        //   diagnosis.diseaseName, diagnosis.confidence (0-1), diagnosis.treatment, diagnosis.description
        let savedId = null;
        try {
            const saved = await dbServices.create({
                model: plantModel,
                data: [{
                    userId: req.user._id,
                    image: {
                        secure_url: req.file.path || "local",
                        public_id:  `flora_${req.user._id}_${Date.now()}`
                    },
                    plantType: result.plant,
                    diagnosis: {
                        diseaseName: result.disease,
                        confidence:  result.confidence / 100, // model stores 0-1
                        treatment:   result.treatment,
                        description: result.explanation
                    },
                    status: "completed"
                }]
            });
            savedId = saved?.[0]?._id || null;
        } catch (dbErr) {
            // Non-critical — never let DB failure break the API response
            console.error("[plant] DB save error (non-critical):", dbErr.message);
        }

        // ── 5. Return final response to frontend ───────────────
        return res.status(200).json({
            message: "Success",
            data: {
                diagnosis: {
                    plant:       result.plant,
                    disease:     result.disease,
                    isHealthy:   result.isHealthy,
                    confidence:  `${Number(result.confidence).toFixed(1)}%`,
                    symptoms:    result.symptoms,
                    cause:       result.cause,
                    treatment:   result.treatment,
                    explanation: result.explanation,
                    recordId:    savedId,
                    ...(process.env.NODE_ENV === "development"
                        && { _debug: result._debug })
                }
            }
        });

    } catch (error) {
        console.error("[plant] Fatal error:", error.message);
        return res.status(500).json({
            message: lang === "ar"
                ? "فشل التشخيص. يرجى المحاولة مرة أخرى."
                : "Diagnosis failed. Please try again.",
            ...(process.env.NODE_ENV === "development"
                && { error: error.message })
        });
    }
};

// ══════════════════════════════════════════════════════════════
// UNCHANGED — getPlantDetails
// ══════════════════════════════════════════════════════════════
export const getPlantDetails = async (req, res, next) => {
    const { id } = req.params;
    const plant = await dbServices.findOne({
        model:  plantModel,
        filter: { _id: id, userId: req.user._id }
    });

    if (!plant) {
        return res.status(404).json({ message: "Diagnosis not found" });
    }

    return successResponse({ res, data: { plant } });
};
