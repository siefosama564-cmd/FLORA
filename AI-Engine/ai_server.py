from flask import Flask, request, jsonify
import tensorflow as tf
from PIL import Image
import numpy as np
import io
import json
import os
from rembg import remove, new_session

app = Flask(__name__)

# --- Globals (None until loaded) ---------------------------------------------
# FIX: Declare model and class_names at module level BEFORE the try blocks.
# Previously both were only assigned inside try-blocks, so if loading failed
# the variables didn't exist in module scope -> NameError inside /predict.
model       = None
class_names = []

# Initialize rembg session
print("[CNN Server] Initializing rembg session...")
rembg_session = new_session()
print("[CNN Server] rembg session initialized!")

# --- 1. Load the FLORA model --------------------------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "flora_plant_model.keras")
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"[CNN Server] [SUCCESS] Model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"[CNN Server] [ERROR] CRITICAL - could not load model: {e}")
    print("[CNN Server] [WARNING] /predict will return 503 until model is available.")

# --- 2. Load class names ------------------------------------------------------
# FIX: class_names.json was missing from the project. We embed the 38 PlantVillage
# class labels directly so the server works without the external file.
# If class_names.json exists alongside this file it will be used instead.
EMBEDDED_CLASS_NAMES = [
    "Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust",
    "Apple___healthy", "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_", "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy", "Grape___Black_rot", "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)", "Peach___Bacterial_spot",
    "Peach___healthy", "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy",
    "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy",
    "Raspberry___healthy", "Soybean___healthy", "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch", "Strawberry___healthy",
    "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight",
    "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy"
]

CLASS_NAMES_PATH = os.path.join(os.path.dirname(__file__), "class_names.json")
if os.path.exists(CLASS_NAMES_PATH):
    try:
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            class_names = json.load(f)
        print(f"[CNN Server] [SUCCESS] Loaded {len(class_names)} class names from file.")
    except Exception as e:
        print(f"[CNN Server] [WARNING] class_names.json unreadable ({e}) - using embedded list.")
        class_names = EMBEDDED_CLASS_NAMES
else:
    print("[CNN Server] [INFO] class_names.json not found - using embedded 38-class list.")
    class_names = EMBEDDED_CLASS_NAMES


@app.route("/health", methods=["GET"])
def health():
    """Lightweight health-check endpoint used by Node.js aiService.js."""
    return jsonify({
        "status": "ok" if model is not None else "degraded",
        "model_loaded": model is not None,
        "num_classes": len(class_names)
    })


@app.route("/predict", methods=["POST"])
def predict():
    # FIX: Guard — if model failed to load at startup, return 503 immediately.
    # Previously this fell through to `model.predict()` which raised NameError
    # and returned a confusing 500 "name 'model' is not defined" error.
    if model is None:
        print("[CNN Server] [ERROR] /predict called but model is not loaded.")
        return jsonify({
            "error": "Model not loaded. Check server logs for the load error.",
            "hint": "Ensure flora_plant_model.keras exists next to ai_server.py"
        }), 503

    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]

    try:
        # Load image
        img = Image.open(file.stream).convert("RGB")

        # 1. Remove background with rembg
        print("[CNN Server] Removing background using rembg...")
        nobg = remove(img, session=rembg_session)

        # 2. Composite onto white background
        if nobg.mode == "RGBA":
            white_bg = Image.new("RGBA", nobg.size, (255, 255, 255, 255))
            img_processed = Image.alpha_composite(white_bg, nobg).convert("RGB")
        else:
            img_processed = nobg.convert("RGB")

        # 3. Resize to 224×224
        img_processed = img_processed.resize((224, 224))

        # 4. Convert to float32 — do NOT divide by 255 (preprocessing is built-in)
        img_array = np.array(img_processed, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)

        # 5. Predict
        predictions = model.predict(img_array)
        score       = predictions[0]
        class_idx   = int(np.argmax(score))
        confidence  = float(score[class_idx])

        # FIX: Guard against empty / shorter-than-expected class_names list
        if class_idx >= len(class_names):
            return jsonify({"error": f"class_idx {class_idx} out of range ({len(class_names)} classes)"}), 500

        class_name = class_names[class_idx]
        print(f"[CNN Server] [SUCCESS] Predicted: {class_name}  confidence={confidence:.4f}")

        # Parse Plant___Disease format
        if "___" in class_name:
            plant, disease = class_name.split("___", 1)
        else:
            plant, disease = class_name, "healthy"

        plant_clean   = plant.replace("_",   " ").strip()
        disease_clean = disease.replace("_", " ").strip()

        return jsonify({
            "plant":      plant_clean,
            "disease":    disease_clean,
            "confidence": round(confidence * 100, 2),
            "class_name": class_name
        })

    except Exception as e:
        print(f"[CNN Server] [ERROR] Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
