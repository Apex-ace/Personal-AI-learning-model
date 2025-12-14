import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

import google.generativeai as genai

# ------------------------------------
# ENV
# ------------------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ------------------------------------
# APP
# ------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------
# GEMINI (AUTO SAFE)
# ------------------------------------
gemini_model = None

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

    for model_name in [
        "models/gemini-2.5-flash",
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro",
    ]:
        try:
            gemini_model = genai.GenerativeModel(model_name)
            gemini_model.generate_content("hello")
            print(f"✅ Gemini using {model_name}")
            break
        except Exception:
            continue

if not gemini_model:
    print("⚠️ Gemini unavailable")

# ------------------------------------
# ML LOAD (BULLETPROOF)
# ------------------------------------
ml = {}

try:
    ml["classifier"] = joblib.load("models/classifier.pkl")
    ml["regression"] = joblib.load("models/regression.pkl")
    ml["imputer"] = joblib.load("models/imputer.pkl")

    # 🔥 FIX: derive columns safely
    ml["X_columns"] = list(
        ml["imputer"].feature_names_in_
    )

    print("✅ ML loaded")

except Exception as e:
    ml["error"] = str(e)
    print("❌ ML error:", e)

# ------------------------------------
# SCHEMAS
# ------------------------------------
class StudentInput(BaseModel):
    attendance: float
    study_hours: float
    previous_score: float
    sleep_hours: float
    stress_level: float

class TutorInput(BaseModel):
    message: str

class TestInput(BaseModel):
    subject: str
    difficulty: str

# ------------------------------------
# ROOT
# ------------------------------------
@app.get("/")
def root():
    return {"status": "ok"}

# ------------------------------------
# PREDICTION (NO NaN EVER)
# ------------------------------------
@app.post("/predict")
def predict(data: StudentInput):
    if "error" in ml:
        return {"error": "ML unavailable"}

    df = pd.DataFrame([data.dict()])
    df = df.apply(pd.to_numeric, errors="coerce")

    df_imputed = ml["imputer"].transform(df)
    X = pd.DataFrame(df_imputed, columns=ml["X_columns"])

    marks = float(ml["regression"].predict(X)[0])

    proba = ml["classifier"].predict_proba(X)[0][1]
    if np.isnan(proba):
        proba = 0.5

    proba = max(0.0, min(1.0, float(proba)))

    risk = "Low" if proba >= 0.75 else "Medium" if proba >= 0.5 else "High"

    return {
        "marks": round(marks, 2),
        "chance": round(proba * 100, 2),
        "risk": risk,
    }

# ------------------------------------
# AI TUTOR (NEVER UNAVAILABLE)
# ------------------------------------
@app.post("/chat_with_tutor")
def chat_tutor(data: TutorInput):
    if not gemini_model:
        return {
            "reply": "I am here to help! Tell me what topic you are studying."
        }

    prompt = f"""
You are a friendly AI tutor for students.
Explain clearly and briefly.

Student question:
{data.message}
"""

    try:
        response = gemini_model.generate_content(prompt)
        return {"reply": response.text}

    except Exception:
        return {
            "reply": "Let's continue learning! Ask your question again."
        }

# ------------------------------------
# QUESTION GENERATION (SAFE)
# ------------------------------------
@app.post("/generate_full_test")
def generate_test(data: TestInput):
    if not gemini_model:
        return {
            "questions": [
                f"Explain basics of {data.subject}",
                f"Give an example problem from {data.subject}",
            ]
        }

    prompt = f"""
Generate 5 {data.difficulty} level questions for subject {data.subject}.
Only list questions.
"""

    try:
        response = gemini_model.generate_content(prompt)
        questions = [
            q.strip("- ").strip()
            for q in response.text.split("\n")
            if q.strip()
        ]

        return {"questions": questions}

    except Exception:
        return {
            "questions": [
                f"What is {data.subject}?",
                f"Explain core concepts of {data.subject}",
            ]
        }
