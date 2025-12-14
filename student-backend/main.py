import os
import json
import pickle
import traceback
import pandas as pd
from typing import Optional
from contextlib import asynccontextmanager

import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# -------------------------------------------------
# ENV + GEMINI SETUP
# -------------------------------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ACTIVE_MODEL = None

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def pick_available_model():
    global ACTIVE_MODEL
    try:
        models = [
            m.name for m in genai.list_models()
            if "generateContent" in m.supported_generation_methods
        ]
        priority = [
            "models/gemini-2.5-flash",
            "models/gemini-1.5-flash",
            "models/gemini-pro"
        ]
        for p in priority:
            if p in models:
                ACTIVE_MODEL = p
                print(f"✅ Using Gemini model: {ACTIVE_MODEL}")
                return
        ACTIVE_MODEL = models[0]
        print(f"⚠️ Using fallback Gemini model: {ACTIVE_MODEL}")
    except Exception as e:
        print("❌ Gemini init failed:", e)

# -------------------------------------------------
# ML ARTIFACTS
# -------------------------------------------------
ml_artifacts = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Gemini
    if GEMINI_API_KEY:
        pick_available_model()
        print("✅ Gemini enabled")
    else:
        print("⚠️ Gemini API key missing")

    # ML Model
    try:
        with open("student_performance_artifacts.pkl", "rb") as f:
            artifacts = pickle.load(f)

        ml_artifacts["model"] = artifacts["regression_model"]
        ml_artifacts["imputer"] = artifacts["imputer"]
        print("✅ ML artifacts loaded successfully")

    except Exception as e:
        print("❌ ML load error:", e)

    yield
    ml_artifacts.clear()

# -------------------------------------------------
# APP
# -------------------------------------------------
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# HEALTH
# -------------------------------------------------
@app.get("/")
def health():
    return {"status": "ok"}

# -------------------------------------------------
# PREDICTION (USES YOUR ML MODEL)
# -------------------------------------------------
@app.post("/predict")
def predict(payload: dict):

    if "model" not in ml_artifacts:
        raise HTTPException(status_code=500, detail="ML model not loaded")

    try:
        df = pd.DataFrame([{
            "math score": payload.get("math score", 0),
            "reading score": payload.get("reading score", 0),
            "writing score": payload.get("writing score", 0),
            "Daily Study Hours": payload.get("Daily Study Hours", 0),
            "Attendance (%)": payload.get("Attendance (%)", 0),
            "Internal Test 1 (out of 40)": payload.get("Internal Test 1 (out of 40)", 0),
            "Internal Test 2 (out of 40)": payload.get("Internal Test 2 (out of 40)", 0),
            "Assignment Score (out of 10)": payload.get("Assignment Score (out of 10)", 0),
        }])

        df = ml_artifacts["imputer"].transform(df)
        predicted = float(ml_artifacts["model"].predict(df)[0])

        if predicted < 40:
            risk = "High"
        elif predicted < 60:
            risk = "Medium"
        else:
            risk = "Low"

        return {
            "final_marks_prediction": round(predicted, 2),
            "final_pass_probability": round(min(predicted / 100, 1), 2),
            "risk_level": risk,
            "math_score": payload.get("math score"),
            "reading_score": payload.get("reading score"),
            "writing_score": payload.get("writing score"),
        }

    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Prediction failed")

# -------------------------------------------------
# AI TUTOR (OLD STYLE PROMPT)
# -------------------------------------------------
@app.post("/chat_with_tutor")
async def chat_with_tutor(data: dict):

    if not ACTIVE_MODEL:
        return {"reply": "Tutor unavailable right now."}

    prompt = f"""
You are a helpful study assistant.

Student predicted score: {data.get("predicted_marks", "unknown")} out of 100.

Student question:
{data.get("message", "")}

Explain clearly using simple steps.
Keep the answer short.
"""

    try:
        model = genai.GenerativeModel(ACTIVE_MODEL)
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        print("❌ Tutor error:", e)
        return {"reply": "Tutor unavailable right now."}

# -------------------------------------------------
# QUESTION GENERATION (OLD STYLE)
# -------------------------------------------------
@app.post("/generate_full_test")
async def generate_test(data: dict):

    if not ACTIVE_MODEL:
        return {"questions": []}

    prompt = f"""
Create a question paper.

Subject: {data.get("test_type")}
Difficulty: {data.get("difficulty")}

Include:
- 5 multiple choice questions
- 3 short answer questions
- 2 long answer questions

Only list questions.
"""

    try:
        model = genai.GenerativeModel(ACTIVE_MODEL)
        response = model.generate_content(prompt)
        return {"questions": response.text}
    except Exception as e:
        print("❌ Test generation error:", e)
        return {"questions": []}
