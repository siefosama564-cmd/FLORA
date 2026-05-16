import {v2 as cloudinary} from "cloudinary"

export const cloudinaryConfig = ()=>{
    cloudinary.config({
        cloud_name: "dgm9bf4iu", // بياناتك الحقيقية من ملف الانف
        api_key: "919481924233859",
        api_secret: "gHMesD59a2LlVE0pVFhQUU14Xuc"
    })
    return cloudinary
}