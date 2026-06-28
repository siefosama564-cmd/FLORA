# FLORA Graduation Thesis Blueprint

This document serves as the master blueprint and reference lexicon for the graduation thesis of **FLORA: An AI-Powered Plant Disease Detection and Egyptian Arabic Conversational Guidance System**. All generated chapters must strictly align with the specifications, terminology, and structures defined herein to guarantee architectural and stylistic consistency across the entire 100-page document.

---

## 1. Administrative Information

*   **University**: Helwan University
*   **Faculty**: Faculty of Science
*   **Department**: Statistics & Computer Science Department
*   **Project Title**: FLORA (Fine-grained Leaf cOgnition & Recognition Architecture)
*   **Subtitle**: An AI-Powered Plant Disease Detection and Egyptian Arabic Conversational Guidance System
*   **Academic Year**: 2025/2026
*   **Graduation Project Supervisor**: Dr. Nadia Abdelsamea
*   **Team Members**:
    1.  **Seif Osama Fouad Ibrahim**
    2.  **Seif El-Din Hamouda Kamel Mahrous**
    3.  **Mohamed Sayed Saeed Mohamed**
    4.  **Youssef Mahdy Mohamed Mahdy Awad**
    5.  **Ahmed Walid Soliman**
    6.  **Shehab Eissa Abdelmonem Ahmed**

---

## 2. Technical Stack & Component Nomenclature

To ensure consistent descriptions throughout the implementation chapters, the following standardized terminology must be used:

| Component | Standard Term | Alternate Acceptable Term | Description / Specifications |
| :--- | :--- | :--- | :--- |
| **Image Classification Model** | FLORA CNN Model | Image Classifier / Visual Intelligence Layer | Transfer learning with **EfficientNetV2-B3** backbone; native input size of 224x224x3. |
| **Background Segmentation** | U²-Net Background Removal | Leaf Segmentation Layer | Powered by the `rembg` library; strips complex backgrounds, compositing the leaf onto a pure white background. |
| **Inference Server (Python)** | AI Engine Inference Server | Python Flask Service | Flask server running on port 5000; exposes `/health` and `/predict` endpoints. |
| **Conversational Core** | Google Gemma 4B Model | Conversational AI Engine | Hosted locally via LM Studio on port 1234; processes user messages based on localized system prompts. |
| **Streaming Mechanism** | Buffer-then-Stream SSE Pipeline | SSE Streaming Controller | Pre-fetches the entire LLM response at the Node.js backend to prevent truncation, then streams word-by-word via Server-Sent Events. |
| **Backend Framework** | Node.js Express Application | Backend REST API | Runs on Express (port 3000), using Mongoose ODM, JWT authentication, and Multer memory storage. |
| **Database** | MongoDB Database | Database Layer | Stores collections: `User`, `Token`, `Message` (chat history), and `Plant` (diagnosis records). |
| **Frontend Framework** | Vanilla HTML5/CSS3/JS Web Interface | Frontend Application | Zero external styling frameworks (Vanilla CSS); centralized translations via `translations.js`. |

---

## 3. Formatting & Style Guide

*   **Academic Tone**: Formulate all chapters in the third-person passive or objective active voice (e.g., *"The model was trained"* or *"The proposed system facilitates"*). Refrain from marketing language, contractions (*don't*, *can't*), and informal phrasing (*like*, *basically*).
*   **Heading Hierarchy**: Follow the IEEE markdown structure:
    *   `# Chapter X: [Title]` (Heading 1)
    *   `## X.Y [Section Title]` (Heading 2)
    *   `### X.Y.Z [Subsection Title]` (Heading 3)
    *   `#### [Sub-subsection Title]` (Heading 4)
*   **Visual Elements**: Do not render actual images. Embed standard descriptive placeholders using the following exact format:
    `[INSERT IMAGE HERE: Figure X.Y - Detailed Description of Diagram or Screenshot]`
*   **Citation Style**: In-text citations must follow the IEEE numerical format (e.g., `[1]`, `[2]`). 

---

## 4. Chapter Outline Map

The documentation consists of exactly six chapters:
1.  **Chapter 1: Introduction**: Project overview, background, problem statement, motivation, aims, objectives, scope, limitations, significance, and system architecture summary.
2.  **Chapter 2: Image AI Model – Part I**: Computer vision in agriculture, dataset research, selection of the *New Plant Diseases Dataset* (PlantVillage), data cleaning, resizing, normalization, and Keras sequential data augmentation.
3.  **Chapter 3: Image AI Model – Part II**: Deep Learning and CNN theory, EfficientNetV2-B3 transfer learning, classification head architecture, two-phase training (head warmup vs. partial fine-tuning of 40 layers), callbacks, evaluation metrics (accuracy, confusion matrix, per-class F1-score), and confidence-threshold safety gates.
4.  **Chapter 4: Conversational AI & Chatbot**: Role of chatbots in agricultural extension, Rasa/Ollama evaluations, Google Gemma 4B selection, prompt engineering, context restoration, memory management, Egyptian dialect localization, and controller-level phrase filtering.
5.  **Chapter 5: Front-End Development**: UI/UX design process, user journey, wireframes, folder structures, multilingual integration (EN/AR), dark/light mode stylesheet variables, SSE streaming animation, and audio recording.
6.  **Chapter 6: Back-End Development**: Express.js REST API architecture, request lifecycle, JWT session management, database collection layouts, Multer memory buffers, Flask and LM Studio integration, and security controls.

---

## 5. Master References List (IEEE Outline)

*   `[1]` Food and Agriculture Organization (FAO), *The State of Food and Agriculture 2023: Revealing the true cost of agrifood systems to support transformation*, Rome: FAO, 2023.
*   `[2]` M. A. El-Sheawy, "The economic impact of agricultural pests and plant pathologies on smallholder farming in Egypt," *Egyptian Journal of Agricultural Economics*, vol. 34, no. 2, pp. 115-128, 2024.
*   `[3]` J. Hughes and M. Salathé, "An open access database of plant disease images on crowdsourced photos," *arXiv preprint arXiv:1511.08060*, 2015. (The PlantVillage Dataset).
*   `[4]` M. Tan and Q. V. Le, "EfficientNetV2: Smaller models and faster training," *International Conference on Machine Learning (ICML)*, PMLR, pp. 10096-10106, 2021.
*   `[5]` G. DeepMind, "Gemma: Open Models for AI Research and Applications," *Google DeepMind Technical Report*, 2024.
*   `[6]` D. Gatis, *Rembg: Tool to remove images background*, GitHub repository, 2020. [Online]. Available: https://github.com/danielgatis/rembg
*   `[7]` R. Fielding, "Architectural Styles and the Design of Network-based Software Architectures," Ph.D. dissertation, University of California, Irvine, 2000. (REST API design).
*   `[8]` W. B. Croft, D. Metzler, and T. Strohman, *Search Engines: Information Retrieval in Practice*, Reading, MA: Addison-Wesley, 2010. (NLP and text processing foundations).
*   `[9]` D. Flanagan, *JavaScript: The Definitive Guide*, 7th ed. Sebastopol, CA: O'Reilly Media, 2020. (Vanilla JS and DOM Event-driven architecture).
*   `[10]` A. Chacon and B. Straub, *Pro Git*, 2nd ed. Apress, 2014. (Software engineering version control practices).
*   `[11]` I. Goodfellow, Y. Bengio, and A. Courville, *Deep Learning*, Cambridge, MA: MIT Press, 2016. (Deep CNN architectural foundations).
*   `[12]` Ministry of Agriculture and Land Reclamation (MALR), *Agricultural Strategy for Sustainable Development (ASSD 2030)*, Cairo: Government of Egypt, 2020.
