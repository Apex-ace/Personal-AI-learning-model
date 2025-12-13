import React, { useState } from 'react';
import { API_BASE_URL } from '../config'; 
import { toast } from 'react-hot-toast'; 
import { BookOpen, CheckCircle, XCircle, Play, RotateCcw, AlertTriangle } from 'lucide-react';

function TestCorner() {
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const generateTest = async () => {
    if (!topic) {
        toast.error("Please enter a topic first!");
        return;
    }

    setLoading(true);
    setQuestions([]);
    setScore(null);
    setAnswers({});
    setIsSubmitted(false);
    
    const loadingToast = toast.loading("Waking up the AI Brain... (might take 30s)");

    try {
        const res = await fetch(`${API_BASE_URL}/generate_test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic, grade_level: "5" })
        });
        
        if (!res.ok) throw new Error("Server sleeping or error");

        const data = await res.json();
        let cleanJson = data.test_json.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedQuestions = JSON.parse(cleanJson);
        
        setQuestions(parsedQuestions);
        toast.dismiss(loadingToast);
        toast.success("Test Generated! Good luck! 🍀");

    } catch (err) {
        console.error(err);
        toast.dismiss(loadingToast);
        toast.error("AI is napping 😴. Wait 1 min & try again!"); 
    } finally {
        setLoading(false);
    }
  };

  const submitTest = () => {
      // Check if all questions are answered
      if (Object.keys(answers).length < questions.length) {
          toast.error(`Please answer all ${questions.length} questions!`);
          return;
      }

      let newScore = 0;
      questions.forEach((q, index) => {
          if (answers[index] === q.answer) newScore++;
      });
      setScore(newScore);
      setIsSubmitted(true);
      
      // Scroll to top to see score
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      if (newScore > questions.length / 2) toast.success(`Great job! Score: ${newScore}`);
      else toast("Keep practicing! 💪", { icon: '📚' });
  };

  // Helper to determine button color during review
  const getButtonColor = (qIndex, option) => {
      if (!isSubmitted) {
          // Normal selection mode
          return answers[qIndex] === option ? '#dbeafe' : 'white';
      }

      const correctAnswer = questions[qIndex].answer;
      const userAnswer = answers[qIndex];

      // 1. If this option is the CORRECT one -> Turn GREEN
      if (option === correctAnswer) return '#dcfce7'; // Light Green

      // 2. If this option is what user picked, but it's WRONG -> Turn RED
      if (option === userAnswer && userAnswer !== correctAnswer) return '#fee2e2'; // Light Red

      // 3. Otherwise -> Grey out
      return '#f1f5f9';
  };

  const getButtonBorder = (qIndex, option) => {
      if (!isSubmitted) return answers[qIndex] === option ? '2px solid #3b82f6' : '1px solid #e2e8f0';
      
      const correctAnswer = questions[qIndex].answer;
      const userAnswer = answers[qIndex];

      if (option === correctAnswer) return '2px solid #22c55e'; // Green Border
      if (option === userAnswer && userAnswer !== correctAnswer) return '2px solid #ef4444'; // Red Border
      return '1px solid #e2e8f0';
  };

  return (
    <div className="page-container" style={{maxWidth: '800px', margin: '0 auto', paddingBottom: '50px'}}>
        <header style={{textAlign: 'center', marginBottom: '30px'}}>
            <h1 style={{fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#3b82f6'}}>
                <BookOpen size={32}/> Test Corner
            </h1>
        </header>

        {/* --- SCOREBOARD (Only shows after submit) --- */}
        {isSubmitted && (
            <div style={{
                background: score === questions.length ? '#dcfce7' : '#fff7ed',
                border: score === questions.length ? '2px solid #22c55e' : '2px solid #f97316',
                borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '30px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <h2 style={{margin: 0, fontSize: '2rem', color: '#1e293b'}}>
                    Score: {score} / {questions.length}
                </h2>
                <div style={{display:'flex', justifyContent:'center', gap:'20px', marginTop:'10px', color:'#64748b'}}>
                    <span style={{display:'flex', alignItems:'center', gap:'5px', color:'#16a34a'}}>
                        <CheckCircle size={20}/> {score} Correct
                    </span>
                    <span style={{display:'flex', alignItems:'center', gap:'5px', color:'#dc2626'}}>
                        <XCircle size={20}/> {questions.length - score} Wrong
                    </span>
                </div>
                <button onClick={() => {setQuestions([]); setTopic(""); setScore(null); setIsSubmitted(false);}} 
                    style={{marginTop: '15px', padding: '8px 16px', borderRadius: '20px', border: '1px solid #cbd5e1', background:'white', cursor:'pointer'}}>
                    Try New Topic
                </button>
            </div>
        )}

        {/* INPUT SECTION (Hide after questions load) */}
        {questions.length === 0 && (
            <div className="card" style={{marginBottom: '20px'}}>
                <label style={{fontWeight:'bold', display:'block', marginBottom:'8px'}}>What do you want to learn?</label>
                <div style={{display: 'flex', gap: '10px'}}>
                    <input 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ex: Photosynthesis, Fractions, History of India..."
                        style={{flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem'}}
                    />
                    <button onClick={generateTest} disabled={loading} className="btn-primary" style={{minWidth: '120px'}}>
                        {loading ? "Thinking..." : "Start Quiz"}
                    </button>
                </div>
            </div>
        )}

        {/* QUESTIONS LIST */}
        {questions.length > 0 && (
            <div className="card">
                {questions.map((q, i) => (
                    <div key={i} style={{marginBottom: '30px', paddingBottom: '20px', borderBottom: i < questions.length - 1 ? '1px solid #f1f5f9' : 'none'}}>
                        
                        {/* Question Text */}
                        <p style={{fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px', color: '#334155'}}>
                            <span style={{color: '#3b82f6', marginRight:'8px'}}>Q{i + 1}.</span> 
                            {q.question}
                        </p>

                        {/* Options Grid */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '10px'}}>
                            {q.options.map((opt) => (
                                <button 
                                    key={opt}
                                    disabled={isSubmitted}
                                    onClick={() => setAnswers({...answers, [i]: opt})}
                                    style={{
                                        padding: '12px 15px', 
                                        borderRadius: '8px', 
                                        border: getButtonBorder(i, opt),
                                        backgroundColor: getButtonColor(i, opt),
                                        color: '#1e293b',
                                        cursor: isSubmitted ? 'default' : 'pointer',
                                        textAlign: 'left', 
                                        transition: '0.2s',
                                        fontSize: '1rem',
                                        position: 'relative' // For icons
                                    }}
                                >
                                    {opt}
                                    
                                    {/* RESULTS ICONS (Only after submit) */}
                                    {isSubmitted && opt === q.answer && (
                                        <CheckCircle size={20} color="#16a34a" style={{position:'absolute', right:'10px', top:'12px'}}/>
                                    )}
                                    {isSubmitted && answers[i] === opt && answers[i] !== q.answer && (
                                        <XCircle size={20} color="#dc2626" style={{position:'absolute', right:'10px', top:'12px'}}/>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Explanation / Feedback Text */}
                        {isSubmitted && answers[i] !== q.answer && (
                            <div style={{marginTop: '10px', padding: '10px', background: '#fff1f2', borderRadius: '8px', borderLeft: '4px solid #f43f5e', color: '#be123c', fontSize:'0.9rem'}}>
                                <strong>Correct Answer:</strong> {q.answer}
                            </div>
                        )}
                    </div>
                ))}

                {!isSubmitted && (
                    <button onClick={submitTest} className="btn-primary" style={{width: '100%', marginTop: '20px', padding: '15px', fontSize:'1.1rem'}}>
                        Submit Answers
                    </button>
                )}
            </div>
        )}
    </div>
  );
}

export default TestCorner;