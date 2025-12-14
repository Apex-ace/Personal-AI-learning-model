import os
import json
import traceback
import google.generativeai as genai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from contextlib import asynccontextmanager
from typing import List, Optional
import pickle
import pandas as pd
from dotenv import load_dotenv

# --- 1. Global Setup ---
load_dotenv()
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
ACTIVE_MODEL_NAME = "gemini-pro"

if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
    print("✅ Gemini API Key Loaded.")
else:
    print("⚠️ WARNING: GEMINI_API_KEY not found.")

# --- SMART MODEL SELECTOR ---
def configure_best_model():
    global ACTIVE_MODEL_NAME
    try:
        models = [
            m.name for m in genai.list_models()
            if "generateContent" in m.supported_generation_methods
        ]
        for m in ["models/gemini-1.5-flash", "models/gemini-pro", "models/gemini-1.0-pro"]:
            if m in models:
                ACTIVE_MODEL_NAME = m
                print(f"✅ Using Gemini Model: {ACTIVE_MODEL_NAME}")
                return
    except Exception as e:
        print("❌ Gemini model selection error:", e)

# --- ML ARTIFACT STORAGE ---
ml_artifacts = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    if GENAI_API_KEY:
        configure_best_model()

    try:
        with open("student_performance_artifacts.pkl", "rb") as f:
            artifacts = pickle.load(f)

        ml_artifacts["df_full"] = artifacts["df"]
        ml_artifacts["classification_model"] = artifacts["classification_model"]
        ml_artifacts["regression_model"] = artifacts["regression_model"]
        ml_artifacts["imputer"] = artifacts["imputer"]
        ml_artifacts["numeric_features"] = artifacts["numeric_features"]
        ml_artifacts["categorical_features"] = artifacts["categorical_features"]

        df = ml_artifacts["df_full"]
        df_cat = pd.get_dummies(df[ml_artifacts["categorical_features"]], drop_first=True)
        X = pd.concat([df[ml_artifacts["numeric_features"]], df_cat], axis=1)
        ml_artifacts["X_full_columns"] = X.columns

        print("✅ ML Artifacts loaded successfully.")

    except Exception as e:
        print("❌ ML Artifact Load Error:", e)
        ml_artifacts["error"] = True

    yield
    ml_artifacts.clear()

# --- FASTAPI APP ---
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
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

# --- PREDICT (REAL ML, FRONTEND SAFE) ---
@app.post("/predict")
def predict(student_data: StudentInput):

    if ml_artifacts.get("error"):
        return {
            "final_marks_prediction": 0,
            "final_pass_probability": 0,
            "risk_level": "Error",
            "math_score": 0,
            "reading_score": 0,
            "writing_score": 0
        }

    try:
        data = student_data.model_dump(by_alias=True)
        df = pd.DataFrame([data])

        num = ml_artifacts["numeric_features"]
        cat = ml_artifacts["categorical_features"]
        imputer = ml_artifacts["imputer"]

        df[num] = imputer.transform(df[num])
        df_cat = pd.get_dummies(df[cat], drop_first=True)

        X = pd.concat([df[num], df_cat], axis=1)
        X = X.reindex(columns=ml_artifacts["X_full_columns"], fill_value=0)

        reg_model = ml_artifacts["regression_model"]
        clf_model = ml_artifacts["classification_model"]

        predicted_marks = float(reg_model.predict(X)[0])
        pass_prob = float(clf_model.predict_proba(X)[0][1])

        if pass_prob < 0.4:
            risk = "High"
        elif pass_prob < 0.7:
            risk = "Medium"
        else:
            risk = "Low"

        return {
            "final_marks_prediction": round(predicted_marks, 2),
            "final_pass_probability": round(pass_prob, 2),
            "risk_level": risk,
            "math_score": data["math score"],
            "reading_score": data["reading score"],
            "writing_score": data["writing score"]
        }

    except Exception:
        traceback.print_exc()
        return {
            "final_marks_prediction": 0,
            "final_pass_probability": 0,
            "risk_level": "Unknown",
            "math_score": 0,
            "reading_score": 0,
            "writing_score": 0
        }

# --- CHAT WITH TUTOR ---
@app.post("/chat_with_tutor")
async def chat_with_tutor(request: ChatRequest):
    prompt = f"Act as a funny tutor for a {request.grade_level}th grader. Use emojis 🌟. Keep it short. Question: {request.message}"
    model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
    response = model.generate_content(prompt)
    return {"reply": response.text}

# --- GENERATE TEST ---
@app.post("/generate_full_test")
async def generate_full_test(req: TestRequest):

    if req.test_type == "Assignment":
        count = 10
    elif "Internal" in req.test_type:
        count = 20
    else:
        count = 15

    context = f"ADAPTIVE INSTRUCTION: {req.learning_context}" if req.learning_context else ""

    prompt = f"""
Return ONLY valid JSON.

Create a {count}-question MCQ test for a 6th grader.
Subject: {req.test_type}
Difficulty: {req.difficulty}

{context}

Format:
{{
 "questions": [
  {{
   "id": 1,
   "question": "...",
   "options": ["A","B","C","D"],
   "correct_answer": "A"
  }}
 ]
}}
"""

    model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
    response = model.generate_content(prompt)

    text = response.text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)

# --- ANALYZE RESULTS ---
@app.post("/analyze_test_results")
async def analyze_test_results(res: TestResult):

    prompt = f"""
Student scored {res.score}/{res.total_marks}.
Weak areas: {", ".join(res.wrong_answers[:5])}.
Return JSON:
{{ "feedback": "...", "recommendation": "..." }}
"""

    model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
    response = model.generate_content(prompt)

    text = response.text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)

# --- RUN (NO PORT SPECIFIED) ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)
