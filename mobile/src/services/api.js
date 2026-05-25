import { Platform } from 'react-native';

// Detect host based on emulator platform or fallback
// Android emulator uses 10.0.2.2 to access localhost of the host machine
// iOS simulator uses localhost directly
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const BASE_URL = `http://${DEFAULT_HOST}:5005`;

let currentBaseUrl = BASE_URL;

// Allow changing the API host dynamically from settings/profile page
export const setApiHost = (hostOrIp) => {
  if (hostOrIp) {
    if (!hostOrIp.startsWith('http')) {
      currentBaseUrl = `http://${hostOrIp}:5005`;
    } else {
      currentBaseUrl = hostOrIp;
    }
  }
  console.log("API Base URL set to:", currentBaseUrl);
};

export const getApiBaseUrl = () => currentBaseUrl;

// Check if Python server is online
export const checkBackendHealth = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
    
    const response = await fetch(`${currentBaseUrl}/health`, { 
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return { online: true, details: data };
    }
    return { online: false, error: 'Status not OK' };
  } catch (err) {
    return { online: false, error: err.message };
  }
};

// Word suggestions from Brown corpus
export const getSuggestions = async (word) => {
  try {
    const response = await fetch(`${currentBaseUrl}/suggestions?word=${encodeURIComponent(word)}`);
    if (response.ok) {
      const data = await response.json();
      return data.suggestions || [];
    }
    throw new Error("Server error");
  } catch (err) {
    console.warn("Using mock suggestions (backend offline):", err.message);
    // Mock suggestions fallback
    if (!word) return ["HELLO", "I", "THE", "PLEASE", "CAN"];
    const mockDb = ["HELLO", "HELP", "HOW", "HAPPY", "HAVE", "I", "IS", "IT", "IN", "INTERPRETER", "THE", "THANK", "THIS", "TO", "TODAY", "PLEASE", "PLAY", "PEOPLE", "CAN", "COME", "CALL"];
    return mockDb.filter(w => w.toUpperCase().startsWith(word.toUpperCase())).slice(0, 5);
  }
};

// Google translation service
export const translateText = async (text, targetLang = 'hi') => {
  try {
    const response = await fetch(`${currentBaseUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_lang: targetLang })
    });
    if (response.ok) {
      const data = await response.json();
      return data.translated_text;
    }
    throw new Error("Server error");
  } catch (err) {
    console.warn("Using mock translation (backend offline):", err.message);
    const mockTranslations = {
      hi: {
        "HELLO": "नमस्ते",
        "THANK YOU": "धन्यवाद",
        "PLEASE": "कृपया",
        "HOW ARE YOU": "आप कैसे हैं?",
        "I NEED HELP": "मुझे मदद चाहिए",
        "YES": "हाँ",
        "NO": "नहीं"
      },
      es: {
        "HELLO": "Hola",
        "THANK YOU": "Gracias",
        "PLEASE": "Por favor",
        "HOW ARE YOU": "¿Cómo estás?",
        "I NEED HELP": "Necesito ayuda",
        "YES": "Sí",
        "NO": "No"
      },
      ta: {
        "HELLO": "வணக்கம்",
        "THANK YOU": "நன்றி",
        "PLEASE": "தயவுசெய்து",
        "HOW ARE YOU": "எப்படி இருக்கிறீர்கள்?",
        "I NEED HELP": "எனக்கு உதவி தேவை",
        "YES": "ஆம்",
        "NO": "இல்லை"
      }
    };
    const langSet = mockTranslations[targetLang] || {};
    return langSet[text.toUpperCase()] || `[${targetLang}] ${text}`;
  }
};

// Text-to-speech base64 audio output
export const getSpeechAudio = async (text, lang = 'en') => {
  try {
    const response = await fetch(`${currentBaseUrl}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang })
    });
    if (response.ok) {
      const data = await response.json();
      return data.audio; // Returns base64 data URI format "data:audio/mp3;base64,..."
    }
    throw new Error("Server error");
  } catch (err) {
    console.warn("gTTS speech API request failed:", err.message);
    return null;
  }
};

// Send base64 camera image to Python backend for MediaPipe + ML classification
export const predictImage = async (base64Image) => {
  try {
    const response = await fetch(`${currentBaseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    });
    if (response.ok) {
      const data = await response.json();
      return {
        letter: data.letter || '',
        confidence: data.confidence || 0.0,
        detected: data.landmarks_detected || false
      };
    }
    throw new Error("Predict request failed");
  } catch (err) {
    console.warn("Prediction API failed (using mock gesture in frontend):", err.message);
    // Return false for detected, allowing UI to trigger local simulator/mock
    return {
      letter: '',
      confidence: 0.0,
      detected: false,
      error: err.message
    };
  }
};

// Send raw 63 landmarks coordinates to Python backend for ML classification
export const predictLandmarks = async (landmarksArray) => {
  try {
    const response = await fetch(`${currentBaseUrl}/predict_landmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ landmarks: landmarksArray })
    });
    if (response.ok) {
      const data = await response.json();
      return {
        letter: data.letter || '',
        confidence: data.confidence || 0.0
      };
    }
    throw new Error("Predict landmarks request failed");
  } catch (err) {
    console.error("Landmarks prediction API failed:", err.message);
    return {
      letter: '',
      confidence: 0.0,
      error: err.message
    };
  }
};
