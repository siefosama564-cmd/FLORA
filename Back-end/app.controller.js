import { rateLimit } from "express-rate-limit"
import helmet from "helmet"
import authRouter from "./src/modules/auth/auth.controller.js"
import userRouter from "./src/modules/user/user.controller.js"
import messageRouter from "./src/modules/message/message.controller.js"
import plantRouter from "./src/modules/plant/plant.controller.js"
import chatRouter from "./src/modules/chat/chat.controller.js" // 🔥 السطر الجديد
import { connectDB } from "./src/DB/connection.js"
import { corsOption } from "./src/utils/cors/cors.utils.js"
import cors from "cors"
import { errorHandler } from "./src/utils/errorHandler.utils.js"
import dotenv from "dotenv"
import path from "node:path"
import morgan from "morgan"

const bootstrap = async (app, express) => {
    dotenv.config({ path: path.resolve("./src/config/.env.dev") })

    if (process.env.VERCEL) {
        app.set("trust proxy", 1);
    }

    app.use(express.json());
    app.use(cors(corsOption())); 
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginOpenerPolicy: { policy: "unsafe-none" }
    }));
    app.use(morgan("dev"));

    app.use("/uploads", express.static(path.resolve("./src/uploads")))

    const limiter = rateLimit({
        windowMs: 5 * 60 * 1000,
        limit: 200, 
        message: { statusCode: 429, message: "Too many requests" }
    })
    app.use(limiter)

    await connectDB()

    app.use('/api/v1/auth', authRouter)
    app.use('/api/v1/user', userRouter)
    app.use('/api/v1/plant', plantRouter)
    app.use('/api/v1/message', messageRouter)
    app.use('/api/v1/chat', chatRouter) // 🔥 تفعيل طريق الشات مع أولاما

    app.get("/", (req, res) => {
        res.status(200).json({ message: "FLORA API is Live" })
    })

    app.use((req, res, next) => {
        res.status(404).json({ message: "not found handler" })
    })

    app.use(errorHandler)
}

export default bootstrap