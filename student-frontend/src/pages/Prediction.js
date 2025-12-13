// Prediction.js

import React, { useState } from 'react';
import { supabase } from '../supabase'; 
import { API_BASE_URL } from '../config'; 
import { toast } from 'react-hot-toast'; 
import { 
    Save, AlertTriangle, CheckCircle, TrendingUp 
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
        
        setChartData({
            labels: ['Passing', 'You', 'Topper'],
            datasets: [
                {
                    label: 'Marks',
                    data: [40, data.final_marks_prediction, 95],
                    backgroundColor: [
                        '#cbd5e1', 
                        data.final_marks_prediction < 40 ? '#ef4444' : '#3b82f6', 
                        '#e2e8f0'
                    ],
                    borderRadius: 8,
                }
            ]
        });
        toast.success("Prediction complete!");

    } catch (err) { 
        console.error(err);
        toast.error("Could not connect to AI Brain.");
    } 
    finally { setLoading(false); }
  };

  const saveProgress = async () => {
    if (!prediction) return;
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // SAVING FULL DIAGNOSTIC DATA: Requires updated Supabase schema
        const { error } = await supabase.from('student_progress').insert([{
            user_id: user.id,
            // These fields are necessary for TestCorner.js adaptive logic:
            math_score: prediction.math_score, 
            reading_score: prediction.reading_score, 
            writing_score: prediction.writing_score, 
            risk_level: prediction.risk_level, 
            pass_probability: prediction.final_pass_probability, 
            // Original fields:
            total_predicted_marks: prediction.final_marks_prediction
        }]).select(); 
        
        if (!error) toast.success("Saved to History! Go to Exam Hall for a new mission.");
        else {
             console.error("Supabase Error:", error);
             toast.error("Error saving data. Check your Supabase schema!");
        }
    } else {
        toast.error("Please log in to save!");
    }
  };

  return (
    <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto'}}>
        <header style={{textAlign: 'center', marginBottom: '20px'}}>
            <h1 style={{fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#1e293b'}}>
                <TrendingUp size={28} color="#3b82f6"/> Stats & Predict
            </h1>
            <p style={{color: '#64748b', fontSize: '0.9rem'}}>AI Performance Calculator</p>
        </header>

        {/* FLEX CONTAINER: Stacks on mobile, Side-by-Side on Desktop */}
        <div style={{
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '20px', 
            alignItems: 'flex-start',
            justifyContent: 'center'
        }}>
            
            {/* --- CARD 1: INPUT FORM --- */}
            <div className="card" style={{
                flex: '1 1 350px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0'
            }}>
                <h3 style={{marginTop: 0, color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px'}}>
                    統 Student Metrics
                </h3>
                
                <form onSubmit={handleAnalyze}>
                    <div style={{
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr',
                        gap: '15px'
                    }}>
                        {[
                            { label: "Math", name: "math score" },
                            { label: "Reading", name: "reading score" },
                            { label: "Writing", name: "writing score" },
                            { label: "Hours/Day", name: "Daily Study Hours" },
                            { label: "Attendance %", name: "Attendance (%)" },
                            { label: "Assign. (10)", name: "Assignment Score (out of 10)" },
                            { label: "Internal 1 (40)", name: "Internal Test 1 (out of 40)" },
                            { label: "Internal 2 (40)", name: "Internal Test 2 (out of 40)" }
                        ].map((field) => (
                            <div key={field.name}>
                                <label style={{fontSize:'0.8rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px'}}>
                                    {field.label}
                                </label>
                                <input 
                                    name={field.name} 
                                    type="number" 
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px', 
                                        border: '1px solid #cbd5e1', fontSize: '1rem',
                                        backgroundColor: '#f8fafc'
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <button className="btn-primary" disabled={loading} style={{
                        marginTop: '20px', width: '100%', padding: '12px', fontSize: '1rem',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                    }}>
                        {loading ? "Calculating..." : "醗 Predict Score"}
                    </button>
                </form>
            </div>

            {/* --- CARD 2: RESULTS (Only shows when prediction exists) --- */}
            {prediction && chartData && (
                <div className="card" style={{
                    flex: '1 1 350px',
                    background: '#f8fafc', border: '2px solid #3b82f6',
                    animation: 'fadeIn 0.5s ease-in'
                }}>
                    <h3 style={{marginTop: 0, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px'}}>
                        投 AI Analysis
                    </h3>
                    
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
                            <strong style={{fontSize:'1.1rem', display:'block'}}>Risk: {prediction.risk_level}</strong>
                            <span style={{fontSize:'0.85rem'}}>Based on study habits.</span>
                        </div>
                    </div>

                    {/* BIG STATS */}
                    <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                        <div style={{flex: 1, background:'white', padding:'15px', borderRadius:'10px', border:'1px solid #e2e8f0', textAlign:'center'}}>
                            <div style={{color:'#64748b', fontSize:'0.8rem'}}>Marks</div>
                            <div style={{fontSize:'2rem', fontWeight:'bold', color:'#3b82f6'}}>{prediction.final_marks_prediction}</div>
                        </div>
                        <div style={{flex: 1, background:'white', padding:'15px', borderRadius:'10px', border:'1px solid #e2e8f0', textAlign:'center'}}>
                            <div style={{color:'#64748b', fontSize:'0.8rem'}}>Chance</div>
                            <div style={{fontSize:'2rem', fontWeight:'bold', color:'#8b5cf6'}}>{(prediction.final_pass_probability * 100).toFixed(0)}%</div>
                        </div>
                    </div>

                    {/* CHART */}
                    <div style={{height: '200px', width: '100%', marginBottom: '15px'}}>
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

                    <button onClick={saveProgress} className="btn-primary" style={{width: '100%', background: '#334155'}}>
                        <Save size={18} style={{marginRight:'8px'}}/> Save Result
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}
export default Prediction;