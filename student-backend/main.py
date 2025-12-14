import os
import json
import pickle
import traceback
import pandas as pd
import numpy as np

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from contextlib import asynccontextmanager
from typing import List, Optional

import google.generativeai as genai
from dotenv import load_dotenv

# =========================================================
# ENV + GEMINI SETUP
# =========================================================

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ACTIVE_MODEL_NAME = "models/gemini-1.5-flash"  # ✅ SAFE MODEL

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini enabled")
else:
    print("⚠️ Gemini API key missing")

# =========================================================
# GLOBAL ML STORE
# =========================================================

ml_artifacts = {}

# =========================================================
# APP LIFESPAN (LOAD ML ON STARTUP)
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        with open("student_performance_artifacts.pkl", "rb") as f:
            artifacts = pickle.load(f)

        ml_artifacts["regression_model"] = artifacts["regression_model"]
        ml_artifacts["classification_model"] = artifacts["classification_model"]
        ml_artifacts["imputer"] = artifacts["imputer"]
        ml_artifacts["numeric_features"] = artifacts["numeric_features"]
        ml_artifacts["categorical_features"] = artifacts.get("categorical_features", [])

        # 🔥 REBUILD FEATURE COLUMNS SAFELY
        df = artifacts["df"]

        num = df[ml_artifacts["numeric_features"]]
        cat = (
            pd.get_dummies(df[ml_artifacts["categorical_features"]], drop_first=True)
            if ml_artifacts["categorical_features"]
            else pd.DataFrame()
        )

        X_full = pd.concat([num.reset_index(drop=True), cat.reset_index(drop=True)], axis=1)
        ml_artifacts["columns"] = X_full.columns

        print("✅ ML artifacts loaded successfully")

    except Exception as e:
        ml_artifacts["error"] = True
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
# DATA MODELS
# =========================================================

class StudentInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    math_score: float = Field(..., alias="math score")
    reading_score: float = Field(..., alias="reading score")
    writing_score: float = Field(..., alias="writing score")
    internal_test_1: float = Field(..., alias="Internal Test 1 (out of 40)")
    internal_test_2: float = Field(..., alias="Internal Test 2 (out of 40)")
    assignment_score: float = Field(0.0, alias="Assignment Score (out of 10)")
    attendance: float = Field(..., alias="Attendance (%)")
    study_hours: float = Field(..., alias="Daily Study Hours")


class ChatRequest(BaseModel):
    message: str
    grade_level: str


class TestRequest(BaseModel):
    difficulty: str
    test_type: str
    learning_context: Optional[str] = None


class TestResult(BaseModel):
    score: int
    total_marks: int
    wrong_answers: List[str]

# =========================================================
# ROUTES
# =========================================================

@app.get("/")
def root():
    return {"status": "AI Learning Backend Running"}

# ---------------------------------------------------------
# ML PREDICTION
# ---------------------------------------------------------

@app.post("/predict")
def predict(student: StudentInput):
    if ml_artifacts.get("error"):
        return {"error": "ML model not loaded"}

    try:
        data = student.model_dump(by_alias=True)
        df = pd.DataFrame([data])

        df = df.rename(columns={
            "math score": "math_score",
            "reading score": "reading_score",
            "writing score": "writing_score",
            "Attendance (%)": "attendance",
            "Daily Study Hours": "study_hours",
        })

        df = df.reindex(columns=ml_artifacts["numeric_features"], fill_value=0)
        df[ml_artifacts["numeric_features"]] = ml_artifacts["imputer"].transform(df)

        X = df.reindex(columns=ml_artifacts["columns"], fill_value=0)

        marks = float(ml_artifacts["regression_model"].predict(X)[0])
        pass_prob = float(ml_artifacts["classification_model"].predict_proba(X)[0][1])

        risk = "High" if pass_prob < 0.6 else "Low"
        if 0.6 <= pass_prob < 0.75:
            risk = "Medium"

        return {
            "final_marks_prediction": round(marks, 2),
            "final_pass_probability": round(pass_prob, 2),
            "risk_level": risk,
            "math_score": data["math score"],
            "reading_score": data["reading score"],
            "writing_score": data["writing score"],
        }

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

# ---------------------------------------------------------
# GEMINI CHAT
# ---------------------------------------------------------

@app.post("/chat_with_tutor")
async def chat_with_tutor(req: ChatRequest):
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        prompt = (
            f"Act as a friendly tutor for a {req.grade_level}th grade student. "
            f"Explain simply with emojis.\nQuestion: {req.message}"
        )
        res = model.generate_content(prompt)
        return {"reply": res.text}

    except Exception as e:
        return {"reply": "Tutor is unavailable right now."}

# ---------------------------------------------------------
# TEST GENERATION
# ---------------------------------------------------------

@app.post("/generate_full_test")
async def generate_full_test(req: TestRequest):
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)

        prompt = f"""
Create a {req.difficulty} level test for a 6th grader.
Subject: {req.test_type}
Context: {req.learning_context or "General"}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "id": 1,
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A"
    }}
  ]
}}
"""

        res = model.generate_content(prompt)
        text = res.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception:
        traceback.print_exc()
        return {"questions": []}

# ---------------------------------------------------------
# TEST ANALYSIS
# ---------------------------------------------------------

@app.post("/analyze_test_results")
async def analyze_test_results(res: TestResult):
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)

        prompt = f"""
Student scored {res.score}/{res.total_marks}.
Weak areas: {", ".join(res.wrong_answers[:5])}

Respond in JSON:
{{"feedback":"...","recommendation":"..."}}
"""

        out = model.generate_content(prompt)
        text = out.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception:
        return {
            "feedback": "Good effort!",
            "recommendation": "Practice weak topics."
        }
