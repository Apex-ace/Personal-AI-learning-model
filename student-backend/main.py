import os
import json
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# ================= ENV =================
load_dotenv()

# ================= APP =================
app = FastAPI(title="Personal AI Learning Model")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= GEMINI =================
import google.generativeai as genai

GEMINI_ENABLED = False
GEMINI_MODEL = None

try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    models = [
        m.name for m in genai.list_models()
        if "generateContent" in m.supported_generation_methods
    ]
    if models:
        GEMINI_MODEL = genai.GenerativeModel(models[0])
        GEMINI_ENABLED = True
        print(f"⚠️ Using Gemini model: {models[0]}")
except Exception as e:
    print("❌ Gemini disabled:", e)

# ================= ML LOAD =================
MODEL = None
SCALER = None

try:
    MODEL = joblib.load("model.pkl")
    SCALER = joblib.load("scaler.pkl")
    print("✅ ML artifacts loaded successfully")
except Exception as e:
    print("❌ ML load error:", e)

# ================= SCHEMAS =================
class PredictInput(BaseModel):
    math: float
    reading: float
    writing: float
    hours_per_day: float
    attendance: float
    assignment: float
    internal1: float
    internal2: float

class TutorInput(BaseModel):
    message: str

class TestInput(BaseModel):
    test_type: str
    difficulty: str
    learning_context: str | None = ""

# ================= HELPERS =================
def clamp(value, low=0, high=100):
    try:
        value = float(value)
        return max(low, min(high, value))
    except:
        return low

# ================= ROUTES =================
@app.get("/")
def root():
    return {"status": "AI Brain Online 🧠"}

@app.post("/predict")
def predict(data: PredictInput):
    if MODEL is None or SCALER is None:
        raise HTTPException(status_code=500, detail="ML model not loaded")

    features = np.array([[
        data.math,
        data.reading,
        data.writing,
        data.hours_per_day,
        data.attendance,
        data.assignment,
        data.internal1,
        data.internal2
    ]])

    features = SCALER.transform(features)
    prediction = MODEL.predict(features)[0]

    predicted_marks = clamp(prediction)
    chance = clamp(predicted_marks)

    if predicted_marks < 40:
        risk = "High"
    elif predicted_marks < 70:
        risk = "Medium"
    else:
        risk = "Low"

    return {
        "predicted_marks": round(predicted_marks, 2),
        "chance": round(chance, 2),
        "risk_level": risk,
        "math_score": data.math,
        "reading_score": data.reading,
        "writing_score": data.writing
    }

@app.post("/chat_with_tutor")
def chat_with_tutor(data: TutorInput):
    if not GEMINI_ENABLED:
        return {"reply": "Tutor is unavailable right now 😴"}

    try:
        prompt = f"You are a friendly AI tutor. Answer clearly and simply:\n{data.message}"
        response = GEMINI_MODEL.generate_content(prompt)
        return {"reply": response.text}
    except Exception:
        return {"reply": "Tutor is unavailable right now 😴"}

@app.post("/generate_full_test")
def generate_test(data: TestInput):
    if not GEMINI_ENABLED:
        return {"questions": []}

    try:
        prompt = f"""
Generate 5 multiple-choice questions.

Subject: {data.test_type}
Difficulty: {data.difficulty}
Context: {data.learning_context}

Return ONLY valid JSON like:
[
  {{
    "question": "",
    "options": ["A","B","C","D"],
    "correct_answer": "A"
  }}
]
"""
        response = GEMINI_MODEL.generate_content(prompt)
        text = response.text.strip()

        json_start = text.find("[")
        questions = json.loads(text[json_start:])

        return {"questions": questions}
    except Exception:
        return {"questions": []}
