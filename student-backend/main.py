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
load_dotenv() 

GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
ACTIVE_MODEL_NAME = "models/gemini-2.5-flash" 

if not GENAI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env file.")
else:
    try:
        genai.configure(api_key=GENAI_API_KEY)
        print("✅ Gemini API Key Loaded.")
    except Exception as e:
        print(f"❌ Error configuring Gemini: {e}")

# --- DYNAMIC MODEL SELECTOR ---
def configure_best_model():
    """Dynamically sets ACTIVE_MODEL_NAME based on availability and preference."""
    global ACTIVE_MODEL_NAME
    print("🔍 Searching for available Gemini models...")
    try:
        # List of models, ordered by preference (fastest/most capable first)
        preferred_order = ["models/gemini-2.5-flash", "models/gemini-2.5-pro", "models/gemini-1.5-flash", "models/gemini-1.0-pro"]
        
        # Filter models that support text generation
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        for model in preferred_order:
            if model in available_models:
                ACTIVE_MODEL_NAME = model
                # Use only the short name for logging/clarity in the endpoints
                short_name = ACTIVE_MODEL_NAME.split('/')[-1]
                print(f"✅ SUCCESS: Using model '{short_name}'")
                return

        if available_models:
            # Fallback to the first available model if none of the preferred models are found
            ACTIVE_MODEL_NAME = available_models[0]
            short_name = ACTIVE_MODEL_NAME.split('/')[-1]
            print(f"⚠️ Using fallback model: '{short_name}'")
        else:
            print("❌ CRITICAL: No generative models found. AI endpoints will fail.")
            # Keep the default name, but flag the issue
            ACTIVE_MODEL_NAME = "models/gemini-2.5-flash" 
            
    except Exception as e:
        print(f"❌ Error listing models (check API key permissions/limits): {e}")

ml_artifacts = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # RUN MODEL SELECTION ON STARTUP
    if GENAI_API_KEY:
        configure_best_model() 
    
    # Load artifacts on startup
    try:
        with open('student_performance_artifacts.pkl', 'rb') as f:
            artifacts = pickle.load(f)
            
        ml_artifacts['df_full'] = artifacts['df']
        ml_artifacts['classification_model'] = artifacts['classification_model']
        ml_artifacts['regression_model'] = artifacts['regression_model']
        ml_artifacts['imputer'] = artifacts['imputer']
        ml_artifacts['topic_map'] = artifacts['topic_map']
        ml_artifacts['advanced_topic_map'] = artifacts['advanced_topic_map']
        ml_artifacts['intervention_map'] = artifacts['intervention_map']
        ml_artifacts['risk_reco'] = artifacts['risk_reco']
        ml_artifacts['general_topics'] = artifacts['general_topics']
        ml_artifacts['numeric_features'] = artifacts['numeric_features']
        ml_artifacts['categorical_features'] = artifacts['categorical_features']

        # Re-create training columns structure
        df_full = ml_artifacts['df_full']
        cat_features = ml_artifacts['categorical_features']
        num_features = ml_artifacts['numeric_features']
        
        df3_encoded = pd.get_dummies(df_full[cat_features], drop_first=True)
        X_full = pd.concat([
            df_full[num_features].reset_index(drop=True),
            df3_encoded.reset_index(drop=True)
        ], axis=1)
        
        ml_artifacts['X_full_columns'] = X_full.columns
        print("✅ Artifacts loaded successfully.")
        
    except FileNotFoundError:
        print("❌ Error: 'student_performance_artifacts.pkl' not found.")
        ml_artifacts['error'] = True
    
    yield
    ml_artifacts.clear()

app = FastAPI(lifespan=lifespan)

# --- 2. CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. Pydantic Models ---
class StudentInput(BaseModel):
    math_score: Optional[float] = Field(None, alias="math score")
    reading_score: Optional[float] = Field(None, alias="reading score")
    writing_score: Optional[float] = Field(None, alias="writing score")
    internal_test_1: Optional[float] = Field(None, alias="Internal Test 1 (out of 40)")
    internal_test_2: Optional[float] = Field(None, alias="Internal Test 2 (out of 40)")
    assignment_score: Optional[float] = Field(0.0, alias="Assignment Score (out of 10)")
    attendance: Optional[float] = Field(None, alias="Attendance (%)")
    study_hours: Optional[float] = Field(None, alias="Daily Study Hours")

    model_config = ConfigDict(populate_by_name=True, extra="allow")

# Models for NEW Endpoints
class ChatRequest(BaseModel):
    message: str
    grade_level: str

class TestRequest(BaseModel):
    difficulty: str
    test_type: str
    learning_context: str

class TestResult(BaseModel):
    score: int
    total_marks: int
    wrong_answers: List[str]

class QuizSubmission(BaseModel):
    question: str
    student_answer: str

# --- 4. Helper Logic (Unchanged) ---
def compute_skill_flags(row):
    def g(key): return row.get(key, np.nan)
    
    math = g('math score')
    read = g('reading score')
    write = g('writing score')
    it1 = g('Internal Test 1 (out of 40)')
    it2 = g('Internal Test 2 (out of 40)')
    att = g('Attendance (%)')
    study = g('Daily Study Hours')

    return {
        "math_weak": math < 50 if pd.notna(math) else False,
        "reading_weak": read < 50 if pd.notna(read) else False,
        "writing_weak": write < 50 if pd.notna(write) else False,
        "internal_low": ((it1 + it2) / 2) < 20 if pd.notna(it1) and pd.notna(it2) else False,
        "attendance_low": att < 60 if pd.notna(att) else False,
        "study_low": study < 1.5 if pd.notna(study) else False,
        "math_strong": math >= 75 if pd.notna(math) else False,
        "reading_strong": read >= 75 if pd.notna(read) else False,
        "writing_strong": write >= 75 if pd.notna(write) else False
    }

def recommend_for_student_logic(student_row, artifacts):
    topics = []
    interventions = []

    if student_row.get('risk_level') == "High":
        topics = ["High Priority Revision Set", "Redo Wrong Questions Pack", "Daily Target Practice (30 mins)", "Fundamental Skill Reinforcement"]
        interventions = ["Teacher Intervention Required", "Strict Weekly Learning Plan", "Daily micro-practice tasks"]
        return list(set(topics)), list(set(interventions))

    topic_map = artifacts['topic_map']
    intervention_map = artifacts['intervention_map']
    for weakness in topic_map.keys():
        if weakness in student_row and student_row[weakness] == True:
            topics.extend(topic_map[weakness])
            interventions.append(intervention_map[weakness])

    adv_topic_map = artifacts['advanced_topic_map']
    for strength in adv_topic_map.keys():
        if strength in student_row and student_row[strength] == True:
            topics.extend(adv_topic_map[strength])

    if not topics:
        risk = student_row.get('risk_level', 'Low')
        topics.extend(artifacts['risk_reco'].get(risk, artifacts['general_topics']))

    return list(set(topics)), list(set(interventions))

def prepare_input_dataframe(data: Dict, artifacts):
    input_df = pd.DataFrame([data])
    cat_feats = artifacts['categorical_features']
    num_feats = artifacts['numeric_features']
    full_cols = artifacts['X_full_columns']

    # Handle Categorical
    for col in cat_feats:
        if col not in input_df.columns:
            input_df[col] = "Missing"
            
    df_encoded = pd.get_dummies(input_df[cat_feats], drop_first=True)
    input_df = input_df.drop(columns=cat_feats, errors='ignore')

    # Handle Numeric (FIXED: Set missing to np.nan for imputation)
    for col in num_feats:
        if col not in input_df.columns:
            input_df[col] = np.nan 
            
    # Filter numeric features to align
    input_df = input_df.filter(num_feats)

    # Align
    X_input = pd.concat([
        input_df.reset_index(drop=True),
        df_encoded.reindex(columns=full_cols.difference(num_feats), fill_value=0)
    ], axis=1)
    
    return X_input[full_cols]


# --- 5. Endpoints (ML Model Prediction) ---
@app.get("/")
def home():
    return {"message": "API is running", "docs": "http://127.0.0.1:8000/docs"}

@app.post("/predict")
def predict(student_data: StudentInput):
    if ml_artifacts.get('error'): raise HTTPException(500, "Artifacts not loaded")
    try:
        data = student_data.model_dump(by_alias=True)
        X_input = prepare_input_dataframe(data, ml_artifacts)
        
        # FIX: Impute X_input and convert the result back to a DataFrame 
        X_imputed_array = ml_artifacts['imputer'].transform(X_input)
        X_imputed = pd.DataFrame(X_imputed_array, columns=X_input.columns)
        
        # Predict Marks
        final_marks = ml_artifacts['regression_model'].predict(X_imputed)[0] 

        # Predict Pass/Fail
        pass_proba = ml_artifacts['classification_model'].predict_proba(X_imputed)[0, 1]
        fail_proba = ml_artifacts['classification_model'].predict_proba(X_imputed)[0, 0]
        pass_pred = int(pass_proba >= 0.5)

        # CALCULATE RISK LEVEL
        if fail_proba > 0.6: risk = 'High'
        elif fail_proba > 0.3: risk = 'Medium'
        else: risk = 'Low'

        return {
            "final_marks_prediction": round(final_marks, 2),
            "final_pass_prediction": pass_pred,
            "final_pass_probability": round(pass_proba, 4),
            "final_fail_probability": round(fail_proba, 4),
            "risk_level": risk, 
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))

@app.post("/recommend")
def recommend(student_data: StudentInput):
    if ml_artifacts.get('error'): raise HTTPException(500, "Artifacts not loaded")
    try:
        data = student_data.model_dump(by_alias=True)
        temp_df = pd.DataFrame([data])
        
        # Calculate flags
        flags = temp_df.apply(compute_skill_flags, axis=1, result_type='expand')
        temp_df = pd.concat([temp_df, flags], axis=1)

        # Get Risk Level
        X_input = prepare_input_dataframe(data, ml_artifacts)
        
        # FIX: Impute X_input and convert the result back to a DataFrame
        X_imputed_array = ml_artifacts['imputer'].transform(X_input)
        X_imputed = pd.DataFrame(X_imputed_array, columns=X_input.columns)
        
        fail_prob = ml_artifacts['classification_model'].predict_proba(X_imputed)[0, 0]

        if fail_prob > 0.6: risk = 'High'
        elif fail_prob > 0.3: risk = 'Medium'
        else: risk = 'Low'
        
        temp_df['risk_level'] = risk
        
        # Get Recommendations
        topics, interventions = recommend_for_student_logic(temp_df.iloc[0], ml_artifacts)

        return {
            "risk_level": risk,
            "fail_probability": round(fail_prob, 4),
            "recommended_topics": topics,
            "recommended_interventions": interventions
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))


# --- 6. Endpoints (AI Chatbot and Test Generation - Using Best Available Model) ---

@app.post("/chat_with_tutor")
async def chat_with_tutor(request: ChatRequest):
    print(f"📩 Chat using model: {ACTIVE_MODEL_NAME}")
    prompt = f"Act as a funny tutor for a {request.grade_level}th grader. Use emojis 🌟. Keep it short. Question: {request.message}"
    try:
        # Use the best available model for chat
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME) 
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        print("❌ GEMINI ERROR:")
        traceback.print_exc()
        # Graceful error response for the frontend
        return {"reply": f"Sorry, my AI circuit is down. Error: {str(e)}"}

@app.post("/generate_full_test")
async def generate_full_test(req: TestRequest):
    print(f"📝 Generating {req.difficulty} test using model: {ACTIVE_MODEL_NAME}")
    
    # Logic for Marks & Questions count
    if req.test_type == "Assignment":
        count = 10 
        subject_prompt = "Mix of critical thinking and problem solving."
    elif "Internal" in req.test_type:
        count = 20
        subject_prompt = "Mixed subjects: Math (8 questions), Reading (6 questions), Writing (6 questions)."
    else:
        count = 20
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
        # Use the best available model for structured output
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_text)
    except Exception as e:
        traceback.print_exc()
        # Graceful error response for the frontend
        return {"questions": []}

@app.post("/analyze_test_results")
async def analyze_test_results(res: TestResult):
    model_name = ACTIVE_MODEL_NAME
    prompt = f"""
    Student scored {res.score}/{res.total_marks}.
    Weak areas: {', '.join(res.wrong_answers[:5])}.
    Provide: 1. Short feedback. 2. Specific recommendation.
    Respond in JSON: {{ "feedback": "...", "recommendation": "..." }}
    """
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_text)
    except Exception as e:
        return {"feedback": "Good effort!", "recommendation": "Review your mistakes."}

@app.post("/generate_study_plan")
async def generate_study_plan(student_data: StudentInput):
    model_name = ACTIVE_MODEL_NAME
    data = student_data.model_dump(by_alias=True)
    prompt = f"Analyze: Math:{data['math score']}, Reading:{data['reading score']}. Return JSON: {{ 'analysis': '...', 'youtube_queries': ['...'], 'quiz': [] }}"
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "")
        return json.loads(cleaned_text)
    except Exception as e:
        return {}

@app.post("/evaluate_answer")
async def evaluate_answer(submission: QuizSubmission):
    model_name = ACTIVE_MODEL_NAME
    prompt = f"Question: {submission.question} Answer: {submission.student_answer}. Correct? Explain."
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return {"feedback": response.text}
    except Exception as e:
        return {"feedback": "Error evaluating answer."}