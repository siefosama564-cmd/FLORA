import mongoose from "mongoose"

// Enums


// إضافة دور "خبير" للـ roles لو حابين
export const roleEnum = {
    ADMIN: "ADMIN",
    USER: "USER",
    EXPERT: "EXPERT" // إضافة اختيارية لمشروع FLORA
}

export const providerEnum = {
    GOOGLE: "GOOGLE",
    SYSTEM: "SYSTEM"
}

export const genderEnum = {
    MALE: "MALE",
    FEMALE: "FEMALE"
}



// User Schema
const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
        trim: true,
        minLength: [2, "firstname must be at least 2 characters"],
        maxLength: [20, "firstname must be at most 20 characters"]
    },
    lastname: {
        type: String,
        required: true,
        trim: true,
        minLength: [2, "lastname must be at least 2 characters"],
        maxLength: [20, "lastname must be at most 20 characters"]
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function () {
            // password is required if provider is SYSTEM
            return this.providers !== providerEnum.GOOGLE
        }
    },
    providers: {
        type: String,
        enum: {
            values: Object.values(providerEnum),
            message: "{VALUE} is not a valid provider"
        },
        default: providerEnum.SYSTEM
    },
    gender: {
        type: String,
        enum: {
            values: Object.values(genderEnum),
            message: (props) => `${props.value} is not a valid gender`
        },
        default: genderEnum.MALE
    },
    phone: {
        type: String,
        trim: true
    },
    confirmEmail: Date,
    confirmEmailOTP: String,
    confirmEmailOTPExpires:{
        type:Date
    },
      address: { // مفيد لتحديد البيئة الزراعية
        type: String,
        trim: true
    },
    cropsOfInterest: [String], // أنواع المحاصيل اللي المزارع مهتم بيها (مثلاً: طماطم، بطاطس)
    
    // ... باقي الكود ...
    confirmPasswordExpires:Date,
    forgetPasswordOTP: String,
    confirmPassword:Date,
    profileImage: String,
    coverImages: [String],
    cloudProfileImage: { public_id: String, secure_url: String },
    cloudCoverImages: [{ public_id: String, secure_url: String }],
    freezeAt: Date,
    freezeBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    restoreAt: Date,
    role: {
        type: String,
        enum: {
            values: Object.values(roleEnum),
            message: "{VALUE} is not a valid role"
        },
        default: roleEnum.USER
    }
}, {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
})



// الـ Virtuals هنا ممتازة لربط محادثات الشات بوت
userSchema.virtual("chatHistory", {
    localField: "_id",
    foreignField: "userId", // تأكد إن الـ Message model بيستخدم userId
    ref: "Message"
})


export const userModel = mongoose.models.User || mongoose.model("User", userSchema)
