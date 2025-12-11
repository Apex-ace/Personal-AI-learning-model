import React, { useState } from 'react';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    "math score": "",
    "reading score": "",
    "writing score": "",
    "Daily Study Hours": "",
    "Attendance (%)": "",
    "Internal Test 1 (out of 40)": "",
    "Internal Test 2 (out of 40)": "",
    "Assignment Score (out of 10)": "" // <--- ADDED THIS
  });

  const [prediction, setPrediction] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPrediction(null);
    setRecommendation(null);

    const payload = {};
    Object.keys(formData).forEach(key => {
        // Handle empty strings safely by converting to 0 or keeping the value
        payload[key] = formData[key] === "" ? 0 : parseFloat(formData[key]);
    });

    try {
      // 1. Fetch Prediction
      const predRes = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!predRes.ok) throw new Error("Failed to fetch prediction");
      const predData = await predRes.json();
      setPrediction(predData);

      // 2. Fetch Recommendation
      const recRes = await fetch('http://127.0.0.1:8000/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!recRes.ok) throw new Error("Failed to fetch recommendations");
      const recData = await recRes.json();
      setRecommendation(recData);

    } catch (err) {
      console.error(err);
      setError("Server Error: Check Python terminal for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🎓 Student Insight System</h1>
      </header>

      <div className="content-grid">
        <div className="card form-card">
          <h2>Student Input</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Math Score</label>
                <input name="math score" type="number" onChange={handleChange} required min="0" max="100"/>
            </div>
            <div className="form-group">
                <label>Reading Score</label>
                <input name="reading score" type="number" onChange={handleChange} required min="0" max="100"/>
            </div>
            <div className="form-group">
                <label>Writing Score</label>
                <input name="writing score" type="number" onChange={handleChange} required min="0" max="100"/>
            </div>
            
            <div className="row">
                <div className="half">
                    <label>Attendance (%)</label>
                    <input name="Attendance (%)" type="number" onChange={handleChange} required min="0" max="100"/>
                </div>
                <div className="half">
                    <label>Study Hours</label>
                    <input name="Daily Study Hours" type="number" onChange={handleChange} step="0.1" required />
                </div>
            </div>

            {/* ADDED ASSIGNMENT SCORE FIELD */}
            <div className="form-group">
                <label>Assignment Score (0-10)</label>
                <input name="Assignment Score (out of 10)" type="number" onChange={handleChange} required min="0" max="10" />
            </div>

            <div className="row">
                <div className="half">
                    <label>Internal 1 (40)</label>
                    <input name="Internal Test 1 (out of 40)" type="number" onChange={handleChange} required max="40"/>
                </div>
                <div className="half">
                    <label>Internal 2 (40)</label>
                    <input name="Internal Test 2 (out of 40)" type="number" onChange={handleChange} required max="40"/>
                </div>
            </div>
            <button className="btn-primary" disabled={loading}>
                {loading ? "Processing..." : "Analyze Performance"}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="results-wrapper">
          {prediction && (
            <div className="card result-card">
              <h2>Performance Forecast</h2>
              <div className="stats-row">
                <div className="stat-box">
                    <span>Expected Marks</span>
                    <h3>{prediction.final_marks_prediction}</h3>
                </div>
                <div className={`stat-box ${prediction.final_pass_prediction ? 'pass' : 'fail'}`}>
                    <span>Status</span>
                    <h3>{prediction.final_pass_prediction ? "PASS" : "FAIL"}</h3>
                </div>
              </div>
              <p>Pass Probability: {(prediction.final_pass_probability * 100).toFixed(1)}%</p>
            </div>
          )}

          {recommendation && (
            <div className={`card reco-card border-${recommendation.risk_level}`}>
                <div className="reco-header">
                    <h2>AI Recommendations</h2>
                    <span className={`badge badge-${recommendation.risk_level}`}>{recommendation.risk_level} Risk</span>
                </div>
                
                <h3>📚 Study Topics</h3>
                <ul>
                    {recommendation.recommended_topics.map((t, i) => <li key={i}>{t}</li>)}
                </ul>

                <h3>🛠️ Interventions</h3>
                <ul>
                    {recommendation.recommended_interventions.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;