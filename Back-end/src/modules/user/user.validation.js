import joi from 'joi'

import { fileValidation } from '../../utils/multer/local.multer.js'
import { generalFields } from '../../Middlewares/validation.middleware.js'

export const profileImageSchema = {


    file: generalFields.file.keys({
        fieldname: joi.string().valid("profileImage").required()
    }).required()
    
}


export const freezeAccountSchema = {
    params: joi.object({
        userId:generalFields.id
    })
    
}

export const restoreAccountSchema = {
    params: joi.object({
        userId:generalFields.id
    })
    
}