# Chapter 6: Back-End Development

## 6.1 Back-End Architecture & RESTful Design Principles

The backend server of project FLORA acts as the central coordinator of the platform. It manages communication between the client frontend interface, the database, the Flask image classification service, and the local large language model. To support high-concurrency requests, file uploads, and real-time text streaming, the server is designed around non-blocking I/O operations and MVC separation.

### 6.1.1 Node.js and Express.js Core Frameworks
The backend application is developed using **Node.js** and the **Express.js** web framework.
*   **Asynchronous Event Loop**: Node.js handles database queries, external API calls, and image uploads asynchronously. It delegates I/O tasks to the libuv thread pool (configured with `UV_THREADPOOL_SIZE=4`), preventing slower networking calls from blocking the single main execution thread. This is crucial for handling concurrent file uploads from multiple active users.
*   **Modular Express Routing**: Route handling is split into modular routers (`auth.controller.js`, `user.controller.js`, `plant.controller.js`, `message.controller.js`, `chat.controller.js`), keeping the codebase clean and maintainable.
*   **Production Process Management**: In production, the Node.js application is managed using **PM2** in cluster mode. Cluster mode spawns multiple instances of the Node process, automatically load-balancing incoming requests across all available CPU cores:

```bash
# Spawning Express cluster across maximum available CPU cores
pm2 start index.js -i max --name "flora-backend"
```

This guarantees high availability and zero-downtime reloads during system updates.

### 6.1.2 Model-View-Controller (MVC) Separation
The server is structured around the MVC design pattern:
1.  **DB Layer (Model)**: Defines database structures, schema rules, and data access configurations using Mongoose ODM.
2.  **Middlewares**: Intercepts requests to handle security checks, token validations, file uploads, and input parsing before routing.
3.  **Modules & Controllers**: Defines API routes, handles business logic, and coordinates communication with external AI endpoints.

[INSERT IMAGE HERE: Figure 6.1 - The MVC Separation and Request Lifecycle inside the FLORA Express Backend]

---

## 6.2 Application Bootstrapping, Server Configuration, and Environment Variables

### 6.2.1 Application Entry Point (`index.js` & `app.controller.js`)
The application boots through `index.js`, initializing Express, and calling `bootstrap(app, express)` to register global middleware, connect to MongoDB, and mount modular routers.

#### Entry Point (`index.js`)
```javascript
import express from "express"
import bootstrap from "./app.controller.js"

const app = express()

await bootstrap(app, express)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`server runing at port ${PORT}`);
})
```

#### Application Bootstrapper (`app.controller.js`)
```javascript
import { rateLimit } from "express-rate-limit"
import helmet from "helmet"
import authRouter from "./src/modules/auth/auth.controller.js"
import userRouter from "./src/modules/user/user.controller.js"
import messageRouter from "./src/modules/message/message.controller.js"
import plantRouter from "./src/modules/plant/plant.controller.js"
import chatRouter from "./src/modules/chat/chat.controller.js"
import { connectDB } from "./src/DB/connection.js"
import { corsOption } from "./src/utils/cors/cors.utils.js"
import cors from "cors"
import { errorHandler } from "./src/utils/errorHandler.utils.js"
import dotenv from "dotenv"
import path from "node:path"
import morgan from "morgan"

const bootstrap = async (app, express) => {
    dotenv.config({ path: path.resolve("./src/config/.env.dev") })

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
    app.use('/api/v1/chat', chatRouter)

    app.get("/", (req, res) => {
        res.status(200).json({ message: "FLORA API is Live" })
    })

    app.use((req, res, next) => {
        res.status(404).json({ message: "not found handler" })
    })

    app.use(errorHandler)
}

export default bootstrap
```

### 6.2.2 Environment Configurations
To keep credentials separate from code, the server relies on environment variables, as summarized in Table 6.1:

| Variable Name | Default Value | Description / Scope |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port on which the Express server listens. |
| `MONGO_URI` | `mongodb://localhost:27017/flora` | Connection URI for the database cluster. |
| `AI_ENGINE_URL` | `http://127.0.0.1:5000/predict` | Destination endpoint of the Flask CNN server. |
| `GEMMA_BASE_URL` | `http://localhost:1234/v1` | Base endpoint of the LM Studio inference service. |
| `GEMMA_MODEL` | `gemma-3-4b-it` | Name of the GGUF model loaded in LM Studio. |
| `AI_TIMEOUT` | `90000` | Global timeout (in ms) for AI generation requests. |

---

## 6.3 Database Design and Mongoose ODM Collection Schemas

FLORA uses **MongoDB** as its database, modeling collections using the **Mongoose** Object Document Mapper. The schema consists of four collections:

### 6.3.1 User Collection Schema (`User`)
Stores client profiles, hashed credentials, and status flags:

```javascript
import mongoose from "mongoose"

export const roleEnum = {
    ADMIN: "ADMIN",
    USER: "USER",
    EXPERT: "EXPERT"
}

export const providerEnum = {
    GOOGLE: "GOOGLE",
    SYSTEM: "SYSTEM"
}

export const genderEnum = {
    MALE: "MALE",
    FEMALE: "FEMALE"
}

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
    confirmEmailOTPExpires: {
        type: Date
    },
    address: {
        type: String,
        trim: true
    },
    cropsOfInterest: [String],
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

userSchema.virtual("chatHistory", {
    localField: "_id",
    foreignField: "userId",
    ref: "Message"
})

export const userModel = mongoose.models.User || mongoose.model("User", userSchema)
```

### 6.3.2 Token Collection Schema (`Token`)
Tracks active sessions to handle access validation:

```javascript
import mongoose from "mongoose"

const tokenSchema = new mongoose.Schema({
    jwtid: {
        type: String,
        required: true,
        unique: true
    },
    expiresIn: {
        type: Date,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    }
}, { timestamps: true })

export const tokenModel = mongoose.models.Token || mongoose.model("Token", tokenSchema)
```

### 6.3.3 Message Collection Schema (`Message`)
Logs conversation history, mapping user text and image attachments to generated bot responses:

```javascript
import mongoose from "mongoose"

export const messageSchema = new mongoose.Schema({
    content: {
        type: String,
        minLength: [1, 'message must be at least 1 character'],
        maxLength: [10000, 'message must be at most 10000 characters']
    },
    senderId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    senderType: {
        type: String,
        enum: ['USER', 'BOT'],
        default: 'USER'
    },
    attachments: [{
        secure_url: String,
        public_id: String
    }],
    conversationId: {
        type: String
    }
}, { timestamps: true })

export const messageModel = mongoose.models.Message || mongoose.model("Message", messageSchema)
```

### 6.3.4 Plant Collection Schema (`Plant`)
Persists diagnosis records for individual users, keeping track of confidence scores, classifications, and treatment details:

```javascript
import mongoose from "mongoose"

const plantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    image: {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true }
    },
    plantType: {
        type: String,
        trim: true,
        default: "Unknown"
    },
    diagnosis: {
        diseaseName: { type: String, default: "Healthy" },
        confidence: { type: Number },
        treatment: { type: String },
        description: { type: String }
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    }
}, { timestamps: true })

export const plantModel = mongoose.models.Plant || mongoose.model("Plant", plantSchema)
```

### 6.3.5 Database Index Optimization
To maintain low latency as the database grows:
*   `conversationId` in the `Message` collection is indexed to accelerate the multi-turn dialog context assembly query.
*   `userId` in the `Plant` collection is indexed to speed up user history queries.

---

## 6.4 User Authentication, Session Guards, and Key-Pair Security

### 6.4.1 Asymmetric Token Signatures (RSA)
FLORA uses asymmetric RSA public/private key-pair signing for token security:
*   **Sign**: The auth service signs new JWT tokens using a secure private key (`private_key.pem`).
*   **Verify**: Protected routes verify incoming token signatures using the matching public key (`public_key.pem`). This ensures that even if our public endpoints are compromised, tokens cannot be forged without the private key.

### 6.4.2 Authentication Middleware Guard
The authentication middleware (`auth.middleware.js`) intercepts requests, verifies tokens, checks for token revocation in the database, and attaches user profiles to the request context:

```javascript
import * as dbService from "../DB/dbService.js";
import { tokenModel } from "../DB/models/token.model.js";
import mongoose from "mongoose";
import { getSignature, signatureEnum, verifyToken } from "../utils/token/token.utils.js";
import { userModel } from "../DB/Models/user.model.js";

export const tokenTypeEnum = {
  ACCESS: "ACCESS",
  REFRESH: "REFRESH",
};

export const decodedToken = async ({ authorization, tokenType = tokenTypeEnum.ACCESS, next } = {}) => {
  if (!authorization) 
    return next(new Error("Authorization header missing", { cause: 401 }));

  const parts = authorization.trim().split(" ");
  const token = parts[parts.length - 1];

  if (!token || typeof token !== "string" || token.length < 10)
    return next(new Error("Token must be a valid string", { cause: 401 }));

  const signatures = await getSignature({ signatureLevel: signatureEnum.USER });

  let decoded;
  try {
    decoded = verifyToken({
      token,
      secretKey: tokenType === tokenTypeEnum.ACCESS ? signatures.accessSignature : signatures.refreshSignature,
    });
  } catch (err) {
    return next(new Error("Invalid Token", { cause: 401 }));
  }

  if (!decoded.jti) return next(new Error("Invalid Token", { cause: 401 }));

  const revokedToken = await dbService.findOne({
    model: tokenModel,
    filter: { jwtid: decoded.jti },
  });
  if (revokedToken) return next(new Error("Token is Revoked", { cause: 401 }));

  const user = await dbService.findById({
    model: userModel,
    id: decoded.id,
  });
  if (!user) return next(new Error("No registered account", { cause: 404 }));

  return { user, decoded };
};

export const authentication = ({ tokenType } = {}) => {
  return async (req, res, next) => {
    const result = await decodedToken({
      authorization: req.headers.authorization,
      tokenType,
      next,
    });

    if (!result) return;

    req.user = result.user;
    req.decoded = result.decoded;
    next();
  };
};
```

---

## 6.5 Memory-Buffered Multipart Uploads and Validation

### 6.5.1 In-Memory Buffer Processing via Multer
To prevent disk bloat, FLORA buffers uploaded images directly in memory (`RAM`) using **Multer** for chat-based prediction:

```javascript
import multer from "multer";

const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, fieldSize: 25 * 1024 * 1024 }
});
```

This is faster than disk storage because it avoids slow disk write/read loops. The file buffer is forwarded directly to the image classification service in memory, and the buffer is cleared automatically once the request completes.

### 6.5.2 Local and Cloud Storage Multer Providers
For static assets like profile images or diagnosis record storage, FLORA uses disk storage wrappers (`local.multer.js`) or cloud wrappers (`cloud.multer.js` supporting Cloudinary integration):

```javascript
// Local disk storage helper snippet
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./src/uploads");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
```

---

## 6.6 Multi-Service Orchestration & HTTP Clients

FLORA's backend acts as an orchestrator, connecting the frontend, the Flask CNN model, and LM Studio:

```
                  ┌────────────────────────┐
                  │   Client Chat (UI)     │
                  └───────────┬────────────┘
                              │ POST /chat/ask
                              ▼
                  ┌────────────────────────┐
                  │  Node.js Express API   │
                  └──────┬──────────┬──────┘
                          │          │
        POST /predict    │          │ POST /chat/completions
     (Multer Image Blob) │          │ (System & Dialog Context)
                           ▼          ▼
               ┌───────────────┐  ┌───────────────┐
               │  Python Flask │  │   LM Studio   │
               │ (CNN Model)   │  │   (Gemma 4B)  │
               └───────────────┘  └───────────────┘
```

The orchestrator manages connections using the **Axios** library with strict timeout controls to prevent the server from hanging if an AI service goes offline:

```javascript
import axios from 'axios';

const url = process.env.AI_ENGINE_URL || "http://127.0.0.1:5000/predict";
const GEMMA_BASE_URL = process.env.GEMMA_BASE_URL || "http://localhost:1234/v1";
const GEMMA_TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 90_000;
```

---

## 6.7 Conversational Context Recovery & Prompt Formatting

### 6.7.1 Client-Side Context Forwarding
When the client frontend sends a message, it includes the active `plantContext` (plant and disease) in the request body, which is injected into the LLM system prompt.

### 6.7.2 Backend Context Recovery Pattern
If a user reloads the browser, the frontend context is cleared. If the user then sends a follow-up question, the backend retrieves the last system-generated diagnostic message starting with `🌿 **` from MongoDB and parses the details:

```javascript
if (!plantContext && conversationId) {
    try {
        const lastDiagnosis = await messageModel.findOne({
            conversationId, senderType: "BOT",
            content: { $regex: /^🌿 \*\*/ }
        }).sort({ createdAt: -1 }).lean();

        if (lastDiagnosis) {
            const match = lastDiagnosis.content.match(/^🌿 \*\*([^*]+)\*\* — ([^\n]+)/);
            if (match) {
                plantContext = { plant: match[1].trim(), disease: match[2].trim() };
                console.log("[chat.controller] 🔄 Recovered plantContext:", plantContext);
            }
        }
    } catch (dbErr) {
        console.warn("[chat.controller] plantContext recovery error:", dbErr.message);
    }
}
```

---

## 6.8 Buffer-then-Stream SSE Pipeline and Post-Processing Sanitization

### 6.8.1 The Design Decision
Rather than streaming directly from LM Studio (which is vulnerable to network drop truncation and bypasses post-processing), FLORA uses a **Buffer-then-Stream** pipeline:
1.  **Pre-Fetching**: Express fetches the complete text from LM Studio synchronously (`stream: false`).
2.  **Filtering**: The server sanitizes the text of forbidden phrases.
3.  **Streaming**: The server opens an SSE connection and streams the sanitized text to the client.

### 6.8.2 Output Post-Processing Filter
To ensure the model output is professional, the server applies a post-processing filter to strip unauthorized greetings before transmission:

```javascript
function cleanArabicResponse(text) {
    if (!text) return text;
    let cleaned = text;
    cleaned = cleaned
        .replace(/^يا حبيبي[،,]?\s*/m, "")
        .replace(/^يا حبيبتي[،,]?\s*/m, "")
        .replace(/^حبيبتي[،,]?\s*/m, "")
        .replace(/^يا عزيزي[،,]?\s*/m, "")
        .replace(/^يا عزيزتي[،,]?\s*/m, "")
        .replace(/^عيزيزتي[،,]?\s*/m, "")
        .replace(/^يا صديقي[،,]?\s*/m, "")
        .replace(/^يا أخي[،,]?\s*/m,   "")
        .replace(/^يا أختي[،,]?\s*/m,  "")
        .replace(/^يا روحي[،,]?\s*/m,  "")
        .replace(/^يا قلبي[、,]?\s*/m,  "")
        .replace(/ yا حبيبي [،,]?\s*/g, "")
        .replace(/ يا حبيبي [،,]?\s*/g, "")
        .replace(/ يا حبيبتي [،,]?\s*/g, "")
        .replace(/ حبيبتي [،,]?\s*/g, "");
    return cleaned.trimStart();
}
```

### 6.8.3 Server-Sent Events (SSE) Stream Implementation
The backend configures headers to support persistent connections:

```javascript
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");
res.setHeader("Connection", "keep-alive");
res.setHeader("X-Accel-Buffering", "no");
res.flushHeaders();
```

It then splits the sanitized text by spaces and transmits chunks (3 words every 35 milliseconds) to simulate typing:

```javascript
function _streamBufferedText(res, fullText, model = "gemma") {
    return new Promise(resolve => {
        _sseJson(res, { type: "model_info", model });
        const words = fullText.split(" ");
        let i = 0;
        const CHUNK = 3;
        const DELAY = 35;

        const tick = () => {
            if (res.writableEnded) { resolve(); return; }
            if (i >= words.length) { _sseDone(res); resolve(); return; }
            const slice = words.slice(i, i + CHUNK).join(" ") + (i + CHUNK < words.length ? " " : "");
            _sseJson(res, { chunk: slice });
            i += CHUNK;
            setTimeout(tick, DELAY);
        };
        tick();
    });
}
```

---

## 6.9 Model Integration Services and Custom Data Mapper

### 6.9.1 normalizations of Plant and Disease Label Mappings
Because CNN model classes use raw English tags (e.g. `Tomato___Tomato_yellow_leaf_curl_virus`), a mapper maps them to user-friendly Arabic text:

```javascript
const PLANT_TRANSLATIONS = {
    "apple": "تفاح",
    "blueberry": "توت أزرق",
    "cherry": "كرز",
    "cherry_(including_sour)": "كرز",
    "corn": "ذرة",
    "corn_(maize)": "ذرة",
    "grape": "عنب",
    "orange": "برتقال",
    "peach": "خوخ",
    "pepper": "فلفل رومي",
    "pepper,_bell": "فلفل رومي",
    "potato": "بطاطس",
    "raspberry": "توت العليق",
    "soybean": "فول الصويا",
    "squash": "كوسة",
    "strawberry": "فراولة",
    "tomato": "طماطم"
};

const DISEASE_TRANSLATIONS = {
    "apple_scab": "جرب التفاح",
    "black_rot": "العفن الأسود",
    "cedar_apple_rust": "صدأ تفاح الأرز",
    "powdery_mildew": "البياض الدقيقي",
    "cercospora_leaf_spot gray_leaf_spot": "بقعة أوراق سيركوسبورا (البقعة الرمادية)",
    "common_rust_": "الصدأ الشائع",
    "common_rust": "الصدأ الشائع",
    "northern_leaf_blight": "لفحة الأوراق الشمالية",
    "esca_(black_measles)": "مرض الإسكا (الحصبة السوداء)",
    "leaf_blight_(isariopsis_leaf_spot)": "لفحة الأوراق",
    "haunglongbing_(citrus_greening)": "اخضرار الحمضيات (التبرقش الأصفر)",
    "bacterial_spot": "التبقع البكتيري",
    "early_blight": "اللفحة المبكرة",
    "late_blight": "اللفحة المتأخرة",
    "leaf_mold": "عفن الأوراق",
    "septoria_leaf_spot": "تبقع أوراق السبتوريا",
    "spider_mites two-spotted_spider_mite": "العنكبوت الأحمر ذو البقعتين",
    "target_spot": "التبقع المستهدف",
    "tomato_yellow_leaf_curl_virus": "فيروس تجعد أوراق الطماطم الأصفر",
    "tomato_mosaic_virus": "فيروس مبرقش الطماطم (الموزايك)",
    "leaf_scorch": "حرق الأوراق",
    "healthy": "سليم ومعافى"
};
```

---

## 6.10 Global Exception Interception and Resilience Mechanisms

### 6.10.1 Timeout Controls and Fallbacks
Requests to the local LLM contain a 90-second timeout. If the AI engine fails or times out, the backend catches the error and generates a localized fallback response:

```javascript
try {
    const gemmaRes = await axios.post(
        `${GEMMA_BASE_URL}/chat/completions`,
        { model: GEMMA_MODEL, messages, stream: false, temperature: 0.7, max_tokens: 1200 },
        { headers: { "Content-Type": "application/json" }, timeout: GEMMA_TIMEOUT }
    );
} catch (err) {
    console.warn("[chat.controller] ⚠️ Gemma failed:", err.message, "— using fallback");
    // Fallback logic builds structured replies based on crop & disease names...
}
```

---

## 6.11 Controller Endpoint Mapping & Input Request Validation Rules

### 6.11.1 Input Checking using Joi Validation Schemas
Request payloads are validated using **Joi** schemas before reaching controllers. Joi validations check query parameters:

```javascript
import joi from 'joi'
import { generalFields } from "../../Middlewares/validation.middleware.js"

export const signUpSchema = {
    body: joi.object({
        firstname: generalFields.firstname.required(),
        lastname: generalFields.lastname.required(),
        email: generalFields.email.required(),
        password: generalFields.password.required(),
        confirmPassword: generalFields.confirmPassword.required(),
        gender: generalFields.gender,
        phone: generalFields.phone,
    })
}

export const loginSchema = {
    body: joi.object({
        email: generalFields.email.required(),
        password: generalFields.password.required()
    })
}
```

### 6.11.2 Request Lifecycle Interception Flow
1.  **Express Route**: Listens and parses the incoming HTTP request.
2.  **Auth Middleware**: Checks the JWT signature, queries revoked tokens, and extracts user credentials.
3.  **Validation Middleware**: Validates inputs using Joi schemas.
4.  **Multer Middleware**: Parses file payloads.
5.  **Controller**: Executes business logic, interfaces with microservices, and streams response data via SSE.

---

## 6.12 Microservice Communication and Network Protocols

### 6.12.1 Image Prediction Request Lifecycle
The backend orchestrator formats the in-memory image buffer into a standard HTTP POST multipart request, forwarding it to the Flask server (`POST http://127.0.0.1:5000/predict`). Flask runs background removal, crops the image to 224 x 224, runs inference, and returns prediction details:

```javascript
export async function predictPlantDisease(imageBuffer) {
    const formData = new FormData();
    formData.append("image", new Blob([imageBuffer]), "plant.jpg");

    const url = process.env.AI_ENGINE_URL || "http://127.0.0.1:5000/predict";
    const response = await axios.post(url, formData, { timeout: 25_000 });

    return {
        label: response.data.class_name,
        plant: response.data.plant,
        disease: response.data.disease,
        confidence: response.data.confidence
    };
}
```

---

## 6.13 Backend API Routing and Endpoint Schemas

To facilitate client integrations, the primary routes are mapped below with their respective input and output schemas:

### 6.13.1 Authentication Submodule Routes (`auth.controller.js`)
*   `POST /api/v1/auth/signUp`: Salt-encrypts credentials using bcrypt and registers profiles in MongoDB.
*   `POST /api/v1/auth/login`: Checks user credentials, returning signed JWT access and refresh tokens.

### 6.13.2 Chat and Diagnostic Submodule Routes (`chat.controller.js`)
*   `POST /api/v1/chat/ask`: Accepts a user question and optional image file. If an image is present, routes it through the visual pipeline, then streams the advisor's response word-by-word.
    *   **Request Payload**: Form-Data containing:
        *   `message`: "إزاي أعالجه؟" (string)
        *   `conversationId`: "mongo_1718712345" (string)
        *   `image`: (binary image file, optional)
    *   **Response Stream (HTTP 200 OK, Server-Sent Events)**:
        ```
        data: {"type": "diagnosis_meta", "plant": "potato", "disease": "early_blight", "confidence": 94}

        data: {"chunk": "بالنسبة لنبات البطاطس المصاب باللفحة المبكرة "}
        data: {"chunk": "خطوات العلاج بتشمل استخدام مبيد فطري "}
        data: [DONE]
        ```

### 6.13.3 Diagnostic History and Plant Submodule Routes (`plant.controller.js`)
*   `GET /api/v1/plant`: Retrieves user diagnostic history logs.
