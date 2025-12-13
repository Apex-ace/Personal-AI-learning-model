import os
import json
import traceback
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
import pickle
import pandas as pd
import numpy as np
from dotenv import load_dotenv

# --- 1. Global Setup ---
load_dotenv() 
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
ACTIVE_MODEL_NAME = "gemini-pro" # Default

if not GENAI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env file.")
else:
    try:
        genai.configure(api_key=GENAI_API_KEY)
        print("✅ Gemini API Key Loaded.")
    except Exception as e:
        print(f"❌ Error configuring Gemini: {e}")

# --- SMART MODEL SELECTOR ---
def configure_best_model():
    global ACTIVE_MODEL_NAME
    print("🔍 Searching for available Gemini models...")
    try:
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        preferred_order = ["models/gemini-1.5-flash", "models/gemini-pro", "models/gemini-1.0-pro"]
        
        for model in preferred_order:
            if model in available_models:
                ACTIVE_MODEL_NAME = model
                print(f"✅ SUCCESS: Using model '{ACTIVE_MODEL_NAME}'")
                return

        if available_models:
            ACTIVE_MODEL_NAME = available_models[0]
            print(f"⚠️ Using fallback: '{ACTIVE_MODEL_NAME}'")
        else:
            print("❌ CRITICAL: No models found.")
    except Exception as e:
        print(f"❌ Error listing models: {e}")

ml_artifacts = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    if GENAI_API_KEY: configure_best_model()

    try:
        with open('student_performance_artifacts.pkl', 'rb') as f:
            artifacts = pickle.load(f)
        ml_artifacts['df_full'] = artifacts['df']
        ml_artifacts['classification_model'] = artifacts['classification_model']
        ml_artifacts['regression_model'] = artifacts['regression_model']
        ml_artifacts['imputer'] = artifacts['imputer']
        ml_artifacts['numeric_features'] = artifacts['numeric_features']
        ml_artifacts['categorical_features'] = artifacts['categorical_features']
        
        # Re-create columns
        df_full = ml_artifacts['df_full']
        cat_features = ml_artifacts['categorical_features']
        num_features = ml_artifacts['numeric_features']
        df_encoded = pd.get_dummies(df_full[cat_features], drop_first=True)
        X_full = pd.concat([df_full[num_features].reset_index(drop=True), df_encoded.reset_index(drop=True)], axis=1)
        ml_artifacts['X_full_columns'] = X_full.columns
        print("✅ ML Artifacts loaded successfully.")
    except Exception as e:
        print(f"❌ Error loading ML artifacts: {e}")
        ml_artifacts['error'] = True
    yield
    ml_artifacts.clear()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change "*" to your specific Vercel URL for better security later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- 2. Data Models ---
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
    test_type: str # "Math", "Reading", "Internal 1", "Assignment"

class TestResult(BaseModel):
    score: int
    total_marks: int
    wrong_answers: List[str]

class QuizSubmission(BaseModel):
    question: str
    student_answer: str
    correct_answer: str

# --- 3. Endpoints ---

@app.post("/predict")
def predict(student_data: StudentInput):
    if ml_artifacts.get('error'): return {"final_marks_prediction": 0, "risk_level": "Error"}
    try:
        data = student_data.model_dump(by_alias=True)
        avg_score = (data['math score'] + data['reading score'] + data['writing score']) / 3
        pred_marks = round(avg_score * 0.9 + (data['Daily Study Hours'] * 2), 2)
        if pred_marks > 100: pred_marks = 100.0
        pass_prob = 0.95 if pred_marks > 40 else 0.45
        return {"final_marks_prediction": pred_marks, "final_pass_probability": pass_prob, "risk_level": "High" if pass_prob < 0.6 else "Low"}
    except Exception:
        return {"final_marks_prediction": 0, "risk_level": "Unknown"}

@app.post("/chat_with_tutor")
async def chat_with_tutor(request: ChatRequest):
    print(f"📩 Chat using model: {ACTIVE_MODEL_NAME}")
    prompt = f"Act as a funny tutor for a {request.grade_level}th grader. Use emojis 🌟. Keep it short. Question: {request.message}"
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        print("❌ GEMINI ERROR:")
        traceback.print_exc()
        return {"reply": f"Error: {str(e)}"}

@app.post("/generate_full_test")
async def generate_full_test(req: TestRequest):
    print(f"📝 Generating {req.difficulty} test for: {req.test_type}")
    
    # Logic for Marks & Questions count
    if req.test_type == "Assignment":
        count = 10 # 10 Qs * 2 Marks = 20 Marks
        subject_prompt = "Mix of critical thinking and problem solving."
    elif "Internal" in req.test_type:
        count = 20 # 20 Qs * 2 Marks = 40 Marks
        subject_prompt = "Mixed subjects: Math (8 questions), Reading (6 questions), Writing (6 questions)."
    else:
        count = 20 # 20 Qs * 2 Marks = 40 Marks
        subject_prompt = f"Strictly 100% {req.test_type} questions."

    prompt = f"""
    Create a {count}-question multiple-choice test for a 5th/6th grader.
    Subject Focus: {subject_prompt}
    Difficulty: {req.difficulty}.
    
    Respond ONLY in this JSON format:
    {{
        "questions": [
            {{
                "id": 1,
                "subject": "{req.test_type}",
                "question": "Question text...",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "Option A"
            }}
        ]
    }}
    """
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_text)
    except Exception as e:
        traceback.print_exc()
        return {"questions": []}

@app.post("/analyze_test_results")
async def analyze_test_results(res: TestResult):
    prompt = f"""
    Student scored {res.score}/{res.total_marks}.
    Weak areas: {', '.join(res.wrong_answers[:5])}.
    Provide: 1. Short feedback. 2. Specific recommendation.
    Respond in JSON: {{ "feedback": "...", "recommendation": "..." }}
    """
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_text)
    except Exception as e:
        return {"feedback": "Good effort!", "recommendation": "Review your mistakes."}

@app.post("/generate_study_plan")
async def generate_study_plan(student_data: StudentInput):
    data = student_data.model_dump(by_alias=True)
    prompt = f"Analyze: Math:{data['math score']}, Reading:{data['reading score']}. Return JSON: {{ 'analysis': '...', 'youtube_queries': ['...'], 'quiz': [] }}"
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "")
        return json.loads(cleaned_text)
    except Exception as e:
        return {}

@app.post("/evaluate_answer")
async def evaluate_answer(submission: QuizSubmission):
    prompt = f"Question: {submission.question} Answer: {submission.student_answer}. Correct? Explain."
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        response = model.generate_content(prompt)
        return {"feedback": response.text}
    except Exception as e:
        return {"feedback": "Error evaluating answer."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)