import joi from 'joi'
import { generalFields } from '../../Middlewares/validation.middleware.js'

export const sendMessageSchema = {
    body: joi.object({
        content:        joi.string().min(1).max(10000).required(),
        conversationId: joi.string().optional()
    })
};

export const getChatHistorySchema = {
    params: joi.object({
        conversationId: joi.string().required()
    })
};