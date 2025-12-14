import os
import json
import pickle
import traceback
from typing import Optional, List
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import google.generativeai as genai

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from dotenv import load_dotenv

# =========================
# ENV + GEMINI SETUP
# =========================
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

gemini_model = None


def get_best_gemini_model():
    """Auto-select a working Gemini model"""
    try:
        models = genai.list_models()
        preferred = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-pro",
        ]

        available = [
            m.name for m in models
            if "generateContent" in m.supported_generation_methods
        ]

        for p in preferred:
            if p in available:
                print(f"✅ Using Gemini model: {p}")
                return genai.GenerativeModel(p)

        if available:
            print(f"⚠️ Using fallback Gemini model: {available[0]}")
            return genai.GenerativeModel(available[0])

        print("❌ No Gemini models available")
        return None

    except Exception as e:
        print("❌ Gemini discovery failed:", e)
        return None


if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = get_best_gemini_model()
    print("✅ Gemini enabled")
else:
    print("⚠️ GEMINI_API_KEY missing")


# =========================
# ML ARTIFACTS
# =========================
ml_artifacts = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        with open("student_performance_artifacts.pkl", "rb") as f:
            artifacts = pickle.load(f)

        ml_artifacts["regression"] = artifacts["regression_model"]
        ml_artifacts["classifier"] = artifacts["classification_model"]
        ml_artifacts["imputer"] = artifacts["imputer"]
        ml_artifacts["X_columns"] = artifacts["X_columns"]

        print("✅ ML artifacts loaded successfully")

    except Exception as e:
        print("❌ ML load error:", e)
        ml_artifacts["error"] = True

    yield
    ml_artifacts.clear()


# =========================
# FASTAPI APP
# =========================
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# SCHEMAS
# =========================
class StudentInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    math_score: float = Field(..., alias="math score")
    reading_score: float = Field(..., alias="reading score")
    writing_score: float = Field(..., alias="writing score")
    internal_test_1: float = Field(..., alias="Internal Test 1 (out of 40)")
    internal_test_2: float = Field(..., alias="Internal Test 2 (out of 40)")
    assignment_score: float = Field(0, alias="Assignment Score (out of 10)")
    attendance: float = Field(..., alias="Attendance (%)")
    study_hours: float = Field(..., alias="Daily Study Hours")


class ChatRequest(BaseModel):
    message: str
    grade_level: str


class TestRequest(BaseModel):
    difficulty: str
    test_type: str
    learning_context: Optional[str] = None


# =========================
# HEALTH CHECK
# =========================
@app.get("/")
def root():
    return {"status": "AI Tutor Backend Running"}


# =========================
# ML PREDICTION
# =========================
@app.post("/predict")
def predict(data: StudentInput):
    if ml_artifacts.get("error"):
        return {"error": "ML unavailable"}

    try:
        df = pd.DataFrame([data.model_dump(by_alias=True)])
        df = ml_artifacts["imputer"].transform(df)

        X = pd.DataFrame(df, columns=ml_artifacts["X_columns"])

        final_marks = float(ml_artifacts["regression"].predict(X)[0])
        pass_prob = float(ml_artifacts["classifier"].predict_proba(X)[0][1])

        risk = (
            "High" if pass_prob < 0.5 else
            "Medium" if pass_prob < 0.75 else
            "Low"
        )

        return {
            "final_marks_prediction": round(final_marks, 2),
            "final_pass_probability": round(pass_prob, 2),
            "risk_level": risk,
            "math_score": data.math_score,
            "reading_score": data.reading_score,
            "writing_score": data.writing_score,
        }

    except Exception as e:
        print("❌ Prediction error:", e)
        return {"error": "Prediction failed"}


# =========================
# AI TUTOR
# =========================
@app.post("/chat_with_tutor")
async def chat_with_tutor(req: ChatRequest):
    if not gemini_model:
        return {"reply": "Tutor unavailable"}

    try:
        prompt = f"""
You are a friendly tutor for a {req.grade_level} grade student.
Explain clearly and simply.

Question:
{req.message}
"""
        response = gemini_model.generate_content(prompt)
        return {"reply": response.text}

    except Exception as e:
        print("❌ Tutor error:", e)
        return {"reply": "Tutor is busy. Try again."}


# =========================
# QUESTION GENERATION
# =========================
@app.post("/generate_full_test")
async def generate_full_test(req: TestRequest):
    if not gemini_model:
        return {"questions": []}

    try:
        context = f"Focus on: {req.learning_context}" if req.learning_context else ""

        prompt = f"""
Create 10 MCQ questions.
Grade: 6
Subject: {req.test_type}
Difficulty: {req.difficulty}
{context}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "id": 1,
      "question": "text",
      "options": ["A","B","C","D"],
      "correct_answer": "A"
    }}
  ]
}}
"""

        response = gemini_model.generate_content(prompt)
        clean = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)

    except Exception as e:
        print("❌ Test generation error:", e)
        return {"questions": [], "error": "AI busy"}
