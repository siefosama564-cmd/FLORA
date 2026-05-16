import mongoose from"mongoose"

 const tokenSchema = new mongoose.Schema({
    jwtid:{
        type:String,
        required:true,
        unique:true
    },
    expiresIn:{
        type:Date,
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    }
},{timestamps:true})

export const tokenModel = mongoose.models.Token || mongoose.model("Token",tokenSchema)