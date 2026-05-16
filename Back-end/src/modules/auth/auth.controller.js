import { Router } from "express";
import * as authservices from "./auth.service.js"
import { validation } from "../../Middlewares/validation.middleware.js";
import { forgetPasswordSchema, loginSchema, resetPasswordSchema, signUpSchema } from "./auth.validate.js";
import { authentication } from "../../Middlewares/auth.middleware.js";

const router = Router()

router.get('/',(req,res)=>{
    res.status(200).json({message:"hello from auth router"})
})
router.post("/signup",validation(signUpSchema),authservices.signUp)

router.post("/login",validation(loginSchema),authservices.login)

router.patch("/confirm-email",authservices.confirmEmail)

router.post("/logout",  authentication(), authservices.logout);


router.patch('/forget-password', validation(forgetPasswordSchema),authservices.forgetPassword)

router.patch('/reset-password', validation(resetPasswordSchema),authservices.resetPassword)

router.post('/refresh-token',authservices.refreshToken)
export default router