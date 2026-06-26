

import express from "express"

import  bootstrap  from "./app.controller.js"


const app = express()


 await bootstrap(app,express)


const PORT = process.env.PORT || 3000

if (!process.env.VERCEL) {
    app.listen(PORT,()=>{
        console.log(`server runing at port ${PORT}`);
    })
}

export default app;