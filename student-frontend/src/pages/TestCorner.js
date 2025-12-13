import React, { useState } from 'react';
import { API_BASE_URL } from '../config'; 
import { toast } from 'react-hot-toast'; // <--- Using Toasts now!
import { BookOpen, CheckCircle, XCircle, Play, RotateCcw } from 'lucide-react';

function TestCorner() {
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateTest = async () => {
    if (!topic) {
        toast.error("Please enter a topic first!");
        return;
    }

    setLoading(true);
    setQuestions([]);
    setScore(null);
    setAnswers({});
    
    // Show a "Waking up" toast so the user knows it might take time
    const loadingToast = toast.loading("Waking up the AI Brain... (might take 30s)");

    try {
        const res = await fetch(`${API_BASE_URL}/generate_test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic, grade_level: "5" })
        });
        
        if (!res.ok) throw new Error("Server sleeping or error");

        const data = await res.json();
        
        // Clean up the text response to valid JSON if needed
        let cleanJson = data.test_json.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedQuestions = JSON.parse(cleanJson);
        
        setQuestions(parsedQuestions);
        toast.dismiss(loadingToast); // Remove loading message
        toast.success("Test Generated! Good luck! 🍀");

    } catch (err) {
        console.error(err);
        toast.dismiss(loadingToast);
        // Better error message
        toast.error("AI is napping 😴. Wait 1 min & try again!"); 
    } finally {
        setLoading(false);
    }
  };

  const submitTest = () => {
      let newScore = 0;
      questions.forEach((q, index) => {
          if (answers[index] === q.answer) newScore++;
      });
      setScore(newScore);
      
      if (newScore > questions.length / 2) toast.success(`Great job! Score: ${newScore}`);
      else toast("Keep practicing! 💪", { icon: '📚' });
  };

  return (
    <div className="page-container" style={{maxWidth: '800px', margin: '0 auto'}}>
        <header style={{textAlign: 'center', marginBottom: '30px'}}>
            <h1 style={{fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#3b82f6'}}>
                <BookOpen size={32}/> Test Corner
            </h1>
            <p style={{color: '#64748b'}}>Generate custom quizzes instantly!</p>
        </header>

        {/* INPUT SECTION */}
        <div className="card" style={{marginBottom: '20px'}}>
            <div style={{display: 'flex', gap: '10px'}}>
                <input 
                    value={topic} 
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter topic (e.g., Solar System, Fractions)..."
                    style={{
                        flex: 1, padding: '12px', borderRadius: '8px', 
                        border: '1px solid #cbd5e1', fontSize: '1rem'
                    }}
                />
                <button 
                    onClick={generateTest} 
                    disabled={loading}
                    className="btn-primary"
                    style={{minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                >
                    {loading ? "Thinking..." : <><Play size={18} style={{marginRight:'5px'}}/> Start</>}
                </button>
            </div>
        </div>

        {/* QUESTIONS LIST */}
        {questions.length > 0 && (
            <div className="card">
                {questions.map((q, i) => (
                    <div key={i} style={{marginBottom: '25px', paddingBottom: '15px', borderBottom: i < questions.length - 1 ? '1px solid #f1f5f9' : 'none'}}>
                        <p style={{fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px'}}>
                            {i + 1}. {q.question}
                        </p>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                            {q.options.map((opt) => (
                                <button 
                                    key={opt}
                                    onClick={() => !score && setAnswers({...answers, [i]: opt})}
                                    style={{
                                        padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                        background: answers[i] === opt ? '#dbeafe' : 'white',
                                        color: answers[i] === opt ? '#1e40af' : '#475569',
                                        cursor: score ? 'default' : 'pointer',
                                        textAlign: 'left', transition: '0.2s'
                                    }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        
                        {/* SHOW RESULTS */}
                        {score !== null && (
                            <div style={{marginTop: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                {answers[i] === q.answer 
                                    ? <span style={{color: '#16a34a', display: 'flex', alignItems: 'center'}}><CheckCircle size={16}/> Correct!</span> 
                                    : <span style={{color: '#dc2626', display: 'flex', alignItems: 'center'}}><XCircle size={16}/> Wrong. Answer: {q.answer}</span>
                                }
                            </div>
                        )}
                    </div>
                ))}

                {score === null ? (
                    <button onClick={submitTest} className="btn-primary" style={{width: '100%', marginTop: '10px'}}>
                        Submit Answers
                    </button>
                ) : (
                    <div style={{textAlign: 'center', marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px'}}>
                        <h2 style={{color: '#3b82f6', margin: 0}}>You scored {score} / {questions.length}</h2>
                        <button onClick={() => {setQuestions([]); setTopic(""); setScore(null)}} style={{
                            marginTop: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', margin: '10px auto'
                        }}>
                            <RotateCcw size={16}/> Try Another Topic
                        </button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}

export default TestCorner;