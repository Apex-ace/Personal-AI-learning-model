
#  AI-Powered Student Learning Platform(junior genius)

> **Empowering students through Machine Learning, Generative AI, and Gamification.**

##  Overview
An intelligent, interactive educational platform designed to provide a holistic learning experience. It combines a **Regression model** for performance prediction, **Google Gemini** for personalized 24/7 tutoring, and a **Gamified UI** to keep students engaged.

##  Key Features

###  1. AI Tutor (Study Buddy)
* **Interactive Chat:** Powered by **Google Gemini API**.
* **Context-Aware:** Configured to provide explanations tailored to a 5th-grade level.
* **Memory:** Retains conversation history for continuous learning.
* **Kid-Friendly UI:** Playful interface to reduce study anxiety.

### 📊 2. Performance Dashboard
* **XP Growth Chart:** Interactive line charts utilizing `Chart.js`.
* **Gamified Stats:** Track "Total Missions," "High Scores," and "Power Levels."
* **Data Visualization:** Clear insights into academic trends.

### 🔮 3. Smart Performance Prediction
* **ML-Powered Analysis:** Uses **Scikit-Learn** (Regression) to predict future marks based on study habits and attendance.
* **Risk Assessment:** Classifies students into High/Medium/Low risk.
* **Pass Probability:** Calculates the statistical likelihood of passing.

### 📝 4. Adaptive Test Corner
* **Personalized Quizzes:** Dynamically generated based on predicted weak areas.
* **Dynamic Difficulty:** Adjusts (Easy/Medium/Hard) based on student risk levels.
* **Instant Feedback:** Immediate scoring and corrections.

### 🦁 5. Gamified Profile
* **Animal Avatars:** Auto-generated avatars based on usernames.
* **Trophy Shelf:** Earn badges (e.g., "Sprinter", "Gold Rush").
* **Leveling System:** Gain XP by completing tests and talking to the AI.

### 🔐 6. Secure Authentication
* **Supabase Auth:** Secure Email/Password login.
* **Persistence:** Keeps sessions active securely.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** React.js
* **Styling:** CSS (Comic Sans, Warm Colors), Lucide React (Icons)
* **Viz:** Chart.js, react-chartjs-2
* **Notifications:** React Hot Toast

### Backend
* **Framework:** FastAPI (Python)
* **Server:** Uvicorn
* **Validation:** Pydantic

### AI & Machine Learning
* **LLM:** Google Gemini API
* **ML Models:** Scikit-Learn (Regression & Classification)
* **Data Processing:** Pandas, NumPy

### Database & Auth
* **Provider:** Supabase (PostgreSQL)

---

## 📂 Project Structure

```text
student-ai-platform/
├── backend/
│   ├── main.py                     # FastAPI app entry point
│   ├── student_performance_artifacts.pkl  # Pre-trained ML models
│   ├── requirements.txt            # Python dependencies
│   └── .env                        # API Keys (Gemini)
├── src/
│   ├── pages/
│   │   ├── AITutor.js              # Chat component
│   │   ├── Dashboard.js            # Charts/Stats
│   │   ├── Login.js                # Auth page
│   │   ├── Prediction.js           # ML Input form
│   │   ├── Profile.js              # User details/Badges
│   │   └── TestCorner.js           # Quiz arena
│   ├── config.js                   # API URLs
│   ├── supabase.js                 # Supabase client init
│   ├── App.js                      # Routing
│   └── index.css                   # Global styles
└── package.json                    # Node dependencies

```

## ⚙️ Installation & Setup

### Prerequisites

* Node.js (v14+)
* Python (v3.9+)
* Supabase Account
* Google Gemini API Key

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install fastapi uvicorn google-generativeai pandas numpy scikit-learn python-dotenv supabase pydantic

# Create .env and add: GEMINI_API_KEY=your_key
python main.py

```

### 2. Frontend Setup

```bash
cd ..
npm install

# Create .env and add Supabase credentials
# REACT_APP_SUPABASE_URL=...
# REACT_APP_SUPABASE_ANON_KEY=...

npm start

```

