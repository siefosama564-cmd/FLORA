import joi from 'joi';
import { generalFields } from "../../Middlewares/validation.middleware.js";

export const diagnoseSchema = {
    body: joi.object({
        notes: joi.string().max(200).optional()
    }),
    // تأكد إن الـ Middleware عندك بيبعت req.file للـ joi هنا
    file: joi.object().required().messages({
        "any.required": "Please upload a plant image"
    })
};
export const getByIdSchema = {
    params: joi.object({
        id: generalFields.id.required()
    })
};