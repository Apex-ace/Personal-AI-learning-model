import os
import json
import pickle
import traceback
from typing import List, Optional

import pandas as pd
import numpy as np
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from contextlib import asynccontextmanager

import google.generativeai as genai

# =========================
# ENV + GEMINI SETUP
# =========================
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "models/gemini-1.5-flash"  # ✅ SAFE MODEL

GEMINI_ENABLED = False
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        GEMINI_ENABLED = True
        print("✅ Gemini enabled")
    except Exception as e:
        print("❌ Gemini init failed:", e)

# =========================
# ML ARTIFACT STORAGE
# =========================
ml_artifacts = {}

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
        ml_artifacts["columns"] = artifacts["X_columns"]

        print("✅ ML artifacts loaded")
    except Exception as e:
        ml_artifacts["error"] = True
        print("❌ ML load error:", e)

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

# =========================
# HEALTH CHECK
# =========================
@app.get("/")
def root():
    return {"status": "AI Tutor Backend Running"}

# =========================
# ML PREDICTION (USED BY FRONTEND)
# =========================
@app.post("/predict")
def predict(student: StudentInput):
    if ml_artifacts.get("error"):
        return {"error": "ML model unavailable"}

    try:
        data = student.model_dump(by_alias=True)
        df = pd.DataFrame([data])

        # numeric
        X_num = df[ml_artifacts["numeric_features"]]
        X_num = ml_artifacts["imputer"].transform(X_num)
        X_num = pd.DataFrame(X_num, columns=ml_artifacts["numeric_features"])

        # categorical (safe even if empty)
        if ml_artifacts["categorical_features"]:
            df_cat = pd.get_dummies(
                df[ml_artifacts["categorical_features"]],
                drop_first=True
            )
        else:
            df_cat = pd.DataFrame()

        X = pd.concat([X_num, df_cat], axis=1)

        # align columns
        X = X.reindex(columns=ml_artifacts["columns"], fill_value=0)

        # predictions
        marks = float(ml_artifacts["regression_model"].predict(X)[0])
        prob = float(ml_artifacts["classification_model"].predict_proba(X)[0][1])

        risk = "Low"
        if prob < 0.6:
            risk = "High"
        elif marks < 60:
            risk = "Medium"

        return {
            "final_marks_prediction": round(marks, 2),
            "final_pass_probability": round(prob, 2),
            "risk_level": risk,
            "math_score": data["math score"],
            "reading_score": data["reading score"],
            "writing_score": data["writing score"],
        }

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

# =========================
# CHAT WITH AI TUTOR
# =========================
@app.post("/chat_with_tutor")
async def chat_with_tutor(req: ChatRequest):
    if not GEMINI_ENABLED:
        return {"reply": "AI tutor is currently unavailable."}

    prompt = (
        f"You are a friendly tutor for a {req.grade_level}th grade student.\n"
        f"Use simple language and emojis.\n"
        f"Question: {req.message}"
    )

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        return {"reply": "Tutor is busy right now."}

# =========================
# GENERATE FULL TEST
# =========================
@app.post("/generate_full_test")
async def generate_full_test(req: TestRequest):
    if not GEMINI_ENABLED:
        return {"questions": []}

    count = 10 if req.test_type == "Assignment" else 15

    context = f"\nFocus area: {req.learning_context}" if req.learning_context else ""

    prompt = f"""
    Create a {count}-question MCQ test for a 6th grade student.
    Subject: {req.test_type}
    Difficulty: {req.difficulty}
    {context}

    Respond ONLY in JSON:
    {{
      "questions": [
        {{
          "id": 1,
          "question": "text",
          "options": ["A", "B", "C", "D"],
          "correct_answer": "A"
        }}
      ]
    }}
    """

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception:
        return {"questions": []}

# =========================
# ANALYZE TEST RESULT
# =========================
@app.post("/analyze_test_results")
async def analyze_test_results(res: TestResult):
    if not GEMINI_ENABLED:
        return {
            "feedback": "Good effort!",
            "recommendation": "Keep practicing."
        }

    prompt = f"""
    Student scored {res.score}/{res.total_marks}.
    Weak topics: {", ".join(res.wrong_answers[:5])}

    Respond in JSON:
    {{
      "feedback": "...",
      "recommendation": "..."
    }}
    """

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception:
        return {
            "feedback": "Nice try!",
            "recommendation": "Revise weak areas."
        }
