# 🌿 FLORA — Plant Disease Detection System
## Setup & Run Guide

---

## Prerequisites

- **Node.js** v18+ (for backend)
- **MongoDB** running locally on port 27017
- **LM Studio** (for Gemma — local AI)
- **Gemini API Key** (already set in `.env.dev`)
- A live server extension (VS Code) or any static file server (for frontend)

---

## 📁 Project Structure

```
FLORA MASTER/
├── Front-End/          ← HTML/CSS/JS frontend (no build needed)
├── Back-end/           ← Node.js Express backend
│   └── src/
│       ├── config/.env.dev  ← All API keys & config
│       └── services/aiService.js  ← 3-layer AI pipeline
├── AI-Engine/          ← Python Flask CNN server (optional)
└── README.md
```

---

## 🔑 API Key Setup

Open `Back-end/src/config/.env.dev` and verify:

```
GEMINI_API_KEY=*******************************   ← already set
GEMMA_BASE_URL=http://localhost:1234/v1                    ← LM Studio default
GEMMA_MODEL=gemma-3-4b-it                                  ← model name in LM Studio
```

> **To use your own Gemini key:** Replace the value of `GEMINI_API_KEY` with your key from https://aistudio.google.com

---

## 🚀 Running the Backend

```bash
cd "Back-end"
npm install
npm run dev
```

Server starts on **http://localhost:3000**

---

## 🖥️ Running the Frontend

Open `Front-End/index.html` with **VS Code Live Server** (right-click → Open with Live Server), or use any static server:

```bash
cd "Front-End"
npx serve .
```

Then open **http://localhost:5500** in your browser.

---

## 🤖 Running LM Studio (Gemma — Local AI)

1. Download & install LM Studio from https://lmstudio.ai
2. Open LM Studio and search for: `gemma-3-4b-it`
3. Download the model
4. Go to **Local Server** tab (left sidebar)
5. Select the model and click **Start Server**
6. Server runs on `http://localhost:1234` by default

> **⚠️ If LM Studio is not running**, the system automatically falls back to **Gemini 1.5 Flash** — so the app still works!

---

## 🐍 Running the Python CNN Server (Optional)

The CNN layer is a placeholder by default. To activate real CNN inference:

```bash
cd "AI-Engine"
pip install flask tensorflow pillow numpy
python ai_server.py
```

Server runs on **http://localhost:5000**

> Replace `cnn_final100.keras` in `ai_server.py` with your actual trained model file.

---

## 🧠 AI Pipeline Architecture

```
User uploads image
        ↓
  Layer 1 — CNN         (placeholder / your model)
        ↓
  Layer 2 — Gemini 1.5 Flash    (validates & diagnoses)
        ↓
  Layer 3 — Gemma-4 via LM Studio   (friendly explanation)
        ↓
  Streamed response to user (real-time typing effect)
```

### Fallback Chain (never crashes):
- Gemma timeout (90s) → **Gemini takes over**
- Gemini fails → **CNN result used directly**
- All fail → **safe error message shown**

---

## ✅ What Was Fixed (This Version)

| # | Fix | Status |
|---|-----|--------|
| 1 | Real-time streaming + typing dots | ✅ |
| 2 | "Ollama" removed everywhere → Hybrid Intelligence | ✅ |
| 3 | 3-Layer AI pipeline (CNN → Gemini → Gemma) | ✅ |
| 4 | Chat with image via multipart (chat route) | ✅ |
| 5 | 30s timeout on Gemma + Gemini fallback | ✅ |
| 6 | Arabic RTL text alignment fixes | ✅ |
| 7 | Conversation history sent to backend | ✅ |
| 8 | Language auto-detection (AR/EN) | ✅ |
| 9 | Non-robotic natural prompts | ✅ |
| 10 | Auto-scroll during streaming | ✅ |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Run `npm install` first |
| MongoDB not connecting | Make sure `mongod` is running on port 27017 |
| AI not responding | Check LM Studio is running with a model loaded |
| Still getting errors | Check `GEMINI_API_KEY` in `.env.dev` |
| Images not analyzed | Backend needs to receive `multipart/form-data` — check network tab |
