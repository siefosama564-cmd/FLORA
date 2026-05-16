import joi from 'joi'
import{generalFields} from "../../Middlewares/validation.middleware.js"
export const signUpSchema = {
    body: joi.object({
        firstname: generalFields.firstname.required(),
        lastname: generalFields.lastname.required(),
        email: generalFields.email.required(),
        password: generalFields.password.required(),
        confirmPassword: generalFields.confirmPassword.required(),
        gender: generalFields.gender,
        phone: generalFields.phone,
       
    })
}

export const loginSchema = {
    body: joi.object({
        email: generalFields.email.required(),
        password: generalFields.password.required()
    })
}

export const confirmEmailSchema = {
    body: joi.object({
        email: generalFields.email.required(),
        otp: joi.string().required()
    })
}

export const forgetPasswordSchema = {
    body: joi.object({
        email: generalFields.email.required()
    })
}

export const resetPasswordSchema = {
    body: joi.object({
        email: generalFields.email.required(),
        password: generalFields.password.required(),
        otp: generalFields.otp.required(),
        confirmPassword: generalFields.confirmPassword
    })
}
