# Chapter 4: Conversational AI & Chatbot

## 4.1 The Role of Conversational AI in Agricultural Extension

Traditional systems for plant disease diagnosis function primarily as single-interaction image classifiers. In a standard computer vision pipeline, a farmer uploads an image, the model processes it, outputs a static class label (such as "Potato Late Blight" or "Tomato Spider Mites"), and the session is terminated. This static interaction leaves a significant information and operational gap for the smallholder farmer. A simple label does not inform the grower about the biological causes of the disease, the potential vectors of transmission, the environmental factors promoting its spread, or the actionable steps required to salvage the crop. Furthermore, agricultural growers are left without a mechanism to ask follow-up questions, clarify treatment instructions, or inquire about safe pesticide application protocols.

To bridge this operational gap, project FLORA incorporates an interactive conversational layer directly integrated with the visual diagnosis engine. Conversational AI serves as a virtual agricultural extension consultant, available 24/7. It allows farmers to ask follow-up questions in natural language, enabling the system to:
*   Clarify diagnostic details based on user observations, such as soil moisture or crop age.
*   Provide customized, step-by-step organic and chemical treatment instructions.
*   Advise on safety protocols, such as pre-harvest intervals for chemicals.
*   Deliver information in the colloquial Egyptian Arabic dialect (*العامية المصرية*), making scientific agronomic advice highly accessible to rural growers.

By embedding an LLM-based conversational agent, the FLORA system transforms from a diagnostic classifier into a complete decision-support system. This interaction model is particularly vital in Egypt, where public agricultural extension services have faced constraints in field personnel. The digital assistant acts as an immediate expert advisor, providing actionable recommendations to protect yields and reduce pesticide misuse.

---

## 4.2 Theoretical Foundations of Natural Language Processing

### 4.2.1 Tokenization and Text Representation
The first step in any NLP pipeline is tokenization—breaking down raw text strings into subword tokens that the model can process. Modern Large Language Models (LLMs) rely on subword tokenization algorithms, such as Byte Pair Encoding (BPE), to construct a vocabulary. BPE iteratively merges the most frequent pairs of characters or character sequences in a corpus. This allows the tokenizer to handle out-of-vocabulary words by breaking them down into constituent subword pieces.

#### BPE Tokenization Dry-Run Example
To illustrate the subword extraction logic of the BPE algorithm, consider a simplified vocabulary building process on a small corpus containing the words: `["low", "lowest", "newer", "wider"]` with their respective frequencies.
1.  **Initialize Vocabulary**: The vocabulary is initialized with all individual characters appearing in the corpus:
    
    V_0 = {l, o, w, e, s, t, n, r, i, d}

2.  **Iterative Character Pairing**: The algorithm counts adjacent character pairs. If the pair `(e, r)` is the most frequent sequence in the text, it is merged into a single token:
    
    V_1 = V_0 + {er}

3.  **Subsequent Merges**: In the next iteration, the pair `(e, s)` and `(s, t)` are analyzed. The sequence `(es, t)` is merged to form the token `est`:
    
    V_2 = V_1 + {est}

When this trained BPE tokenizer receives an out-of-vocabulary word like "lower", it does not output an `<unk>` (unknown) token. Instead, it breaks it down into known subwords: `["low", "er"]`. These subword indexes are then mapped to token IDs, which are passed to the model.

Once tokenized, the sequence of token IDs is mapped to a continuous vector space using an embedding matrix:

E_shape = V × D

where V is the vocabulary size of the model, and D is the dimensionality of the embedding vector (e.g., 3072 for Gemma). Each token index t is mapped to a vector e_t in this D-dimensional space:

e_t = E[t, :]

These embeddings represent semantic relationships, meaning words with similar contexts are grouped close together in the vector space. The token representation is further modified by adding positional encodings (often using Rotary Position Embeddings or RoPE) to ensure that the transformer model preserves the relative and absolute positions of words in a sentence.

### 4.2.2 Causal Transformer Architectures
Modern conversational AI models are built upon the Transformer architecture, which uses self-attention to capture contextual relationships in text. For a causal (autoregressive) language model, the self-attention is masked so the model only generates text based on preceding context:

Attention(Q, K, V) = Softmax((Q * K^T) / sqrt(d_k) + M) * V

where Q, K, and V represent the Query, Key, and Value matrices projected from the input sequence representation X:

Q = X * W_Q

K = X * W_K

V = X * W_V

The term d_k represents the scaling factor (dimension of the key vectors), which prevents the dot-product from growing excessively large and causing vanishing gradients in the Softmax function. The matrix M is a causal attention mask defined as:

M[i, j] = 0 if i >= j, and M[i, j] = -infinity if i < j

The addition of M inside the Softmax ensures that when computing the attention weights for token i, the model assigns a weight of exactly zero to any token j that appears after i in the sequence. This mask prevents the model from attending to future tokens, preserving the chronological flow of generated text during training and inference.

[INSERT IMAGE HERE: Figure 4.1 - The Causal Transformer Self-Attention Mechanism with Causal Masking for Autoregressive Text Generation]

#### Attention Architectures and Memory Optimization
Traditional transformers utilize Multi-Head Attention (MHA), where each query head has a corresponding key and value head. While highly expressive, MHA is memory-intensive during inference. To generate text token-by-token, the model must store the Keys and Values of all previous tokens in VRAM (the KV Cache) to avoid recomputing them. For long sequences, the KV Cache dominates VRAM usage, restricting batch size and concurrent user capacity.

To alleviate this, models utilize Multi-Query Attention (MQA) or Grouped-Query Attention (GQA). In Multi-Head Attention (MHA), the KV cache memory size in bytes is computed per token as:

KV_Cache_Size_MHA = 2 * 2 * n_layers * n_heads * d_head

where n_layers is the number of transformer layers, n_heads is the number of query heads, d_head is the head dimension, the first multiplier 2 accounts for both Keys and Values, and the second multiplier 2 represents the 16-bit floating point precision (FP16). By contrast, Grouped-Query Attention groups query heads into clusters that share a single key-value head, and Multi-Query Attention (MQA) shares a single key-value head across all query heads. Gemma leverages Multi-Query Attention (MQA) to reduce the memory cache footprint during inference, increasing text generation throughput. The memory reduction ratio is calculated as:

Memory_Cache_Reduction_Ratio = H_KV / H_Q

where H_KV is the number of Key-Value heads (1 in MQA) and H_Q is the number of Query heads (typically 8 to 32 in modern LLMs). For Gemma, this reduction allows the system to support longer context windows without hitting hardware VRAM constraints. This is a critical feature for project FLORA, as it enables the chatbot to maintain multi-turn context (remembering previous leaves, treatments, and farmer statements) on a consumer-grade workstation with a single GPU, preventing memory exhaustion when multiple users access the system concurrently.

---

## 4.3 Challenges of Building a Chatbot from Scratch

Our team evaluated the feasibility of building a custom conversational engine from scratch but encountered three major challenges:
1.  **Morphological Complexity of Arabic**: Arabic is a highly inflected, morphologically rich language. It relies on a root-and-pattern system where a consonant root (e.g., ك-ت-ب for "write") fits into templates to produce various verbs and nouns. Additionally, prefixes and pronouns attach directly to words (clitics), making custom rule-based parsers extremely difficult to build.
2.  **Dialectal Variation**: Daily spoken communication in Egypt uses colloquial Egyptian Arabic, which has unique vocabulary, grammar, and pronunciation compared to Modern Standard Arabic (MSA). Standard NLP datasets are almost entirely in MSA, making training a custom Egyptian dialect model from scratch unfeasible due to data scarcity.
3.  **Computational Resource Limits**: Training a custom language model requires massive GPU clusters, huge datasets of web-scraped texts, and weeks of training. Since graduation project budgets are limited, training a model from scratch was computationally and financially unviable.

---

## 4.4 Survey of Chatbot Frameworks and Architectures

We evaluated three architectural approaches:

### 4.4.1 Rasa (Intent-Based Framework)
Rasa relies on intent classification and entity extraction, managing dialog flows using static rules and story files.
*   *Limitations*: Highly rigid. If a user phrases a question outside pre-defined stories, the assistant fails. It requires manual annotation of thousands of intents.

### 4.4.2 Ollama (Local LLM Engine)
Ollama is a command-line tool designed to run LLMs locally.
*   *Limitations*: Had compatibility issues on Windows during testing and showed higher VRAM utilization compared to alternative engines.

### 4.4.3 LM Studio (Local Inference Server)
LM Studio runs open-source LLMs offline, exposing an OpenAI-compatible REST API:

POST http://localhost:1234/v1/chat/completions

*   *Advantages*: Stable GPU acceleration, low latency, and support for GGUF model formats. It allows running quantized models locally with minimal setup.

### 4.4.4 Framework Comparison Summary
The benchmark results are summarized in Table 4.1:

| Evaluation Metric | Rasa | Ollama | LM Studio API (Selected) |
| :--- | :--- | :--- | :--- |
| **Conversational Flexibility** | Low (Rigid rules) | High (Generative LLM) | **High (Generative LLM)** |
| **Quantization Support** | N/A | High | **Superior (GGUF formats)** |
| **Arabic Dialect Support** | Poor (Manual intents) | Medium (Model dependent) | **Excellent (Direct prompt control)** |
| **Inference Latency** | Very Fast (<5ms) | Medium (~1.5s) | **Fast (~800ms with GPU)** |
| **Deployment Complexity** | High | Low | **Very Low (OpenAI API compatible)** |

---

## 4.5 Selection of Google Gemma 4B Model

We selected the **Google Gemma 4B** model (specifically, the instruct-tuned `gemma-3-4b-it` model in 4-bit quantized GGUF format). The selection was based on:
1.  **Multi-Query Attention (MQA)**: Reduces the memory cache footprint during inference, increasing text generation throughput.
2.  **Resource Efficiency**: Quantized to 4-bit, Gemma 4B requires only ~2.8 GB of VRAM, allowing it to co-exist with our CNN model on a single local GPU. The formula for estimating model VRAM footprint is:

VRAM = (P * Q) / 8 + KV_Cache + Overhead

where P is the parameter size (4.1 billion), Q is the quantization bit-depth (4 bits), and Overhead is the execution engine allocation. Substituting the values:

VRAM = (4.1 * 10^9 * 4) / 8 bytes + 0.3 * 10^9 bytes = 2.05 GB + 0.3 GB ~ 2.35 GB

With runtime allocations, the real-world usage stabilizes at ~2.8 GB, leaving ample space on an 8 GB consumer GPU for the visual models.
3.  **Arabic Dialect Comprehension**: Gemma has excellent multilingual comprehension and naturally processes colloquial Egyptian Arabic when directed by system prompts, mapping terms like "الندوة" to blight and "الحمراء" to spider mites.

---

## 4.6 System Prompt Engineering and Dialect Localization

To enforce colloquial Egyptian Arabic, guide the tone, and prevent formatting errors, we designed a localized system prompt for the Arabic flow:

```
أنت "فلورا" — خبيرة زراعية مصرية ذكية ومهنية وتساعد بأسلوب متزن وودود دون مبالغة.
قواعد الرد الصارمة:
1. ردك يجب أن يكون بالكامل باللهجة المصرية العامية البسيطة — ممنوع الفصحى أو الإنجليزي.
2. رد مباشرة على سؤال المستخدم بشكل مهني ولطيف ومفيد وبناءً على السياق الحالي دون مبالغة في الود أو العاطفة.
3. خاطب المستخدم بصيغة المذكر (باعتبارها الصيغة العامة والمحايدة للمخاطب في اللغة العربية)، وتجنب تماماً مخاطبته بصيغة المؤنث (مثل: أهلاً بكِ، تفضلي، إلخ).
4. لا تقم بكتابة بيانات التشخيص كعنوان جاف في بداية الرد (مثل: "الاسم: تفاح، المرض: جرب التفاح") لأن المستخدم يعرفها بالفعل، ولكن استخدم هذه المعلومات لتوجيه ردك بالكامل لحل مشكلة المستخدم.
5. ممنوع استخدام عبارات التودد المبالغ فيها أو غير اللائقة مثل: "يا حبيبي"، "يا حبيبتي"، "يا عزيزتي"، "يا روحي"، إلخ.
6. تنبيه هام جداً: ابدأ ردك مباشرة بدون كتابة أي تفكير أو مسودات تفكير (مثل: Thinking Process أو غيرها).
```

### 4.6.1 Analysis of Prompt Design Decisions
To ensure the LLM complies with the localized agronomic role, we perform a detailed breakdown of the six rules:

*   **Rule 1 (Dialect Enforcement)**: Egyptian smallholder farmers communicate in local vernacular rather than Modern Standard Arabic (MSA), which is often perceived as overly formal and academic. Restricting the language to the simple Egyptian dialect makes the advice direct, understandable, and culturally resonant.
*   **Rule 2 (Contextual Appropriateness)**: The model answers dynamically based on current agricultural context, providing brief, professional, and high-value agronomic advice without crossing into emotional over-friendliness.
*   **Rule 3 (Neutral Gender Pronouns)**: Arabic grammar requires gender matching in verbs and adjectives. Since the system does not collect the user's gender during signup, using standard masculine forms as a grammatical default avoids awkward clashing conjugation.
*   **Rule 4 (No Dry Summaries)**: Bypassing dry summary tags prevents repeating diagnostic labels that the client interface already presents in the structured diagnosis card, allowing the conversation to flow naturally.
*   **Rule 5 (Professional Tone Preservation)**: Large Language Models trained on open web text can generate overly familiar Arabic phrases like "يا روحي" or "يا حبيبي". This rule maintains a respectful, professional, yet warm consultant-client relationship.
*   **Rule 6 (Bypassing Internal Monologues)**: Enforcing direct response start prevents the model from rendering raw reasoning traces or markdown blocks (e.g., `<thought>`) on the user interface, improving readability.

---

## 4.7 Orchestration, Context Management, and Session Memory

### 4.7.1 Database Transcripts and History Retrieval
A conversational agent must remember previous turns to support multi-turn dialogue. To implement this without exceeding VRAM capacity or bloating the inference context, we store all messages in a MongoDB collection using Mongoose Schema validation rules:

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
```

When a user submits a query, the backend loads the last 15 messages sorted chronologically using the `createdAt` index to construct the conversational history:

```javascript
const messages = await messageModel.find({ conversationId, senderId: userId })
    .sort({ createdAt: 1 }).limit(15).lean();

const chronologicalHistory = messages.map(m => ({
    role: m.senderType === "USER" ? "user" : "assistant",
    content: String(m.content || "")
}));
```

This dynamic array is combined with the active system prompt, creating a structured payload:

```javascript
const payload = {
  model: "gemma-3-4b-it",
  messages: [
    { role: "system", content: systemPrompt },
    ...chronologicalHistory,
    { role: "user", content: safeMessage }
  ],
  temperature: 0.7,
  max_tokens: 1200,
  stream: false
};
```

### 4.7.2 Backend Context Recovery
If a user reloads the browser tab, the frontend state is reset, losing the active diagnosis context. If the user then submits a follow-up query, the model would lack the necessary context to respond correctly.

To solve this, the FLORA backend incorporates a Context Recovery Pattern. Before calling the LLM, the backend checks for prior diagnosis messages if the request does not provide one:

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

This context recovery mechanism maintains dialogue continuity without requiring complex client-side state synchronization, providing a seamless user experience even across page reloads.

---

## 4.8 The Buffer-then-Stream SSE Pipeline

Streaming text directly from a local LLM can result in response truncation if the network fluctuates, and bypasses backend sanitization filters. To resolve this, FLORA implements a **Buffer-then-Stream** pipeline:

[INSERT IMAGE HERE: Figure 4.2 - Comparison: Raw Streaming (vulnerable to truncation) vs. FLORA's Buffer-then-Stream Pipeline (ensuring complete, sanitized responses)]

The operation of the Buffer-then-Stream pipeline is divided into three distinct stages:

1.  **Synchronous Fetching**: The backend Node.js application initiates a non-streaming POST request to the local LM Studio instance (`stream: false`). The Node server blocks asynchronously until LM Studio has fully generated the complete output response.
2.  **Output Sanitization**: The raw generated text is captured in a memory buffer. The backend applies regular expressions and blacklist filters to remove unauthorized greetings, markdown artifacts, or language leaks before the user can see them.
3.  **SSE Streaming**: The server opens an EventSource connection with the header `Content-Type: text/event-stream` and sets `Cache-Control: no-cache`. It then streams the sanitized text from memory to the client. The system splits the text by spaces and sends 3 words every 35 milliseconds using a timed loop:

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

This paced delivery simulates a natural typing effect, improving the perceived performance of the system while ensuring the response is fully generated and sanitized before rendering.

---

## 4.9 Post-Processing and Output Sanitization

To ensure responses remain professional, a sanitization layer uses regular expressions to strip unauthorized colloquial greetings before the text is streamed:

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
        .replace(/^عزيزتي[،,]?\s*/m, "")
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

This post-processing step ensures that the output complies with professional agricultural consultation standards, even if the model hallucinates overly familiar language.

---

## 4.10 System Limitations and Future Work

While the conversational layer provides an interactive user experience, it has two key limitations:
*   **General Knowledge Gaps**: Gemma occasionally lacks fine-grained details on local Egyptian soil varieties.
*   **Startup Latency**: On CPU-only hardware, the pre-fetch phase can introduce a delay before streaming starts.

To address these limitations, future work will focus on:
1.  **Domain-Specific Fine-Tuning**: Fine-tuning the LLM on localized Egyptian agricultural guidelines, pesticide catalogs, and extension reports to improve diagnostic accuracy.
2.  **Retrieval-Augmented Generation (RAG)**: Implementing a vector database containing localized agricultural documents to provide fact-grounded recommendations and reduce hallucinations.
3.  **Edge Execution Optimization**: Compiling the LLM with TensorRT-LLM or ONNX runtime to reduce inference latency and enable smoother real-time interactions.

---

## 4.11 Comparative Performance Benchmarks of Local LLMs

We benchmarked three models locally using GGUF format on a workstation with an NVIDIA RTX 3060 GPU, as summarized in Table 4.2:

| Performance Indicator | Mistral 7B Instruct | LLaMA-3 8B Instruct | Google Gemma 4B (Selected) |
| :--- | :--- | :--- | :--- |
| **Parameter Size** | 7.2 Billion | 8.0 Billion | **4.1 Billion** |
| **VRAM Footprint** | ~4.8 GB | ~5.4 GB | **~2.8 GB** |
| **Context Window** | 32,768 tokens | 8,192 tokens | **8,192 tokens** |
| **Attention Architecture** | GQA | GQA | **MQA** |
| **Average Response Speed** | ~14 tokens/sec | ~11 tokens/sec | **~24 tokens/sec** |
| **Arabic Vocabulary** | Good (Formal) | Superior (Formal) | **Excellent (Colloquial)** |
| **Coexistence with CNN** | Poor (VRAM Collision) | Poor (VRAM Collision) | **Excellent (Stable VRAM margin)** |

Both Mistral 7B and LLaMA-3 8B require around 5 GB of VRAM. Loaded alongside our CNN model (~2.5 GB VRAM), the total footprint exceeded the GPU's memory capacity. Gemma 4B requires only 2.8 GB, allowing both servers to run stably on a single card.

The benchmarking workstation utilized the following hardware configuration:
*   **GPU**: NVIDIA GeForce RTX 3060 with 12 GB VRAM.
*   **CPU**: AMD Ryzen 5 5600X (6 cores, 12 threads), operating at a base clock of 3.7 GHz.
*   **RAM**: 32 GB DDR4 system memory running at 3200 MHz.

On this setup, Gemma 4B exhibited zero cold-start latency once loaded into VRAM, and maintained a stable token generation rate. LLaMA-3 8B, by contrast, frequently triggered out-of-memory errors (VRAM paging to system RAM), dropping the generation speed to less than 2 tokens per second and causing system instability.

---

## 4.12 System Prompt Security and Hijacking Controls

When exposing generative AI models via public-facing APIs, security is a major concern. If left unguarded, large language models are vulnerable to **prompt injection attacks** (also known as jailbreaking) where malicious inputs attempt to override the system instructions.

To safeguard the conversational interface, FLORA implements a robust, multi-layer security guardrail:

1.  **Express Payload Constraints**: Express request limits and Joi input validations enforce maximum character length constraints on input messages (e.g. `maxLength: 10000`). This prevents extremely long, complex prompt injection payloads from crashing the parser or overflowing model attention buffers.
2.  **Instruction Framing**: User query variables are passed inside dedicated `{ role: "user", content: safeMessage }` message layers, keeping user queries separated from system-level instructions at the API level.
3.  **Sanitization and Style Guards**: The system prompt strictly overrides model behavior by forcing it to start responses directly, bypass intermediate internal processes, and reject discussing non-agricultural or unprofessional topics. Unwanted phrases generated during the interaction are stripped at the backend controller before transmission to the client using `cleanArabicResponse`.
