import multer from "multer"
import fs from "node:fs"
import path from "node:path"

export const fileValidation = {
    images: ["image/png", "image/jpeg", "image/jpg"],
    videos: ["video/mp4", "video/mj2", "video/mpeg"],
    audios: ["audio/webm", "audio/x-pn-realaudio-plugin"],
    documents: ["application/pdf", "application/msword"],
}

export const localFileUpload = ({
    customPath = "general",
    validation = []
}) => {
    // التأكد إن المسار الأساسي بيبدأ من جذر المشروع
    const basePath = `uploads/${customPath}`
    
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            let userPath = basePath
            // ربط الصورة باليوزر اللي مسجل دخول (عشان الـ History)
            if (req.user?._id) userPath += `/${req.user._id}`
            
            // المسار النهائي اللي الصورة هتتحفظ فيه بجد
            const fullPath = path.resolve(`./${userPath}`) 
            
            // إنشاء الفولدر لو مش موجود (recursive عشان يعمل الفولدرات الفرعية)
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true })
            }

            cb(null, fullPath)
        },
        filename: (req, file, cb) => {
            // عمل اسم فريد للصورة عشان ما يحصلش تداخل
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9) + "-" + file.originalname
            
            // حفظ المسار في الـ file object عشان نستخدمه في الداتا بيز بسهولة
            file.finalPath = `${basePath}/${req.user?._id}/${uniqueSuffix}`
            
            cb(null, uniqueSuffix)
        }
    })

    const fileFilter = (req, file, cb) => {
        // التأكد إن نوع الملف مسموح بيه (صور نباتات مثلاً)
        if (!validation.includes(file.mimetype)) {
            return cb(new Error("invalid file type", { cause: 400 }), false)
        }
        return cb(null, true)
    }

    return multer({ fileFilter, storage })
}