import mongoose from "mongoose"

const plantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // بيانات الصورة المرفوعة
    image: {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true }
    },
    // نتيجة موديل أحمد (التعرف على نوع النبات)
    plantType: {
        type: String,
        trim: true,
        default: "Unknown"
    },
    // نتيجة موديل شهاب (تشخيص المرض)
    diagnosis: {
        diseaseName: { type: String, default: "Healthy" },
        confidence: { type: Number }, // نسبة التأكد (مثلاً 0.95)
        treatment: { type: String }, // العلاج المقترح
        description: { type: String } // وصف المرض
    },
    // لربط الفحص بمحادثة معينة مع الشات بوت (اختياري)
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    }
}, { timestamps: true })

export const plantModel = mongoose.models.Plant || mongoose.model("Plant", plantSchema)