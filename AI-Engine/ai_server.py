from flask import Flask, request, jsonify
import tensorflow as tf
from PIL import Image
import numpy as np
import io
import json
import os
from rembg import remove, new_session

app = Flask(__name__)

# Initialize rembg session
print("[CNN Server] Initializing rembg session...")
rembg_session = new_session()
print("[CNN Server] rembg session initialized!")

# 1. Load the real FLORA model
model_path = 'flora_plant_model.keras'
try:
    model = tf.keras.models.load_model(model_path)
    print(f"[CNN Server] Model loaded successfully from {model_path}!")
except Exception as e:
    print(f"[CNN Server] Error loading model {model_path}: {e}")

# 2. Load the real class names
class_names_path = 'class_names.json'
try:
    with open(class_names_path, 'r', encoding='utf-8') as f:
        class_names = json.load(f)
    print(f"[CNN Server] Loaded {len(class_names)} class names successfully!")
except Exception as e:
    print(f"[CNN Server] Error loading class names from {class_names_path}: {e}")
    class_names = []

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    
    try:
        # Load image
        img = Image.open(file.stream).convert('RGB')
        
        # 1. Run rembg to remove background
        print("[CNN Server] Removing background using rembg...")
        nobg = remove(img, session=rembg_session)
        
        # 2. Composite onto a white background (rembg returns transparent RGBA)
        if nobg.mode == 'RGBA':
            white_bg = Image.new('RGBA', nobg.size, (255, 255, 255, 255))
            composite = Image.alpha_composite(white_bg, nobg).convert('RGB')
            img_processed = composite
        else:
            img_processed = nobg.convert('RGB')
            
        # 3. Resize to 224x224 as required by the model
        img_processed = img_processed.resize((224, 224))
        
        # 4. Convert to float32 NumPy array without rescaling (do NOT divide by 255.0)
        img_array = np.array(img_processed, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)

        # 5. Prediction (no softmax required as model output layer has it built-in)
        predictions = model.predict(img_array)
        score = predictions[0]
        class_idx = np.argmax(score)
        confidence = float(score[class_idx])
        
        class_name = class_names[class_idx]
        print(f"[CNN Server] Predicted: {class_name} with confidence: {confidence:.4f}")
        
        # Parse plant and disease from the class label (formatted as Plant___Disease)
        if "___" in class_name:
            plant, disease = class_name.split("___", 1)
        else:
            plant = class_name
            disease = "Unknown"
            
        # Format names to look cleaner
        plant_clean = plant.replace("_", " ").strip()
        disease_clean = disease.replace("_", " ").strip()
        
        return jsonify({
            "plant": plant_clean,
            "disease": disease_clean,
            "confidence": float(100 * confidence),
            "class_name": class_name
        })
    except Exception as e:
        print(f"[CNN Server] Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run the server on port 5000
    app.run(host='0.0.0.0', port=5000)