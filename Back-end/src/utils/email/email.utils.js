import nodemailer from "nodemailer"

export const sendEmail = async ({
    to="",
    subject="",
    text="",
    html="",
    attachments=[]
}) => {
    const transporter = nodemailer.createTransport({
        service:"gmail",
        auth:{
            user:process.env.EMAIL,
            pass:process.env.PASSWORD
        }
    })

    const info = await transporter.sendMail({
        from:`youssef mahdy <${process.env.EMAIL}>`,
            to,
            subject,
            text,
            html,
            attachments

    })
    console.log(`message ${info.messageId}`);
    
}


export const emailSubject ={
    confirmEmail:"please confirm ur email",
    resetPassword:"please reset ur password"
}

