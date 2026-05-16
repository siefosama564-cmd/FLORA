import multer from "multer"


export const cloudFileUploadMulter=({
   customPath="general",
    validation=[]
})=>{

    const storage = multer.diskStorage({})
    
    const fileFilter = (req,file,cb)=>{
        if(validation.includes(file.mimetype)){
            cb(null,true)
        }else{
            cb(new Error ("invalid file type"),false)
        }
    }

    return multer({fileFilter,storage})

}

