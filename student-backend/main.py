import os
import json
import pickle
import traceback
import pandas as pd
import google.generativeai as genai

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from contextlib import asynccontextmanager
from typing import List, Optional

# =====================================================
# ENV + GEMINI SETUP
# =====================================================

GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = None

if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
    print("✅ Gemini API Key Loaded")
else:
    print("⚠️ Gemini API Key NOT found")

def select_gemini_model():
    """
    Safely select a supported Gemini model.
    Avoids deprecated gemini-pro.
    """
    try:
        models = [
            m.name for m in genai.list_models()
            if "generateContent" in m.supported_generation_methods
        ]

        for preferred in [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-pro",
        ]:
            if preferred in models:
                return preferred

        return models[0] if models else None

    except Exception as e:
        print("❌ Gemini model discovery failed:", e)
        return None

if GENAI_API_KEY:
    GEMINI_MODEL_NAME = select_gemini_model()
    print(f"🧠 Using Gemini model: {GEMINI_MODEL_NAME}")

# =====================================================
# GLOBAL ML STORAGE
# =====================================================

ml_artifacts = {}

# =====================================================
# APP LIFESPAN – LOAD ML ON STARTUP
# =====================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        with open("student_performance_artifacts.pkl", "rb") as f:
            artifacts = pickle.load(f)

        ml_artifacts["df"] = artifacts["df"]
        ml_artifacts["regression_model"] = artifacts["regression_model"]
        ml_artifacts["classification_model"] = artifacts["classification_model"]
        ml_artifacts["imputer"] = artifacts["imputer"]
        ml_artifacts["numeric_features"] = artifacts["numeric_features"]
        ml_artifacts["categorical_features"] = artifacts["categorical_features"]

        df = ml_artifacts["df"]
        df_cat = pd.get_dummies(
            df[ml_artifacts["categorical_features"]],
            drop_first=True
        )

        X = pd.concat(
            [df[ml_artifacts["numeric_features"]], df_cat],
            axis=1
        )

        ml_artifacts["X_full_columns"] = X.columns

        print("✅ ML artifacts loaded successfully")

    except Exception as e:
        print("❌ Failed to load ML artifacts:", e)
        ml_artifacts["error"] = True

    yield
    ml_artifacts.clear()

# =====================================================
# FASTAPI APP
# =====================================================

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# DATA MODELS
# =====================================================

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

# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/health")
def health():
    return {"status": "ok"}

# =====================================================
# ML PREDICTION
# =====================================================

@app.post("/predict")
def predict(student: StudentInput):

    if ml_artifacts.get("error"):
        return {"error": "ML not loaded"}

    data = student.model_dump(by_alias=True)
    df = pd.DataFrame([data])

    num = ml_artifacts["numeric_features"]
    cat = ml_artifacts["categorical_features"]
    imputer = ml_artifacts["imputer"]

    df[num] = imputer.transform(df[num])
    df_cat = pd.get_dummies(df[cat], drop_first=True)

    X = pd.concat([df[num], df_cat], axis=1)
    X = X.reindex(columns=ml_artifacts["X_full_columns"], fill_value=0)

    reg = ml_artifacts["regression_model"]
    clf = ml_artifacts["classification_model"]

    marks = float(reg.predict(X)[0])
    pass_prob = float(clf.predict_proba(X)[0][1])

    if pass_prob < 0.4:
        risk = "High"
    elif pass_prob < 0.7:
        risk = "Medium"
    else:
        risk = "Low"

    return {
        "final_marks_prediction": round(marks, 2),
        "final_pass_probability": round(pass_prob, 2),
        "risk_level": risk,
        "math_score": data["math score"],
        "reading_score": data["reading score"],
        "writing_score": data["writing score"],
    }

# =====================================================
# GEMINI CHAT (SAFE)
# =====================================================

@app.post("/chat_with_tutor")
async def chat_with_tutor(req: ChatRequest):

    if not GEMINI_MODEL_NAME:
        return {"reply": "AI tutor is temporarily unavailable."}

    try:
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)

        prompt = (
            f"Act as a friendly tutor for a {req.grade_level}th grade student. "
            f"Keep answers short and simple.\n\nQuestion: {req.message}"
        )

        response = model.generate_content(prompt)
        return {"reply": response.text}

    except Exception as e:
        print("❌ Gemini error:", e)
        return {"reply": "Sorry, I had trouble answering that. Try again."}

# =====================================================
# GEMINI TEST GENERATION (SAFE)
# =====================================================

@app.post("/generate_full_test")
async def generate_full_test(req: TestRequest):

    if not GEMINI_MODEL_NAME:
        return {"questions": []}

    try:
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)

        prompt = f"""
Create a multiple-choice test.

Grade: 6
Subject: {req.test_type}
Difficulty: {req.difficulty}

{f"Focus on this weakness: {req.learning_context}" if req.learning_context else ""}

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

        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception as e:
        print("❌ Gemini test error:", e)
        traceback.print_exc()
        return {"questions": []}

# =====================================================
# TEST ANALYSIS (SAFE)
# =====================================================

@app.post("/analyze_test_results")
async def analyze_test_results(res: TestResult):

    if not GEMINI_MODEL_NAME:
        return {
            "feedback": "Good effort!",
            "recommendation": "Review the incorrect answers."
        }

    try:
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)

        prompt = f"""
Student score: {res.score}/{res.total_marks}
Weak areas: {', '.join(res.wrong_answers[:5])}

Respond ONLY in JSON:
{{ "feedback": "...", "recommendation": "..." }}
"""

        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception:
        return {
            "feedback": "Good effort!",
            "recommendation": "Practice your weak topics."
        }
