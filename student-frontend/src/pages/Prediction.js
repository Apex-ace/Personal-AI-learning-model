import React, { useState } from 'react';
import { supabase } from '../supabase'; 
import { Calculator, BookOpen, PenTool, Clock, Calendar, Save, Activity } from 'lucide-react'; // Fun Icons

function Prediction() {
  const [formData, setFormData] = useState({
    "math score": "", "reading score": "", "writing score": "",
    "Daily Study Hours": "", "Attendance (%)": "",
    "Internal Test 1 (out of 40)": "", "Internal Test 2 (out of 40)": "",
    "Assignment Score (out of 10)": ""
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {};
    Object.keys(formData).forEach(k => payload[k] = parseFloat(formData[k]) || 0);

    try {
        const res = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        setPrediction(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const saveProgress = async () => {
    if (!prediction) return;
    const { error } = await supabase.from('student_progress').insert([{
      math_score: formData["math score"],
      reading_score: formData["reading score"],
      total_predicted_marks: prediction.final_marks_prediction
    }]);
    if (!error) alert("Mission Saved to History! 🌟");
  };

  return (
    <div className="page-container">
        <header style={{textAlign: 'center', marginBottom: '30px'}}>
            <h1 style={{fontSize: '2.5rem', marginBottom: '5px'}}>🚀 Performance Check</h1>
            <p style={{color: '#64748b'}}>Enter your recent scores to calculate your XP!</p>
        </header>

        <div className="card" style={{maxWidth: '800px', margin: '0 auto'}}>
            <form onSubmit={handleAnalyze}>
                <h3 style={{marginBottom: '15px', color: '#3b82f6'}}>📚 Subject Scores</h3>
                <div className="stats-grid" style={{gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '20px'}}>
                    <div>
                        <label><Calculator size={16}/> Math</label>
                        <input name="math score" type="number" onChange={handleChange} placeholder="0-100" />
                    </div>
                    <div>
                        <label><BookOpen size={16}/> Reading</label>
                        <input name="reading score" type="number" onChange={handleChange} placeholder="0-100" />
                    </div>
                    <div>
                        <label><PenTool size={16}/> Writing</label>
                        <input name="writing score" type="number" onChange={handleChange} placeholder="0-100" />
                    </div>
                </div>

                <h3 style={{marginBottom: '15px', color: '#8b5cf6'}}>⏱️ Study Habits</h3>
                <div className="stats-grid" style={{gridTemplateColumns: '1fr 1fr', marginBottom: '20px'}}>
                    <div>
                        <label><Clock size={16}/> Study Hours/Day</label>
                        <input name="Daily Study Hours" type="number" onChange={handleChange} placeholder="e.g. 2.5" />
                    </div>
                    <div>
                        <label><Calendar size={16}/> Attendance %</label>
                        <input name="Attendance (%)" type="number" onChange={handleChange} placeholder="0-100" />
                    </div>
                </div>

                <h3 style={{marginBottom: '15px', color: '#ec4899'}}>📝 Internal Tests</h3>
                <div className="stats-grid" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                    <div>
                        <label>Internal 1 (40)</label>
                        <input name="Internal Test 1 (out of 40)" type="number" onChange={handleChange} />
                    </div>
                    <div>
                        <label>Internal 2 (40)</label>
                        <input name="Internal Test 2 (out of 40)" type="number" onChange={handleChange} />
                    </div>
                    <div>
                        <label>Assignment (10)</label>
                        <input name="Assignment Score (out of 10)" type="number" onChange={handleChange} />
                    </div>
                </div>

                <button className="btn-primary" disabled={loading} style={{marginTop: '30px'}}>
                    {loading ? "Calculating XP..." : "🚀 Launch Analysis"}
                </button>
            </form>
        </div>

        {prediction && (
            <div className="card" style={{marginTop:'30px', background: '#f0fdf4', border: '2px solid #22c55e', textAlign: 'center'}}>
                <Activity size={48} color="#22c55e" style={{marginBottom: '10px'}}/>
                <h2 style={{color: '#166534', margin: '0'}}>Mission Report</h2>
                
                <div style={{display: 'flex', justifyContent: 'center', gap: '40px', margin: '20px 0'}}>
                    <div>
                        <p style={{marginBottom: '5px', color: '#64748b'}}>Predicted Score</p>
                        <h1 style={{fontSize: '3rem', margin: '0', color: '#3b82f6'}}>{prediction.final_marks_prediction}</h1>
                    </div>
                    <div>
                        <p style={{marginBottom: '5px', color: '#64748b'}}>Success Chance</p>
                        <h1 style={{fontSize: '3rem', margin: '0', color: '#8b5cf6'}}>{(prediction.final_pass_probability * 100).toFixed(0)}%</h1>
                    </div>
                </div>

                <button onClick={saveProgress} className="btn-primary" style={{background:'#10b981', width: 'auto', padding: '10px 30px'}}>
                    <Save size={18} style={{marginRight: '8px'}}/> Save Result
                </button>
            </div>
        )}
    </div>
  );
}
export default Prediction;