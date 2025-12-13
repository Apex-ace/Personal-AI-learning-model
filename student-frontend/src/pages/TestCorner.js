import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
    Award, Brain, ChevronRight, RotateCcw,
    Calculator, BookOpen, PenTool, Layers, ClipboardList 
} from 'lucide-react';

// CHART JS IMPORTS
import { Doughnut, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, 
  LinearScale, BarElement 
} from 'chart.js';

// Register Chart Components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function TestCorner() {
  const [loading, setLoading] = useState(false);
  const [testStage, setTestStage] = useState('menu'); 
  const [selectedMode, setSelectedMode] = useState(null);
  
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  
  // Results State
  const [score, setScore] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [difficulty, setDifficulty] = useState("Medium");

  useEffect(() => { fetchLevel(); }, []);

  const fetchLevel = async () => {
    const { data } = await supabase.from('student_progress').select('total_predicted_marks').order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
        const marks = data[0].total_predicted_marks;
        if (marks > 80) setDifficulty("Hard");
        else if (marks < 40) setDifficulty("Easy");
        else setDifficulty("Medium");
    }
  };

  const testModules = [
    { id: 'math', label: 'Math Test', icon: <Calculator size={32} color="#3b82f6"/>, type: 'Math', color: '#eff6ff', border: '#3b82f6' },
    { id: 'reading', label: 'Reading Test', icon: <BookOpen size={32} color="#ec4899"/>, type: 'Reading', color: '#fdf2f8', border: '#ec4899' },
    { id: 'writing', label: 'Writing Test', icon: <PenTool size={32} color="#eab308"/>, type: 'Writing', color: '#fefce8', border: '#eab308' },
    { id: 'internal1', label: 'Internal 1', icon: <Layers size={32} color="#8b5cf6"/>, type: 'Internal 1', color: '#f5f3ff', border: '#8b5cf6' },
    { id: 'internal2', label: 'Internal 2', icon: <Layers size={32} color="#8b5cf6"/>, type: 'Internal 2', color: '#f5f3ff', border: '#8b5cf6' },
    { id: 'assignment', label: 'Assignment', icon: <ClipboardList size={32} color="#22c55e"/>, type: 'Assignment', color: '#f0fdf4', border: '#22c55e' },
  ];

  const startTest = async (mode) => {
    setSelectedMode(mode);
    setLoading(true);
    try {
        const res = await fetch('http://127.0.0.1:8000/generate_full_test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ difficulty: difficulty, test_type: mode })
        });
        const data = await res.json();
        if(data.questions && data.questions.length > 0) {
            setQuestions(data.questions);
            setTestStage('test');
            setCurrentQ(0);
            setAnswers({});
        } else {
            alert("AI is busy, please try again!");
        }
    } catch (e) {
        alert("Server busy! Try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleAnswer = (option) => setAnswers({ ...answers, [currentQ]: option });

  const submitTest = () => {
    setLoading(true);
    let rawScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    
    // For Breakdown Chart (Internals)
    let subjectScores = { Math: 0, Reading: 0, Writing: 0 };
    let subjectTotals = { Math: 0, Reading: 0, Writing: 0 };

    questions.forEach((q, index) => {
        // Track Subject Totals
        // (If subject isn't explicit in mixed tests, we default based on keywords or keep as 'General')
        let subj = q.subject || selectedMode; 
        if (!subjectTotals[subj]) subjectTotals[subj] = 0;
        if (!subjectScores[subj]) subjectScores[subj] = 0;
        subjectTotals[subj]++;

        if (answers[index] === q.correct_answer) {
            rawScore += 2;
            correctCount++;
            subjectScores[subj]++;
        } else {
            wrongCount++;
        }
    });

    setScore(rawScore);

    // --- GENERATE CHART DATA ---
    if (selectedMode.includes("Internal")) {
        // BAR CHART for Mixed Subjects
        setChartData({
            type: 'bar',
            labels: Object.keys(subjectScores), // ["Math", "Reading", "Writing"]
            datasets: [{
                label: 'Questions Correct',
                data: Object.values(subjectScores),
                backgroundColor: ['#3b82f6', '#ec4899', '#eab308'],
                borderRadius: 10,
            }]
        });
    } else {
        // DOUGHNUT CHART for Single Subject
        setChartData({
            type: 'doughnut',
            labels: ['Correct', 'Incorrect'],
            datasets: [{
                data: [correctCount, wrongCount],
                backgroundColor: ['#22c55e', '#ef4444'],
                hoverOffset: 4
            }]
        });
    }

    setTestStage('result');
    setLoading(false);
  };

  // Helper Renderers
  if (loading) return (
    <div className="page-container" style={{textAlign:'center', paddingTop:'100px'}}>
        <Brain size={80} color="#8b5cf6" className="spin-animation"/>
        <h2 style={{marginTop:'20px'}}>Generating {selectedMode}...</h2>
        <p>AI is grading your {difficulty} exam...</p>
    </div>
  );

  return (
    <div className="page-container">
      
      {/* --- MENU --- */}
      {testStage === 'menu' && (
        <>
            <header style={{textAlign: 'center', marginBottom: '30px'}}>
                <h1>🏫 Exam Hall</h1>
                <p style={{color: '#64748b'}}>Select a subject to test your knowledge.</p>
                <span className="badge-pill" style={{background:'#dbeafe', color:'#1e40af'}}>Current Level: {difficulty}</span>
            </header>

            <div className="stats-grid">
                {testModules.map(mod => (
                    <div key={mod.id} className="stat-card" 
                        style={{cursor: 'pointer', background: mod.color, borderBottom: `5px solid ${mod.border}`, transition: '0.2s'}}
                        onClick={() => startTest(mod.type)}
                        onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                        <div style={{marginBottom:'10px'}}>{mod.icon}</div>
                        <h3 style={{color: '#334155'}}>{mod.label}</h3>
                        <p style={{fontSize: '0.9rem', color: '#64748b'}}>Start Exam</p>
                    </div>
                ))}
            </div>
        </>
      )}

      {/* --- TEST UI --- */}
      {testStage === 'test' && questions.length > 0 && (
        <div className="card" style={{maxWidth:'800px', margin:'0 auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                <h2 style={{margin:0}}>{selectedMode}</h2>
                <span style={{background:'#f1f5f9', padding:'5px 15px', borderRadius:'10px', fontWeight:'bold'}}>
                    Q {currentQ + 1} / {questions.length}
                </span>
            </div>
            
            <div style={{width:'100%', height:'10px', background:'#e2e8f0', borderRadius:'5px', marginBottom:'30px'}}>
                <div style={{width: `${((currentQ + 1) / questions.length) * 100}%`, height:'100%', background: '#3b82f6', borderRadius:'5px', transition:'all 0.3s'}}></div>
            </div>

            <h2 style={{fontSize:'1.4rem', marginBottom:'30px'}}>{questions[currentQ].question}</h2>

            <div className="options-grid" style={{display:'grid', gap:'15px'}}>
                {questions[currentQ].options.map((opt, i) => (
                    <button key={i} onClick={() => handleAnswer(opt)}
                        className="btn-option"
                        style={{
                            textAlign:'left', padding:'20px', fontSize:'1.1rem', borderRadius:'15px',
                            border: answers[currentQ] === opt ? '3px solid #3b82f6' : '2px solid #e2e8f0',
                            background: answers[currentQ] === opt ? '#eff6ff' : 'white', cursor:'pointer'
                        }}>
                        {opt}
                    </button>
                ))}
            </div>

            <div style={{display:'flex', justifyContent:'space-between', marginTop:'30px'}}>
                <button disabled={currentQ===0} onClick={()=>setCurrentQ(c=>c-1)} className="btn-primary" style={{width:'auto', background:'#94a3b8'}}>Back</button>
                {currentQ < questions.length - 1 ? 
                    <button onClick={()=>setCurrentQ(c=>c+1)} className="btn-primary" style={{width:'auto'}}>Next <ChevronRight/></button> :
                    <button onClick={submitTest} className="btn-primary" style={{width:'auto', background:'#22c55e'}}>Submit & Grade</button>
                }
            </div>
        </div>
      )}

      {/* --- VISUAL RESULTS --- */}
      {testStage === 'result' && chartData && (
        <div className="card" style={{maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px'}}>
            <Award size={64} color="#eab308" style={{margin:'0 auto 20px'}}/>
            <h1 style={{fontSize: '3rem', margin: '0', color: '#3b82f6'}}>{score} / {questions.length * 2}</h1>
            <p style={{color: '#64748b', marginBottom: '30px'}}>Final Score</p>

            <div style={{height: '300px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {chartData.type === 'doughnut' ? (
                    <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                ) : (
                    <Bar data={chartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
                )}
            </div>

            <button onClick={() => {setTestStage('menu'); setScore(0); setAnswers({});}} className="btn-primary" style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
                <RotateCcw size={20}/> Take Another Test
            </button>
        </div>
      )}
    </div>
  );
}

export default TestCorner;