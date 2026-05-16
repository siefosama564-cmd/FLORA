import fs from "node:fs"
import path from "node:path"
import morgan from "morgan"

const __dirName = path.resolve()

export function attachRouterWithLogger(app, routerPath, router, logFileName) {
    // 1️⃣ المسار الكامل لمجلد اللوجز
    const logDir = path.join(__dirName, "./src/logs")

    // 2️⃣ لو المجلد مش موجود، اعمله
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
    }

    // 3️⃣ إنشاء WriteStream للملف
    const logStream = fs.createWriteStream(
        path.join(logDir, logFileName),
        { flags: "a" }
    )

    // 4️⃣ استخدام morgan
    app.use(routerPath, morgan("combined", { stream: logStream }), router)
    app.use(routerPath, morgan("dev"), router)
}
