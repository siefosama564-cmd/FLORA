export const errorHandler = (err,req,res,next)=>{

   const status = err.cause || 500


    return res.status(status).json({message:err.message||"something went wrong",cause:err.cause,stack:err.stack})

}

