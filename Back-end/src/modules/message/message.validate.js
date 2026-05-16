import joi from 'joi'
import { Types } from 'mongoose'
import { generalFields } from '../../Middlewares/validation.middleware.js'


export const sendMessageSchema = {
    body: joi.object({
        content:joi.string().min(2).max(1000).required()
    }),
    params: joi.object({
         receiverId: generalFields.id
    })
}