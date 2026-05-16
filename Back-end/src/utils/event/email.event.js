import {EventEmitter} from "node:events"
import { emailSubject, sendEmail } from "../email/email.utils.js"
import { template } from "../email/generate.html.js"

export const eventEmitter = new EventEmitter()

eventEmitter.on("confirmEmail",async (data) => {
    try {
        await sendEmail({
            to:data.to,
            subject:emailSubject.confirmEmail,
            html:template({code:data.otp,subject:emailSubject.confirmEmail})
        })
    } catch (error) {
        console.log("something went wrong"+error.message);
        
    }
})

eventEmitter.on("resetPassword",async (data) => {
    await sendEmail({
        to:data.to,
        subject:emailSubject.resetPassword,
        html:template({code:data.otp,firstName:data.firstname,subject:emailSubject.resetPassword})
    }).catch((error)=>{
        console.log(error.message);
        
    })

})