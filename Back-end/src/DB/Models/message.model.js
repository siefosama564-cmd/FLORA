import mongoose from "mongoose"

export const messageSchema = new mongoose.Schema({
    content: {
        type: String,
        // ✅ رفعنا الـ maxLength من 1000 لـ 10000
        // ردود الـ AI بتكون أطول من 1000 حرف وكانت بتسبب Validation Error
        minLength: [1, 'message must be at least 1 character'],
        maxLength: [10000, 'message must be at most 10000 characters']
    },
    // مين اللي بعت الرسالة؟
    senderId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    // هل الرسالة من المستخدم ولا رد من الـ AI؟
    senderType: {
        type: String,
        enum: ['USER', 'BOT'],
        default: 'USER'
    },
    // لو المزارع بعت صورة مع السؤال
    attachments: [{
        secure_url: String,
        public_id: String
    }],
    // لربط الرسائل ببعضها كـ Conversation واحدة
    conversationId: {
        type: String // ممكن تستخدم UUID أو ObjectId
    }
}, { timestamps: true })

export const messageModel = mongoose.models.Message || mongoose.model("Message", messageSchema)
