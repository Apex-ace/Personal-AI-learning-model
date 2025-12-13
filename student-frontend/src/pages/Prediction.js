import React, { useState } from 'react';
import { supabase } from '../supabase'; 
import { API_BASE_URL } from '../config'; 
import { 
    Calculator, BookOpen, PenTool, Clock, Calendar, 
    Save, TrendingUp, AlertTriangle, CheckCircle 
} from 'lucide-react';

// CHART COMPONENTS
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Prediction() {
  const [formData, setFormData] = useState({
    "math score": "", "reading score": "", "writing score": "",
    "Daily Study Hours": "", "Attendance (%)": "",
    "Internal Test 1 (out of 40)": "", "Internal Test 2 (out of 40)": "",
    "Assignment Score (out of 10)": ""
  });
  
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {};
    Object.keys(formData).forEach(k => payload[k] = parseFloat(formData[k]) || 0);

    try {
        const res = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error("Backend connection failed");
        
        const data = await res.json();
        setPrediction(data);

        // --- PREPARE ML VISUALIZATION ---
        setChartData({
            labels: ['Passing Marks', 'Your Prediction', 'Topper Score'],
            datasets: [
                {
                    label: 'Score Comparison',
                    data: [40, data.final_marks_prediction, 95], // 40 is pass, 95 is max
                    backgroundColor: [
                        '#94a3b8', // Grey for Pass
                        data.final_marks_prediction < 40 ? '#ef4444' : '#3b82f6', // Red if fail, Blue if pass
                        '#e2e8f0'  // Light grey for max
                    ],
                    borderRadius: 8,
                }
            ]
        });

    } catch (err) { 
        console.error(err);
        alert("Could not connect to Python Backend.");
    } 
    finally { setLoading(false); }
  };

  const saveProgress = async () => {
    if (!prediction) return;
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { error } = await supabase.from('student_progress').insert([{
            user_id: user.id,
            math_score: formData["math score"],
            reading_score: formData["reading score"],
            total_predicted_marks: prediction.final_marks_prediction
        }]);
        if (!error) alert("Data saved to database successfully.");
    } else {
        alert("Please log in to save!");
    }
  };

  return (
    <div className="page-container">
        <header style={{textAlign: 'center', marginBottom: '30px'}}>
            <h1 style={{fontSize: '2.2rem', marginBottom: '5px'}}>📊 ML Model Prediction</h1>
            <p style={{color: '#64748b'}}>Direct feed from Linear Regression & Random Forest Model</p>
        </header>

        <div style={{display: 'grid', gridTemplateColumns: prediction ? '1fr 1fr' : '1fr', gap: '30px'}}>
            
            {/* --- INPUT FORM --- */}
            <div className="card">
                <form onSubmit={handleAnalyze}>
                    <h3 style={{marginTop: 0, color: '#334155'}}>1. Student Metrics</h3>
                    
                    <div className="stats-grid" style={{gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom:'20px'}}>
                        <div><label style={{fontSize:'0.85rem'}}>Math Score</label><input name="math score" type="number" onChange={handleChange}/></div>
                        <div><label style={{fontSize:'0.85rem'}}>Reading Score</label><input name="reading score" type="number" onChange={handleChange}/></div>
                        <div><label style={{fontSize:'0.85rem'}}>Writing Score</label><input name="writing score" type="number" onChange={handleChange}/></div>
                        <div><label style={{fontSize:'0.85rem'}}>Study Hours</label><input name="Daily Study Hours" type="number" onChange={handleChange}/></div>
                        <div><label style={{fontSize:'0.85rem'}}>Attendance %</label><input name="Attendance (%)" type="number" onChange={handleChange}/></div>
                        <div><label style={{fontSize:'0.85rem'}}>Assignment (10)</label><input name="Assignment Score (out of 10)" type="number" onChange={handleChange}/></div>
                        <div><label style={{fontSize:'0.85rem'}}>Internal 1 (40)</label><input name="Internal Test 1 (out of 40)" type="number" onChange={handleChange}/></div>
                        <div><label style={{fontSize:'0.85rem'}}>Internal 2 (40)</label><input name="Internal Test 2 (out of 40)" type="number" onChange={handleChange}/></div>
                    </div>

                    <button className="btn-primary" disabled={loading}>
                        {loading ? "Processing Data..." : "Run Prediction Model"}
                    </button>
                </form>
            </div>

            {/* --- ML OUTPUT RESULTS --- */}
            {prediction && chartData && (
                <div className="card" style={{background: '#f8fafc', border: '1px solid #cbd5e1'}}>
                    <h3 style={{marginTop: 0, color: '#334155'}}>2. Model Output</h3>
                    
                    {/* RISK BADGE */}
                    <div style={{
                        padding: '15px', borderRadius: '10px', marginBottom: '20px',
                        display: 'flex', alignItems: 'center', gap: '15px',
                        background: prediction.risk_level === 'High' ? '#fee2e2' : '#dcfce7',
                        border: prediction.risk_level === 'High' ? '1px solid #ef4444' : '1px solid #22c55e',
                        color: prediction.risk_level === 'High' ? '#b91c1c' : '#15803d'
                    }}>
                        {prediction.risk_level === 'High' ? <AlertTriangle size={24}/> : <CheckCircle size={24}/>}
                        <div>
                            <strong style={{fontSize:'1.1rem', display:'block'}}>Risk Level: {prediction.risk_level}</strong>
                            <span style={{fontSize:'0.9rem'}}>Based on study hours & internal scores.</span>
                        </div>
                    </div>

                    {/* NUMERICAL STATS */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px'}}>
                        <div style={{background:'white', padding:'15px', borderRadius:'10px', border:'1px solid #e2e8f0', textAlign:'center'}}>
                            <div style={{color:'#64748b', fontSize:'0.9rem', marginBottom:'5px'}}>Predicted Marks</div>
                            <div style={{fontSize:'2.5rem', fontWeight:'bold', color:'#3b82f6'}}>{prediction.final_marks_prediction}</div>
                        </div>
                        <div style={{background:'white', padding:'15px', borderRadius:'10px', border:'1px solid #e2e8f0', textAlign:'center'}}>
                            <div style={{color:'#64748b', fontSize:'0.9rem', marginBottom:'5px'}}>Pass Probability</div>
                            <div style={{fontSize:'2.5rem', fontWeight:'bold', color:'#8b5cf6'}}>{(prediction.final_pass_probability * 100).toFixed(0)}%</div>
                        </div>
                    </div>

                    {/* GRAPH */}
                    <div style={{height: '200px', width: '100%'}}>
                        <Bar 
                            data={chartData} 
                            options={{
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true, max: 100 } }
                            }}
                        />
                    </div>

                    <button onClick={saveProgress} className="btn-primary" style={{marginTop: '20px', background: '#334155'}}>
                        <Save size={18} style={{marginRight:'8px'}}/> Save to Database
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}
export default Prediction;