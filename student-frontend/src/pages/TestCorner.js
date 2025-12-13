import React, { useState } from 'react';
import { API_BASE_URL } from '../config'; 
import { toast } from 'react-hot-toast'; 
import { 
    BookOpen, CheckCircle, XCircle, Calculator, PenTool, 
    Layers, ClipboardList, School, ArrowLeft, RefreshCw,
    ChevronLeft, ChevronRight
} from 'lucide-react';

function TestCorner() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  
  // NEW: Track which question is currently visible
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- 1. EXAM HALL CONFIGURATION ---
  const subjects = [
      { 
          id: 'math', 
          name: 'Math Test', 
          test_type: 'Math', 
          icon: <Calculator size={32}/>, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' 
      },
      { 
          id: 'reading', 
          name: 'Reading Test', 
          test_type: 'Reading', 
          icon: <BookOpen size={32}/>, color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' 
      },
      { 
          id: 'writing', 
          name: 'Writing Test', 
          test_type: 'Writing', 
          icon: <PenTool size={32}/>, color: '#eab308', bg: '#fefce8', border: '#fde047' 
      },
      { 
          id: 'internal1', 
          name: 'Internal 1', 
          test_type: 'Internal 1', 
          icon: <Layers size={32}/>, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' 
      },
      { 
          id: 'internal2', 
          name: 'Internal 2', 
          test_type: 'Internal 2', 
          icon: <Layers size={32}/>, color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff' 
      },
      { 
          id: 'assignment', 
          name: 'Assignment', 
          test_type: 'Assignment', 
          icon: <ClipboardList size={32}/>, color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' 
      },
  ];

  const generateTest = async (subject) => {
    setLoading(true);
    setQuestions([]);
    setScore(null);
    setAnswers({});
    setIsSubmitted(false);
    setActiveSubject(subject.name);
    setCurrentIndex(0); // Reset to first question
    
    const loadingToast = toast.loading(`Generating ${subject.name}...`);

    try {
        const res = await fetch(`${API_BASE_URL}/generate_full_test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                difficulty: "Hard", 
                test_type: subject.test_type 
            })
        });
        
        if (!res.ok) throw new Error("Server sleeping or Not Found");

        const data = await res.json();
        
        let parsedQuestions = [];
        if (data.questions) parsedQuestions = data.questions;
        else if (Array.isArray(data)) parsedQuestions = data;
        
        if(!parsedQuestions || parsedQuestions.length === 0) throw new Error("No questions");

        setQuestions(parsedQuestions);
        toast.dismiss(loadingToast);
        toast.success(`${subject.name} Ready! 🍀`);

    } catch (err) {
        console.error(err);
        toast.dismiss(loadingToast);
        toast.error("AI is busy. Try again!");
        setActiveSubject(null); 
    } finally {
        setLoading(false);
    }
  };

  const submitTest = () => {
      // Validate all answered
      if (Object.keys(answers).length < questions.length) {
          toast.error(`Please answer all questions first!`);
          return;
      }

      let newScore = 0;
      questions.forEach((q, index) => {
          if (answers[index] === q.correct_answer) newScore++;
      });
      setScore(newScore);
      setIsSubmitted(true);
      setCurrentIndex(0); // Go back to start to review
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      if (newScore > questions.length / 2) toast.success(`Great job! Score: ${newScore}`);
      else toast("Keep practicing! 💪");
  };

  // --- NAVIGATION HELPERS ---
  const handleNext = () => {
      if (currentIndex < questions.length - 1) {
          setCurrentIndex(currentIndex + 1);
      }
  };

  const handlePrev = () => {
      if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
      }
  };

  // --- STYLE HELPERS ---
  const getButtonColor = (option) => {
      const currentQ = questions[currentIndex];
      const isSelected = answers[currentIndex] === option;

      if (!isSubmitted) return isSelected ? '#dbeafe' : 'white';
      
      // REVIEW MODE COLORS
      if (option === currentQ.correct_answer) return '#dcfce7'; // Correct (Green)
      if (isSelected && option !== currentQ.correct_answer) return '#fee2e2'; // Wrong (Red)
      return '#f1f5f9'; // Others (Grey)
  };

  const getButtonBorder = (option) => {
      const currentQ = questions[currentIndex];
      const isSelected = answers[currentIndex] === option;

      if (!isSubmitted) return isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0';
      
      // REVIEW MODE BORDERS
      if (option === currentQ.correct_answer) return '2px solid #22c55e'; 
      if (isSelected && option !== currentQ.correct_answer) return '2px solid #ef4444'; 
      return '1px solid #e2e8f0';
  };

  // Current Question Object
  const currentQ = questions[currentIndex];

  return (
    <div className="page-container" style={{maxWidth: '800px', margin: '0 auto', paddingBottom: '50px'}}>
        
        {/* --- HEADER --- */}
        {!questions.length && (
            <div style={{textAlign: 'center', marginBottom: '40px', marginTop: '20px'}}>
                <h1 style={{fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', color: '#1e293b', marginBottom: '10px'}}>
                    <School size={40} color="#ea580c"/> Exam Hall
                </h1>
                <p style={{color: '#64748b', fontSize: '1.1rem'}}>Select a subject to test your knowledge.</p>
                <span style={{color: '#3b82f6', fontWeight: 'bold'}}>Current Level: Hard</span>
            </div>
        )}

        {/* --- EXAM HALL (Subject Selection) --- */}
        {!questions.length && !loading && (
            <div style={{
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '20px', padding: '10px'
            }}>
                {subjects.map((sub) => (
                    <div key={sub.id} onClick={() => generateTest(sub)} style={{
                        background: sub.bg, border: `2px solid ${sub.border}`, borderBottom: `6px solid ${sub.border}`,
                        borderRadius: '16px', padding: '30px', cursor: 'pointer', transition: 'transform 0.2s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{color: sub.color}}>{sub.icon}</div>
                        <h3 style={{margin: 0, fontSize: '1.4rem', color: '#334155'}}>{sub.name}</h3>
                        <span style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b'}}>Start Exam</span>
                    </div>
                ))}
            </div>
        )}

        {/* --- LOADING --- */}
        {loading && (
            <div style={{textAlign: 'center', marginTop: '50px'}}>
                <div className="loader" style={{marginBottom: '20px'}}></div>
                <h2>Preparing {activeSubject}...</h2>
            </div>
        )}

        {/* --- QUESTION CARD (ONE BY ONE) --- */}
        {questions.length > 0 && currentQ && (
            <div className="card" style={{minHeight: '400px', display: 'flex', flexDirection: 'column'}}>
                
                {/* TOP BAR: Back & Progress */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <button onClick={() => {setQuestions([]); setScore(null);}} 
                        style={{background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem'}}>
                        <ArrowLeft size={18}/> Quit
                    </button>
                    <span style={{fontWeight: 'bold', color: '#3b82f6'}}>
                        Question {currentIndex + 1} / {questions.length}
                    </span>
                </div>

                {/* SCORE BANNER (Only shows after submit) */}
                {isSubmitted && (
                    <div style={{
                        background: score === questions.length ? '#dcfce7' : '#fff7ed',
                        border: score === questions.length ? '2px solid #22c55e' : '2px solid #f97316',
                        borderRadius: '12px', padding: '15px', textAlign: 'center', marginBottom: '20px'
                    }}>
                        <h2 style={{margin: 0, fontSize: '1.5rem', color: '#1e293b'}}>Score: {score} / {questions.length}</h2>
                        <p style={{margin: '5px 0 0', fontSize: '0.9rem', color: '#64748b'}}>Review your answers below.</p>
                    </div>
                )}

                {/* QUESTION TEXT */}
                <h3 style={{fontSize: '1.2rem', color: '#334155', marginBottom: '25px', lineHeight: '1.5'}}>
                    {currentQ.question}
                </h3>

                {/* OPTIONS LIST */}
                <div style={{display: 'grid', gap: '12px', flex: 1}}>
                    {currentQ.options.map((opt) => (
                        <button key={opt} 
                            disabled={isSubmitted} 
                            onClick={() => setAnswers({...answers, [currentIndex]: opt})}
                            style={{
                                padding: '16px', borderRadius: '12px', 
                                border: getButtonBorder(opt),
                                backgroundColor: getButtonColor(opt),
                                color: '#1e293b', textAlign: 'left', 
                                cursor: isSubmitted ? 'default' : 'pointer', fontSize: '1rem',
                                position: 'relative', transition: 'all 0.2s',
                                fontWeight: answers[currentIndex] === opt ? '600' : '400'
                            }}>
                            {opt}
                            {/* Icons for Review Mode */}
                            {isSubmitted && opt === currentQ.correct_answer && <CheckCircle size={20} color="#16a34a" style={{position:'absolute', right:'15px', top:'16px'}}/>}
                            {isSubmitted && answers[currentIndex] === opt && answers[currentIndex] !== currentQ.correct_answer && <XCircle size={20} color="#dc2626" style={{position:'absolute', right:'15px', top:'16px'}}/>}
                        </button>
                    ))}
                </div>

                {/* EXPLANATION (Only if wrong in review mode) */}
                {isSubmitted && answers[currentIndex] !== currentQ.correct_answer && (
                    <div style={{marginTop: '20px', padding: '12px', background: '#fff1f2', borderRadius: '8px', borderLeft: '4px solid #f43f5e', color: '#be123c'}}>
                        <strong>Correct Answer:</strong> {currentQ.correct_answer}
                    </div>
                )}

                {/* NAVIGATION FOOTER */}
                <div style={{marginTop: '30px', display: 'flex', justifyContent: 'space-between', gap: '15px'}}>
                    
                    {/* PREV BUTTON */}
                    <button onClick={handlePrev} disabled={currentIndex === 0}
                        style={{
                            padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1',
                            background: currentIndex === 0 ? '#f1f5f9' : 'white', 
                            color: currentIndex === 0 ? '#94a3b8' : '#334155',
                            cursor: currentIndex === 0 ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}>
                        <ChevronLeft size={20}/> Prev
                    </button>

                    {/* NEXT / SUBMIT BUTTON */}
                    {currentIndex === questions.length - 1 ? (
                        !isSubmitted ? (
                            <button onClick={submitTest} className="btn-primary" 
                                style={{padding: '12px 30px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                Submit Exam <CheckCircle size={20}/>
                            </button>
                        ) : (
                            <button onClick={() => {setQuestions([]); setScore(null);}} 
                                style={{
                                    padding: '12px 30px', borderRadius: '10px', background: '#334155', color: 'white', border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                <RefreshCw size={18}/> New Test
                            </button>
                        )
                    ) : (
                        <button onClick={handleNext} className="btn-primary"
                            style={{padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                            Next <ChevronRight size={20}/>
                        </button>
                    )}
                </div>

            </div>
        )}
    </div>
  );
}

export default TestCorner;