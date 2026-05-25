import os
import cv2
import mediapipe as mp
import numpy as np
import pickle
import base64
import nltk
from nltk.corpus import words, brown
from collections import Counter, defaultdict
from flask import Flask, request, jsonify
from flask_cors import CORS
from googletrans import Translator
from gtts import gTTS
import io

# Setup NLTK data path and downloads
try:
    nltk.data.find('corpora/words')
    nltk.data.find('corpora/brown')
except LookupError:
    nltk.download('words')
    nltk.download('brown')

# Build NLTK transition model
word_list = set(words.words())
word_transitions = defaultdict(Counter)
for sentence in brown.sents():
    for w1, w2 in zip(sentence[:-1], sentence[1:]):
        word_transitions[w1.lower()][w2.lower()] += 1

# Load ASL Classifier
MODEL_PATH = "asl(1)_landmarks_model.pkl"
model = None
le = None

def load_model():
    global model, le
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                model, le = pickle.load(f)
            print("ASL Model loaded successfully!")
        except Exception as e:
            print(f"Error loading ASL model: {e}")
    else:
        print(f"ASL Model file {MODEL_PATH} not found yet. Please run training.")

load_model()

# Initialize MediaPipe Tasks API HandLandmarker
detector = None
try:
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    
    model_path = 'hand_landmarker.task'
    if not os.path.exists(model_path):
        print("Downloading hand_landmarker.task model...")
        import urllib.request
        url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
        urllib.request.urlretrieve(url, model_path)
        print("Model downloaded successfully!")
        
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.7,
        min_tracking_confidence=0.7
    )
    detector = vision.HandLandmarker.create_from_options(options)
    print("MediaPipe HandLandmarker Tasks API initialized successfully!")
except Exception as e:
    print(f"Warning: MediaPipe HandLandmarker Tasks API is not available ({e}). Direct image predictions will fallback gracefully.")

# Initialize Translator
translator = Translator()

# Flask App Setup
app = Flask(__name__)
CORS(app)

def get_word_suggestions(current_word, num_suggestions=5):
    suggestions = []
    if not current_word:
        return ["HELLO", "I", "THE", "PLEASE", "CAN"]
    
    word_completions = [w for w in word_list if w.lower().startswith(current_word.lower())]
    suggestions.extend(word_completions[:2])
    
    if current_word.lower() in word_transitions:
        common_next = word_transitions[current_word.lower()].most_common(3)
        suggestions.extend(word for word, _ in common_next)
    
    return list(dict.fromkeys(suggestions))[:num_suggestions]

@app.route("/health", methods=["GET"])
def health_check():
    # Reload model if it was not loaded originally
    if model is None:
        load_model()
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None
    })

@app.route("/suggestions", methods=["GET"])
def suggestions_endpoint():
    word = request.args.get("word", "").strip()
    suggestions = get_word_suggestions(word)
    # Convert all suggestions to uppercase to keep consistent with ASL interface
    suggestions_upper = [s.upper() for s in suggestions]
    return jsonify({"suggestions": suggestions_upper})

@app.route("/translate", methods=["POST"])
def translate_endpoint():
    data = request.json or {}
    text = data.get("text", "").strip()
    target_lang = data.get("target_lang", "hi").strip()
    
    if not text:
        return jsonify({"translated_text": "", "error": "No text provided"}), 400
        
    try:
        result = translator.translate(text, dest=target_lang)
        translated_text = getattr(result, 'text', str(result))
        return jsonify({"translated_text": translated_text})
    except Exception as e:
        return jsonify({"translated_text": text, "error": str(e)})

@app.route("/speak", methods=["POST"])
def speak_endpoint():
    data = request.json or {}
    text = data.get("text", "").strip()
    lang = data.get("lang", "en").strip()
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    try:
        # Create TTS
        tts = gTTS(text=text, lang=lang)
        
        # Save to an in-memory byte buffer
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        
        # Base64 encode the audio file
        audio_b64 = base64.b64encode(fp.read()).decode("utf-8")
        
        return jsonify({
            "audio": f"data:audio/mp3;base64,{audio_b64}",
            "text": text,
            "lang": lang
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/predict_landmarks", methods=["POST"])
def predict_landmarks_endpoint():
    if model is None:
        load_model()
        if model is None:
            return jsonify({"error": "ASL Model is not trained or loaded"}), 503
            
    data = request.json or {}
    landmarks = data.get("landmarks")
    
    if not landmarks or len(landmarks) != 63:
        return jsonify({"error": "Invalid landmarks. Must be list of 63 floats"}), 400
        
    try:
        proba = model.predict_proba([landmarks])[0]
        pred_idx = np.argmax(proba)
        letter = le.inverse_transform([pred_idx])[0]
        confidence = float(proba[pred_idx])
        
        return jsonify({
            "letter": letter,
            "confidence": confidence
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/predict", methods=["POST"])
def predict_image_endpoint():
    if model is None:
        load_model()
        if model is None:
            return jsonify({"error": "ASL Model is not trained or loaded"}), 503
            
    if detector is None:
        return jsonify({
            "letter": "",
            "confidence": 0.0,
            "landmarks_detected": False,
            "error": "MediaPipe HandLandmarker is not available on this server environment. Please use raw landmarks (/predict_landmarks) or local sign simulation."
        })

    data = request.json or {}
    image_b64 = data.get("image")
    
    if not image_b64:
        return jsonify({"error": "No image data provided"}), 400
        
    try:
        # Handle headers in data URL if present
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
            
        img_bytes = base64.b64decode(image_b64)
        np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({"error": "Failed to decode image"}), 400
            
        # Flip image horizontally (same as Tkinter camera feed)
        frame = cv2.flip(frame, 1)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Convert to MediaPipe Image object
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        
        # Run detection
        detection_result = detector.detect(mp_image)
        
        if detection_result.hand_landmarks:
            hand_landmarks = detection_result.hand_landmarks[0]
            lm_list = []
            for lm in hand_landmarks:
                lm_list.extend([lm.x, lm.y, lm.z])
                
            proba = model.predict_proba([lm_list])[0]
            pred_idx = np.argmax(proba)
            letter = le.inverse_transform([pred_idx])[0]
            confidence = float(proba[pred_idx])
            
            return jsonify({
                "letter": letter,
                "confidence": confidence,
                "landmarks_detected": True
            })
        else:
            return jsonify({
                "letter": "",
                "confidence": 0.0,
                "landmarks_detected": False,
                "message": "No hand detected"
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=True)
