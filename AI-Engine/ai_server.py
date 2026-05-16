from flask import Flask, request, jsonify
import tensorflow as tf
from PIL import Image
import numpy as np
import io

app = Flask(__name__)

# 1. تحميل الموديل بتاعك (تأكد من المسار صح)
try:
    model = tf.keras.models.load_model('cnn_final100.keras')
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")

# 2. لستة الأمراض (⚠️ لازم تكون بنفس ترتيب التريننج)
# دي مجرد أمثلة، استبدلها باللستة الحقيقية اللي الموديل اتدرب عليها
class_names = [
    "Apple Scab", "Apple Black Rot", "Grape Black Rot", 
    "Tomato Leaf Mold", "Potato Early Blight", "Healthy Plant"
]

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    
    try:
        # تجهيز الصورة للموديل
        img = Image.open(file.stream).convert('RGB')
        img = img.resize((224, 224)) # تأكد من مقاس الموديل (ممكن يكون 150 أو 224)
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # التوقع
        predictions = model.predict(img_array)
        score = tf.nn.softmax(predictions[0])
        class_idx = np.argmax(score)
        
        return jsonify({
            "disease": class_names[class_idx],
            "confidence": float(100 * np.max(score))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # السيرفر ده هيشتغل على بورت 5000
    app.run(host='0.0.0.0', port=5000)