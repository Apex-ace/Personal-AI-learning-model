import os
import json
import pickle
import traceback
import pandas as pd
import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from dotenv import load_dotenv

import google.generativeai as genai

# =========================================================
# ENV + GEMINI SETUP
# =========================================================
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ACTIVE_GEMINI_MODEL = None

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def select_available_gemini_model():
    global ACTIVE_GEMINI_MODEL
    try:
        models = genai.list_models()
        for m in models:
            if "generateContent" in m.supported_generation_methods:
                ACTIVE_GEMINI_MODEL = m.name
                print(f"⚠️ Using fallback Gemini model: {ACTIVE_GEMINI_MODEL}")
                return
    except Exception as e:
        print("❌ Gemini model detection failed:", e)

# =========================================================
# ML ARTIFACTS
# =========================================================
ml_artifacts = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Gemini
    if GEMINI_API_KEY:
        select_available_gemini_model()
        print("✅ Gemini enabled")

    # Load YOUR model
    try:
        with open("student_performance_artifacts.pkl", "rb") as f:
            artifacts = pickle.load(f)

        ml_artifacts["model"] = artifacts["regression_model"]
        ml_artifacts["imputer"] = artifacts["imputer"]
        ml_artifacts["numeric_features"] = artifacts["numeric_features"]

        print("✅ ML artifacts loaded successfully")

    except Exception as e:
        print("❌ ML load error:", e)

    yield
    ml_artifacts.clear()

# =========================================================
# FASTAPI APP
# =========================================================
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# REQUEST MODELS (MATCH FRONTEND)
# =========================================================
class PredictionInput(BaseModel):
    math_score: float
    reading_score: float
    writing_score: float
    internal_test_1: float
    internal_test_2: float
    assignment_score: float
    attendance: float
    study_hours: float

class TutorRequest(BaseModel):
    message: str
    predicted_marks: float

class TestRequest(BaseModel):
    subject: str
    difficulty: str

# =========================================================
# ROOT (PREVENT 404 CONFUSION)
# =========================================================
@app.get("/")
def root():
    return {"status": "AI Learning Backend Running"}

# =========================================================
# PREDICTION (USES YOUR ML MODEL)
# =========================================================
@app.post("/predict")
def predict(data: PredictionInput):

    if "model" not in ml_artifacts:
        raise HTTPException(status_code=500, detail="ML model not loaded")

    try:
        df = pd.DataFrame([{
            "math score": data.math_score,
            "reading score": data.reading_score,
            "writing score": data.writing_score,
            "Internal Test 1 (out of 40)": data.internal_test_1,
            "Internal Test 2 (out of 40)": data.internal_test_2,
            "Assignment Score (out of 10)": data.assignment_score,
            "Attendance (%)": data.attendance,
            "Daily Study Hours": data.study_hours
        }])

        df = ml_artifacts["imputer"].transform(df)
        prediction = ml_artifacts["model"].predict(df)[0]

        risk = "Low"
        if prediction < 40:
            risk = "High"
        elif prediction < 60:
            risk = "Medium"

        return {
            "predicted_marks": round(float(prediction), 2),
            "risk_level": risk
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Prediction failed")

# =========================================================
# AI TUTOR (OLD SIMPLE PROMPT)
# =========================================================
@app.post("/chat_with_tutor")
def chat_with_tutor(data: TutorRequest):

    if not ACTIVE_GEMINI_MODEL:
        return {"reply": "Tutor is unavailable right now."}

    prompt = f"""
You are a helpful study assistant.

Student predicted score: {data.predicted_marks} out of 100.

Student question:
{data.message}

Explain clearly using simple words.
Give step-by-step help.
Keep it short.
"""

    try:
        model = genai.GenerativeModel(ACTIVE_GEMINI_MODEL)
        response = model.generate_content(prompt)
        return {"reply": response.text}

    except Exception as e:
        traceback.print_exc()
        return {"reply": "Tutor is unavailable right now."}

# =========================================================
# QUESTION GENERATION (OLD STABLE PROMPT)
# =========================================================
@app.post("/generate_full_test")
def generate_test(data: TestRequest):

    if not ACTIVE_GEMINI_MODEL:
        return {"error": "AI is busy. Try again!"}

    prompt = f"""
Create a question paper.

Subject: {data.subject}
Difficulty: {data.difficulty}

Include:
1. Five multiple choice questions
2. Three short answer questions
3. Two long answer questions

Only list the questions.
"""

    try:
        model = genai.GenerativeModel(ACTIVE_GEMINI_MODEL)
        response = model.generate_content(prompt)
        return {"questions": response.text}

    except Exception:
        return {"error": "AI is busy. Try again!"}
