

import express from "express"

import  bootstrap  from "./app.controller.js"


const app = express()


 await bootstrap(app,express)


const PORT = process.env.PORT

app.listen(PORT,()=>{
    console.log(`server runing at port ${PORT}`);
   

    
})